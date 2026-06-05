/**
 * OTP 二次验证设置组件
 *
 * 状态卡片 + 操作区域，清晰的视觉层级
 *
 * GitHub-only 用户（auth_provider 不含 PASSWORD 位）不可启用 OTP，
 * 需提示先设置账号密码。
 */

'use client'

import { useState, useEffect } from 'react'
import { Form, Input, Button, Space, Typography, App } from 'antd'
import { LockOutlined, SafetyOutlined, SecurityScanOutlined, CheckCircleOutlined, CloseCircleOutlined, GithubOutlined } from '@ant-design/icons'
import QRCode from 'qrcode'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSetupOtp, useVerifyOtp, useDisableOtp } from '@/hooks/useAuth'
import { AUTH_PROVIDER } from '@/constants/auth'

const { Text } = Typography

export default function OtpSettings() {
  const { user } = useAuthStore()
  const { message } = App.useApp()
  const { mutate: setupOtp, isPending: isSettingUpOtp } = useSetupOtp()
  const { mutate: verifyOtp, isPending: isVerifyingOtp } = useVerifyOtp()
  const { mutate: disableOtp, isPending: isDisablingOtp } = useDisableOtp()

  const [form] = Form.useForm()
  const [otpData, setOtpData] = useState<{ secret: string; qr_code_url: string } | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  // 判断是否为账号密码用户
  const hasPassword = user ? (user.auth_provider & AUTH_PROVIDER.PASSWORD) !== 0 : false

  // 客户端生成 QR 码（避免向第三方 API 泄露 OTP 密钥）
  useEffect(() => {
    if (!otpData?.qr_code_url) return

    let cancelled = false
    QRCode.toDataURL(otpData.qr_code_url, {
      width: 180,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch((err) => {
        if (!cancelled) console.error('QR 码生成失败:', err)
      })

    return () => { cancelled = true }
  }, [otpData?.qr_code_url])

  const handleSetupOtp = () => {
    const password = form.getFieldValue('password')
    if (!password) {
      message.error('请输入密码')
      return
    }
    setupOtp(password, {
      onSuccess: (data) => setOtpData(data),
    })
  }

  const handleVerifyOtp = () => {
    const code = form.getFieldValue('otp_code')
    if (!code) {
      message.error('请输入验证码')
      return
    }
    verifyOtp(code, {
      onSuccess: () => {
        setOtpData(null)
        setQrDataUrl(null)
        form.resetFields()
      },
    })
  }

  const handleDisableOtp = () => {
    const password = form.getFieldValue('password')
    const code = form.getFieldValue('otp_code')
    if (!password || !code) {
      message.error('请输入密码和验证码')
      return
    }
    disableOtp({ password, code }, {
      onSuccess: () => form.resetFields(),
    })
  }

  const isEnabled = user?.otp_enabled

  // GitHub-only 用户：显示提示，不显示操作区域
  if (!hasPassword) {
    return (
      <div style={{ maxWidth: 480 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 28,
            padding: '16px 18px',
            backgroundColor: '#fff7e6',
            borderRadius: 10,
            border: '1px solid #ffd591',
          }}
        >
          <GithubOutlined style={{ fontSize: 20, color: '#fa8c16', flexShrink: 0 }} />
          <div>
            <Text strong style={{ display: 'block', fontSize: 14, marginBottom: 2 }}>
              OTP 二次验证不可用
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              当前账号通过 GitHub 登录，需先设置账号密码后才能启用 OTP。
              OTP 仅用于保护账号密码登录。
            </Text>
          </div>
        </div>
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
          backgroundColor: isEnabled ? '#f6ffed' : '#fff7e6',
          borderRadius: 10,
          border: `1px solid ${isEnabled ? '#b7eb8f' : '#ffd591'}`,
        }}
      >
        {isEnabled ? (
          <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a', flexShrink: 0 }} />
        ) : (
          <CloseCircleOutlined style={{ fontSize: 20, color: '#fa8c16', flexShrink: 0 }} />
        )}
        <div>
          <Text strong style={{ display: 'block', fontSize: 14, marginBottom: 2 }}>
            OTP 二次验证：{isEnabled ? '已启用' : '未启用'}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {isEnabled
              ? '您的账号已受到双重保护，登录时需要验证码'
              : '启用后登录时需要输入身份验证器应用生成的验证码'}
          </Text>
        </div>
      </div>

      {/* 操作区域 */}
      {otpData ? (
        /* 扫码验证流程 */
        <div>
          <div style={{ marginBottom: 24 }}>
            <Text strong style={{ display: 'block', fontSize: 15, marginBottom: 12 }}>
              <SecurityScanOutlined style={{ marginRight: 8, color: '#1677ff' }} />
              扫描二维码
            </Text>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 24,
                backgroundColor: '#fafafa',
                borderRadius: 10,
                border: '1px solid #f0f0f0',
              }}
            >
              <div
                style={{
                  padding: 16,
                  background: '#fff',
                  borderRadius: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  marginBottom: 16,
                }}
              >
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- QR 码为 data URL，无需 next/image 优化
                  <img
                    src={qrDataUrl}
                    alt="OTP QR Code"
                    style={{ display: 'block', borderRadius: 4 }}
                  />
                ) : (
                  <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12 }}>
                    生成中...
                  </div>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: 13, textAlign: 'center', marginBottom: 8 }}>
                使用身份验证器应用扫描此二维码
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                支持 Google Authenticator、Microsoft Authenticator、1Password
              </Text>
              <div style={{ marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  或手动输入密钥：<Text copyable style={{ fontSize: 12 }}>{otpData.secret}</Text>
                </Text>
              </div>
            </div>
          </div>

          <Form form={form} layout="vertical" requiredMark={false}>
            <Form.Item
              name="otp_code"
              label={<Text style={{ fontSize: 13, color: '#8c8c8c' }}>输入 6 位验证码</Text>}
              rules={[{ required: true, message: '请输入验证码' }]}
              style={{ marginBottom: 20 }}
            >
              <Input
                prefix={<SafetyOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="000000"
                maxLength={6}
                style={{ height: 42, borderRadius: 8, fontSize: 16, letterSpacing: 4 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Space style={{ width: '100%' }}>
                <Button
                  type="primary"
                  onClick={handleVerifyOtp}
                  loading={isVerifyingOtp}
                  style={{ height: 42, borderRadius: 8, minWidth: 120 }}
                >
                  验证并启用
                </Button>
                <Button
                  onClick={() => { setOtpData(null); setQrDataUrl(null); form.resetFields() }}
                  style={{ height: 42, borderRadius: 8 }}
                >
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      ) : (
        /* 初始状态：输入密码 */
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            name="password"
            label={<Text style={{ fontSize: 13, color: '#8c8c8c' }}>账号密码</Text>}
            rules={[{ required: true, message: '请输入密码' }]}
            style={{ marginBottom: 20 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="输入密码以继续"
              style={{ height: 42, borderRadius: 8 }}
            />
          </Form.Item>

          {isEnabled && (
            <Form.Item
              name="otp_code"
              label={<Text style={{ fontSize: 13, color: '#8c8c8c' }}>当前验证码</Text>}
              rules={[{ required: true, message: '请输入验证码' }]}
              style={{ marginBottom: 20 }}
            >
              <Input
                prefix={<SafetyOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="输入 6 位验证码"
                maxLength={6}
                style={{ height: 42, borderRadius: 8, fontSize: 16, letterSpacing: 4 }}
              />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            {isEnabled ? (
              <Button
                type="primary"
                danger
                onClick={handleDisableOtp}
                loading={isDisablingOtp}
                style={{ height: 42, borderRadius: 8, width: '100%', fontSize: 15 }}
              >
                禁用 OTP 二次验证
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleSetupOtp}
                loading={isSettingUpOtp}
                style={{ height: 42, borderRadius: 8, width: '100%', fontSize: 15 }}
              >
                启用 OTP 二次验证
              </Button>
            )}
          </Form.Item>
        </Form>
      )}
    </div>
  )
}
