/**
 * 管理员获取指定用户的简历列表
 *
 * GET /api/admin/users/[id]/resumes
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { listAdminResumes } from '@/lib/services/admin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async () => {
    try {
      const { id } = await params

      const resumes = await listAdminResumes({ userId: id })
      return success(resumes)
    } catch (err) {
      console.error('获取用户简历列表错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
