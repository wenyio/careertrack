/**
 * 复制简历 API
 *
 * POST /api/resumes/:id/duplicate
 */

import { withAuth, error, success } from '@/lib/api'
import { duplicateResume } from '@/lib/services/resume'
import { parseRouteParams } from '@/lib/api-validation'
import { idPathParamsSchema } from '@/lib/validation/params'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user) => {
    const parsedParams = await parseRouteParams(params, idPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response
    const { id } = parsedParams.data

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
