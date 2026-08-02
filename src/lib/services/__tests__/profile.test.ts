import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  addProfileEntry,
  addProfileEntryFromResume,
  getProfile,
  patchProfileBasicInfo,
  patchProfileFields,
  replaceProfileEntryFromResume,
  updateProfile,
  updateProfileEntry,
} from '@/lib/services/profile'
import { transaction } from '@/lib/storage/sqlite'
import type { DatabaseQuery } from '@/lib/storage/types'
import type { Profile } from '@/types/profile'

function createProfile(
  entries: Record<string, unknown>[] = [],
  basicInfo: Record<string, unknown> = {},
  overrides: Partial<Profile> = {},
): Profile {
  return {
    id: 'profile-1',
    user_id: 'user-1',
    basic_info: basicInfo as unknown as Profile['basic_info'],
    education: entries,
    skills: [],
    work_experience: [],
    projects: [],
    portfolio: [],
    awards: [],
    other_experience: [],
    research: [],
    self_evaluations: [],
    summary: '',
    created_at: '2026-07-30T00:00:00.000Z',
    updated_at: '2026-07-30T00:00:00.000Z',
    ...overrides,
  }
}

describe('profile service concurrency', () => {
  it('creates a missing profile with an idempotent insert', async () => {
    let profile: Profile | undefined
    let insertSql = ''
    const database: DatabaseQuery = async (sql) => {
      if (sql.startsWith('SELECT')) {
        return { rows: profile ? [profile] : [], rowCount: profile ? 1 : 0 }
      }
      insertSql = sql
      profile = createProfile()
      return { rows: [], rowCount: 1 }
    }

    const result = await getProfile('user-1', database)
    expect(result).toEqual(profile)
    expect(insertSql).toContain('ON CONFLICT(user_id) DO NOTHING')
  })

  it('derives self evaluations from legacy summary when the array is missing', async () => {
    const legacyProfile = createProfile()
    delete (legacyProfile as unknown as Record<string, unknown>).self_evaluations
    legacyProfile.summary = '旧版简介'
    const database: DatabaseQuery = async () => ({
      rows: [legacyProfile],
      rowCount: 1,
    })

    await expect(getProfile('user-1', database)).resolves.toMatchObject({
      self_evaluations: [{
        id: 'legacy-summary',
        title: '默认自我评价',
        description: '旧版简介',
      }],
    })
  })

  it('retries a stale array update and preserves both concurrent additions', async () => {
    let entries: Record<string, unknown>[] = []
    let initialReads = 0
    let releaseInitialReads!: () => void
    const initialReadBarrier = new Promise<void>((resolve) => {
      releaseInitialReads = resolve
    })

    const database: DatabaseQuery = async (sql, params) => {
      if (sql.startsWith('SELECT')) {
        const snapshot = structuredClone(entries)
        initialReads++
        if (initialReads <= 2) {
          if (initialReads === 2) releaseInitialReads()
          await initialReadBarrier
        }
        return { rows: [createProfile(snapshot)], rowCount: 1 }
      }

      const expected = String(params?.[2])
      if (expected !== JSON.stringify(entries)) {
        return { rows: [], rowCount: 0 }
      }
      entries = JSON.parse(String(params?.[0])) as Record<string, unknown>[]
      return { rows: [createProfile(entries)], rowCount: 1 }
    }

    await Promise.all([
      addProfileEntry('user-1', 'education', { school: 'A' }, database),
      addProfileEntry('user-1', 'education', { school: 'B' }, database),
    ])

    expect(entries.map((entry) => entry.school).sort()).toEqual(['A', 'B'])
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(2)
  })

  it('merges an entry update onto the latest value after a conflict', async () => {
    let entries = [{ id: 'entry-1', school: 'Old', city: 'Shanghai' }]
    let firstUpdate = true
    const database: DatabaseQuery = async (sql, params) => {
      if (sql.startsWith('SELECT')) {
        return { rows: [createProfile(structuredClone(entries))], rowCount: 1 }
      }

      if (firstUpdate) {
        firstUpdate = false
        entries = [{ ...entries[0], city: 'Beijing' }]
        return { rows: [], rowCount: 0 }
      }
      expect(String(params?.[2])).toBe(JSON.stringify(entries))
      entries = JSON.parse(String(params?.[0])) as typeof entries
      return { rows: [createProfile(entries)], rowCount: 1 }
    }

    await updateProfileEntry(
      'user-1',
      'education',
      'entry-1',
      { school: 'New' },
      database,
    )

    expect(entries).toEqual([{
      id: 'entry-1',
      school: 'New',
      city: 'Beijing',
    }])
  })

  it('adds a resume entry with a new profile id and without resume-only fields', async () => {
    let entries: Record<string, unknown>[] = []
    const database: DatabaseQuery = async (sql, params) => {
      if (sql.startsWith('SELECT')) {
        return { rows: [createProfile(structuredClone(entries))], rowCount: 1 }
      }

      entries = JSON.parse(String(params?.[0])) as Record<string, unknown>[]
      return { rows: [createProfile(entries)], rowCount: 1 }
    }

    await addProfileEntryFromResume(
      'user-1',
      'projects',
      {
        id: 'resume-entry-1',
        _hidden_fields: ['city'],
        name: '优化后的项目',
      },
      database,
    )

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ name: '优化后的项目' })
    expect(entries[0].id).not.toBe('resume-entry-1')
    expect(entries[0]).not.toHaveProperty('_hidden_fields')
  })

  it('replaces a target profile entry while preserving the target id', async () => {
    let entries: Record<string, unknown>[] = [{
      id: 'profile-entry-1',
      school: '旧学校',
      city: '旧城市',
    }]
    const database: DatabaseQuery = async (sql, params) => {
      if (sql.startsWith('SELECT')) {
        return { rows: [createProfile(structuredClone(entries))], rowCount: 1 }
      }

      entries = JSON.parse(String(params?.[0])) as typeof entries
      return { rows: [createProfile(entries)], rowCount: 1 }
    }

    await replaceProfileEntryFromResume(
      'user-1',
      'education',
      'profile-entry-1',
      {
        id: 'resume-entry-1',
        school: '新学校',
        _hidden_fields: ['degree'],
      },
      database,
    )

    expect(entries).toEqual([{
      id: 'profile-entry-1',
      school: '新学校',
    }])
  })

  it('syncs self evaluations from resume and refreshes the compatibility summary', async () => {
    let entries: Record<string, unknown>[] = []
    const database: DatabaseQuery = async (sql, params) => {
      if (sql.startsWith('SELECT')) {
        return {
          rows: [createProfile([], {}, { self_evaluations: structuredClone(entries) })],
          rowCount: 1,
        }
      }

      entries = JSON.parse(String(params?.[0])) as Record<string, unknown>[]
      const summary = params?.[3] as string
      return {
        rows: [createProfile([], {}, {
          self_evaluations: entries,
          summary,
        })],
        rowCount: 1,
      }
    }

    const created = await addProfileEntryFromResume(
      'user-1',
      'self_evaluations',
      {
        id: 'resume-summary',
        title: '技术岗位',
        description: '面向技术岗位',
      },
      database,
    )
    expect(created.self_evaluations).toHaveLength(1)
    expect(created.self_evaluations[0]).toMatchObject({
      title: '技术岗位',
      description: '面向技术岗位',
    })
    expect(created.self_evaluations[0].id).not.toBe('resume-summary')
    expect(created.summary).toBe('面向技术岗位')

    const targetId = created.self_evaluations[0].id
    const replaced = await replaceProfileEntryFromResume(
      'user-1',
      'self_evaluations',
      targetId,
      {
        title: '产品岗位',
        description: '面向产品岗位',
      },
      database,
    )

    expect(replaced.self_evaluations).toEqual([{
      id: targetId,
      title: '产品岗位',
      description: '面向产品岗位',
    }])
    expect(replaced.summary).toBe('面向产品岗位')
  })

  it('retries a nested basic-info patch without losing a concurrent field', async () => {
    let basicInfo: Record<string, unknown> = {
      name: 'Old',
      job_intention: { position: 'Engineer', expected_city: 'Shanghai' },
    }
    let firstUpdate = true
    const database: DatabaseQuery = async (sql, params) => {
      if (sql.startsWith('SELECT')) {
        return {
          rows: [createProfile([], structuredClone(basicInfo))],
          rowCount: 1,
        }
      }

      if (firstUpdate) {
        firstUpdate = false
        basicInfo = { ...basicInfo, phone: '13800000000' }
        return { rows: [], rowCount: 0 }
      }
      expect(String(params?.[2])).toBe(JSON.stringify(basicInfo))
      basicInfo = JSON.parse(String(params?.[0])) as Record<string, unknown>
      return { rows: [createProfile([], basicInfo)], rowCount: 1 }
    }

    await patchProfileBasicInfo(
      'user-1',
      { job_intention: { expected_city: 'Beijing' } },
      database,
    )

    expect(basicInfo).toEqual({
      name: 'Old',
      phone: '13800000000',
      job_intention: { position: 'Engineer', expected_city: 'Beijing' },
    })
  })
})

