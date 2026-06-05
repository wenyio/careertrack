/**
 * 管理员概览统计
 *
 * GET /api/admin/stats
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { getAdminStats } from '@/lib/services/admin'

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    try {
      const stats = await getAdminStats()
      return success(stats)
    } catch (err) {
      console.error('获取统计数据错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
