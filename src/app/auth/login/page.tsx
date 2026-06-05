/**
 * 登录页面
 *
 * 第一屏：GitHub 登录（推荐）+ 用户名密码登录（老用户）
 * OTP 验证码在后端返回 OTP_REQUIRED 后原位展开
 */

'use client'

import { useState, useEffect } from 'react'
import { Form, Input, Button, Typography, App } from 'antd'
import { UserOutlined, LockOutlined, SafetyOutlined, GithubOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { login as loginApi } from '@/services/auth'
import { useAuthStore } from '@/stores/useAuthStore'
import { queryClient } from '@/lib/query-client'
import { hasGuestData } from '@/services/guest-migration'
import AuthShell from '@/components/layout/AuthShell'
import { COOKIE_MAX_AGE } from '@/constants'
import { getErrorCode, getErrorMessage } from '@/utils/error'
import type { LoginRequest } from '@/types/auth'

const { Text } = Typography

export default function LoginPage() {
  const [form] = Form.useForm()
  const router = useRouter()
  const { loginSuccess } = useAuthStore()
  const { message } = App.useApp()
  const [showOtp, setShowOtp] = useState(false)

  // 处理 OAuth 回调带回的错误
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    if (!error) return

    const errorMessages: Record<string, string> = {
      github_config: 'GitHub OAuth 未配置，请联系管理员',
      github_state: 'GitHub 登录请求已过期，请重试',
      github_token: 'GitHub 授权失败，请重试',
      github_callback: 'GitHub 登录失败，请检查网络后重试',
      account_disabled: '账号已被禁用，请联系管理员',
    }
    message.error(errorMessages[error] || '登录失败，请重试')

    // 清除 URL 中的 error 参数
    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('error')
    window.history.replaceState(null, '', cleanUrl.toString())
  }, [message])

  const { mutate: login, isPending } = useMutation({
    mutationFn: (credentials: LoginRequest) => loginApi(credentials),
    onSuccess: (data) => {
      queryClient.clear()
      loginSuccess(data.token, data.user)
      document.cookie = `token=${data.token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
      message.success('登录成功')
      router.push(hasGuestData() ? '/auth/migrate' : '/resumes')
    },
    onError: (error: Error) => {
      if (getErrorCode(error) === 'OTP_REQUIRED') {
        setShowOtp(true)
      } else {
        message.error(getErrorMessage(error, '登录失败'))
      }
    },
  })

  return (
    <AuthShell title="继续使用职迹">
      {/* GitHub 登录 — 推荐入口 */}
      <Button
        block
        size="large"
        icon={<GithubOutlined />}
        href="/api/auth/github/start?mode=login"
        style={{ marginBottom: 20 }}
      >
        使用 GitHub 登录
      </Button>

      {/* 分隔线 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
        <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          或使用账号密码
        </Text>
        <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
      </div>

      {/* 账号密码登录 */}
      <Form
        form={form}
        onFinish={(values: LoginRequest) => login(values)}
        autoComplete="off"
        size="large"
        style={{ marginBottom: 12 }}
      >
        <Form.Item
          name="username"
          rules={[{ required: true, message: '请输入用户名' }]}
          style={{ marginBottom: 12 }}
        >
          <Input prefix={<UserOutlined />} placeholder="用户名" />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: '请输入密码' }]}
          style={{ marginBottom: showOtp ? 12 : 16 }}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="密码" />
        </Form.Item>

        {showOtp && (
          <Form.Item
            name="otp_code"
            style={{ marginBottom: 16 }}
            rules={[
              { required: true, message: '请输入 OTP 验证码' },
              { len: 6, message: 'OTP 验证码为 6 位数字' },
            ]}
            extra={
              <span style={{ fontSize: 12 }}>
                <SafetyOutlined style={{ marginRight: 4 }} />
                请输入 Google Authenticator 中的验证码
              </span>
            }
          >
            <Input
              prefix={<SafetyOutlined />}
              placeholder="6 位 OTP 验证码"
              maxLength={6}
              autoFocus
            />
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 12 }}>
          <Button type="primary" htmlType="submit" loading={isPending} block>
            登录
          </Button>
        </Form.Item>
      </Form>

      {/* 底部链接 */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          还没有账号？{' '}
          <Link href="/auth/register">注册新账号</Link>
        </Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          <Link href="/resumes">以游客身份使用</Link>
        </Text>
      </div>
    </AuthShell>
  )
}
