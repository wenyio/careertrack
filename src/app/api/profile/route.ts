/**
 * 个人信息 API
 *
 * GET /api/profile - 获取个人信息
 * PUT /api/profile - 更新个人信息
 */

import { withAuth, success } from '@/lib/api'
import { getProfile, updateProfile } from '@/lib/services/profile'

/**
 * 获取个人信息
 */
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const profile = await getProfile(user.id)
    return success(profile)
  })
}

/**
 * 更新个人信息
 */
export async function PUT(request: Request) {
  return withAuth(request, async (user) => {
    const body = await request.json()

    const profile = await updateProfile(user.id, body)

    return success(profile)
  })
}
