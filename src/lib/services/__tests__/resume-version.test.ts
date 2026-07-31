import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { transaction } from '@/lib/storage/sqlite'
import {
  AUTO_VERSION_RETENTION,
  AUTO_VERSION_WINDOW_MS,
  createAutoResumeVersion,
  createManualResumeVersion,
  getResumeVersion,
  listResumeVersions,
  MANUAL_VERSION_LIMIT,
  restoreResumeVersion,
  ResumeVersionConflictError,
  ResumeVersionLimitError,
} from '@/lib/services/resume-version'

let directory: string
let previousDatabasePath: string | undefined
const userId = '00000000-0000-4000-8000-000000000001'
const otherUserId = '00000000-0000-4000-8000-000000000002'
const resumeId = '00000000-0000-4000-8000-000000000010'

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), 'careertrack-resume-versions-'))
  previousDatabasePath = process.env.SQLITE_DB_PATH
  process.env.SQLITE_DB_PATH = join(directory, 'versions.db')
  await transaction(async (database) => {
    await database('INSERT INTO users (id, username, auth_provider) VALUES ($1, $2, $3)', [userId, 'version-owner', 1])
    await database('INSERT INTO users (id, username, auth_provider) VALUES ($1, $2, $3)', [otherUserId, 'version-other', 1])
    await database(
      `INSERT INTO resumes (id, user_id, name, content, revision)
       VALUES ($1, $2, $3, $4, $5)`,
      [resumeId, userId, '初始简历', JSON.stringify({ summary: '版本一' }), 1],
    )
  })
})

afterEach(() => {
  if (previousDatabasePath === undefined) delete process.env.SQLITE_DB_PATH
  else process.env.SQLITE_DB_PATH = previousDatabasePath
  rmSync(directory, { recursive: true, force: true })
})

describe('resume version service', () => {
  it('enforces ownership, returns metadata without snapshot, and creates manual versions idempotently', async () => {
    await expect(createManualResumeVersion(resumeId, otherUserId)).rejects.toThrow('简历不存在')
    const first = await createManualResumeVersion(resumeId, userId, '投递前')
    const repeated = await createManualResumeVersion(resumeId, userId, 'ignored')
    expect(repeated.id).toBe(first.id)

    const versions = await listResumeVersions(resumeId)
    expect(versions.items).toHaveLength(1)
    expect(versions.items[0]).not.toHaveProperty('snapshot')
    const detail = await getResumeVersion(resumeId, first.id)
    expect(detail?.snapshot).toMatchObject({ name: '初始简历', content: { summary: '版本一' } })
  })

  it('coalesces automatic checkpoints within ten minutes and retains only recent automatic snapshots', async () => {
    await expect(createAutoResumeVersion(resumeId, userId)).resolves.toBeTruthy()
    await transaction((database) => database(
      'UPDATE resumes SET revision = revision + 1 WHERE id = $1', [resumeId],
    ))
    const start = Date.now()
    await expect(createAutoResumeVersion(resumeId, userId, start + 1)).resolves.toBeNull()

    for (let index = 0; index < AUTO_VERSION_RETENTION + 2; index++) {
      await transaction((database) => database(
        'UPDATE resumes SET revision = revision + 1 WHERE id = $1', [resumeId],
      ))
      await createAutoResumeVersion(
        resumeId,
        userId,
        start + AUTO_VERSION_WINDOW_MS * (index + 2),
      )
    }
    const result = await transaction((database) => database<{ total: number; source: string }>(
      `SELECT COUNT(*)::int AS total, source FROM resume_versions
       WHERE resume_id = $1 AND source = 'auto' GROUP BY source`,
      [resumeId],
    ))
    expect(result.rows[0].total).toBe(AUTO_VERSION_RETENTION)
  })

  it('limits manual versions without deleting restore or automatic records', async () => {
    await transaction(async (database) => {
      for (let revision = 1; revision <= MANUAL_VERSION_LIMIT; revision++) {
        await database(
      `INSERT INTO resume_versions (resume_id, revision, source, snapshot)
           VALUES ($1, $2, 'manual', $3)`,
          [resumeId, revision, JSON.stringify({ name: 'x', template: 'classic', modules_config: {}, modules_order: [], content: {} })],
        )
      }
      await database(
        `INSERT INTO resume_versions (resume_id, revision, source, snapshot)
         VALUES ($1, $2, 'restore', $3)`,
        [resumeId, 200, JSON.stringify({ name: 'x', template: 'classic', modules_config: {}, modules_order: [], content: {} })],
      )
      await database('UPDATE resumes SET revision = $1 WHERE id = $2', [MANUAL_VERSION_LIMIT + 1, resumeId])
    })
    await expect(createManualResumeVersion(resumeId, userId)).rejects.toBeInstanceOf(ResumeVersionLimitError)
    const restoreRows = await transaction((database) => database(
      "SELECT id FROM resume_versions WHERE resume_id = $1 AND source = 'restore'", [resumeId],
    ))
    expect(restoreRows.rows).toHaveLength(1)
  })

  it('restores atomically with a higher revision and rejects stale expected revisions', async () => {
    const version = await createManualResumeVersion(resumeId, userId)
    await transaction((database) => database(
      "UPDATE resumes SET content = $1, revision = 2 WHERE id = $2",
      [JSON.stringify({ summary: '版本二' }), resumeId],
    ))
    const restored = await restoreResumeVersion(resumeId, version.id, userId, 2)
    expect(restored.revision).toBe(3)
    expect(restored.content).toEqual({ summary: '版本一' })

    await expect(restoreResumeVersion(resumeId, version.id, userId, 2))
      .rejects.toBeInstanceOf(ResumeVersionConflictError)
    const restoreRows = await transaction((database) => database<{ revision: number }>(
      "SELECT revision FROM resume_versions WHERE resume_id = $1 AND source = 'restore'",
      [resumeId],
    ))
    expect(restoreRows.rows.map((row) => row.revision)).toEqual([3])
  })

  it('rolls back the resume update when recording the restore snapshot fails', async () => {
    const version = await createManualResumeVersion(resumeId, userId)
    await transaction(async (database) => {
      await database(
        "UPDATE resumes SET content = $1, revision = 2 WHERE id = $2",
        [JSON.stringify({ summary: '恢复前内容' }), resumeId],
      )
      // The restore snapshot is written after the resume row. This trigger
      // proves both writes share one transaction rather than leaving a partial restore.
      await database(
        `CREATE TRIGGER fail_restore_snapshot
         BEFORE INSERT ON resume_versions
         WHEN NEW.source = 'restore'
         BEGIN SELECT RAISE(ABORT, 'forced restore snapshot failure'); END`,
      )
    })

    await expect(restoreResumeVersion(resumeId, version.id, userId, 2))
      .rejects.toThrow('forced restore snapshot failure')
    const current = await transaction((database) => database<{ revision: number; content: unknown }>(
      'SELECT revision, content FROM resumes WHERE id = $1', [resumeId],
    ))
    expect(current.rows[0]).toMatchObject({ revision: 2, content: { summary: '恢复前内容' } })
  })
})
