/**
 * 获取当前用户信息
 *
 * GET /api/auth/me
 */

import { withAuth, error, success } from '@/lib/api'
import { query } from '@/lib/db'

export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const result = await query(
      'SELECT id, username, otp_enabled, role, auth_provider, disabled_at FROM users WHERE id = $1',
      [user.id]
    )

    if (result.rows.length === 0) {
      return error('用户不存在', 404)
    }

    return success(result.rows[0])
  })
}
