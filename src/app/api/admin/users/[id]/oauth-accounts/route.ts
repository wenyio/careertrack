/**
 * 管理员查看用户 OAuth 绑定列表
 *
 * GET /api/admin/users/[id]/oauth-accounts
 *
 * 只返回绑定元数据，不返回 access token 等敏感凭据。
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { getAdminUser, getAdminUserOAuthAccounts } from '@/lib/services/admin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async () => {
    const { id } = await params

    const user = await getAdminUser(id)
    if (!user) {
      return error('用户不存在', 404)
    }

    const accounts = await getAdminUserOAuthAccounts(id)
    return success(accounts)
  })
}
