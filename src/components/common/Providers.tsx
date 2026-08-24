/**
 * 全局 Providers 组件
 *
 * 包装应用所需的所有 Context Providers：
 * - Ant Design 的 ConfigProvider（主题配置）
 * - TanStack Query 的 QueryClientProvider（数据缓存）
 * - Ant Design 的 App 组件（消息提示等）
 */

'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntdApp } from 'antd'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'
import { queryClient } from '@/lib/query-client'
import { I18nProvider, useI18n, type Locale } from '@/i18n'
import AuthSessionBootstrap from './AuthSessionBootstrap'

/**
 * Ant Design 主题配置
 */
const antdTheme = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n()
  const antdLocale = locale === 'en-US' ? enUS : zhCN

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={antdLocale} theme={antdTheme}>
        <AntdApp>
          <AuthSessionBootstrap>
            {children}
          </AuthSessionBootstrap>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  )
}

/**
 * Providers 组件
 */
export default function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode
  initialLocale: Locale
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <AppProviders>
        {children}
      </AppProviders>
    </I18nProvider>
  )
}
