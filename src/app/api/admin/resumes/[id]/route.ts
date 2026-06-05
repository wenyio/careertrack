/**
 * 管理员简历详情 / 删除
 *
 * GET /api/admin/resumes/[id]
 * DELETE /api/admin/resumes/[id]
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { getAdminResume, deleteAdminResume } from '@/lib/services/admin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async () => {
    try {
      const { id } = await params

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
    try {
      const { id } = await params

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
