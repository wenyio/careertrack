/**
 * 取消公开简历 API
 *
 * DELETE /api/resumes/:id/unpublish
 */

import { withAuth, error, success } from '@/lib/api'
import { unpublishResume } from '@/lib/services/resume'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user) => {
    const { id } = await params

    try {
      await unpublishResume(id, user.id)
      return success({ success: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '取消发布失败'
      if (message === '简历不存在') {
        return error(message, 404)
      }
      return error(message)
    }
  })
}
