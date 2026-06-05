/**
 * 修改密码
 *
 * PUT /api/auth/password
 *
 * 有 password_hash 的用户：需要验证 current_password 后才能设置 new_password。
 * GitHub-only 用户（无 password_hash）：直接设置 new_password，无需 current_password。
 * 设置密码后 auth_provider 自动加上 PASSWORD 位。
 */

import { withAuth, error, success } from '@/lib/api'
import { query } from '@/lib/db'
import { verifyPassword, hashPassword } from '@/lib/auth'
import { AUTH_PROVIDER } from '@/constants/auth'

export async function PUT(request: Request) {
  return withAuth(request, async (user) => {
    const body = await request.json()
    const { current_password, new_password } = body

    if (!new_password || typeof new_password !== 'string') {
      return error('请输入新密码')
    }

    if (new_password.length < 6) {
      return error('新密码长度至少 6 个字符')
    }

    // 查询当前用户信息
    const userResult = await query(
      'SELECT password_hash, auth_provider FROM users WHERE id = $1',
      [user.id]
    )
    const userData = userResult.rows[0]

    const hasPassword = (userData.auth_provider & AUTH_PROVIDER.PASSWORD) !== 0 && !!userData.password_hash

    if (hasPassword) {
      // 有密码的用户：必须验证当前密码
      if (!current_password) {
        return error('请输入当前密码')
      }

      const isValid = await verifyPassword(current_password, userData.password_hash)
      if (!isValid) {
        return error('当前密码错误')
      }
    }

    // 哈希新密码并更新
    const newHash = await hashPassword(new_password)

    // 如果用户之前没有密码（GitHub-only），加上 PASSWORD 位
    const newAuthProvider = hasPassword
      ? userData.auth_provider
      : userData.auth_provider | AUTH_PROVIDER.PASSWORD

    await query(
      'UPDATE users SET password_hash = $1, auth_provider = $2, updated_at = NOW() WHERE id = $3',
      [newHash, newAuthProvider, user.id]
    )

    return success({ success: true })
  })
}
