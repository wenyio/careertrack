/**
 * OAuth 回调中转页
 *
 * 从 URL hash 读取 token → 调用 /api/auth/me 获取 user → 写入 Zustand + cookie → 跳转 /resumes
 * 异常时跳转 /auth/login 并提示错误。
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Spin, Typography } from 'antd'
import { useAuthStore } from '@/stores/useAuthStore'
import { queryClient } from '@/lib/query-client'
import { COOKIE_MAX_AGE } from '@/constants'
import { getCurrentUser } from '@/services/auth'

const { Text } = Typography

export default function OAuthCallbackPage() {
  const router = useRouter()
  const { loginSuccess } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCallback() {
      // 从 URL hash 读取 token
      const hash = window.location.hash.slice(1) // 去掉 #
      const params = new URLSearchParams(hash)
      const token = params.get('token')

      if (!token) {
        setError('未收到登录凭证')
        setTimeout(() => router.replace('/auth/login'), 2000)
        return
      }

      try {
        // 先设置 token 到 store，以便 API 请求能带上 Authorization header
        const { setToken } = useAuthStore.getState()
        setToken(token)

        // 获取用户信息
        const user = await getCurrentUser()

        // 清除旧账号缓存，写入 Zustand 和 cookie
        queryClient.clear()
        loginSuccess(token, user)
        document.cookie = `token=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`

        // 跳转到简历页
        router.replace('/resumes')
      } catch {
        setError('获取用户信息失败')
        // 清除无效 token
        const { logout } = useAuthStore.getState()
        logout()
        setTimeout(() => router.replace('/auth/login'), 2000)
      }
    }

    handleCallback()
  }, [router, loginSuccess])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 16,
      }}
    >
      {error ? (
        <>
          <Text type="danger" style={{ fontSize: 16 }}>{error}</Text>
          <Text type="secondary">正在跳转到登录页...</Text>
        </>
      ) : (
        <>
          <Spin size="large" />
          <Text type="secondary" style={{ fontSize: 16 }}>正在完成登录...</Text>
        </>
      )}
    </div>
  )
}
