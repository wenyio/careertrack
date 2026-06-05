/**
 * 简历详情 API
 *
 * GET /api/resumes/:id - 获取简历详情
 * PUT /api/resumes/:id - 更新简历
 * DELETE /api/resumes/:id - 删除简历
 */

import { withAuth, error, success } from '@/lib/api'
import { getResume, updateResume, deleteResume } from '@/lib/services/resume'
import { NextResponse } from 'next/server'

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

    try {
      const resume = await updateResume(id, user.id, body)
      return success(resume)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '更新失败'
      if (message === '简历不存在') {
        return error(message, 404)
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
