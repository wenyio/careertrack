/**
 * 公开简历 API
 *
 * GET /api/public/:slug
 */

import { NextResponse } from 'next/server'
import { getResumeBySlug } from '@/lib/services/resume'
import { parseRouteParams } from '@/lib/api-validation'
import { publicSlugPathParamsSchema } from '@/lib/validation/params'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const parsedParams = await parseRouteParams(params, publicSlugPathParamsSchema)
  if (!parsedParams.success) return parsedParams.response

  try {
    const { slug } = parsedParams.data
    const resume = await getResumeBySlug(slug)
    if (!resume) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: '简历不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(resume)
  } catch (err) {
    console.error('获取公开简历错误:', err)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
