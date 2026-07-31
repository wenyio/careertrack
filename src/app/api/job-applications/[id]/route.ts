import { error, success, withAuth } from '@/lib/api'
import { parseJsonBody, parseRouteParams } from '@/lib/api-validation'
import { deleteJobApplication, getJobApplication, JobApplicationConflictError, JobApplicationRelationError, updateJobApplication } from '@/lib/services/job-application'
import { updateJobApplicationBodySchema } from '@/lib/validation/business'
import { idPathParamsSchema } from '@/lib/validation/params'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, async (user) => {
    const parsed = await parseRouteParams(params, idPathParamsSchema)
    if (!parsed.success) return parsed.response
    try {
      const application = await getJobApplication(parsed.data.id, user.id)
      return application ? success(application) : error('求职申请不存在', 404)
    } catch (reason) {
      console.error('[job-applications] detail failed', reason)
      return error('服务器内部错误', 500)
    }
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, async (user) => {
    const parsedParams = await parseRouteParams(params, idPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response
    const parsedBody = await parseJsonBody(request, updateJobApplicationBodySchema)
    if (!parsedBody.success) return parsedBody.response
    try {
      return success(await updateJobApplication(parsedParams.data.id, user.id, parsedBody.data))
    } catch (reason) {
      if (reason instanceof JobApplicationConflictError) return error(reason.message, 409)
      if (reason instanceof Error && reason.message === '求职申请不存在') return error(reason.message, 404)
      if (reason instanceof JobApplicationRelationError) return error(reason.message, 400)
      console.error('[job-applications] update failed', reason)
      return error('服务器内部错误', 500)
    }
  })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, async (user) => {
    const parsed = await parseRouteParams(params, idPathParamsSchema)
    if (!parsed.success) return parsed.response
    try {
      return await deleteJobApplication(parsed.data.id, user.id)
        ? new NextResponse(null, { status: 204 })
        : error('求职申请不存在', 404)
    } catch (reason) {
      console.error('[job-applications] delete failed', reason)
      return error('服务器内部错误', 500)
    }
  })
}
