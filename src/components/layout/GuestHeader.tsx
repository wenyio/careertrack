/**
 * 游客模式导航栏
 *
 * 简化版 header，不显示 MCP、管理后台、个人设置等入口。
 * 右侧显示 "游客模式" 标签和 "登录/注册" 按钮。
 */

'use client'

import { useRouter } from 'next/navigation'
import { Button, Tag } from 'antd'
import { LoginOutlined } from '@ant-design/icons'
import HeaderBrand from './HeaderBrand'

export default function GuestHeader() {
  const router = useRouter()

  return (
    <>
      <header
        className="guest-header"
        style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 56,
          overflow: 'hidden',
        }}
      >
        <HeaderBrand onClick={() => router.push('/resumes')} />

        {/* 中间：我的简历 */}
        <div
          className="guest-header-nav"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 14, color: '#1677ff', fontWeight: 600 }}>
            我的简历
          </span>
        </div>

        {/* 右侧：游客标签 + 登录按钮 */}
        <div className="guest-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <Tag className="guest-mode-tag" color="orange" style={{ margin: 0 }}>
            游客模式
          </Tag>
          <Button
            className="guest-login-button"
            type="primary"
            size="small"
            icon={<LoginOutlined />}
            onClick={() => router.push('/auth/login')}
          >
            <span className="guest-login-text">登录 / 注册</span>
          </Button>
        </div>
      </header>

      <style jsx global>{`
        @media (max-width: 768px) {
          .guest-header {
            padding: 0 12px !important;
            gap: 12px !important;
          }

          .guest-header-nav {
            display: none !important;
          }

          .guest-header-actions {
            gap: 8px !important;
          }
        }

        @media (max-width: 480px) {
          .guest-login-button {
            padding-inline: 8px !important;
          }

          .guest-login-text {
            display: none;
          }
        }

        @media (max-width: 360px) {
          .guest-mode-tag {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
