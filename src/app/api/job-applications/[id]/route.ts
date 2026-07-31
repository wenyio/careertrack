import { error, success, withAuth } from '@/lib/api'
import { parseJsonBody, parseRouteParams } from '@/lib/api-validation'
import { deleteJobApplication, getJobApplication, JobApplicationConflictError, updateJobApplication } from '@/lib/services/job-application'
import { updateJobApplicationBodySchema } from '@/lib/validation/business'
import { idPathParamsSchema } from '@/lib/validation/params'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, async (user) => {
    const parsed = await parseRouteParams(params, idPathParamsSchema)
    if (!parsed.success) return parsed.response
    const application = await getJobApplication(parsed.data.id, user.id)
    return application ? success(application) : error('求职申请不存在', 404)
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
      return error(reason instanceof Error ? reason.message : '更新失败')
    }
  })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, async (user) => {
    const parsed = await parseRouteParams(params, idPathParamsSchema)
    if (!parsed.success) return parsed.response
    return await deleteJobApplication(parsed.data.id, user.id)
      ? new NextResponse(null, { status: 204 })
      : error('求职申请不存在', 404)
  })
}
