/**
 * Job application service. Every data operation takes a user ID and applies it
 * in SQL; IDs from a browser are never an ownership proof.
 */

import { query, transaction } from '@/lib/db'
import { getOrCreateApplicationResumeVersion } from '@/lib/services/resume-version'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, paginatedData, paginationOffset } from '@/lib/pagination'
import type { DatabaseQuery } from '@/lib/storage/types'
import type { PaginatedData, PaginationParams } from '@/types/pagination'
import type { CreateJobApplicationRequest, JobApplication, JobApplicationStatus, UpdateJobApplicationRequest } from '@/types/job-application'

export class JobApplicationConflictError extends Error {
  constructor() {
    super('求职申请已在其他位置更新，请刷新后重试')
    this.name = 'JobApplicationConflictError'
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

async function resolveResumeVersion(
  database: DatabaseQuery,
  userId: string,
  resumeId: string | null | undefined,
  requestedVersionId: string | null | undefined,
): Promise<{ resumeId: string | null; resumeVersionId: string | null }> {
  if (!resumeId) {
    if (requestedVersionId) throw new Error('未关联简历时不能关联简历版本')
    return { resumeId: null, resumeVersionId: null }
  }

  if (!requestedVersionId) {
    const version = await getOrCreateApplicationResumeVersion(resumeId, userId, database)
    return { resumeId, resumeVersionId: version.id }
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
  if (!result.rows[0]) throw new Error('简历版本不存在或不属于当前简历')
  return { resumeId, resumeVersionId: requestedVersionId }
}

export async function listJobApplications(
  userId: string,
  options: ListOptions = { page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE },
): Promise<PaginatedData<JobApplication>> {
  const clauses = ['user_id = $1']
  const values: unknown[] = [userId]
  if (options.status && options.status !== 'all') {
    values.push(options.status)
    clauses.push(`status = $${values.length}`)
  }
  if (options.q) {
    values.push(`%${escapeLike(options.q)}%`)
    clauses.push(`(company ILIKE $${values.length} ESCAPE '\\' OR position ILIKE $${values.length} ESCAPE '\\')`)
  }
  const where = clauses.join(' AND ')
  const offset = paginationOffset(options)
  const [items, count] = await Promise.all([
    query<JobApplication>(
      `SELECT * FROM job_applications WHERE ${where}
       ORDER BY updated_at DESC, id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, options.pageSize, offset],
    ),
    query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM job_applications WHERE ${where}`, values),
  ])
  return paginatedData(items.rows, options, Number(count.rows[0]?.total || 0))
}

export async function getJobApplication(id: string, userId: string, database: DatabaseQuery = query): Promise<JobApplication | null> {
  const result = await database<JobApplication>('SELECT * FROM job_applications WHERE id = $1 AND user_id = $2', [id, userId])
  return result.rows[0] || null
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
    return result.rows[0]
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
    return result.rows[0]
  })
}

export async function deleteJobApplication(id: string, userId: string): Promise<boolean> {
  const result = await query('DELETE FROM job_applications WHERE id = $1 AND user_id = $2', [id, userId])
  return (result.rowCount || 0) > 0
}
