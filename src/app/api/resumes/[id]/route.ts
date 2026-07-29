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
import { MAX_RESUME_NAME_LENGTH } from '@/constants'

/**
 * 获取简历详情
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user) => {
    const { id } = await params

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
    const { id } = await params
    const body = await request.json()

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return error('简历名称不能为空')
      }
      if (body.name.trim().length > MAX_RESUME_NAME_LENGTH) {
        return error(`简历名称不能超过 ${MAX_RESUME_NAME_LENGTH} 个字符`)
      }
      body.name = body.name.trim()
    }

    try {
      const resume = await updateResume(id, user.id, body)
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
    const { id } = await params

    const deleted = await deleteResume(id, user.id)
    if (!deleted) {
      return error('简历不存在', 404)
    }

    return new NextResponse(null, { status: 204 })
  })
}
