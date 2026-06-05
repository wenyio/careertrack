/**
 * 管理员注册码管理
 *
 * POST /api/admin/registration-codes — 生成注册码
 * GET  /api/admin/registration-codes — 查询注册码列表
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { query } from '@/lib/db'
import { generateRegistrationCode, hashRegistrationCode } from '@/lib/registration-code'
import type { RegistrationCode } from '@/types/admin'

/**
 * 生成注册码
 *
 * 必须管理员登录。
 * 生成高熵随机码，数据库只存 hash，明文仅在响应中返回一次。
 */
export async function POST(request: Request) {
  return withAdminAuth(request, async (admin) => {
    const body = await request.json().catch(() => ({}))
    const { label, expires_at } = body as { label?: string; expires_at?: string }

    // 生成注册码
    const code = generateRegistrationCode()
    const codeHash = hashRegistrationCode(code)

    // 写入数据库
    const result = await query(
      `INSERT INTO registration_codes (code_hash, label, created_by, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, label, created_by, expires_at, created_at`,
      [codeHash, label || null, admin.id, expires_at || null]
    )

    const record = result.rows[0]

    return success({
      id: record.id,
      code, // 明文仅此一次返回
      label: record.label,
      created_by: record.created_by,
      expires_at: record.expires_at,
      created_at: record.created_at,
    }, 201)
  })
}

/**
 * 查询注册码列表
 *
 * 仅管理员可查询。
 * 支持按状态筛选：unused、used、disabled、expired。
 * 不返回明文注册码。
 */
export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'all'

    let sql = `
      SELECT id, label, created_by, used_by_user_id, expires_at, disabled_at, used_at, created_at, updated_at
      FROM registration_codes
    `
    const conditions: string[] = []

    if (status === 'unused') {
      conditions.push('used_at IS NULL AND disabled_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())')
    } else if (status === 'used') {
      conditions.push('used_at IS NOT NULL')
    } else if (status === 'disabled') {
      conditions.push('disabled_at IS NOT NULL')
    } else if (status === 'expired') {
      conditions.push('expires_at IS NOT NULL AND expires_at <= NOW() AND used_at IS NULL')
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`
    }

    sql += ' ORDER BY created_at DESC'

    const result = await query(sql, [])

    return success(result.rows as RegistrationCode[])
  })
}
