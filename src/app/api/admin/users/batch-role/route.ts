/**
 * 管理员批量修改用户角色
 *
 * POST /api/admin/users/batch-role
 * Body: { ids: string[], role: 'user' | 'admin' }
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { batchUpdateUserRole } from '@/lib/services/admin'
import { parseJsonBody } from '@/lib/api-validation'
import { adminBatchUserRoleBodySchema } from '@/lib/validation/admin'

export async function POST(request: Request) {
  return withAdminAuth(request, async (admin) => {
    const parsedBody = await parseJsonBody(
      request,
      adminBatchUserRoleBodySchema,
    )
    if (!parsedBody.success) return parsedBody.response
    const { ids, role } = parsedBody.data

    try {
      // 如果是降级，过滤掉自己
      const targetIds = role === 'user'
        ? ids.filter((id) => id !== admin.id)
        : ids

      if (targetIds.length === 0) {
        return error('不能将自己的角色降级', 400)
      }

      const updated = await batchUpdateUserRole(targetIds, role)

      return success({ updated: updated.length, users: updated })
    } catch (err) {
      console.error('批量修改角色错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
