/**
 * 简历列表 API
 *
 * GET /api/resumes - 获取简历列表
 * POST /api/resumes - 创建简历
 */

import { withAuth, error, success } from '@/lib/api'
import { listResumes, createResume, buildInitialContentFromProfile } from '@/lib/services/resume'
import { getProfile } from '@/lib/services/profile'

/**
 * 获取简历列表
 */
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const resumes = await listResumes(user.id)
    return success(resumes)
  })
}

/**
 * 创建简历
 *
 * 默认从当前 profile 快照初始化 content，确保新建简历和公开页有内容。
 * 传 initialize_from_profile: false 可创建空白简历。
 */
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const body = await request.json()
    const { name, initialize_from_profile } = body

    if (!name?.trim()) {
      return error('简历名称不能为空')
    }

    // 默认从 profile 初始化（向后兼容）
    const shouldInitFromProfile = initialize_from_profile !== false

    let initialContent: Record<string, unknown> | undefined
    if (shouldInitFromProfile) {
      const profile = await getProfile(user.id)
      initialContent = buildInitialContentFromProfile(profile as unknown as Record<string, unknown>)
    }

    const resume = await createResume(user.id, name.trim(), initialContent)

    return success(resume, 201)
  })
}
