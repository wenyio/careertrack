/**
 * 管理员 Service
 *
 * 管理员专用的数据库操作，跨表查询、无 user_id 限制。
 * 供 REST API 管理后台路由调用。
 */

import { query } from '@/lib/db'

/** 用户角色类型 */
export type UserRole = 'user' | 'admin'

// ============ 简历管理 ============

/** 管理员简历列表（可选搜索、公开状态过滤） */
export async function listAdminResumes(opts: {
  q?: string
  pub?: 'all' | 'true' | 'false'
  userId?: string
}) {
  let sql = `
    SELECT r.id, r.name, r.user_id, u.username, r.is_public, r.public_slug,
      r.template, r.created_at, r.updated_at
    FROM resumes r
    JOIN users u ON r.user_id = u.id
  `
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (opts.userId) {
    conditions.push(`r.user_id = $${paramIndex}`)
    params.push(opts.userId)
    paramIndex++
  }

  if (opts.q) {
    conditions.push(`(r.name ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex} OR r.public_slug ILIKE $${paramIndex})`)
    params.push(`%${opts.q}%`)
    paramIndex++
  }

  if (opts.pub === 'true') {
    conditions.push(`r.is_public = true`)
  } else if (opts.pub === 'false') {
    conditions.push(`r.is_public = false`)
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`
  }

  sql += ` ORDER BY r.updated_at DESC`

  const result = await query(sql, params)
  return result.rows
}

/** 管理员简历详情（含用户名） */
export async function getAdminResume(id: string) {
  const result = await query(
    `SELECT r.id, r.user_id, u.username, r.name, r.modules_config, r.modules_order,
      r.content, r.template, r.is_public, r.public_slug, r.created_at, r.updated_at
    FROM resumes r
    JOIN users u ON r.user_id = u.id
    WHERE r.id = $1`,
    [id]
  )
  return result.rows[0] || null
}

/** 管理员删除简历（无 user_id 限制） */
export async function deleteAdminResume(id: string) {
  const result = await query(
    'DELETE FROM resumes WHERE id = $1 RETURNING id, name',
    [id]
  )
  return result.rows[0] || null
}

/** 管理员批量删除简历 */
export async function batchDeleteAdminResumes(ids: string[]) {
  const result = await query(
    'DELETE FROM resumes WHERE id = ANY($1) RETURNING id, name',
    [ids]
  )
  return result.rows
}

// ============ 用户管理 ============

/** 管理员用户列表（含简历计数） */
export async function listAdminUsers(opts: { q?: string }) {
  let sql = `
    SELECT u.id, u.username, u.role, u.otp_enabled, u.auth_provider, u.disabled_at,
      u.created_at, u.updated_at,
      COALESCE(r.cnt, 0)::int AS resume_count
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS cnt
      FROM resumes
      GROUP BY user_id
    ) r ON r.user_id = u.id
  `
  const params: unknown[] = []

  if (opts.q) {
    sql += ` WHERE u.username ILIKE $1`
    params.push(`%${opts.q}%`)
  }

  sql += ` ORDER BY u.created_at DESC`

  const result = await query(sql, params)
  return result.rows
}

/** 管理员用户详情 */
export async function getAdminUser(id: string) {
  const result = await query(
    'SELECT id, username, role, otp_enabled, auth_provider, disabled_at, created_at, updated_at FROM users WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

/** 管理员删除用户 */
export async function deleteUser(id: string) {
  const result = await query(
    'DELETE FROM users WHERE id = $1 RETURNING id, username',
    [id]
  )
  return result.rows[0] || null
}

/** 修改用户角色 */
export async function updateUserRole(id: string, role: UserRole) {
  const result = await query(
    'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, role',
    [role, id]
  )
  return result.rows[0] || null
}

/** 批量删除用户 */
export async function batchDeleteUsers(ids: string[]) {
  const result = await query(
    'DELETE FROM users WHERE id = ANY($1) RETURNING id, username',
    [ids]
  )
  return result.rows
}

/** 批量修改用户角色 */
export async function batchUpdateUserRole(ids: string[], role: UserRole) {
  const result = await query(
    'UPDATE users SET role = $1, updated_at = NOW() WHERE id = ANY($2) RETURNING id, username, role',
    [role, ids]
  )
  return result.rows
}

// ============ OAuth 绑定管理 ============

/** 查询指定用户的 OAuth 绑定列表（不含敏感字段） */
export async function getAdminUserOAuthAccounts(userId: string) {
  const result = await query(
    `SELECT id, provider, provider_username, email, avatar_url, created_at
     FROM user_oauth_accounts
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  )
  return result.rows
}

