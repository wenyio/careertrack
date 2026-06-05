/**
 * 管理员用户列表
 *
 * GET /api/admin/users?q=xxx
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { listAdminUsers } from '@/lib/services/admin'

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    try {
      const { searchParams } = new URL(request.url)
      const q = searchParams.get('q')?.trim() || ''

      const users = await listAdminUsers({ q })
      return success(users)
    } catch (err) {
      console.error('获取用户列表错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
