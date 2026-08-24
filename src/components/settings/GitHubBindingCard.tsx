/**
 * GitHub 绑定管理组件
 *
 * 显示当前用户的 GitHub 绑定状态，支持绑定和解绑。
 * GitHub-only 用户（无密码）不能解绑，需先设置密码。
 */

'use client'

import { useEffect, useRef } from 'react'
import { Button, Typography, App, Avatar, Empty, Spin } from 'antd'
import { GithubOutlined, DisconnectOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOAuthAccounts, useUnbindOAuthAccount } from '@/hooks/useAuth'
import { AUTH_PROVIDER } from '@/constants/auth'
import { useAuthStore as useAuthStoreHook } from '@/stores/useAuthStore'
import { useI18n } from '@/i18n'

const { Text } = Typography

export default function GitHubBindingCard() {
  const { user } = useAuthStore()
  const { message, modal } = App.useApp()
  const { locale, t } = useI18n()
  const searchParams = useSearchParams()
  const { data: accounts, isLoading, refetch } = useOAuthAccounts()
  const { mutate: unbind, isPending: isUnbinding } = useUnbindOAuthAccount()

  const hasPassword = user ? (user.auth_provider & AUTH_PROVIDER.PASSWORD) !== 0 : false
  const githubAccount = accounts?.find(a => a.provider === 'github')

  // 绑定成功后刷新数据（用 ref 防止重复执行）
  const bindHandled = useRef(false)
  useEffect(() => {
    if (bindHandled.current) return
    const bindStatus = searchParams.get('bind')
    if (!bindStatus) return

    bindHandled.current = true

    // 清除 URL 中的 bind 参数，防止刷新重复触发
    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('bind')
    cleanUrl.searchParams.delete('reason')
    window.history.replaceState(null, '', cleanUrl.toString())

    if (bindStatus === 'success') {
      refetch()
      // 更新本地 user 的 auth_provider
      const currentUser = useAuthStoreHook.getState().user
      if (currentUser) {
        useAuthStoreHook.getState().updateUser({
          auth_provider: currentUser.auth_provider | AUTH_PROVIDER.GITHUB,
        })
      }
      message.success(t('security.githubBindSuccess'))
    } else if (bindStatus === 'error') {
      const reason = searchParams.get('reason')
      const errorMsg = reason === 'already_bound'
        ? t('security.githubAlreadyBound')
        : reason === 'invalid_state'
          ? t('security.githubBindExpired')
          : t('security.githubBindFailed')
      message.error(errorMsg)
    }
  })

  const handleBind = () => {
    // 直接跳转，start 路由会从 token cookie 读取当前用户
    window.location.href = '/api/auth/github/start?mode=bind'
  }

  const handleUnbind = () => {
    if (!githubAccount) return

    if (!hasPassword) {
      message.warning(t('security.githubSetPasswordBeforeUnbind'))
      return
    }

    const username = githubAccount.provider_username || t('security.unknown')
    modal.confirm({
      title: t('security.githubUnbindTitle'),
      content: t('security.githubUnbindContent', { username }),
      okText: t('security.githubUnbind'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => unbind(githubAccount.id),
    })
  }

  if (isLoading) {
    return (
      <div style={{ maxWidth: 480, display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480 }}>
      {/* 状态卡片 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 28,
          padding: '16px 18px',
          backgroundColor: githubAccount ? '#f6ffed' : '#f6f8fa',
          borderRadius: 10,
          border: `1px solid ${githubAccount ? '#b7eb8f' : '#f0f0f0'}`,
        }}
      >
        {githubAccount ? (
          <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a', flexShrink: 0 }} />
        ) : (
          <GithubOutlined style={{ fontSize: 20, color: '#8c8c8c', flexShrink: 0 }} />
        )}
        <div>
          <Text strong style={{ display: 'block', fontSize: 14, marginBottom: 2 }}>
            {t('security.githubBindingStatus', {
              status: githubAccount ? t('security.githubBound') : t('security.githubUnbound'),
            })}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {githubAccount
              ? t('security.githubLinked', { username: githubAccount.provider_username || t('security.unknown') })
              : t('security.githubLoginHint')}
          </Text>
        </div>
      </div>

      {/* 已绑定：显示账号信息 + 解绑按钮 */}
      {githubAccount ? (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              backgroundColor: '#fff',
              borderRadius: 10,
              border: '1px solid #f0f0f0',
              marginBottom: 16,
            }}
          >
            {githubAccount.avatar_url ? (
              <Avatar src={githubAccount.avatar_url} size={40} />
            ) : (
              <Avatar icon={<GithubOutlined />} size={40} style={{ backgroundColor: '#24292f' }} />
            )}
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: 'block', fontSize: 14 }}>
                @{githubAccount.provider_username || t('security.unknown')}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('security.githubBoundAt', {
                  date: new Date(githubAccount.created_at).toLocaleDateString(locale),
                })}
              </Text>
            </div>
          </div>

          {!hasPassword && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fff7e6',
                borderRadius: 8,
                border: '1px solid #ffd591',
                marginBottom: 16,
              }}
            >
              <Text type="warning" style={{ fontSize: 13 }}>
                {t('security.githubNoPasswordWarning')}
              </Text>
            </div>
          )}

          <Button
            danger
            icon={<DisconnectOutlined />}
            loading={isUnbinding}
            disabled={!hasPassword}
            onClick={handleUnbind}
            style={{ height: 42, borderRadius: 8, width: '100%', fontSize: 15 }}
          >
            {t('security.githubUnbindAccount')}
          </Button>
        </div>
      ) : (
        /* 未绑定：显示绑定按钮 */
        <div>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t('security.githubEmpty')}
              </Text>
            }
            style={{ marginBottom: 20 }}
          />
          <Button
            type="primary"
            icon={<GithubOutlined />}
            onClick={handleBind}
            style={{ height: 42, borderRadius: 8, width: '100%', fontSize: 15, backgroundColor: '#24292f', borderColor: '#24292f' }}
          >
            {t('security.githubBindAccount')}
          </Button>
        </div>
      )}
    </div>
  )
}
