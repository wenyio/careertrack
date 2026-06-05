/**
 * 根布局组件
 *
 * Next.js App Router 的根布局，所有页面都会渲染在这个布局内
 */

import type { Metadata } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import Providers from '@/components/common/Providers'
import AppLayout from '@/components/layout/AppLayout'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://careertrack.example.com'),
  title: {
    template: '%s | 职迹 CareerTrack',
    default: '职迹 CareerTrack',
  },
  description: '记录职业成长轨迹，打造专属职业名片。开源的个人简历管理系统。',
  keywords: ['简历', 'resume', 'career', 'portfolio', '个人主页'],
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
