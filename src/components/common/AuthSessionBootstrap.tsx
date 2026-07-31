'use client'

import { useEffect } from 'react'
import { Spin } from 'antd'
import { usePathname } from 'next/navigation'
import { getCurrentUser } from '@/services/auth'
import { useAuthStore } from '@/stores/useAuthStore'

function needsResolvedSession(pathname: string): boolean {
  return pathname === '/resumes'
    || pathname.startsWith('/resumes/')
    || pathname.startsWith('/settings/')
    || pathname.startsWith('/admin')
    || pathname === '/applications'
    || pathname === '/auth/migrate'
}

export default function AuthSessionBootstrap({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const sessionReady = useAuthStore((state) => state.sessionReady)
  const loginSuccess = useAuthStore((state) => state.loginSuccess)
  const logout = useAuthStore((state) => state.logout)
  const setSessionReady = useAuthStore((state) => state.setSessionReady)

  useEffect(() => {
    let cancelled = false

    const synchronize = async () => {
      if (!useAuthStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
            unsubscribe()
            resolve()
          })
        })
      }

      try {
        const user = await getCurrentUser()
        if (!cancelled) loginSuccess(user)
      } catch {
        if (!cancelled) logout()
      } finally {
        if (!cancelled) setSessionReady(true)
      }
    }

    void synchronize()
    return () => {
      cancelled = true
    }
  }, [loginSuccess, logout, setSessionReady])

  if (needsResolvedSession(pathname) && !sessionReady) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  return children
}
