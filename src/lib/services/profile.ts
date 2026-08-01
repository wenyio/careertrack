/**
 * 个人信息 Service
 *
 * 供 REST API 和 MCP 共用的业务逻辑层
 */

import { query } from '@/lib/db'
import { randomBytes } from 'node:crypto'
import type { DatabaseQuery } from '@/lib/storage/types'
import type { Profile, ProfileArrayField } from '@/types/profile'

export type { ProfileArrayField } from '@/types/profile'

type ProfileJsonField = 'basic_info' | ProfileArrayField

const MAX_JSON_FIELD_UPDATE_ATTEMPTS = 3

/** 获取个人信息（不存在则自动创建空 Profile） */
export async function getProfile(
  userId: string,
  database: DatabaseQuery = query,
): Promise<Profile> {
  let result = await database(
    'SELECT * FROM profiles WHERE user_id = $1',
    [userId]
  )

  if (result.rows.length === 0) {
    // 注册和 OAuth normally 已创建 profile；ON CONFLICT 只处理历史数据或并发首次访问。
    await database(
      'INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT(user_id) DO NOTHING',
      [userId]
    )
    result = await database(
      'SELECT * FROM profiles WHERE user_id = $1',
      [userId]
    )
  }

  if (result.rows.length === 0) {
    throw new Error('个人信息创建失败')
  }

  return result.rows[0] as unknown as Profile
}

/** 获取指定用户的个人信息（不自动创建，不存在返回 null，管理员用） */
export async function getProfileByUserId(
  userId: string,
  database: DatabaseQuery = query,
): Promise<Profile | null> {
  const result = await database(
    'SELECT * FROM profiles WHERE user_id = $1',
    [userId]
  )
  return (result.rows[0] as unknown as Profile) || null
}

/** 更新个人信息（局部更新，仅覆盖传入的字段） */
export async function updateProfile(
  userId: string,
  updates: Record<string, unknown>,
  database: DatabaseQuery = query,
): Promise<Profile> {
  const fields = [
    'basic_info', 'education', 'skills', 'work_experience',
    'projects', 'portfolio', 'awards', 'other_experience',
    'research', 'summary',
  ]

  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  for (const field of fields) {
    if (updates[field] !== undefined) {
      setClauses.push(`${field} = $${paramIndex}`)
      values.push(
        typeof updates[field] === 'object'
          ? JSON.stringify(updates[field])
          : updates[field]
      )
      paramIndex++
    }
  }

  if (setClauses.length === 0) {
    return getProfile(userId, database)
  }

  setClauses.push('updated_at = NOW()')
  values.push(userId)

  const sql = `
    UPDATE profiles
    SET ${setClauses.join(', ')}
    WHERE user_id = $${paramIndex}
    RETURNING *
  `

  const result = await database(sql, values)

  if (result.rows.length === 0) {
    throw new Error('个人信息不存在')
  }

  return result.rows[0] as unknown as Profile
}

/** 深度合并基本信息，并在并发写入时基于最新值重试。 */
export function patchProfileBasicInfo(
  userId: string,
  updates: Record<string, unknown>,
  database: DatabaseQuery = query,
): Promise<Profile> {
  return mutateJsonProfileField<Record<string, unknown>>(
    userId,
    'basic_info',
    {},
    (current) => deepMergeRecords(current, updates),
    database,
  )
}

/** MCP 的基本信息与简介 patch 保持为一次条件写入。 */
export function patchProfileFields(
  userId: string,
  updates: {
    basic_info?: Record<string, unknown>
    summary?: string
  },
  database: DatabaseQuery = query,
): Promise<Profile> {
  if (!updates.basic_info) {
    return updateProfile(
      userId,
      updates.summary === undefined ? {} : { summary: updates.summary },
      database,
    )
  }

  return mutateJsonProfileField<Record<string, unknown>>(
    userId,
    'basic_info',
    {},
    (current) => deepMergeRecords(current, updates.basic_info!),
    database,
    updates.summary,
  )
}

/** 向数组字段添加新条目（自动生成 id） */
export async function addProfileEntry(
  userId: string,
  field: ProfileArrayField,
  entry: Record<string, unknown>,
  database: DatabaseQuery = query,
): Promise<Profile> {
  const newEntry = { ...entry, id: generateId() }
  return mutateJsonProfileField<Record<string, unknown>[]>(
    userId,
    field,
    [],
    (entries) => [...entries, newEntry],
    database,
  )
}

