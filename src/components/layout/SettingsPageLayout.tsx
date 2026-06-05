/**
 * 设置页面通用布局
 *
 * 统一个人资料和账号安全页面的视觉风格
 * 返回按钮 + 标题区 + 左侧竖导航 + 右侧内容
 */

'use client'

import { Typography, Spin } from 'antd'
import PageContainer from './PageContainer'

const { Title, Text } = Typography

export interface NavItem {
  key: string
  label: string
  icon: string
}

interface SettingsPageLayoutProps {
  /** 页面标题 */
  title: string
  /** 页面副标题 */
  subtitle: string
  /** 左侧导航项，为空或单项时不渲染页内导航 */
  navItems?: NavItem[]
  /** 当前选中的导航 key */
  activeKey?: string
  /** 导航切换回调 */
  onNavChange?: (key: string) => void
  /** 右侧内容 */
  children: React.ReactNode
  /** 标题右侧操作按钮 */
  extra?: React.ReactNode
  /** 是否加载中 */
  loading?: boolean
  /** 容器尺寸 */
  size?: 'md' | 'lg'
}

export default function SettingsPageLayout({
  title,
  subtitle,
  navItems,
  activeKey,
  onNavChange,
  children,
  extra,
  loading = false,
  size = 'lg',
}: SettingsPageLayoutProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  // 当 navItems 为空或只有一个 item 时，不渲染页内导航
  const showNav = navItems && navItems.length > 1

  return (
    <PageContainer size={size}>
      {/* 页面标题 + 操作按钮 */}
      <div
        style={{
          marginBottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 600, letterSpacing: '-0.02em' }}>
            {title}
          </Title>
          <Text type="secondary" style={{ fontSize: 14, marginTop: 6, display: 'block' }}>
            {subtitle}
          </Text>
        </div>
        {extra && <div>{extra}</div>}
      </div>

      {/* 布局：侧边导航 + 内容区（无导航时直接渲染内容） */}
      {showNav ? (
        <div className="settings-layout" style={{ display: 'flex', gap: 28, minHeight: 480 }}>
          {/* 左侧导航 */}
          <nav className="settings-nav" style={{ width: 200, flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '6px 8px',
                backgroundColor: '#fafafa',
                borderRadius: 12,
                border: '1px solid #f0f0f0',
              }}
            >
              {navItems!.map((item) => {
                const isActive = activeKey === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => onNavChange?.(item.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '11px 14px',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? '#1677ff' : '#595959',
                      backgroundColor: isActive ? '#fff' : 'transparent',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#f0f0f0'
                        e.currentTarget.style.color = '#262626'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = '#595959'
                      }
                    }}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1, width: 22, textAlign: 'center' }}>
                      {item.icon}
                    </span>
                    <span className="nav-item-label">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </nav>

          {/* 右侧内容区 */}
          <div className="settings-content" style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 28,
                border: '1px solid #f0f0f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                minHeight: 400,
              }}
            >
              {children}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 28,
            border: '1px solid #f0f0f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            minHeight: 400,
          }}
        >
          {children}
        </div>
      )}

      {/* 移动端响应式（仅在有导航时生效） */}
      {showNav && (
        <style jsx global>{`
          @media (max-width: 768px) {
            .settings-layout {
              flex-direction: column !important;
              gap: 16px !important;
            }

            .settings-nav {
              width: 100% !important;
              flex-shrink: 0;
            }

            /* 导航改为横向滚动标签 */
            .settings-nav > div {
              flex-direction: row !important;
              flex-wrap: nowrap !important;
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
              gap: 4px !important;
              padding: 6px !important;
            }

            .settings-nav button {
              flex-shrink: 0;
              white-space: nowrap;
              padding: 8px 14px !important;
              font-size: 13px !important;
            }

            .settings-nav .nav-item-label {
              font-size: 13px;
            }

            .settings-content > div {
              padding: 16px !important;
            }
          }
        `}</style>
      )}
    </PageContainer>
  )
}
