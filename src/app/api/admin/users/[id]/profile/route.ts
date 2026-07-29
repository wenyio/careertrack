/**
 * 管理员获取指定用户的个人信息
 *
 * GET /api/admin/users/[id]/profile
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { getProfileByUserId } from '@/lib/services/profile'
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
      const profile = await getProfileByUserId(id)
      if (!profile) {
        return error('个人信息不存在', 404)
      }

      return success(profile)
    } catch (err) {
      console.error('获取用户个人信息错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
