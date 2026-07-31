import { error, success, withAuth } from '@/lib/api'
import { getJobApplicationSummary } from '@/lib/services/job-application'

/** Summary is an independent aggregate query; never derive these counts from a page. */
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    try {
      return success(await getJobApplicationSummary(user.id))
    } catch (reason) {
      console.error('[job-applications] summary failed', reason)
      return error('服务器内部错误', 500)
    }
  })
}
