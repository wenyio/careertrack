/**
 * Resume version history service.
 *
 * `resumes.revision` remains the optimistic-write token. Version rows merely
 * retain selected states, so a restore always creates a new, higher revision.
 */

import { query, transaction } from '@/lib/db'
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  paginatedData,
  paginationOffset,
} from '@/lib/pagination'
import type { DatabaseQuery } from '@/lib/storage/types'
import type {
  Resume,
  ResumeContent,
  ResumeModuleType,
  ResumeTemplateId,
  ModulesConfig,
  ResumeVersion,
  ResumeVersionDetail,
  ResumeVersionSnapshot,
  ResumeVersionSource,
} from '@/types/resume'
import type { PaginatedData, PaginationParams } from '@/types/pagination'
import { DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER } from '@/config/modules'

export const AUTO_VERSION_WINDOW_MS = 10 * 60 * 1000
export const AUTO_VERSION_RETENTION = 30
export const MANUAL_VERSION_LIMIT = 100

export class ResumeVersionLimitError extends Error {
  constructor() {
    super(`每份简历最多可保留 ${MANUAL_VERSION_LIMIT} 个手动版本，请先恢复或继续使用现有版本`)
    this.name = 'ResumeVersionLimitError'
  }
}

export class ResumeVersionConflictError extends Error {
  constructor(message = '简历已在其他位置更新，请刷新后重试恢复') {
    super(message)
    this.name = 'ResumeVersionConflictError'
  }
}

interface VersionRow extends Omit<ResumeVersion, 'created_at'> {
  created_at: unknown
  snapshot?: ResumeVersionSnapshot | string
}

export function snapshotFor(resume: Resume): ResumeVersionSnapshot {
  const modulesConfig = resume.modules_config && Object.keys(resume.modules_config).length > 0
    ? resume.modules_config
    : DEFAULT_MODULES_CONFIG
  return {
    name: resume.name,
    template: (resume.template || 'classic') as ResumeTemplateId,
    modules_config: modulesConfig as ModulesConfig,
    modules_order: Array.isArray(resume.modules_order) && resume.modules_order.length > 0
      ? resume.modules_order as ResumeModuleType[]
      : DEFAULT_MODULES_ORDER,
    content: (resume.content || {}) as ResumeContent,
  }
}

function parseSnapshot(value: ResumeVersionSnapshot | string | undefined): ResumeVersionSnapshot | null {
  if (!value) return null
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as ResumeVersionSnapshot
  } catch {
    return null
  }
}

function toMetadata(row: VersionRow): ResumeVersion {
  return {
    id: row.id,
    resume_id: row.resume_id,
    revision: Number(row.revision),
    source: row.source,
    label: row.label,
    created_at: toVersionCreatedAt(row.created_at),
  }
}

function toDetail(row: VersionRow): ResumeVersionDetail | null {
  const snapshot = parseSnapshot(row.snapshot)
  return snapshot ? { ...toMetadata(row), snapshot } : null
}

/** PostgreSQL decodes TIMESTAMPTZ as Date while SQLite returns TEXT. */
export function parseVersionCreatedAt(value: unknown): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value !== 'string') return NaN
  return Date.parse(
    value.includes('T') ? value : `${value.replace(' ', 'T')}Z`,
  )
}

/** Return one UTC representation regardless of SQLite TEXT or PostgreSQL Date. */
export function toVersionCreatedAt(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value !== 'string') return ''
  const timestamp = parseVersionCreatedAt(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : value
}

async function getOwnedResume(
  database: DatabaseQuery,
  resumeId: string,
  userId: string,
): Promise<Resume | null> {
  const result = await database(
    'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
    [resumeId, userId],
  )
  return (result.rows[0] as Resume | undefined) || null
}

async function findVersion(
  database: DatabaseQuery,
  resumeId: string,
  revision: number,
  source: ResumeVersionSource,
): Promise<ResumeVersion | null> {
  const result = await database<VersionRow>(
    `SELECT id, resume_id, revision, source, label, created_at
     FROM resume_versions
     WHERE resume_id = $1 AND revision = $2 AND source = $3`,
    [resumeId, revision, source],
  )
  return result.rows[0] ? toMetadata(result.rows[0]) : null
}

async function insertSnapshot(
  database: DatabaseQuery,
  resume: Resume,
  source: ResumeVersionSource,
  label?: string,
): Promise<ResumeVersion> {
  const existing = await findVersion(database, resume.id, resume.revision, source)
  if (existing) return existing

  const result = await database<VersionRow>(
    `INSERT INTO resume_versions (resume_id, revision, source, label, snapshot)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT(resume_id, revision, source) DO NOTHING
     RETURNING id, resume_id, revision, source, label, created_at`,
    [
      resume.id,
      resume.revision,
      source,
      label || null,
      JSON.stringify(snapshotFor(resume)),
    ],
  )
  if (result.rows[0]) return toMetadata(result.rows[0])

  // A concurrent request may have won the unique key; that is the same
  // logical snapshot and therefore an idempotent success.
  const concurrent = await findVersion(database, resume.id, resume.revision, source)
  if (concurrent) return concurrent
  throw new Error('创建简历版本失败')
}

