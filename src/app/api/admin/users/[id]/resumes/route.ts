/**
 * 管理员获取指定用户的简历列表
 *
 * GET /api/admin/users/[id]/resumes
 */

import { withAdminAuth, error, paginatedSuccess } from '@/lib/api'
import { listAdminResumes } from '@/lib/services/admin'
import { parseRouteParams, parseSearchParams } from '@/lib/api-validation'
import {
  idPathParamsSchema,
  paginationQuerySchema,
} from '@/lib/validation/params'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async () => {
    const parsedParams = await parseRouteParams(params, idPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response
    const parsedQuery = parseSearchParams(request, paginationQuerySchema)
    if (!parsedQuery.success) return parsedQuery.response

    try {
      const { id } = parsedParams.data
      const resumes = await listAdminResumes({
        userId: id,
        pagination: {
          page: parsedQuery.data.page,
          pageSize: parsedQuery.data.page_size,
        },
      })
      return paginatedSuccess(resumes)
    } catch (err) {
      console.error('获取用户简历列表错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
