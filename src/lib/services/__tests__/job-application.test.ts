import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { transaction } from '@/lib/storage/sqlite'
import { createJobApplication, getJobApplication, JobApplicationConflictError, listJobApplications, updateJobApplication } from '@/lib/services/job-application'

const userId = '00000000-0000-4000-8000-000000000101'
const otherUserId = '00000000-0000-4000-8000-000000000102'
const resumeId = '00000000-0000-4000-8000-000000000110'
const otherResumeId = '00000000-0000-4000-8000-000000000111'
let directory: string
let previousPath: string | undefined

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), 'careertrack-applications-'))
  previousPath = process.env.SQLITE_DB_PATH
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
    await createJobApplication(userId, { company: 'Beta', position: 'Backend', status: 'applied' })
    await createJobApplication(otherUserId, { company: 'Acme', position: 'Private', status: 'applied' })
    const filtered = await listJobApplications(userId, { page: 1, pageSize: 1, q: 'acme', status: 'all' })
    expect(filtered.pagination.total).toBe(1)
    expect(filtered.items[0].position).toBe('Frontend')
    expect(await getJobApplication(first.id, otherUserId)).toBeNull()
    const updated = await updateJobApplication(first.id, userId, { expected_revision: first.revision, status: 'screening', next_action_at: '2026-08-01' })
    expect(updated.status_changed_at).toBeTruthy()
    await expect(updateJobApplication(first.id, userId, { expected_revision: first.revision, status: 'interview' })).rejects.toBeInstanceOf(JobApplicationConflictError)
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
