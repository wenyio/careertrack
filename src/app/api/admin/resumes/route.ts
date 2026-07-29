/**
 * 管理员简历列表
 *
 * GET /api/admin/resumes?q=xxx&public=all|true|false
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { listAdminResumes } from '@/lib/services/admin'
import { parseSearchParams } from '@/lib/api-validation'
import { adminResumesQuerySchema } from '@/lib/validation/params'

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    const parsedQuery = parseSearchParams(request, adminResumesQuerySchema)
    if (!parsedQuery.success) return parsedQuery.response

    try {
      const resumes = await listAdminResumes({
        q: parsedQuery.data.q,
        pub: parsedQuery.data.public,
      })
      return success(resumes)
    } catch (err) {
      console.error('获取简历列表错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
