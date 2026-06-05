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
import zhCN from 'antd/locale/zh_CN'
import { queryClient } from '@/lib/query-client'

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

/**
 * Providers 组件
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN} theme={antdTheme}>
        <AntdApp>
          {children}
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  )
}
