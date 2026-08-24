/**
 * OAuth 回调中转页
 *
 * 服务端已写入 HttpOnly session，本页拉取 user 并同步客户端展示状态。
 * 异常时跳转 /auth/login 并提示错误。
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Spin, Typography } from 'antd'
import { useAuthStore } from '@/stores/useAuthStore'
import { queryClient } from '@/lib/query-client'
import { getCurrentUser } from '@/services/auth'
import { useI18n } from '@/i18n'

const { Text } = Typography

export default function OAuthCallbackPage() {
  const router = useRouter()
  const { loginSuccess } = useAuthStore()
  const { t } = useI18n()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCallback() {
      try {
        // 获取用户信息
        const user = await getCurrentUser()

        // 清除旧账号缓存并同步客户端展示状态
        queryClient.clear()
        loginSuccess(user)

        // 跳转到简历页
        router.replace('/resumes')
      } catch {
        setError(t('auth.oauthUserFailed'))
        // 清除无效的客户端认证状态
        const { logout } = useAuthStore.getState()
        logout()
        setTimeout(() => router.replace('/auth/login'), 2000)
      }
    }

    handleCallback()
  }, [router, loginSuccess, t])

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
          <Text type="secondary">{t('auth.redirectingLogin')}</Text>
        </>
      ) : (
        <>
          <Spin size="large" />
          <Text type="secondary" style={{ fontSize: 16 }}>{t('auth.completingLogin')}</Text>
        </>
      )}
    </div>
  )
}
