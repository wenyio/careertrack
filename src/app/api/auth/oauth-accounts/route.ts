/**
 * 查询当前用户的 OAuth 绑定
 *
 * GET /api/auth/oauth-accounts
 */

import { withAuth, success } from '@/lib/api'
import { query } from '@/lib/db'

export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const result = await query(
      `SELECT id, provider, provider_username, avatar_url, created_at
       FROM user_oauth_accounts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.id]
    )

    return success(result.rows)
  })
}
