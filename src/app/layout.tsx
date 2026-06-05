/**
 * 根布局组件
 *
 * Next.js App Router 的根布局，所有页面都会渲染在这个布局内
 */

import type { Metadata } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import Providers from '@/components/common/Providers'
import AppLayout from '@/components/layout/AppLayout'
import { BRAND_LOGO_URL, BRAND_MARK_URL, SITE_NAME, SITE_URL } from '@/utils/seo'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: `%s | ${SITE_NAME}`,
    default: SITE_NAME,
  },
  description: '记录职业成长轨迹，打造专属职业名片。开源的个人简历管理系统。',
  keywords: ['职迹', 'CareerTrack', '简历', 'resume', 'career', 'portfolio', '个人主页', '职业档案'],
  applicationName: SITE_NAME,
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/brand-mark.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/brand/brand-mark-192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: ['/favicon.svg'],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: SITE_NAME,
    description: '记录职业成长轨迹，打造专属职业名片。开源的个人简历管理系统。',
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
    locale: 'zh_CN',
    images: [
      {
        url: BRAND_LOGO_URL,
        width: 420,
        height: 112,
        alt: `${SITE_NAME} Logo`,
        type: 'image/svg+xml',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: '记录职业成长轨迹，打造专属职业名片。',
    images: [BRAND_MARK_URL],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <Providers>
            <AppLayout>
              {children}
            </AppLayout>
          </Providers>
        </AntdRegistry>
      </body>
    </html>
  )
}
