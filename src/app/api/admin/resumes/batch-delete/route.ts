/**
 * 管理员批量删除简历
 *
 * POST /api/admin/resumes/batch-delete
 * Body: { ids: string[] }
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { batchDeleteAdminResumes } from '@/lib/services/admin'
import { parseJsonBody } from '@/lib/api-validation'
import { adminBatchDeleteResumesBodySchema } from '@/lib/validation/admin'

export async function POST(request: Request) {
  return withAdminAuth(request, async () => {
    const parsedBody = await parseJsonBody(
      request,
      adminBatchDeleteResumesBodySchema,
    )
    if (!parsedBody.success) return parsedBody.response
    const { ids } = parsedBody.data

    try {
      const deleted = await batchDeleteAdminResumes(ids)

      return success({ deleted: deleted.length, resumes: deleted })
    } catch (err) {
      console.error('批量删除简历错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
