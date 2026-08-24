/**
 * 根布局组件
 *
 * Next.js App Router 的根布局，所有页面都会渲染在这个布局内
 */

import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import Providers from '@/components/common/Providers'
import AppLayout from '@/components/layout/AppLayout'
import { BRAND_LOGO_URL, BRAND_MARK_URL, SITE_NAME, SITE_URL } from '@/utils/seo'
import { LOCALE_COOKIE_NAME, localeToHtmlLang, normalizeLocale, type Locale } from '@/i18n/locales'
import './globals.css'

async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value)
}

function getRootCopy(locale: Locale) {
  if (locale === 'en-US') {
    return {
      description: 'Track your career growth and build a personal career profile. An open-source resume management system.',
      keywords: ['CareerTrack', 'resume', 'career', 'portfolio', 'profile', 'personal website'],
      twitterDescription: 'Track your career growth and build a personal career profile.',
      ogLocale: 'en_US',
    }
  }

  return {
    description: '记录职业成长轨迹，打造专属职业名片。开源的个人简历管理系统。',
    keywords: ['职迹', 'CareerTrack', '简历', 'resume', 'career', 'portfolio', '个人主页', '职业档案'],
    twitterDescription: '记录职业成长轨迹，打造专属职业名片。',
    ogLocale: 'zh_CN',
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale()
  const copy = getRootCopy(locale)

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      template: `%s | ${SITE_NAME}`,
      default: SITE_NAME,
    },
    description: copy.description,
    keywords: copy.keywords,
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
      description: copy.description,
      url: SITE_URL,
      siteName: SITE_NAME,
      type: 'website',
      locale: copy.ogLocale,
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
      description: copy.twitterDescription,
      images: [BRAND_MARK_URL],
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getRequestLocale()

  return (
    <html lang={localeToHtmlLang(locale)}>
      <body>
        <AntdRegistry>
          <Providers initialLocale={locale}>
            <AppLayout>
              {children}
            </AppLayout>
          </Providers>
        </AntdRegistry>
      </body>
    </html>
  )
}
