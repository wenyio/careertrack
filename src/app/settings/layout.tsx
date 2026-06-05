/**
 * 设置页面布局
 *
 * 登录守卫：未登录跳转 /auth/login
 * 设置页面为私密页面，禁止搜索引擎索引。
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Spin } from 'antd'
import { useAuthStore } from '@/stores/useAuthStore'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [hydrated, setHydrated] = useState(false)

  // 订阅 Zustand persist 水合完成事件
  useEffect(() => {
    if (!useAuthStore.persist) return
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
    }
  }, [hydrated, isAuthenticated, router])

  // 水合完成前显示加载中
  if (!hydrated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin />
      </div>
    )
  }

  // 未登录显示加载中（等待跳转）
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin />
      </div>
    )
  }

  return children
}
