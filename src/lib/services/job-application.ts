/**
 * Job application service. Every data operation takes a user ID and applies it
 * in SQL; IDs from a browser are never an ownership proof.
 */

import { query, transaction } from '@/lib/db'
import { getOrCreateApplicationResumeVersion } from '@/lib/services/resume-version'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, paginatedData, paginationOffset } from '@/lib/pagination'
import type { DatabaseQuery } from '@/lib/storage/types'
import type { PaginatedData, PaginationParams } from '@/types/pagination'
import type { CreateJobApplicationEventRequest, CreateJobApplicationRequest, JobApplication, JobApplicationActionCenter, JobApplicationEvent, JobApplicationStatus, JobApplicationSummary, UpdateJobApplicationRequest } from '@/types/job-application'

export class JobApplicationConflictError extends Error {
  constructor() {
    super('求职申请已在其他位置更新，请刷新后重试')
    this.name = 'JobApplicationConflictError'
  }
}

export class JobApplicationRelationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JobApplicationRelationError'
  }
}

interface ListOptions extends PaginationParams {
  q?: string
  status?: 'all' | JobApplicationStatus
}

function normalizedNull(value: string | null | undefined): string | null {
  return value?.trim() || null
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

function toDateOnly(value: unknown): string | null {
  if (value === null || value === undefined) return null
  // PostgreSQL DATE is configured to return this string directly. Do not turn
  // it into a Date: Date carries a timezone although this value does not.
  if (typeof value !== 'string') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return null
}

function todayDateOnly(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${date}`
}

function toEvent(row: JobApplicationEvent): JobApplicationEvent {
  const metadata = typeof row.metadata === 'string'
    ? (() => { try { return JSON.parse(row.metadata) as Record<string, unknown> } catch { return {} } })()
    : row.metadata || {}
  return { ...row, metadata }
}

async function insertApplicationEvent(
  database: DatabaseQuery,
  applicationId: string,
  userId: string,
  eventType: JobApplicationEvent['event_type'],
  content: string | null,
  metadata: Record<string, unknown> = {},
  occurredAt?: string,
): Promise<JobApplicationEvent> {
  const result = await database<JobApplicationEvent>(
    `INSERT INTO job_application_events (application_id, user_id, event_type, content, metadata, occurred_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW())) RETURNING *`,
    [applicationId, userId, eventType, content, JSON.stringify(metadata), occurredAt || null],
  )
  return toEvent(result.rows[0])
}

/** Keep date-only fields stable across SQLite TEXT and PostgreSQL DATE parsers. */
function toJobApplication(row: JobApplication): JobApplication {
  return {
    ...row,
    applied_at: toDateOnly(row.applied_at),
    next_action_at: toDateOnly(row.next_action_at),
  }
}

async function resolveResumeVersion(
  database: DatabaseQuery,
  userId: string,
  resumeId: string | null | undefined,
  requestedVersionId: string | null | undefined,
): Promise<{ resumeId: string | null; resumeVersionId: string | null }> {
  if (!resumeId) {
    if (requestedVersionId) throw new JobApplicationRelationError('未关联简历时不能关联简历版本')
    return { resumeId: null, resumeVersionId: null }
  }

  if (!requestedVersionId) {
    try {
      const version = await getOrCreateApplicationResumeVersion(resumeId, userId, database)
      return { resumeId, resumeVersionId: version.id }
    } catch (reason) {
      if (reason instanceof Error && reason.message === '简历不存在') {
        throw new JobApplicationRelationError('简历不存在或不属于当前用户')
      }
      throw reason
    }
  }

  // The join proves both the requested resume and its version belong to this
  // user. This check is deliberately server-side even though a foreign key
  // exists: the FK alone cannot express cross-table ownership.
  const result = await database<{ id: string }>(
    `SELECT rv.id FROM resume_versions rv
     JOIN resumes r ON r.id = rv.resume_id
     WHERE rv.id = $1 AND rv.resume_id = $2 AND r.user_id = $3`,
    [requestedVersionId, resumeId, userId],
  )
  if (!result.rows[0]) throw new JobApplicationRelationError('简历版本不存在或不属于当前简历')
  return { resumeId, resumeVersionId: requestedVersionId }
}

export async function listJobApplications(
  userId: string,
  options: ListOptions = { page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE },
): Promise<PaginatedData<JobApplication>> {
  const clauses = ['ja.user_id = $1']
  const values: unknown[] = [userId]
  if (options.status && options.status !== 'all') {
    values.push(options.status)
    clauses.push(`ja.status = $${values.length}`)
  }
  if (options.q) {
    values.push(`%${escapeLike(options.q)}%`)
    clauses.push(`(ja.company ILIKE $${values.length} ESCAPE '\\' OR ja.position ILIKE $${values.length} ESCAPE '\\')`)
  }
  const where = clauses.join(' AND ')
  const offset = paginationOffset(options)
  const [items, count] = await Promise.all([
    query<JobApplication>(
      `SELECT ja.*, r.name AS resume_name, rv.revision AS resume_version_revision
       FROM job_applications ja
       LEFT JOIN resumes r ON r.id = ja.resume_id
       LEFT JOIN resume_versions rv ON rv.id = ja.resume_version_id
       WHERE ${where}
       ORDER BY ja.updated_at DESC, ja.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, options.pageSize, offset],
    ),
    query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM job_applications ja WHERE ${where}`, values),
  ])
  return paginatedData(items.rows.map(toJobApplication), options, Number(count.rows[0]?.total || 0))
}

export async function getJobApplication(id: string, userId: string, database: DatabaseQuery = query): Promise<JobApplication | null> {
  const result = await database<JobApplication>(
    `SELECT ja.*, r.name AS resume_name, rv.revision AS resume_version_revision
     FROM job_applications ja
     LEFT JOIN resumes r ON r.id = ja.resume_id
     LEFT JOIN resume_versions rv ON rv.id = ja.resume_version_id
     WHERE ja.id = $1 AND ja.user_id = $2`,
    [id, userId],
  )
  return result.rows[0] ? toJobApplication(result.rows[0]) : null
}

export async function getJobApplicationSummary(userId: string, today = todayDateOnly()): Promise<JobApplicationSummary> {
  const [summaryResult, statusesResult] = await Promise.all([
    query<{ total: number; active: number; interview: number; offer: number; due_today: number; overdue: number }>(
      `SELECT COUNT(*)::int AS total,
       COALESCE(SUM(CASE WHEN status IN ('applied', 'screening', 'interview') THEN 1 ELSE 0 END), 0)::int AS active,
       COALESCE(SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END), 0)::int AS interview,
       COALESCE(SUM(CASE WHEN status = 'offer' THEN 1 ELSE 0 END), 0)::int AS offer,
       COALESCE(SUM(CASE WHEN next_action_at = $2 AND status IN ('wishlist', 'applied', 'screening', 'interview') THEN 1 ELSE 0 END), 0)::int AS due_today,
       COALESCE(SUM(CASE WHEN next_action_at < $2 AND status IN ('wishlist', 'applied', 'screening', 'interview') THEN 1 ELSE 0 END), 0)::int AS overdue
       FROM job_applications WHERE user_id = $1`,
      [userId, today],
    ),
    query<{ status: JobApplicationStatus; total: number }>(
      'SELECT status, COUNT(*)::int AS total FROM job_applications WHERE user_id = $1 GROUP BY status',
      [userId],
    ),
  ])
  const by_status = Object.fromEntries(
    ['wishlist', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'].map((status) => [status, 0]),
  ) as Record<JobApplicationStatus, number>
  for (const row of statusesResult.rows) by_status[row.status] = Number(row.total)
  return { ...summaryResult.rows[0], by_status }
}

export async function getJobApplicationActionCenter(userId: string, today = todayDateOnly()): Promise<JobApplicationActionCenter> {
  const result = await query<JobApplication>(
    `SELECT ja.*, r.name AS resume_name, rv.revision AS resume_version_revision
     FROM job_applications ja
     LEFT JOIN resumes r ON r.id = ja.resume_id
     LEFT JOIN resume_versions rv ON rv.id = ja.resume_version_id
     WHERE ja.user_id = $1
       AND ja.status IN ('wishlist', 'applied', 'screening', 'interview')
       AND ja.next_action_at IS NOT NULL
     ORDER BY ja.next_action_at ASC, ja.updated_at DESC LIMIT 100`,
    [userId],
  )
  const sevenDays = new Date(`${today}T12:00:00`)
  sevenDays.setDate(sevenDays.getDate() + 7)
  const until = todayDateOnly(sevenDays)
  const center: JobApplicationActionCenter = { overdue: [], due_today: [], upcoming: [] }
  for (const application of result.rows.map(toJobApplication)) {
    if (!application.next_action_at) continue
    if (application.next_action_at < today) center.overdue.push(application)
    else if (application.next_action_at === today) center.due_today.push(application)
    else if (application.next_action_at <= until) center.upcoming.push(application)
  }
  return center
}

export async function listJobApplicationEvents(applicationId: string, userId: string): Promise<JobApplicationEvent[] | null> {
  // Include user_id in both the existence probe and event query: a guessed ID
  // must not reveal whether another user's application has activity.
  const application = await getJobApplication(applicationId, userId)
  if (!application) return null
  const result = await query<JobApplicationEvent>(
    `SELECT * FROM job_application_events
     WHERE application_id = $1 AND user_id = $2
     ORDER BY occurred_at DESC, id DESC`,
    [applicationId, userId],
  )
  return result.rows.map(toEvent)
}

export async function createJobApplicationEvent(
  applicationId: string,
  userId: string,
  input: CreateJobApplicationEventRequest,
): Promise<JobApplicationEvent> {
  return transaction(async (database) => {
    const application = await getJobApplication(applicationId, userId, database)
    if (!application) throw new Error('求职申请不存在')
    if (input.expected_revision !== undefined && application.revision !== input.expected_revision) throw new JobApplicationConflictError()
    if (input.next_action_at !== undefined) {
      const update = await database<JobApplication>(
        `UPDATE job_applications SET next_action_at = $1, revision = revision + 1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3 AND revision = $4 RETURNING *`,
        [input.next_action_at, applicationId, userId, application.revision],
      )
      if (!update.rows[0]) throw new JobApplicationConflictError()
    }
    return insertApplicationEvent(
      database, applicationId, userId, input.event_type, normalizedNull(input.content), input.metadata || {}, input.occurred_at,
    )
  })
}

export async function createJobApplication(userId: string, input: CreateJobApplicationRequest): Promise<JobApplication> {
  return transaction(async (database) => {
    const resume = await resolveResumeVersion(database, userId, input.resume_id, input.resume_version_id)
    const result = await database<JobApplication>(
      `INSERT INTO job_applications (
         user_id, company, position, status, job_url, location, channel, salary, notes,
         applied_at, next_action_at, resume_id, resume_version_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        userId, input.company.trim(), input.position.trim(), input.status || 'wishlist',
        normalizedNull(input.job_url), normalizedNull(input.location), normalizedNull(input.channel),
        normalizedNull(input.salary), normalizedNull(input.notes), input.applied_at || null,
        input.next_action_at || null, resume.resumeId, resume.resumeVersionId,
      ],
    )
    await insertApplicationEvent(database, result.rows[0].id, userId, 'created', null, { status: result.rows[0].status })
    return toJobApplication(result.rows[0])
  })
}

