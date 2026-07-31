import { error, success, withAuth } from '@/lib/api'
import { parseRouteParams } from '@/lib/api-validation'
import { getResume } from '@/lib/services/resume'
import { getResumeVersion } from '@/lib/services/resume-version'
import { resumeVersionPathParamsSchema } from '@/lib/validation/params'

/** GET /api/resumes/:id/versions/:versionId — the only endpoint loading a snapshot. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  return withAuth(request, async (user) => {
    const parsedParams = await parseRouteParams(params, resumeVersionPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response
    const { id, versionId } = parsedParams.data
    if (!await getResume(id, user.id)) return error('简历不存在', 404)

    const version = await getResumeVersion(id, versionId)
    if (!version) return error('版本不存在', 404)
    return success(version)
  })
}
