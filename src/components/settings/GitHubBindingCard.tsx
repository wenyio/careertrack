/**
 * GitHub 绑定管理组件
 *
 * 显示当前用户的 GitHub 绑定状态，支持绑定和解绑。
 * GitHub-only 用户（无密码）不能解绑，需先设置密码。
 */

'use client'

import { useEffect, useRef } from 'react'
import { Button, Typography, App, Avatar, Empty, Spin } from 'antd'
import { GithubOutlined, LinkOutlined, DisconnectOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOAuthAccounts, useUnbindOAuthAccount } from '@/hooks/useAuth'
import { AUTH_PROVIDER } from '@/constants/auth'
import { useAuthStore as useAuthStoreHook } from '@/stores/useAuthStore'

const { Text } = Typography

export default function GitHubBindingCard() {
  const { user } = useAuthStore()
  const { message, modal } = App.useApp()
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
      message.success('GitHub 账号绑定成功')
    } else if (bindStatus === 'error') {
      const reason = searchParams.get('reason')
      const errorMsg = reason === 'already_bound'
        ? '该 GitHub 账号已被其他用户绑定'
        : reason === 'invalid_state'
          ? '绑定请求已过期，请重试'
          : '绑定失败，请重试'
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
      message.warning('请先设置账号密码后再解绑 GitHub')
      return
    }

    modal.confirm({
      title: '确认解绑 GitHub',
      content: `确定要解绑 GitHub 账号 @${githubAccount.provider_username || '未知'} 吗？解绑后将无法使用 GitHub 登录。`,
      okText: '解绑',
      okType: 'danger',
      cancelText: '取消',
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
            GitHub 绑定：{githubAccount ? '已绑定' : '未绑定'}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {githubAccount
              ? `已关联 @${githubAccount.provider_username || '未知'}`
              : '绑定 GitHub 后可以使用 GitHub 快速登录'}
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
                @{githubAccount.provider_username || '未知'}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                绑定于 {new Date(githubAccount.created_at).toLocaleDateString('zh-CN')}
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
                当前账号未设置密码，解绑 GitHub 后将无法登录。请先在「修改密码」中设置密码。
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
            解绑 GitHub
          </Button>
        </div>
      ) : (
        /* 未绑定：显示绑定按钮 */
        <div>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" style={{ fontSize: 13 }}>
                绑定 GitHub 后可以快速登录，无需输入密码
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
            绑定 GitHub 账号
          </Button>
        </div>
      )}
    </div>
  )
}
