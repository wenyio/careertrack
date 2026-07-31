import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { transaction } from '@/lib/storage/sqlite'
import { createJobApplication, createJobApplicationEvent, getJobApplication, getJobApplicationActionCenter, getJobApplicationSummary, JobApplicationConflictError, JobApplicationValidationError, listJobApplicationEvents, listJobApplications, updateJobApplication } from '@/lib/services/job-application'

const userId = '00000000-0000-4000-8000-000000000101'
const otherUserId = '00000000-0000-4000-8000-000000000102'
const resumeId = '00000000-0000-4000-8000-000000000110'
const otherResumeId = '00000000-0000-4000-8000-000000000111'
let directory: string
let previousPath: string | undefined
let previousTimeZone: string | undefined
let previousTz: string | undefined

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), 'careertrack-applications-'))
  previousPath = process.env.SQLITE_DB_PATH
  previousTimeZone = process.env.APP_TIMEZONE
  previousTz = process.env.TZ
  process.env.SQLITE_DB_PATH = join(directory, 'applications.db')
})

beforeEach(async () => {
  await transaction(async (database) => {
    await database('DELETE FROM users')
    await database('INSERT INTO users (id, username, auth_provider) VALUES ($1, $2, $3)', [userId, 'applications-owner', 1])
    await database('INSERT INTO users (id, username, auth_provider) VALUES ($1, $2, $3)', [otherUserId, 'applications-other', 1])
    await database('INSERT INTO resumes (id, user_id, name) VALUES ($1, $2, $3)', [resumeId, userId, '我的简历'])
    await database('INSERT INTO resumes (id, user_id, name) VALUES ($1, $2, $3)', [otherResumeId, otherUserId, '他人的简历'])
  })
})

afterAll(() => {
  if (previousPath === undefined) delete process.env.SQLITE_DB_PATH
  else process.env.SQLITE_DB_PATH = previousPath
  if (previousTimeZone === undefined) delete process.env.APP_TIMEZONE
  else process.env.APP_TIMEZONE = previousTimeZone
  if (previousTz === undefined) delete process.env.TZ
  else process.env.TZ = previousTz
  rmSync(directory, { recursive: true, force: true })
})