describe('profile service SQLite dialect', () => {
  it('executes idempotent creation and JSON compare-and-swap SQL', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'careertrack-profile-'))
    const previousDatabasePath = process.env.SQLITE_DB_PATH
    process.env.SQLITE_DB_PATH = join(directory, 'profile.db')

    try {
      await transaction(async (database) => {
        await database(
          `INSERT INTO users (id, username, password_hash, auth_provider)
           VALUES ($1, $2, $3, $4)`,
          ['user-1', 'profile-service-test', 'unused', 1],
        )

        await expect(getProfile('user-1', database)).resolves.toMatchObject({
          user_id: 'user-1',
        })
        await expect(patchProfileBasicInfo(
          'user-1',
          { name: 'SQLite 用户' },
          database,
        )).resolves.toMatchObject({
          basic_info: { name: 'SQLite 用户' },
        })
        await expect(patchProfileFields(
          'user-1',
          {
            basic_info: { phone: '13800000000' },
            summary: '一次条件写入',
          },
          database,
        )).resolves.toMatchObject({
          basic_info: {
            name: 'SQLite 用户',
            phone: '13800000000',
          },
          summary: '一次条件写入',
        })
        await expect(updateProfile(
          'user-1',
          {
            self_evaluations: [
              { id: 'eval-1', title: '技术岗位', description: '面向技术岗位' },
              { id: 'eval-2', title: '产品岗位', description: '面向产品岗位' },
            ],
          },
          database,
        )).resolves.toMatchObject({
          self_evaluations: [
            { id: 'eval-1', title: '技术岗位', description: '面向技术岗位' },
            { id: 'eval-2', title: '产品岗位', description: '面向产品岗位' },
          ],
          summary: '面向技术岗位',
        })
        await expect(addProfileEntry(
          'user-1',
          'education',
          { school: 'SQLite 大学' },
          database,
        )).resolves.toMatchObject({
          education: [expect.objectContaining({ school: 'SQLite 大学' })],
        })
        const createdEvaluation = await addProfileEntryFromResume(
          'user-1',
          'self_evaluations',
          { title: 'SQLite 自我评价', description: '第一版' },
          database,
        )
        const evaluationId = createdEvaluation.self_evaluations[0].id
        expect(createdEvaluation.summary).toBe('面向技术岗位')
        const replacedEvaluation = await replaceProfileEntryFromResume(
          'user-1',
          'self_evaluations',
          evaluationId,
          { title: 'SQLite 自我评价', description: '第二版' },
          database,
        )
        expect(replacedEvaluation.self_evaluations[0]).toMatchObject({
          id: evaluationId,
          title: 'SQLite 自我评价',
          description: '第二版',
        })
        expect(replacedEvaluation.self_evaluations).toHaveLength(3)
        expect(replacedEvaluation.summary).toBe('第二版')
      })
    } finally {
      if (previousDatabasePath === undefined) {
        delete process.env.SQLITE_DB_PATH
      } else {
        process.env.SQLITE_DB_PATH = previousDatabasePath
      }
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
