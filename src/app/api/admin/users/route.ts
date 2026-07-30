/**
 * 管理员用户列表
 *
 * GET /api/admin/users?q=xxx
 */

import { withAdminAuth, error, paginatedSuccess } from '@/lib/api'
import { listAdminUsers } from '@/lib/services/admin'
import { parseSearchParams } from '@/lib/api-validation'
import { adminUsersQuerySchema } from '@/lib/validation/params'

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    const parsedQuery = parseSearchParams(request, adminUsersQuerySchema)
    if (!parsedQuery.success) return parsedQuery.response

    try {
      const users = await listAdminUsers({
        q: parsedQuery.data.q,
        pagination: {
          page: parsedQuery.data.page,
          pageSize: parsedQuery.data.page_size,
        },
      })
      return paginatedSuccess(users)
    } catch (err) {
      console.error('获取用户列表错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
