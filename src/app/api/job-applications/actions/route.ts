import { error, success, withAuth } from '@/lib/api'
import { getJobApplicationActionCenter } from '@/lib/services/job-application'

/** This intentionally queries the server-side actionable set, never a page. */
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    try {
      return success(await getJobApplicationActionCenter(user.id))
    } catch (reason) {
      console.error('[job-applications] actions failed', reason)
      return error('服务器内部错误', 500)
    }
  })
}
