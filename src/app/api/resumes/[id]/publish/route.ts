/**
 * 公开简历 API
 *
 * POST /api/resumes/:id/publish
 */

import { withAuth, error, success } from '@/lib/api'
import { publishResume } from '@/lib/services/resume'
import { parseJsonBody, parseRouteParams } from '@/lib/api-validation'
import { publishResumeBodySchema } from '@/lib/validation/business'
import { idPathParamsSchema } from '@/lib/validation/params'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user) => {
    const parsedParams = await parseRouteParams(params, idPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response
    const parsedBody = await parseJsonBody(request, publishResumeBodySchema)
    if (!parsedBody.success) return parsedBody.response
    const { id } = parsedParams.data
    const { slug } = parsedBody.data

    try {
      await publishResume(id, user.id, slug)
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
