import { error, success, withAuth } from '@/lib/api'
import { parseJsonBody, parseRouteParams } from '@/lib/api-validation'
import {
  restoreResumeVersion,
  ResumeVersionConflictError,
} from '@/lib/services/resume-version'
import { restoreResumeVersionBodySchema } from '@/lib/validation/business'
import { resumeVersionPathParamsSchema } from '@/lib/validation/params'

/** POST /api/resumes/:id/versions/:versionId/restore */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  return withAuth(request, async (user) => {
    const parsedParams = await parseRouteParams(params, resumeVersionPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response
    const parsedBody = await parseJsonBody(request, restoreResumeVersionBodySchema)
    if (!parsedBody.success) return parsedBody.response

    try {
      const resume = await restoreResumeVersion(
        parsedParams.data.id,
        parsedParams.data.versionId,
        user.id,
        parsedBody.data.expected_revision,
      )
      return success(resume)
    } catch (reason) {
      if (reason instanceof ResumeVersionConflictError) {
        return error(reason.message, 409)
      }
      if (reason instanceof Error && (reason.message === '简历不存在' || reason.message === '版本不存在')) {
        return error(reason.message, 404)
      }
      return error('恢复版本失败', 500)
    }
  })
}
