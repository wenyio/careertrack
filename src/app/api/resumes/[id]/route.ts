/**
 * 简历详情 API
 *
 * GET /api/resumes/:id - 获取简历详情
 * PUT /api/resumes/:id - 更新简历
 * DELETE /api/resumes/:id - 删除简历
 */

import { withAuth, error, success } from '@/lib/api'
import { getResume, updateResume, deleteResume, ResumeConflictError } from '@/lib/services/resume'
import { NextResponse } from 'next/server'
import { parseJsonBody, parseRouteParams } from '@/lib/api-validation'
import { updateResumeBodySchema } from '@/lib/validation/business'
import { idPathParamsSchema } from '@/lib/validation/params'
import { createAutoResumeVersion } from '@/lib/services/resume-version'

/**
 * 获取简历详情
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user) => {
    const parsedParams = await parseRouteParams(params, idPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response
    const { id } = parsedParams.data

    const resume = await getResume(id, user.id)
    if (!resume) {
      return error('简历不存在', 404)
    }

    return success(resume)
  })
}

/**
 * 更新简历
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user) => {
    const parsedParams = await parseRouteParams(params, idPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response
    const parsedBody = await parseJsonBody(request, updateResumeBodySchema)
    if (!parsedBody.success) return parsedBody.response
    const { id } = parsedParams.data

    try {
      const resume = await updateResume(id, user.id, parsedBody.data)
      // Autosave can be frequent; the version service coalesces these writes
      // into at most one automatic checkpoint per ten-minute window.
      try {
        await createAutoResumeVersion(id, user.id)
      } catch (snapshotError) {
        // The resume write already committed. Reporting a failed checkpoint as
        // a failed save would make clients retry a stale revision and mask the
        // successful edit; retain the server-side signal without changing it.
        console.error('[resume-version] 自动快照创建失败', snapshotError)
      }
      return success(resume)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '更新失败'
      if (message === '简历不存在') {
        return error(message, 404)
      }
      if (err instanceof ResumeConflictError) {
        return error(message, 409)
      }
      return error(message)
    }
  })
}

/**
 * 删除简历
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user) => {
    const parsedParams = await parseRouteParams(params, idPathParamsSchema)
    if (!parsedParams.success) return parsedParams.response
    const { id } = parsedParams.data

    const deleted = await deleteResume(id, user.id)
    if (!deleted) {
      return error('简历不存在', 404)
    }

    return new NextResponse(null, { status: 204 })
  })
}
