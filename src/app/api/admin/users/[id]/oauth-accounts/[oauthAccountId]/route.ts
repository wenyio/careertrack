/**
 * 管理员解绑用户 OAuth 账号
 *
 * DELETE /api/admin/users/[id]/oauth-accounts/[oauthAccountId]
 *
 * 安全检查：
 * - 目标用户存在
 * - OAuth 绑定记录属于该用户
 * - 如果用户无密码且仅此一个绑定，拒绝解绑
 * - 解绑后如果没有其他 GitHub 绑定，清除 auth_provider 的 GITHUB 位
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { query } from '@/lib/db'
import { AUTH_PROVIDER } from '@/constants/auth'
import {
  getAdminUser,
  getAdminUserOAuthAccountById,
  deleteAdminUserOAuthAccount,
} from '@/lib/services/admin'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; oauthAccountId: string }> }
) {
  return withAdminAuth(request, async () => {
    const { id, oauthAccountId } = await params

    // 校验目标用户存在
    const user = await getAdminUser(id)
    if (!user) {
      return error('用户不存在', 404)
    }

    // 校验绑定记录存在且属于该用户
    const account = await getAdminUserOAuthAccountById(oauthAccountId)
    if (!account || account.user_id !== id) {
      return error('绑定记录不存在', 404)
    }

    // 检查用户是否有密码
    const authProvider = user.auth_provider as number
    const hasPassword = (authProvider & AUTH_PROVIDER.PASSWORD) !== 0

    // 检查用户 OAuth 绑定数量
    const bindingsResult = await query(
      'SELECT COUNT(*)::int AS cnt FROM user_oauth_accounts WHERE user_id = $1',
      [id]
    )
    const bindingCount = bindingsResult.rows[0].cnt as number

    // 无密码且仅此一个绑定，拒绝解绑
    if (!hasPassword && bindingCount <= 1) {
      return error('该用户未设置密码，解绑后将无法登录。请先让用户设置密码后再解绑。', 400)
    }

    // 删除绑定记录
    await deleteAdminUserOAuthAccount(oauthAccountId)

    // 检查是否还有其他 GitHub 绑定
    const remainingGithub = await query(
      "SELECT COUNT(*)::int AS cnt FROM user_oauth_accounts WHERE user_id = $1 AND provider = 'github'",
      [id]
    )
    if (remainingGithub.rows[0].cnt === 0) {
      const newProvider = authProvider & ~AUTH_PROVIDER.GITHUB
      await query(
        'UPDATE users SET auth_provider = $1, updated_at = NOW() WHERE id = $2',
        [newProvider, id]
      )
    }

    return success({ success: true })
  })
}
