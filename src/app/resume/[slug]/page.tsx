/**
 * 公开简历页面
 *
 * 通过公开链接查看简历，无需登录。
 * 服务端组件，负责 SEO 元数据生成与 JSON-LD 结构化数据。
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { query } from '@/lib/db'
import PublicResumeClient from './PublicResumeClient'
import type { ResumeContent } from '@/types/resume'
import {
  SITE_URL,
  SITE_NAME,
  generateSeoTitle,
  generateSeoTitleEN,
  generateSeoDescription,
  generateSeoDescriptionEN,
  generateOpenGraph,
  generateTwitterCard,
  generateResumeJsonLd,
  detectResumeLanguage,
  SEO_FALLBACK,
} from '@/utils/seo'

interface PageProps {
  params: Promise<{ slug: string }>
}

/** 安全解析简历 content JSON */
function safeParseContent(content: unknown): ResumeContent {
  try {
    if (!content) return {}
    if (typeof content === 'string') return JSON.parse(content) as ResumeContent
    return content as ResumeContent
  } catch {
    return {}
  }
}

/** 生成动态 SEO 元数据 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  try {
    const result = await query(
      `SELECT name, content, template, updated_at FROM resumes WHERE public_slug = $1 AND is_public = true`,
      [slug]
    )

    if (result.rows.length === 0) {
      return {
        title: SEO_FALLBACK.zh.notFoundTitle,
        description: SEO_FALLBACK.zh.notFoundDescription,
        robots: { index: false, follow: false },
      }
    }

    const resume = result.rows[0]
    const content = safeParseContent(resume.content)
    const lang = detectResumeLanguage(content)

    // 生成 title / description
    const title = lang === 'en' ? generateSeoTitleEN(content) : generateSeoTitle(content)
    const description = lang === 'en' ? generateSeoDescriptionEN(content) : generateSeoDescription(content)

    // 生成 OG / Twitter
    const openGraph = generateOpenGraph(content, slug, lang)
    const twitter = generateTwitterCard(content, slug, lang)

    return {
      title,
      description,
      alternates: {
        canonical: `${SITE_URL}/resume/${slug}`,
      },
      robots: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
      openGraph,
      twitter,
      authors: [{ name: content.basic_info?.name || SITE_NAME }],
    }
  } catch {
    return {
      title: SEO_FALLBACK.zh.errorTitle,
      description: SEO_FALLBACK.zh.errorDescription,
      robots: { index: false, follow: false },
    }
  }
}

export default async function PublicResumePage({ params }: PageProps) {
  const { slug } = await params

  // 服务端查询简历数据，用于 JSON-LD 和客户端初始数据
  let resumeContent: ResumeContent = {}
  let initialData = null
  try {
    const result = await query(
      `SELECT name, content, modules_config, modules_order, template, public_slug, is_public
       FROM resumes WHERE public_slug = $1 AND is_public = true`,
      [slug]
    )
    if (result.rows.length === 0) {
      notFound()
    }
    const row = result.rows[0]
    resumeContent = safeParseContent(row.content)
    // 传递给客户端组件，避免重复请求
    initialData = {
      name: row.name,
      content: row.content,
      modules_config: row.modules_config,
      modules_order: row.modules_order,
      template: row.template,
      public_slug: row.public_slug,
      is_public: row.is_public,
    }
  } catch {
    // 数据库错误时不阻塞页面渲染，交给客户端处理
  }

  // 生成 JSON-LD 结构化数据
  const jsonLd = generateResumeJsonLd(resumeContent, slug)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicResumeClient slug={slug} initialData={initialData} />
    </>
  )
}
