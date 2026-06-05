/**
 * 管理员简历列表
 *
 * GET /api/admin/resumes?q=xxx&public=all|true|false
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { listAdminResumes } from '@/lib/services/admin'

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    try {
      const { searchParams } = new URL(request.url)
      const q = searchParams.get('q')?.trim() || ''
      const pub = searchParams.get('public') || 'all'

      const resumes = await listAdminResumes({ q, pub: pub as 'all' | 'true' | 'false' })
      return success(resumes)
    } catch (err) {
      console.error('获取简历列表错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
