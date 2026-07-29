/**
 * 管理员获取用户详情 / 删除用户
 *
 * GET /api/admin/users/[id]
 * DELETE /api/admin/users/[id]
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { getAdminUser, deleteUser } from '@/lib/services/admin'
import { parseRouteParams } from '@/lib/api-validation'
import { idPathParamsSchema } from '@/lib/validation/params'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async () => {
    const parsedParams = await parseRouteParams(params, idPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response

    try {
      const { id } = parsedParams.data
      const user = await getAdminUser(id)
      if (!user) {
        return error('用户不存在', 404)
      }

      return success(user)
    } catch (err) {
      console.error('获取用户详情错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async (admin) => {
    const parsedParams = await parseRouteParams(params, idPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response

    try {
      const { id } = parsedParams.data
      // 禁止删除自己
      if (id === admin.id) {
        return error('不能删除自己的账号', 400)
      }

      const deleted = await deleteUser(id)
      if (!deleted) {
        return error('用户不存在', 404)
      }

      return success({ id: deleted.id, username: deleted.username })
    } catch (err) {
      console.error('删除用户错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
