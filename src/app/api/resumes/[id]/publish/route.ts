/**
 * 公开简历 API
 *
 * POST /api/resumes/:id/publish
 */

import { withAuth, error, success } from '@/lib/api'
import { publishResume } from '@/lib/services/resume'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user) => {
    const { id } = await params
    const body = await request.json()
    const { slug } = body

    if (!slug?.trim()) {
      return error('公开链接不能为空')
    }

    try {
      await publishResume(id, user.id, slug.trim())
      return success({ success: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '发布失败'
      if (message === '简历不存在') {
        return error(message, 404)
      }
      return error(message)
    }
  })
}
