/**
 * 个人信息 Service
 *
 * 供 REST API 和 MCP 共用的业务逻辑层
 */

import { query } from '@/lib/db'
import { randomBytes } from 'node:crypto'
import type { Profile } from '@/types/profile'

/** 个人信息中的数组字段 */
export type ProfileArrayField =
  | 'education' | 'skills' | 'work_experience' | 'projects'
  | 'portfolio' | 'awards' | 'other_experience' | 'research'

/** 获取个人信息（不存在则自动创建空 Profile） */
export async function getProfile(userId: string): Promise<Profile> {
  let result = await query(
    'SELECT * FROM profiles WHERE user_id = $1',
    [userId]
  )

  if (result.rows.length === 0) {
    await query(
      'INSERT INTO profiles (user_id) VALUES ($1)',
      [userId]
    )
    result = await query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [userId]
    )
  }

  return result.rows[0] as unknown as Profile
}

/** 获取指定用户的个人信息（不自动创建，不存在返回 null，管理员用） */
export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const result = await query(
    'SELECT * FROM profiles WHERE user_id = $1',
    [userId]
  )
  return (result.rows[0] as unknown as Profile) || null
}

/** 更新个人信息（局部更新，仅覆盖传入的字段） */
export async function updateProfile(
  userId: string,
  updates: Record<string, unknown>
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
    return getProfile(userId)
  }

  setClauses.push('updated_at = NOW()')
  values.push(userId)

  const sql = `
    UPDATE profiles
    SET ${setClauses.join(', ')}
    WHERE user_id = $${paramIndex}
    RETURNING *
  `

  const result = await query(sql, values)

  if (result.rows.length === 0) {
    throw new Error('个人信息不存在')
  }

  return result.rows[0] as unknown as Profile
}

/** 向数组字段添加新条目（自动生成 id） */
export async function addProfileEntry(
  userId: string,
  field: ProfileArrayField,
  entry: Record<string, unknown>
): Promise<Profile> {
  const profile = await getProfile(userId)
  const entries = ((profile as unknown as Record<string, unknown>)[field] as Record<string, unknown>[]) || []

  const newEntry = { id: generateId(), ...entry }
  const updated = [...entries, newEntry]

  return updateProfile(userId, { [field]: updated })
}

/** 更新数组字段中的某个条目（按 id 匹配，局部 merge） */
export async function updateProfileEntry(
  userId: string,
  field: ProfileArrayField,
  entryId: string,
  updates: Record<string, unknown>
): Promise<Profile> {
  const profile = await getProfile(userId)
  const entries = ((profile as unknown as Record<string, unknown>)[field] as Record<string, unknown>[]) || []

  const index = entries.findIndex((e) => e.id === entryId)
  if (index === -1) {
    throw new Error(`未找到 ${field} 中 id 为 ${entryId} 的条目`)
  }

  const updatedEntries = [...entries]
  updatedEntries[index] = { ...updatedEntries[index], ...updates }

  return updateProfile(userId, { [field]: updatedEntries })
}

/** 删除数组字段中的某个条目（按 id 匹配） */
export async function deleteProfileEntry(
  userId: string,
  field: ProfileArrayField,
  entryId: string
): Promise<Profile> {
  const profile = await getProfile(userId)
  const entries = ((profile as unknown as Record<string, unknown>)[field] as Record<string, unknown>[]) || []

  const filtered = entries.filter((e) => e.id !== entryId)
  if (filtered.length === entries.length) {
    throw new Error(`未找到 ${field} 中 id 为 ${entryId} 的条目`)
  }

  return updateProfile(userId, { [field]: filtered })
}

/** 生成短 ID */
function generateId(): string {
  return randomBytes(8).toString('hex')
}
