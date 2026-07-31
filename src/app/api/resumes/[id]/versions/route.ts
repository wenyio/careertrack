import { error, paginatedSuccess, success, withAuth } from '@/lib/api'
import { parseJsonBody, parseRouteParams, parseSearchParams } from '@/lib/api-validation'
import {
  createManualResumeVersion,
  ResumeVersionLimitError,
  listResumeVersions,
} from '@/lib/services/resume-version'
import { getResume } from '@/lib/services/resume'
import { createResumeVersionBodySchema } from '@/lib/validation/business'
import { idPathParamsSchema, paginationQuerySchema } from '@/lib/validation/params'

/** GET /api/resumes/:id/versions — metadata only. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async (user) => {
    const parsedParams = await parseRouteParams(params, idPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response
    const parsedQuery = parseSearchParams(request, paginationQuerySchema)
    if (!parsedQuery.success) return parsedQuery.response

    if (!await getResume(parsedParams.data.id, user.id)) {
      return error('简历不存在', 404)
    }
    const versions = await listResumeVersions(parsedParams.data.id, {
      page: parsedQuery.data.page,
      pageSize: parsedQuery.data.page_size,
    })
    return paginatedSuccess(versions)
  })
}

/** POST /api/resumes/:id/versions — explicit manual snapshot. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async (user) => {
    const parsedParams = await parseRouteParams(params, idPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response
    const parsedBody = await parseJsonBody(request, createResumeVersionBodySchema, {
      allowEmpty: true,
    })
    if (!parsedBody.success) return parsedBody.response

    try {
      const version = await createManualResumeVersion(
        parsedParams.data.id,
        user.id,
        parsedBody.data.label,
      )
      return success(version, 201)
    } catch (reason) {
      if (reason instanceof ResumeVersionLimitError) {
        return error(reason.message, 409, 'VERSION_LIMIT_REACHED')
      }
      if (reason instanceof Error && reason.message === '简历不存在') {
        return error(reason.message, 404)
      }
      return error('创建版本失败', 500)
    }
  })
}
