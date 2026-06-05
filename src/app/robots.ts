/**
 * 动态 robots.txt 生成
 *
 * 允许爬取公开简历页面，屏蔽编辑页、API、私密页面。
 */

import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://careertrack.example.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/resume/',
        ],
        disallow: [
          '/resumes/',
          '/resumes/*/edit',
          '/auth/',
          '/settings/',
          '/admin/',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
