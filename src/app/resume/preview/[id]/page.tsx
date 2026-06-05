/**
 * 简历临时预览页面
 *
 * 通过签名 token 访问未发布的简历预览。
 * URL 格式：/resume/preview/{id}?token=xxx&expires=xxx
 */

import { notFound } from 'next/navigation'
import { verifyPreviewToken, getResumeById } from '@/lib/services/resume'
import PublicResumeClient from '../../[slug]/PublicResumeClient'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string; expires?: string }>
}

export default async function ResumePreviewPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { token } = await searchParams

  if (!token) {
    notFound()
  }

  // 验证 token
  const verified = verifyPreviewToken(id, token)
  if (!verified) {
    notFound()
  }

  // 获取简历数据
  const resume = await getResumeById(id)
  if (!resume) {
    notFound()
  }

  const initialData = {
    name: resume.name,
    content: resume.content,
    modules_config: resume.modules_config,
    modules_order: resume.modules_order,
    template: resume.template,
    public_slug: undefined,
    is_public: false,
  }

  return <PublicResumeClient slug="" initialData={initialData} />
}
