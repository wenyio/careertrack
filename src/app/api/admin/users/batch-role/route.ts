/**
 * 管理员批量修改用户角色
 *
 * POST /api/admin/users/batch-role
 * Body: { ids: string[], role: 'user' | 'admin' }
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { batchUpdateUserRole, type UserRole } from '@/lib/services/admin'

export async function POST(request: Request) {
  return withAdminAuth(request, async (admin) => {
    try {
      const body = await request.json()
      const { ids, role } = body

      if (!Array.isArray(ids) || ids.length === 0) {
        return error('请选择要修改的用户', 400)
      }

      if (!role || !['user', 'admin'].includes(role)) {
        return error('无效的角色值', 400)
      }

      // 如果是降级，过滤掉自己
      const targetIds = role === 'user'
        ? ids.filter((id: string) => id !== admin.id)
        : ids

      if (targetIds.length === 0) {
        return error('不能将自己的角色降级', 400)
      }

      const updated = await batchUpdateUserRole(targetIds, role as UserRole)

      return success({ updated: updated.length, users: updated })
    } catch (err) {
      console.error('批量修改角色错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
