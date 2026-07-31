import { error, paginatedSuccess, success, withAuth } from '@/lib/api'
import { parseJsonBody, parseSearchParams } from '@/lib/api-validation'
import { createJobApplication, listJobApplications } from '@/lib/services/job-application'
import { createJobApplicationBodySchema } from '@/lib/validation/business'
import { jobApplicationsQuerySchema } from '@/lib/validation/params'

export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const parsed = parseSearchParams(request, jobApplicationsQuerySchema)
    if (!parsed.success) return parsed.response
    return paginatedSuccess(await listJobApplications(user.id, {
      page: parsed.data.page, pageSize: parsed.data.page_size, q: parsed.data.q, status: parsed.data.status,
    }))
  })
}

export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const parsed = await parseJsonBody(request, createJobApplicationBodySchema)
    if (!parsed.success) return parsed.response
    try {
      return success(await createJobApplication(user.id, parsed.data), 201)
    } catch (reason) {
      return error(reason instanceof Error ? reason.message : '创建失败')
    }
  })
}