/** 从简历条目同步新增到个人信息：丢弃简历条目 id 与展示专属字段。 */
export async function addProfileEntryFromResume(
  userId: string,
  field: ProfileArrayField,
  entry: Record<string, unknown>,
  database: DatabaseQuery = query,
): Promise<Profile> {
  return addProfileEntry(userId, field, sanitizeResumeEntryForProfile(entry), database)
}

/** 更新数组字段中的某个条目（按 id 匹配，局部 merge） */
export async function updateProfileEntry(
  userId: string,
  field: ProfileArrayField,
  entryId: string,
  updates: Record<string, unknown>,
  database: DatabaseQuery = query,
): Promise<Profile> {
  return mutateJsonProfileField<Record<string, unknown>[]>(
    userId,
    field,
    [],
    (entries) => {
      const index = entries.findIndex((item) => item.id === entryId)
      if (index === -1) {
        throw new Error(`未找到 ${field} 中 id 为 ${entryId} 的条目`)
      }

      const updatedEntries = [...entries]
      updatedEntries[index] = { ...updatedEntries[index], ...updates }
      return updatedEntries
    },
    database,
  )
}

/** 使用简历条目覆盖个人信息中的指定条目：保留 profile 条目 id。 */
export async function replaceProfileEntryFromResume(
  userId: string,
  field: ProfileArrayField,
  entryId: string,
  entry: Record<string, unknown>,
  database: DatabaseQuery = query,
): Promise<Profile> {
  return mutateJsonProfileField<Record<string, unknown>[]>(
    userId,
    field,
    [],
    (entries) => {
      const index = entries.findIndex((item) => item.id === entryId)
      if (index === -1) {
        throw new Error(`未找到 ${field} 中 id 为 ${entryId} 的条目`)
      }

      const updatedEntries = [...entries]
      updatedEntries[index] = {
        ...sanitizeResumeEntryForProfile(entry),
        id: entryId,
      }
      return updatedEntries
    },
    database,
  )
}

/** 删除数组字段中的某个条目（按 id 匹配） */
export async function deleteProfileEntry(
  userId: string,
  field: ProfileArrayField,
  entryId: string,
  database: DatabaseQuery = query,
): Promise<Profile> {
  return mutateJsonProfileField<Record<string, unknown>[]>(
    userId,
    field,
    [],
    (entries) => {
      const filtered = entries.filter((item) => item.id !== entryId)
      if (filtered.length === entries.length) {
        throw new Error(`未找到 ${field} 中 id 为 ${entryId} 的条目`)
      }
      return filtered
    },
    database,
  )
}

function sanitizeResumeEntryForProfile(entry: Record<string, unknown>): Record<string, unknown> {
  const { id: _, _hidden_fields: __, ...rest } = entry // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest
}

/**
 * 对 JSON 字段执行乐观条件更新。
 *
 * REST 会整体保存表单，而 MCP 只修改单个条目。后者若直接“读取再覆盖”，并发添加
 * 或修改会互相丢失；比较旧 JSON 后更新可以同时兼容 SQLite 和 PostgreSQL。
 */
async function mutateJsonProfileField<T>(
  userId: string,
  field: ProfileJsonField,
  fallback: T,
  mutate: (current: T) => T,
  database: DatabaseQuery,
  summary?: string,
): Promise<Profile> {
  for (let attempt = 0; attempt < MAX_JSON_FIELD_UPDATE_ATTEMPTS; attempt++) {
    const profile = await getProfile(userId, database)
    const current = (
      (profile as unknown as Record<string, unknown>)[field] as T | undefined
    ) ?? fallback
    const updated = mutate(current)

    const values: unknown[] = [
      JSON.stringify(updated),
      userId,
      JSON.stringify(current),
    ]
    const summaryClause = summary === undefined ? '' : ', summary = $4'
    if (summary !== undefined) values.push(summary)

    const result = await database(
      `UPDATE profiles
       SET ${field} = $1${summaryClause}, updated_at = NOW()
       WHERE user_id = $2 AND ${field} = $3
       RETURNING *`,
      values,
    )

    if (result.rows.length > 0) {
      return result.rows[0] as unknown as Profile
    }
  }

  throw new Error('个人信息正在被并发修改，请重试')
}

function deepMergeRecords(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target }
  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = result[key]
    if (
      sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)
      && targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)
    ) {
      result[key] = deepMergeRecords(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      )
    } else {
      result[key] = sourceValue
    }
  }
  return result
}

/** 生成短 ID */
function generateId(): string {
  return randomBytes(8).toString('hex')
}
