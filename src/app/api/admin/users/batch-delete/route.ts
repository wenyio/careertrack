/**
 * 管理员批量删除用户
 *
 * POST /api/admin/users/batch-delete
 * Body: { ids: string[] }
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { batchDeleteUsers } from '@/lib/services/admin'

export async function POST(request: Request) {
  return withAdminAuth(request, async (admin) => {
    try {
      const body = await request.json()
      const { ids } = body

      if (!Array.isArray(ids) || ids.length === 0) {
        return error('请选择要删除的用户', 400)
      }

      // 过滤掉自己，防止误删
      const targetIds = ids.filter((id: string) => id !== admin.id)
      if (targetIds.length === 0) {
        return error('不能删除自己的账号', 400)
      }

      const deleted = await batchDeleteUsers(targetIds)

      return success({ deleted: deleted.length, users: deleted })
    } catch (err) {
      console.error('批量删除用户错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
