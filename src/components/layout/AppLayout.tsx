/**
 * 应用主布局组件
 *
 * 顶部导航栏布局，支持移动端适配
 * 已登录用户显示导航，未登录用户不显示
 */

'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Layout, Menu, Avatar, Dropdown, Drawer, Button } from 'antd'
import {
  UserOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/useAuthStore'
import { useLogout } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useGravatarUrl } from '@/utils/avatar'
import { getAppNavigationMode, isAdminRoute, isSettingsRoute } from '@/utils/navigation'
import { MAIN_NAV_ITEMS, SETTINGS_NAV_ITEMS, USER_MENU_ITEMS } from '@/config/navigation'
import HeaderBrand from './HeaderBrand'
import GuestHeader from './GuestHeader'

const { Header, Content, Footer } = Layout

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user } = useAuthStore()
  const logout = useLogout()
  const { data: profile } = useProfile(isAuthenticated)
  const gravatarUrl = useGravatarUrl(profile?.basic_info?.email)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navMode = getAppNavigationMode(pathname, isAuthenticated)
  const isAdminPage = isAdminRoute(pathname)
  const isSettingsPage = isSettingsRoute(pathname)
  const isAdmin = user?.role === 'admin'

  // 不显示任何全局导航
  if (navMode === 'none') {
    return <>{children}</>
  }

  // 游客模式：显示 GuestHeader
  if (navMode === 'guest') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <GuestHeader />
        <div style={{ paddingTop: 56 }}>{children}</div>
      </div>
    )
  }

  // 根据用户角色过滤导航项
  const filterByRole = (items: typeof USER_MENU_ITEMS) =>
    items.filter((item) => !item.roles || (isAdmin && item.roles.includes('admin')))

  // 用户下拉菜单
  const userMenuItems = [
    ...filterByRole(USER_MENU_ITEMS).map((item) => ({
      key: item.key,
      icon: item.icon ? <item.icon /> : undefined,
      label: item.label,
      onClick: () => router.push(item.href),
    })),
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: logout,
    },
  ]

  // 移动端菜单项：根据当前页面显示不同的导航组
  const activeNavItems = isSettingsPage ? SETTINGS_NAV_ITEMS : filterByRole(MAIN_NAV_ITEMS)
  const mobileMenuItems = [
    ...activeNavItems.map((item) => ({
      key: item.key,
      label: item.label,
      onClick: () => {
        router.push(item.href)
        setMobileMenuOpen(false)
      },
    })),
    ...(!isSettingsPage ? [
      { type: 'divider' as const },
      {
        key: '/settings/profile',
        icon: <UserOutlined />,
        label: '个人信息',
        onClick: () => {
          router.push('/settings/profile')
          setMobileMenuOpen(false)
        },
      },
    ] : []),
    { type: 'divider' as const },
    {
      key: 'logout',
      label: '退出登录',
      danger: true,
      onClick: () => {
        logout()
        setMobileMenuOpen(false)
      },
    },
  ]

  return (
    <Layout className={isAdminPage ? 'admin-page-layout' : ''} style={isAdminPage ? { overflow: 'hidden' } : { minHeight: '100vh' }}>
      {/* 顶部导航栏 */}
      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 56,
          overflow: 'hidden',
        }}
      >
        {/* 左侧：Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* 移动端菜单按钮 */}
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileMenuOpen(true)}
            style={{ display: 'none' }}
            className="mobile-menu-btn"
          />

          <HeaderBrand onClick={() => router.push('/resumes')} />
        </div>

        {/* 中间：导航链接（移动端隐藏，改用 Drawer 菜单） */}
        <div
          className="header-nav-tabs"
          style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, minWidth: 0 }}
        >
          {(isSettingsPage ? SETTINGS_NAV_ITEMS : filterByRole(MAIN_NAV_ITEMS)).map((item) => {
            const isActive = item.match ? item.match(pathname) : pathname === item.key
            return (
              <div
                key={item.key}
                onClick={() => router.push(item.key)}
                style={{
                  padding: '6px 16px',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#1677ff' : '#666',
                  background: 'transparent',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = '#333'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = '#666'
                }}
              >
                {item.label}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 20,
                      height: 2.5,
                      borderRadius: 2,
                      background: '#1677ff',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* 右侧：用户头像 */}
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={['hover']}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '4px 12px',
              borderRadius: 8,
              transition: 'background 0.2s',
              height: 40,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Avatar
              size={28}
              src={gravatarUrl || undefined}
              icon={<UserOutlined />}
              style={{ background: '#1677ff', flexShrink: 0 }}
            />
            <span className="user-name" style={{ fontSize: 14, lineHeight: 1 }}>
              {user?.username || '用户'}
            </span>
          </div>
        </Dropdown>
      </Header>

      {/* 移动端抽屉菜单 */}
      <Drawer
        title="菜单"
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        size="small"
      >
        <Menu
          mode="inline"
          selectedKeys={[
            pathname.startsWith('/admin') ? '/admin' :
            pathname.startsWith('/resumes') ? '/resumes' : pathname
          ]}
          items={mobileMenuItems}
        />
      </Drawer>

      {/* 主内容区 */}
      <Content style={{ background: '#f5f5f5', minHeight: 'calc(100vh - 56px)', paddingTop: 56 }}>
        {children}
      </Content>

      {/* 页脚版本号（admin 页面不显示） */}
      {!isAdminPage && (
        <Footer style={{
          textAlign: 'center',
          padding: '12px 50px',
          background: 'transparent',
          color: '#999',
          fontSize: 12,
        }}>
          职迹 CareerTrack v{process.env.NEXT_PUBLIC_VERSION || 'dev'}
        </Footer>
      )}

      {/* 移动端样式 */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: inline-flex !important;
          }
          .user-name {
            display: none;
          }
          /* header 导航标签在移动端隐藏，改用 Drawer 菜单 */
          .header-nav-tabs {
            display: none !important;
          }
        }
        /* 覆盖 Ant Design Header 默认样式，确保高度一致 */
        .ant-layout-header {
          height: 56px !important;
          line-height: 56px !important;
        }
        /* Footer 移动端适配 */
        @media (max-width: 768px) {
          .ant-layout-footer {
            padding: 12px 16px !important;
          }
        }
      `}</style>
    </Layout>
  )
}
