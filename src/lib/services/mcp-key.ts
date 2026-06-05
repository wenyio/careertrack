/**
 * MCP Key Service
 *
 * 管理 MCP API Key 的生成、查询、撤销
 * Key 格式：ct_mcp_<random>，只在创建时返回一次明文
 * 数据库存储：sha256 hash、prefix（前12字符）、scope、last_used_at、revoked_at
 */

import { query } from '@/lib/db'
import { createHash, randomBytes } from 'node:crypto'

/** MCP Key 数据库记录 */
interface McpKeyRecord {
  id: string
  user_id: string
  prefix: string
  hash: string
  scope: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

/** MCP Key 创建结果（含明文 secret） */
interface McpKeyCreated extends McpKeyRecord {
  secret: string
}

/** MCP Key 列表项（不含 hash 和 secret） */
interface McpKeyInfo {
  id: string
  prefix: string
  scope: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

const KEY_PREFIX = 'ct_mcp_'
const KEY_BYTES = 32

/** 生成 MCP Key */
function generateKey(): string {
  return KEY_PREFIX + randomBytes(KEY_BYTES).toString('hex')
}

/** 计算 Key 的 SHA-256 hash */
function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/** 创建 MCP Key，返回明文 secret（仅此一次） */
export async function createMcpKey(
  userId: string,
  scope = 'read_write'
): Promise<McpKeyCreated> {
  const secret = generateKey()
  const hash = hashKey(secret)
  const prefix = secret.slice(0, 12)

  const result = await query(
    `INSERT INTO mcp_keys (user_id, prefix, hash, scope)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, prefix, hash, scope]
  )

  return { ...(result.rows[0] as unknown as McpKeyRecord), secret }
}

/** 列出用户的所有 MCP Key（不含 hash） */
export async function listMcpKeys(userId: string): Promise<McpKeyInfo[]> {
  const result = await query(
    `SELECT id, prefix, scope, created_at, last_used_at, revoked_at
     FROM mcp_keys
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  )
  return result.rows as unknown as McpKeyInfo[]
}

/** 通过明文 secret 查找并验证 Key */
export async function verifyMcpKey(secret: string): Promise<McpKeyRecord | null> {
  const hash = hashKey(secret)

  const result = await query(
    `SELECT * FROM mcp_keys
     WHERE hash = $1 AND revoked_at IS NULL`,
    [hash]
  )

  if (result.rows.length === 0) return null

  const record = result.rows[0] as unknown as McpKeyRecord

  // 更新 last_used_at（fire-and-forget）
  query(
    `UPDATE mcp_keys SET last_used_at = NOW() WHERE id = $1`,
    [record.id]
  ).catch(() => { /* ignore */ })

  return record
}

/** 撤销 MCP Key */
export async function revokeMcpKey(keyId: string, userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE mcp_keys
     SET revoked_at = NOW()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [keyId, userId]
  )
  return (result.rowCount ?? 0) > 0
}

/** 删除 MCP Key（物理删除） */
export async function deleteMcpKey(keyId: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM mcp_keys WHERE id = $1 AND user_id = $2',
    [keyId, userId]
  )
  return (result.rowCount ?? 0) > 0
}
