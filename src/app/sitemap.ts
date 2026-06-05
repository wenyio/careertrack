/**
 * 动态 Sitemap 生成
 *
 * 只包含公开发布的简历页面，lastmod 取简历最后更新时间。
 * 每次请求时动态查询数据库，确保内容实时同步。
 */

import type { MetadataRoute } from 'next'
import { query } from '@/lib/db'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://careertrack.example.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 静态页面
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  // 公开简历页面
  try {
    const result = await query(
      `SELECT public_slug, updated_at FROM resumes WHERE is_public = true AND public_slug IS NOT NULL AND public_slug != ''`
    )

    const resumePages: MetadataRoute.Sitemap = result.rows.map(row => ({
      url: `${SITE_URL}/resume/${row.public_slug}`,
      lastModified: new Date(row.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    return [...staticPages, ...resumePages]
  } catch {
    // 数据库查询失败时返回静态页面
    return staticPages
  }
}
