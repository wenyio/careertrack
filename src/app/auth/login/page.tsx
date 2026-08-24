/**
 * 登录页面
 *
 * 第一屏：GitHub 登录（推荐）+ 用户名密码登录（老用户）
 * OTP 验证码在后端返回 OTP_REQUIRED 后原位展开
 */

'use client'

import { useState, useEffect } from 'react'
import { Form, Input, Button, Typography, App } from 'antd'
import {
  UserOutlined,
  LockOutlined,
  SafetyOutlined,
  GithubOutlined,
  KeyOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { login as loginApi } from '@/services/auth'
import { useAuthStore } from '@/stores/useAuthStore'
import { queryClient } from '@/lib/query-client'
import { hasGuestData } from '@/services/guest-migration'
import AuthShell from '@/components/layout/AuthShell'
import { getErrorCode, getErrorMessage } from '@/utils/error'
import type { LoginRequest } from '@/types/auth'
import { useI18n } from '@/i18n'

const { Text } = Typography

export default function LoginPage() {
  const [form] = Form.useForm()
  const router = useRouter()
  const { loginSuccess } = useAuthStore()
  const { message } = App.useApp()
  const { t } = useI18n()
  const [showOtp, setShowOtp] = useState(false)
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)

  // 处理 OAuth 回调带回的错误
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    if (!error) return

    const errorMessages: Record<string, string> = {
      github_config: t('auth.githubConfig'),
      github_state: t('auth.githubState'),
      github_token: t('auth.githubToken'),
      github_callback: t('auth.githubCallback'),
      account_disabled: t('auth.accountDisabled'),
    }
    message.error(errorMessages[error] || t('auth.loginFailed'))

    // 清除 URL 中的 error 参数
    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('error')
    window.history.replaceState(null, '', cleanUrl.toString())
  }, [message, t])

  const { mutate: login, isPending } = useMutation({
    mutationFn: (credentials: LoginRequest) => loginApi(credentials),
    onSuccess: (data) => {
      queryClient.clear()
      loginSuccess(data.user)
      if (data.recovery_code_used) {
        message.warning(
          t('auth.recoveryUsed', { count: data.recovery_codes_remaining ?? 0 }),
        )
      } else {
        message.success(t('auth.loginSuccess'))
      }
      router.push(hasGuestData() ? '/auth/migrate' : '/resumes')
    },
    onError: (error: Error) => {
      if (getErrorCode(error) === 'OTP_REQUIRED') {
        setShowOtp(true)
      } else {
        message.error(getErrorMessage(error, t('auth.loginFailed')))
      }
    },
  })

  return (
    <AuthShell title={t('auth.continue')}>
      {/* GitHub 登录 — 推荐入口 */}
      <Button
        block
        size="large"
        icon={<GithubOutlined />}
        href="/api/auth/github/start?mode=login"
        style={{ marginBottom: 20 }}
      >
        {t('auth.githubLogin')}
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
          {t('auth.orPassword')}
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
          rules={[{ required: true, message: t('auth.usernameRequired') }]}
          style={{ marginBottom: 12 }}
        >
          <Input prefix={<UserOutlined />} placeholder={t('auth.username')} />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: t('auth.passwordRequired') }]}
          style={{ marginBottom: showOtp ? 12 : 16 }}
        >
          <Input.Password prefix={<LockOutlined />} placeholder={t('auth.password')} />
        </Form.Item>

        {showOtp && (
          <>
            <Form.Item
              name={useRecoveryCode ? 'recovery_code' : 'otp_code'}
              style={{ marginBottom: 8 }}
              rules={useRecoveryCode
                ? [
                  { required: true, message: t('auth.recoveryCodeRequired') },
                  {
                    pattern: /^[A-Fa-f0-9]{4}(?:-?[A-Fa-f0-9]{4}){3}$/,
                    message: t('auth.recoveryCodeInvalid'),
                  },
                ]
                : [
                  { required: true, message: t('auth.otpRequired') },
                  { pattern: /^\d{6}$/, message: t('auth.otpDigits') },
                ]}
              extra={
                <span style={{ fontSize: 12 }}>
                  {useRecoveryCode ? (
                    <KeyOutlined style={{ marginRight: 4 }} />
                  ) : (
                    <SafetyOutlined style={{ marginRight: 4 }} />
                  )}
                  {useRecoveryCode
                    ? t('auth.recoveryOnce')
                    : t('auth.authenticatorHint')}
                </span>
              }
            >
              <Input
                prefix={useRecoveryCode
                  ? <KeyOutlined />
                  : <SafetyOutlined />}
                placeholder={useRecoveryCode ? 'XXXX-XXXX-XXXX-XXXX' : t('auth.otpPlaceholder')}
                maxLength={useRecoveryCode ? 19 : 6}
                autoComplete="one-time-code"
                autoFocus
              />
            </Form.Item>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, marginBottom: 12 }}
              onClick={() => {
                form.setFieldValue(
                  useRecoveryCode ? 'recovery_code' : 'otp_code',
                  undefined,
                )
                setUseRecoveryCode((current) => !current)
              }}
            >
              {useRecoveryCode ? t('auth.useAuthenticator') : t('auth.useRecovery')}
            </Button>
          </>
        )}

        <Form.Item style={{ marginBottom: 12 }}>
          <Button type="primary" htmlType="submit" loading={isPending} block>
            {t('auth.login')}
          </Button>
        </Form.Item>
      </Form>

      {/* 底部链接 */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {t('auth.noAccount')}{' '}
          <Link href="/auth/register">{t('auth.register')}</Link>
        </Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          <Link href="/resumes">{t('auth.guest')}</Link>
        </Text>
      </div>
    </AuthShell>
  )
}
