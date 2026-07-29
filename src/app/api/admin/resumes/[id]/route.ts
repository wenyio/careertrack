/**
 * 管理员简历详情 / 删除
 *
 * GET /api/admin/resumes/[id]
 * DELETE /api/admin/resumes/[id]
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { getAdminResume, deleteAdminResume } from '@/lib/services/admin'
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
      const resume = await getAdminResume(id)
      if (!resume) {
        return error('简历不存在', 404)
      }

      return success(resume)
    } catch (err) {
      console.error('获取简历详情错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async () => {
    const parsedParams = await parseRouteParams(params, idPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response

    try {
      const { id } = parsedParams.data
      const deleted = await deleteAdminResume(id)
      if (!deleted) {
        return error('简历不存在', 404)
      }

      return success({ id: deleted.id })
    } catch (err) {
      console.error('删除简历错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
