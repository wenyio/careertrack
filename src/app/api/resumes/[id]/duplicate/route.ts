/**
 * 复制简历 API
 *
 * POST /api/resumes/:id/duplicate
 */

import { withAuth, error, success } from '@/lib/api'
import { duplicateResume } from '@/lib/services/resume'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user) => {
    const { id } = await params

    try {
      const resume = await duplicateResume(id, user.id)
      return success(resume, 201)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '复制失败'
      if (message === '简历不存在') {
        return error(message, 404)
      }
      return error(message)
    }
  })
}