export async function updateJobApplication(id: string, userId: string, input: UpdateJobApplicationRequest): Promise<JobApplication> {
  return transaction(async (database) => {
    const existing = await getJobApplication(id, userId, database)
    if (!existing) throw new Error('求职申请不存在')
    if (existing.revision !== input.expected_revision) throw new JobApplicationConflictError()

    const hasResumeUpdate = Object.prototype.hasOwnProperty.call(input, 'resume_id')
    const resume = hasResumeUpdate
      ? await resolveResumeVersion(database, userId, input.resume_id, input.resume_version_id)
      : { resumeId: existing.resume_id, resumeVersionId: existing.resume_version_id }
    const fields: Array<[keyof JobApplication, unknown]> = []
    for (const key of ['company', 'position', 'status', 'job_url', 'location', 'channel', 'salary', 'notes', 'applied_at', 'next_action_at'] as const) {
      if (input[key] !== undefined) fields.push([key, ['job_url', 'location', 'channel', 'salary', 'notes'].includes(key) ? normalizedNull(input[key] as string | null) : input[key]])
    }
    if (hasResumeUpdate) {
      fields.push(['resume_id', resume.resumeId], ['resume_version_id', resume.resumeVersionId])
    }
    const values: unknown[] = fields.map(([, value]) => value)
    const setClauses = fields.map(([field], index) => `${field} = $${index + 1}`)
    if (input.status !== undefined && input.status !== existing.status) {
      // Compare in the service rather than reusing a SET placeholder inside a
      // CASE expression. PostgreSQL otherwise can infer conflicting parameter
      // types for that placeholder on dynamic updates.
      setClauses.push('status_changed_at = NOW()')
    }
    setClauses.push('revision = revision + 1', 'updated_at = NOW()')
    values.push(id, userId, input.expected_revision)
    const result = await database<JobApplication>(
      `UPDATE job_applications SET ${setClauses.join(', ')}
       WHERE id = $${values.length - 2} AND user_id = $${values.length - 1} AND revision = $${values.length}
       RETURNING *`,
      values,
    )
    if (!result.rows[0]) throw new JobApplicationConflictError()
    if (input.status !== undefined && input.status !== existing.status) {
      // The record and its status history share one transaction so a timeline
      // never observes a current stage without the corresponding transition.
      await insertApplicationEvent(database, id, userId, 'status_changed', null, {
        from: existing.status, to: input.status,
      })
    }
    return toJobApplication(result.rows[0])
  })
}

export async function deleteJobApplication(id: string, userId: string): Promise<boolean> {
  const result = await query('DELETE FROM job_applications WHERE id = $1 AND user_id = $2', [id, userId])
  return (result.rowCount || 0) > 0
}
