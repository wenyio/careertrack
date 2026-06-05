/**
 * 后台管理布局
 *
 * 权限守卫：非管理员跳转到 /resumes
 * 左侧竖向子导航栏：概览、用户管理、简历管理
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Spin, Menu } from 'antd'
import { useAuthStore } from '@/stores/useAuthStore'
import { ADMIN_NAV_ITEMS } from '@/config/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuthStore()
  const [hydrated, setHydrated] = useState(false)

  // 订阅 Zustand persist 水合完成事件（回调内 setState，非 effect 同步调用）
  useEffect(() => {
    // SSR 或 persist 未初始化时跳过
    if (!useAuthStore.persist) return
    // 已经水合过了（通过微任务延迟 setState，避免 effect 内同步调用）
    if (useAuthStore.persist.hasHydrated()) {
      queueMicrotask(() => setHydrated(true))
      return
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      router.replace('/auth/login')
      return
    }
    if (user && user.role !== 'admin') {
      router.replace('/resumes')
    }
  }, [hydrated, isAuthenticated, user, router])

  const loadingBox = (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin />
    </div>
  )

  // 水合完成前显示加载中
  if (!hydrated) return loadingBox

  // 未登录或非管理员显示加载中（等待跳转）
  if (!isAuthenticated || (user && user.role !== 'admin')) return loadingBox

  // 匹配当前 tab
  const activeKey = ADMIN_NAV_ITEMS.find((item) => item.match?.(pathname))?.key ?? '/admin'

  const menuItems = ADMIN_NAV_ITEMS.map((item) => ({
    key: item.key,
    icon: item.icon ? <item.icon /> : undefined,
    label: item.label,
  }))

  return (
    <div className="admin-layout">
      {/* 左侧导航 */}
      <div className="admin-sider">
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderInlineEnd: 'none', height: '100%' }}
        />
      </div>

      {/* 右侧内容区 */}
      <div className="admin-content">
        {children}
      </div>

      <style jsx global>{`
        .admin-layout {
          position: fixed;
          top: 56px;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          background: #f5f5f5;
          overflow: hidden;
        }
        .admin-sider {
          width: 180px;
          background: #fff;
          border-right: 1px solid #f0f0f0;
          flex-shrink: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .admin-content {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        /* 移动端：侧栏变顶部横向导航 */
        @media (max-width: 768px) {
          .admin-layout {
            flex-direction: column;
          }
          .admin-sider {
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid #f0f0f0 !important;
            overflow-y: visible !important;
          }
          .admin-sider .ant-menu {
            display: flex !important;
            flex-direction: row !important;
          }
          .admin-sider .ant-menu-item {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