describe('job application service', () => {
  it('creates a current application snapshot and enforces resume/version ownership', async () => {
    const application = await createJobApplication(userId, { company: '示例公司', position: '工程师', status: 'applied', resume_id: resumeId })
    expect(application.resume_id).toBe(resumeId)
    expect(application.resume_version_id).toBeTruthy()
    const version = await transaction((database) => database<{ source: string }>('SELECT source FROM resume_versions WHERE id = $1', [application.resume_version_id]))
    expect(version.rows[0].source).toBe('application')
    await expect(createJobApplication(userId, { company: '越权公司', position: '工程师', resume_id: otherResumeId })).rejects.toThrow('简历不存在')
  })

  it('filters, paginates, isolates users, and detects a stale revision', async () => {
    const first = await createJobApplication(userId, { company: 'Acme', position: 'Frontend', status: 'wishlist' })
    await createJobApplication(userId, { company: 'Beta', position: 'Backend', status: 'applied', applied_at: '2026-07-31', next_action_at: '2026-08-01' })
    await createJobApplication(otherUserId, { company: 'Acme', position: 'Private', status: 'applied' })
    const filtered = await listJobApplications(userId, { page: 1, pageSize: 1, q: 'acme', status: 'all' })
    expect(filtered.pagination.total).toBe(1)
    expect(filtered.items[0].position).toBe('Frontend')
    expect(await getJobApplication(first.id, otherUserId)).toBeNull()
    const updated = await updateJobApplication(first.id, userId, { expected_revision: first.revision, status: 'screening', next_action_at: '2026-08-01' })
    expect(updated.status_changed_at).toBeTruthy()
    await expect(updateJobApplication(first.id, userId, { expected_revision: first.revision, status: 'interview' })).rejects.toBeInstanceOf(JobApplicationConflictError)
    const beta = (await listJobApplications(userId, { page: 1, pageSize: 10 })).items.find((item) => item.company === 'Beta')
    expect(beta).toMatchObject({ applied_at: '2026-07-31', next_action_at: '2026-08-01' })
    const alphabetical = await listJobApplications(userId, { page: 1, pageSize: 10, sort: 'company' })
    expect(alphabetical.items.map((item) => item.company)).toEqual(['Acme', 'Beta'])
    await expect(getJobApplicationSummary(userId)).resolves.toMatchObject({ total: 2, active: 2, interview: 0, by_status: { applied: 1, screening: 1 } })
    const events = await listJobApplicationEvents(first.id, userId)
    expect(events?.items.map((event) => event.event_type)).toEqual(expect.arrayContaining(['created', 'status_changed']))
    expect(await listJobApplicationEvents(first.id, otherUserId)).toBeNull()
  })

  it('appends follow-ups without replacing history and updates the current next action', async () => {
    const application = await createJobApplication(userId, { company: '过程公司', position: '设计师' })
    await createJobApplicationEvent(application.id, userId, {
      event_type: 'follow_up',
      content: '已发送邮件',
      next_status: 'screening',
      next_action_at: '2026-08-01',
      expected_revision: application.revision,
    })
    const refreshed = await getJobApplication(application.id, userId)
    await createJobApplicationEvent(application.id, userId, { event_type: 'note', content: '等待回复' })
    const events = await listJobApplicationEvents(application.id, userId)
    expect(refreshed).toMatchObject({
      status: 'screening',
      next_action_at: '2026-08-01',
      revision: application.revision + 1,
    })
    expect(events?.items.filter((event) => event.event_type === 'follow_up')).toHaveLength(1)
    expect(events?.items.filter((event) => event.event_type === 'status_changed')).toHaveLength(1)
    expect(events?.items.filter((event) => event.event_type === 'note')).toHaveLength(1)
    await expect(createJobApplicationEvent(application.id, userId, {
      event_type: 'follow_up',
      content: '缺少并发令牌',
      next_status: 'interview',
    })).rejects.toBeInstanceOf(JobApplicationValidationError)
    await expect(createJobApplicationEvent(application.id, userId, {
      event_type: 'follow_up',
      content: '过期并发令牌',
      next_action_at: null,
      expected_revision: application.revision,
    })).rejects.toBeInstanceOf(JobApplicationConflictError)
  })

  it('stores and lists timeline events by normalized UTC occurrence time', async () => {
    const application = await createJobApplication(userId, { company: '时区公司', position: '工程师' })
    await transaction((database) => database(
      `UPDATE job_application_events
       SET occurred_at = '2026-07-31T00:00:00Z'
       WHERE application_id = $1 AND user_id = $2 AND event_type = 'created'`,
      [application.id, userId],
    ))
    await createJobApplicationEvent(application.id, userId, {
      event_type: 'note',
      content: '北京时间 9 点',
      occurred_at: '2026-08-01T09:00:00+08:00',
    })
    await createJobApplicationEvent(application.id, userId, {
      event_type: 'note',
      content: 'UTC 0 点半',
      occurred_at: '2026-08-01T00:30:00Z',
    })
    await transaction((database) => database(
      `INSERT INTO job_application_events (application_id, user_id, event_type, content, occurred_at)
       VALUES ($1, $2, 'note', 'SQLite UTC 文本', '2026-08-01 00:00:00')`,
      [application.id, userId],
    ))

    const firstPage = await listJobApplicationEvents(application.id, userId, { page: 1, pageSize: 2 })
    const secondPage = await listJobApplicationEvents(application.id, userId, { page: 2, pageSize: 2 })
    expect(firstPage?.pagination).toMatchObject({ total: 4, has_more: true })
    expect(firstPage?.items.map((event) => event.occurred_at)).toEqual([
      expect.stringMatching(/^2026-08-01T01:00:00\.000Z$/),
      expect.stringMatching(/^2026-08-01T00:30:00\.000Z$/),
    ])
    expect(secondPage?.items.some((event) => event.content === 'SQLite UTC 文本' && event.occurred_at === '2026-08-01T00:00:00.000Z')).toBe(true)
  })

  it('uses a date-only calendar boundary for summaries and the action center', async () => {
    await createJobApplication(userId, { company: '逾期', position: '工程师', status: 'applied', next_action_at: '2026-07-31' })
    await createJobApplication(userId, { company: '今日', position: '设计师', status: 'screening', next_action_at: '2026-08-01' })
    await createJobApplication(userId, { company: '未来', position: '产品', status: 'interview', next_action_at: '2026-08-08' })
    await createJobApplication(userId, { company: '过期 Offer', position: '运营', status: 'offer', next_action_at: '2026-07-31' })
    await createJobApplication(userId, { company: '待规划', position: '测试', status: 'applied' })

    await expect(getJobApplicationSummary(userId, '2026-08-01')).resolves.toMatchObject({ due_today: 1, overdue: 1 })
    await expect(getJobApplicationActionCenter(userId, '2026-08-01')).resolves.toMatchObject({
      overdue: { items: [expect.objectContaining({ company: '逾期' })] },
      due_today: { items: [expect.objectContaining({ company: '今日' })] },
      upcoming: { items: [expect.objectContaining({ company: '未来' })] },
      unplanned: { items: [expect.objectContaining({ company: '待规划' })] },
    })
  })

  it('uses APP_TIMEZONE for the application calendar even when the process runs in UTC', async () => {
    process.env.TZ = 'UTC'
    process.env.APP_TIMEZONE = 'Asia/Shanghai'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-31T17:00:00.000Z'))
    try {
      await createJobApplication(userId, { company: '上海今日', position: '工程师', status: 'applied', next_action_at: '2026-08-01' })
      await expect(getJobApplicationSummary(userId)).resolves.toMatchObject({ due_today: 1, overdue: 0 })
      const actions = await getJobApplicationActionCenter(userId)
      expect(actions.due_today.items).toEqual([expect.objectContaining({ company: '上海今日' })])
    } finally {
      vi.useRealTimers()
    }
  })

  it('queries each action bucket independently so overdue items cannot hide today items', async () => {
    for (let index = 0; index < 25; index += 1) {
      await createJobApplication(userId, { company: `逾期 ${index}`, position: '工程师', status: 'applied', next_action_at: '2026-07-31' })
    }
    await createJobApplication(userId, { company: '不会被挤掉的今日', position: '工程师', status: 'applied', next_action_at: '2026-08-01' })

    const actions = await getJobApplicationActionCenter(userId, '2026-08-01', 20)
    expect(actions.overdue).toMatchObject({ total: 25, has_more: true, limit: 20 })
    expect(actions.overdue.items).toHaveLength(20)
    expect(actions.due_today.items).toEqual([expect.objectContaining({ company: '不会被挤掉的今日' })])
  })

  it('keeps applications when their resume is deleted and cascades them with the user', async () => {
    const application = await createJobApplication(userId, { company: '保留公司', position: '产品', resume_id: resumeId })
    await transaction((database) => database('DELETE FROM resumes WHERE id = $1', [resumeId]))
    const afterResumeDelete = await getJobApplication(application.id, userId)
    expect(afterResumeDelete).toMatchObject({ resume_id: null, resume_version_id: null })
    await transaction((database) => database('DELETE FROM users WHERE id = $1', [userId]))
    expect(await getJobApplication(application.id, userId)).toBeNull()
  })
})
