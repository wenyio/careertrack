/**
 * 修改用户名
 *
 * PUT /api/auth/username
 *
 * 校验 username 唯一性和规则。
 * 有 password_hash 的用户需要验证 current_password。
 * 成功后重新签发 JWT，更新 HttpOnly session 并返回 user。
 */

import { withAuth, error, success } from '@/lib/api'
import { query, transaction } from '@/lib/db'
import { verifyPassword } from '@/lib/auth'
import { AUTH_PROVIDER } from '@/constants/auth'
import { setAuthSessionCookie } from '@/lib/security/session'
import {
  issueAuthSession,
  revokeAllAuthSessions,
} from '@/lib/security/auth-session'

export async function PUT(request: Request) {
  return withAuth(request, async (user) => {
    const body = await request.json()
    const { username, current_password } = body

    // 参数验证
    if (!username || typeof username !== 'string') {
      return error('用户名不能为空')
    }

    const trimmed = username.trim()
    if (trimmed.length < 3 || trimmed.length > 50) {
      return error('用户名长度需要 3-50 个字符')
    }

    // 检查用户名格式（字母、数字、下划线、中文）
    if (!/^[a-zA-Z0-9_一-鿿]+$/.test(trimmed)) {
      return error('用户名只能包含字母、数字、下划线和中文')
    }

    // 查询当前用户信息
    const userResult = await query(
      'SELECT auth_provider, password_hash FROM users WHERE id = $1',
      [user.id]
    )
    const userData = userResult.rows[0]

    // 有密码的用户需要验证当前密码
    if (userData.auth_provider & AUTH_PROVIDER.PASSWORD) {
      if (!current_password) {
        return error('请输入当前密码')
      }
      if (!userData.password_hash) {
        return error('密码验证失败')
      }
      const isValid = await verifyPassword(current_password, userData.password_hash)
      if (!isValid) {
        return error('当前密码错误')
      }
    }

    // 检查用户名是否已被占用（排除自己）
    const existing = await query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [trimmed, user.id]
    )
    if (existing.rows.length > 0) {
      return error('用户名已被占用')
    }

    const { updatedUser, newToken } = await transaction(async (transactionQuery) => {
      await transactionQuery(
        'UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2',
        [trimmed, user.id],
      )

      // JWT payload 含 username；原会话必须和用户名变更一起失效。
      await revokeAllAuthSessions(user.id, transactionQuery)
      const newToken = await issueAuthSession(
        {
          id: user.id,
          username: trimmed,
          auth_provider: userData.auth_provider,
        },
        transactionQuery,
      )

      const updatedResult = await transactionQuery(
        'SELECT id, username, otp_enabled, role, auth_provider FROM users WHERE id = $1',
        [user.id],
      )
      return { updatedUser: updatedResult.rows[0], newToken }
    })

    const response = success({
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        otp_enabled: updatedUser.otp_enabled,
        role: updatedUser.role,
        auth_provider: updatedUser.auth_provider,
      },
    })
    setAuthSessionCookie(response, newToken, request)
    return response
  })
}
