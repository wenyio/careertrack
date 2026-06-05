/**
 * 简历预览 Token 生成 API
 *
 * POST /api/resumes/:id/preview-token
 *
 * 生成一个有时效的签名 token，用于未发布简历的临时预览。
 * 需要 JWT 认证。
 */

import { withAuth, error, success } from '@/lib/api'
import { getResume, generatePreviewToken } from '@/lib/services/resume'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user) => {
    const { id } = await params

    const resume = await getResume(id, user.id)
    if (!resume) {
      return error('简历不存在', 404)
    }

    const { token, expiresAt } = generatePreviewToken(id)

    return success({
      token,
      expires_at: expiresAt,
      preview_url: `/resume/preview/${id}?token=${token}&expires=${expiresAt}`,
    })
  })
}
