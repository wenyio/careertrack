import { error, success, withAuth } from '@/lib/api'
import { parseJsonBody, parseRouteParams } from '@/lib/api-validation'
import { createJobApplicationEvent, getJobApplication, JobApplicationConflictError, listJobApplicationEvents } from '@/lib/services/job-application'
import { createJobApplicationEventBodySchema } from '@/lib/validation/business'
import { idPathParamsSchema } from '@/lib/validation/params'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, async (user) => {
    const parsed = await parseRouteParams(params, idPathParamsSchema)
    if (!parsed.success) return parsed.response
    try {
      const events = await listJobApplicationEvents(parsed.data.id, user.id)
      return events ? success(events) : error('求职申请不存在', 404)
    } catch (reason) {
      console.error('[job-application-events] list failed', reason)
      return error('服务器内部错误', 500)
    }
  })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, async (user) => {
    const parsedParams = await parseRouteParams(params, idPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response
    const parsedBody = await parseJsonBody(request, createJobApplicationEventBodySchema)
    if (!parsedBody.success) return parsedBody.response
    try {
      // Resolve here as well as in the write transaction to return 404 rather
      // than treating an unknown/foreign application as a generic failure.
      if (!await getJobApplication(parsedParams.data.id, user.id)) return error('求职申请不存在', 404)
      return success(await createJobApplicationEvent(parsedParams.data.id, user.id, parsedBody.data), 201)
    } catch (reason) {
      if (reason instanceof JobApplicationConflictError) return error(reason.message, 409)
      if (reason instanceof Error && reason.message === '求职申请不存在') return error(reason.message, 404)
      console.error('[job-application-events] create failed', reason)
      return error('服务器内部错误', 500)
    }
  })
}