async function trimAutoVersions(database: DatabaseQuery, resumeId: string): Promise<void> {
  const versions = await database<{ id: string }>(
    `SELECT id FROM resume_versions
     WHERE resume_id = $1 AND source = 'auto'
     ORDER BY created_at DESC, id DESC`,
    [resumeId],
  )
  const obsoleteIds = versions.rows.slice(AUTO_VERSION_RETENTION).map((version) => version.id)
  if (obsoleteIds.length > 0) {
    await database('DELETE FROM resume_versions WHERE id = ANY($1)', [obsoleteIds])
  }
}

/** List metadata only; snapshots are intentionally not selected on this path. */
export async function listResumeVersions(
  resumeId: string,
  pagination: PaginationParams = { page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE },
  database: DatabaseQuery = query,
): Promise<PaginatedData<ResumeVersion>> {
  const offset = paginationOffset(pagination)
  const [itemsResult, countResult] = await Promise.all([
    database<VersionRow>(
      `SELECT id, resume_id, revision, source, label, created_at
       FROM resume_versions WHERE resume_id = $1
       ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`,
      [resumeId, pagination.pageSize, offset],
    ),
    database<{ total: number }>(
      'SELECT COUNT(*)::int AS total FROM resume_versions WHERE resume_id = $1',
      [resumeId],
    ),
  ])
  return paginatedData(
    itemsResult.rows.map(toMetadata),
    pagination,
    Number(countResult.rows[0]?.total || 0),
  )
}

/** Requires the caller to have already verified resume ownership. */
export async function getResumeVersion(
  resumeId: string,
  versionId: string,
  database: DatabaseQuery = query,
): Promise<ResumeVersionDetail | null> {
  const result = await database<VersionRow>(
    `SELECT id, resume_id, revision, source, label, snapshot, created_at
     FROM resume_versions WHERE id = $1 AND resume_id = $2`,
    [versionId, resumeId],
  )
  return result.rows[0] ? toDetail(result.rows[0]) : null
}

export async function createManualResumeVersion(
  resumeId: string,
  userId: string,
  expectedRevision: number,
  label?: string,
): Promise<ResumeVersion> {
  return transaction(async (database) => {
    const resume = await getOwnedResume(database, resumeId, userId)
    if (!resume) throw new Error('简历不存在')
    if (resume.revision !== expectedRevision) {
      throw new ResumeVersionConflictError('简历已更新，请刷新后再保存版本')
    }

    const existing = await findVersion(database, resume.id, resume.revision, 'manual')
    if (existing) return existing

    const count = await database<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM resume_versions
       WHERE resume_id = $1 AND source = 'manual'`,
      [resume.id],
    )
    if (Number(count.rows[0]?.total || 0) >= MANUAL_VERSION_LIMIT) {
      throw new ResumeVersionLimitError()
    }
    return insertSnapshot(database, resume, 'manual', label)
  })
}

/**
 * Coalesces frequent editor writes into a periodic safety checkpoint. This is
 * deliberately callable after an update rather than on every keystroke.
 */
export async function createAutoResumeVersion(
  resumeId: string,
  userId: string,
  now = Date.now(),
): Promise<ResumeVersion | null> {
  return transaction(async (database) => {
    const resume = await getOwnedResume(database, resumeId, userId)
    if (!resume) throw new Error('简历不存在')

    const sameRevision = await findVersion(database, resume.id, resume.revision, 'auto')
    if (sameRevision) return sameRevision

    const latest = await database<{ created_at: unknown }>(
      `SELECT created_at FROM resume_versions
       WHERE resume_id = $1 AND source = 'auto'
       ORDER BY created_at DESC, id DESC LIMIT 1`,
      [resume.id],
    )
    const latestMs = parseVersionCreatedAt(latest.rows[0]?.created_at)
    if (Number.isFinite(latestMs) && now - latestMs < AUTO_VERSION_WINDOW_MS) {
      return null
    }

    const version = await insertSnapshot(database, resume, 'auto')
    await trimAutoVersions(database, resume.id)
    return version
  })
}

export async function restoreResumeVersion(
  resumeId: string,
  versionId: string,
  userId: string,
  expectedRevision: number,
): Promise<Resume> {
  return transaction(async (database) => {
    const resume = await getOwnedResume(database, resumeId, userId)
    if (!resume) throw new Error('简历不存在')
    if (resume.revision !== expectedRevision) throw new ResumeVersionConflictError()

    const version = await getResumeVersion(resumeId, versionId, database)
    if (!version) throw new Error('版本不存在')

    const snapshot = version.snapshot
    const updated = await database<Resume>(
      `UPDATE resumes
       SET name = $1, template = $2, modules_config = $3, modules_order = $4,
           content = $5, revision = revision + 1, updated_at = NOW()
       WHERE id = $6 AND user_id = $7 AND revision = $8
       RETURNING *`,
      [
        snapshot.name,
        snapshot.template,
        JSON.stringify(snapshot.modules_config),
        JSON.stringify(snapshot.modules_order),
        JSON.stringify(snapshot.content),
        resumeId,
        userId,
        expectedRevision,
      ],
    )
    if (!updated.rows[0]) throw new ResumeVersionConflictError()

    // The restore version records the resulting state at its new revision;
    // it never reuses the historical revision selected by the user.
    await insertSnapshot(database, updated.rows[0], 'restore')
    return updated.rows[0]
  })
}
