/**
 * 管理员批量删除简历
 *
 * POST /api/admin/resumes/batch-delete
 * Body: { ids: string[] }
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { batchDeleteAdminResumes } from '@/lib/services/admin'

export async function POST(request: Request) {
  return withAdminAuth(request, async () => {
    try {
      const body = await request.json()
      const { ids } = body

      if (!Array.isArray(ids) || ids.length === 0) {
        return error('请选择要删除的简历', 400)
      }

      const deleted = await batchDeleteAdminResumes(ids)

      return success({ deleted: deleted.length, resumes: deleted })
    } catch (err) {
      console.error('批量删除简历错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
