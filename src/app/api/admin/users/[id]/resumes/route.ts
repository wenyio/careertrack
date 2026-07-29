/**
 * 管理员获取指定用户的简历列表
 *
 * GET /api/admin/users/[id]/resumes
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { listAdminResumes } from '@/lib/services/admin'
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
      const resumes = await listAdminResumes({ userId: id })
      return success(resumes)
    } catch (err) {
      console.error('获取用户简历列表错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
