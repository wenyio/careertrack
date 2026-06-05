/**
 * 页面容器组件
 *
 * 提供统一的页面宽度限制和内边距
 * 支持不同尺寸：sm (600px), md (800px), lg (1200px)
 * 支持移动端响应式
 */

'use client'

import { Typography } from 'antd'

const { Title, Text } = Typography

type ContainerSize = 'sm' | 'md' | 'lg' | 'full'

interface PageContainerProps {
  children: React.ReactNode
  /** 容器尺寸 */
  size?: ContainerSize
  /** 页面标题 */
  title?: string
  /** 页面副标题 */
  subtitle?: string
  /** 标题右侧的操作按钮 */
  extra?: React.ReactNode
}

const sizeMap: Record<ContainerSize, number | string> = {
  sm: 600,
  md: 800,
  lg: 1200,
  full: '100%',
}

export default function PageContainer({
  children,
  size = 'lg',
  title,
  subtitle,
  extra,
}: PageContainerProps) {
  return (
    <div
      style={{
        maxWidth: sizeMap[size],
        margin: '0 auto',
        padding: '24px 16px',
        minHeight: 'calc(100vh - 56px)',
      }}
      className="page-container"
    >
      {/* 页面标题 */}
      {(title || extra) && (
        <div
          style={{
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            {title && (
              <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
                {title}
              </Title>
            )}
            {subtitle && (
              <Text type="secondary" style={{ fontSize: 14, display: 'block', marginTop: 4 }}>
                {subtitle}
              </Text>
            )}
          </div>
          {extra && <div>{extra}</div>}
        </div>
      )}

      {children}

      {/* 响应式样式 */}
      <style jsx global>{`
        @media (min-width: 768px) {
          .page-container {
            padding: 32px 24px !important;
          }
        }
        @media (min-width: 1024px) {
          .page-container {
            padding: 32px 40px !important;
          }
        }
      `}</style>
    </div>
  )
}
