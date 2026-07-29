/**
 * 管理员修改用户角色
 *
 * PATCH /api/admin/users/[id]/role
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { updateUserRole } from '@/lib/services/admin'
import { parseJsonBody } from '@/lib/api-validation'
import { adminUserRoleBodySchema } from '@/lib/validation/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async (admin) => {
    const parsedBody = await parseJsonBody(request, adminUserRoleBodySchema)
    if (!parsedBody.success) return parsedBody.response
    const { role } = parsedBody.data

    try {
      const { id } = await params

      // 禁止管理员把自己降级
      if (id === admin.id && role !== 'admin') {
        return error('不能将自己的角色降级为普通用户', 400)
      }

      const updated = await updateUserRole(id, role)
      if (!updated) {
        return error('用户不存在', 404)
      }

      return success(updated)
    } catch (err) {
      console.error('修改用户角色错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
