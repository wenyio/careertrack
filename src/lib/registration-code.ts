/**
 * 注册码工具
 *
 * 生成、哈希、校验一次性注册码
 */

import { createHash, randomBytes } from 'crypto'
import { query } from '@/lib/db'

/**
 * 生成高熵随机注册码
 *
 * 格式：8 组 4 字符，用连字符分隔（如 ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ01-2345）
 * 总长度 39 字符，熵值约 128 bit
 */
export function generateRegistrationCode(): string {
  const bytes = randomBytes(16)
  const hex = bytes.toString('hex').toUpperCase() // 32 hex chars
  // 分成 8 组，每组 4 字符
  return [
    hex.slice(0, 4),
    hex.slice(4, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 24),
    hex.slice(24, 28),
    hex.slice(28, 32),
  ].join('-')
}

/**
 * 对注册码进行 sha256 哈希
 *
 * 输入先 trim 并转小写再哈希
 */
export function hashRegistrationCode(code: string): string {
  const normalized = code.trim().toLowerCase()
  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * 校验注册码
 *
 * 检查：hash 匹配、未过期、未禁用、未使用
 *
 * @returns 校验通过返回注册码记录，否则返回 null
 */
export async function validateRegistrationCode(code: string): Promise<Record<string, unknown> | null> {
  const codeHash = hashRegistrationCode(code)

  const result = await query(
    `SELECT * FROM registration_codes
     WHERE code_hash = $1
       AND (expires_at IS NULL OR expires_at > NOW())
       AND disabled_at IS NULL
       AND used_at IS NULL`,
    [codeHash]
  )

  return result.rows[0] || null
}

/**
 * 标记注册码为已使用
 */
export async function markRegistrationCodeUsed(codeId: string, userId: string): Promise<void> {
  await query(
    `UPDATE registration_codes
     SET used_by_user_id = $1, used_at = NOW(), updated_at = NOW()
     WHERE id = $2`,
    [userId, codeId]
  )
}
