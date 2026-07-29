/**
 * 管理员删除注册码
 *
 * DELETE /api/admin/registration-codes/[id]
 *
 * 已使用的注册码不能删除，保留审计信息（used_by_user_id、used_at）。
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { getRegistrationCodeById, deleteRegistrationCode } from '@/lib/services/admin'
import { parseRouteParams } from '@/lib/api-validation'
import { idPathParamsSchema } from '@/lib/validation/params'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async () => {
    const parsedParams = await parseRouteParams(params, idPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response
    const { id } = parsedParams.data

    const code = await getRegistrationCodeById(id)
    if (!code) {
      return error('注册码不存在', 404)
    }

    if (code.used_at) {
      return error('已使用的注册码不能删除', 400)
    }

    await deleteRegistrationCode(id)
    return success({ success: true })
  })
}
