/**
 * 解绑 OAuth 账号
 *
 * DELETE /api/auth/oauth-accounts/[id]
 *
 * 安全检查：如果用户只有此 OAuth 登录方式（无密码且无其他 OAuth），
 * 需要先设置密码才能解绑。
 */

import { withAuth, error, success } from '@/lib/api'
import { query } from '@/lib/db'
import { AUTH_PROVIDER } from '@/constants/auth'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user) => {
    const { id } = await params

    // 查找绑定记录
    const bindingResult = await query(
      'SELECT id, provider FROM user_oauth_accounts WHERE id = $1 AND user_id = $2',
      [id, user.id]
    )

    if (bindingResult.rows.length === 0) {
      return error('绑定记录不存在', 404)
    }

    // 检查用户是否还有密码
    const userResult = await query(
      'SELECT auth_provider FROM users WHERE id = $1',
      [user.id]
    )
    const authProvider = userResult.rows[0].auth_provider as number
    const hasPassword = (authProvider & AUTH_PROVIDER.PASSWORD) !== 0

    // 检查用户还有多少个 OAuth 绑定
    const bindingsResult = await query(
      'SELECT COUNT(*)::int AS cnt FROM user_oauth_accounts WHERE user_id = $1',
      [user.id]
    )
    const bindingCount = bindingsResult.rows[0].cnt as number

    // 如果没有密码且只有这一个 OAuth 绑定，拒绝解绑
    if (!hasPassword && bindingCount <= 1) {
      return error('当前账号未设置密码，解绑后将无法登录。请先设置密码后再解绑。', 400)
    }

    // 删除绑定记录
    await query('DELETE FROM user_oauth_accounts WHERE id = $1', [id])

    // 如果用户没有其他 GitHub 绑定，去掉 auth_provider 的 GITHUB 位
    const remainingGithub = await query(
      "SELECT COUNT(*)::int AS cnt FROM user_oauth_accounts WHERE user_id = $1 AND provider = 'github'",
      [user.id]
    )
    if (remainingGithub.rows[0].cnt === 0) {
      const newProvider = authProvider & ~AUTH_PROVIDER.GITHUB
      await query(
        'UPDATE users SET auth_provider = $1, updated_at = NOW() WHERE id = $2',
        [newProvider, user.id]
      )
    }

    return success({ success: true })
  })
}
