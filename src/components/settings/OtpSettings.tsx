/**
 * OTP 二次验证设置组件
 *
 * 状态卡片 + 操作区域，清晰的视觉层级
 *
 * GitHub-only 用户（auth_provider 不含 PASSWORD 位）不可启用 OTP，
 * 需提示先设置账号密码。
 */

'use client'

import { useState } from 'react'
import { Form, Input, Button, Space, Typography } from 'antd'
import {
  LockOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  GithubOutlined,
  KeyOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  useSetupOtp,
  useVerifyOtp,
  useDisableOtp,
  useRegenerateRecoveryCodes,
} from '@/hooks/useAuth'
import { AUTH_PROVIDER } from '@/constants/auth'
import type { SetupOtpResponse } from '@/types/auth'
import OtpEnrollmentPanel from './OtpEnrollmentPanel'
import OtpRecoveryCodesPanel from './OtpRecoveryCodesPanel'

const { Text } = Typography

interface CredentialFields {
  password: string
  otp_code?: string
}

export default function OtpSettings() {
  const { user } = useAuthStore()
  const { mutate: setupOtp, isPending: isSettingUpOtp } = useSetupOtp()
  const { mutate: verifyOtp, isPending: isVerifyingOtp } = useVerifyOtp()
  const { mutate: disableOtp, isPending: isDisablingOtp } = useDisableOtp()
  const {
    mutate: regenerateRecoveryCodes,
    isPending: isRegeneratingRecoveryCodes,
  } = useRegenerateRecoveryCodes()

  const [credentialForm] = Form.useForm<CredentialFields>()
  const [otpData, setOtpData] = useState<SetupOtpResponse | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])

  // 判断是否为账号密码用户
  const hasPassword = user ? (user.auth_provider & AUTH_PROVIDER.PASSWORD) !== 0 : false

  const handleSetupOtp = ({ password }: CredentialFields) => {
    setupOtp(password, {
      onSuccess: (data) => {
        // The enrollment panel has its own Form instance; clear the password
        // before rendering the secret and QR code.
        credentialForm.resetFields()
        setOtpData(data)
      },
    })
  }

  const handleVerifyOtp = (code: string) => {
    verifyOtp(code, {
      onSuccess: (data) => {
        setRecoveryCodes(data.recovery_codes)
        setOtpData(null)
      },
    })
  }

  const handleDisableOtp = ({ password, otp_code }: CredentialFields) => {
    if (!otp_code) return
    disableOtp({ password, code: otp_code }, {
      onSuccess: () => credentialForm.resetFields(),
    })
  }

  const handleRegenerateRecoveryCodes = ({
    password,
    otp_code,
  }: CredentialFields) => {
    if (!otp_code) return
    regenerateRecoveryCodes({ password, code: otp_code }, {
      onSuccess: (data) => {
        setRecoveryCodes(data.recovery_codes)
        credentialForm.resetFields()
      },
    })
  }

  const handleDisableOtpClick = () => {
    void credentialForm
      .validateFields()
      .then(handleDisableOtp)
      .catch(() => undefined)
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
      {recoveryCodes.length > 0 ? (
        <OtpRecoveryCodesPanel
          codes={recoveryCodes}
          onConfirmSaved={() => setRecoveryCodes([])}
        />
      ) : otpData ? (
        <OtpEnrollmentPanel
          key={otpData.secret}
          otpData={otpData}
          isVerifying={isVerifyingOtp}
          onVerify={handleVerifyOtp}
          onCancel={() => setOtpData(null)}
        />
      ) : (
        <Form<CredentialFields>
          form={credentialForm}
          layout="vertical"
          requiredMark={false}
          disabled={
            isSettingUpOtp
            || isRegeneratingRecoveryCodes
            || isDisablingOtp
          }
          onFinish={
            isEnabled ? handleRegenerateRecoveryCodes : handleSetupOtp
          }
        >
          <Form.Item
            name="password"
            label={
              <Text style={{ fontSize: 13, color: '#8c8c8c' }}>
                账号密码
              </Text>
            }
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
              label={
                <Text style={{ fontSize: 13, color: '#8c8c8c' }}>
                  当前验证码或恢复码
                </Text>
              }
              rules={[{ required: true, message: '请输入验证码或恢复码' }]}
              style={{ marginBottom: 20 }}
            >
              <Input
                prefix={<SafetyOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="6 位验证码或恢复码"
                autoComplete="one-time-code"
                maxLength={19}
                style={{ height: 42, borderRadius: 8, fontSize: 16 }}
              />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            {isEnabled ? (
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Button
                  block
                  icon={<KeyOutlined />}
                  htmlType="submit"
                  loading={isRegeneratingRecoveryCodes}
                  disabled={isDisablingOtp}
                  style={{ height: 42, borderRadius: 8, fontSize: 15 }}
                >
                  重新生成恢复码
                </Button>
                <Button
                  type="primary"
                  danger
                  block
                  htmlType="button"
                  onClick={handleDisableOtpClick}
                  loading={isDisablingOtp}
                  disabled={isRegeneratingRecoveryCodes}
                  style={{ height: 42, borderRadius: 8, fontSize: 15 }}
                >
                  禁用 OTP 二次验证
                </Button>
              </Space>
            ) : (
              <Button
                type="primary"
                htmlType="submit"
                loading={isSettingUpOtp}
                style={{
                  height: 42,
                  borderRadius: 8,
                  width: '100%',
                  fontSize: 15,
                }}
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