/** 根据 ID 获取单条 OAuth 绑定记录 */
export async function getAdminUserOAuthAccountById(oauthAccountId: string) {
  const result = await query(
    'SELECT id, user_id, provider FROM user_oauth_accounts WHERE id = $1',
    [oauthAccountId]
  )
  return result.rows[0] || null
}

/** 删除 OAuth 绑定记录 */
export async function deleteAdminUserOAuthAccount(oauthAccountId: string) {
  const result = await query(
    'DELETE FROM user_oauth_accounts WHERE id = $1 RETURNING id',
    [oauthAccountId]
  )
  return result.rows[0] || null
}

// ============ 注册码管理（状态变更） ============

/** 禁用注册码 */
export async function disableRegistrationCode(id: string) {
  const result = await query(
    `UPDATE registration_codes
     SET disabled_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING id, label, created_by, used_by_user_id, expires_at, disabled_at, used_at, created_at, updated_at`,
    [id]
  )
  return result.rows[0] || null
}

/** 启用注册码（仅限未使用的） */
export async function enableRegistrationCode(id: string) {
  const result = await query(
    `UPDATE registration_codes
     SET disabled_at = NULL, updated_at = NOW()
     WHERE id = $1 AND used_at IS NULL
     RETURNING id, label, created_by, used_by_user_id, expires_at, disabled_at, used_at, created_at, updated_at`,
    [id]
  )
  return result.rows[0] || null
}

/** 删除注册码（仅限未使用的） */
export async function deleteRegistrationCode(id: string) {
  const result = await query(
    'DELETE FROM registration_codes WHERE id = $1 AND used_at IS NULL RETURNING id',
    [id]
  )
  return result.rows[0] || null
}

/** 获取单个注册码详情 */
export async function getRegistrationCodeById(id: string) {
  const result = await query(
    `SELECT id, label, created_by, used_by_user_id, expires_at, disabled_at, used_at, created_at, updated_at
     FROM registration_codes WHERE id = $1`,
    [id]
  )
  return result.rows[0] || null
}

// ============ 统计 ============

/** 管理员概览统计 */
export async function getAdminStats() {
  const [userStats, resumeStats, recentUsers, recentResumes] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total_users, COUNT(*) FILTER (WHERE role = 'admin')::int AS admin_count FROM users`),
    query(`SELECT COUNT(*)::int AS total_resumes, COUNT(*) FILTER (WHERE is_public = true)::int AS public_resumes FROM resumes`),
    query(`SELECT id, username, role, created_at FROM users ORDER BY created_at DESC LIMIT 10`),
    query(`SELECT r.id, r.name, r.user_id, u.username, r.is_public, r.updated_at FROM resumes r JOIN users u ON r.user_id = u.id ORDER BY r.updated_at DESC LIMIT 10`),
  ])

  return {
    total_users: userStats.rows[0].total_users,
    admin_count: userStats.rows[0].admin_count,
    total_resumes: resumeStats.rows[0].total_resumes,
    public_resumes: resumeStats.rows[0].public_resumes,
    recent_users: recentUsers.rows,
    recent_resumes: recentResumes.rows,
  }
}
