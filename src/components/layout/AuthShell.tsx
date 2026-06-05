/**
 * 统一认证 Shell
 *
 * 登录 / 注册页面的公共外层：渐变背景 + 居中卡片 + Logo + 标题。
 * 替代旧的 AuthLayout，保持更精简的结构。
 */

'use client'

import { Card, Typography } from 'antd'

const { Title, Text } = Typography

interface AuthShellProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}
    >
      <Card
        className="auth-card"
        style={{
          width: 400,
          maxWidth: '100%',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          borderRadius: 16,
        }}
      >
        {/* Logo + 标题 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 22,
              fontWeight: 700,
              margin: '0 auto 12px',
              boxShadow: '0 4px 12px rgba(22, 119, 255, 0.3)',
            }}
          >
            职
          </div>
          <Title level={4} style={{ marginBottom: 2 }}>
            {title}
          </Title>
          {subtitle && <Text type="secondary">{subtitle}</Text>}
        </div>

        {children}
      </Card>

      {/* 移动端卡片内边距收窄 */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .auth-card .ant-card-body {
            padding: 20px 16px !important;
          }
        }
      `}</style>
    </div>
  )
}
