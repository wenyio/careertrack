/**
 * OTP authenticator enrollment and first-code verification.
 *
 * QR generation remains local so the TOTP URI is never sent to a third-party
 * image service. The manual secret is always available as a fallback.
 */

'use client'

import { useEffect, useState } from 'react'
import { Alert, Button, Form, Input, Space, Typography } from 'antd'
import { SafetyOutlined, SecurityScanOutlined } from '@ant-design/icons'
import QRCode from 'qrcode'
import type { SetupOtpResponse } from '@/types/auth'

const { Text } = Typography

interface EnrollmentFields {
  otp_code: string
}

interface OtpEnrollmentPanelProps {
  otpData: SetupOtpResponse
  isVerifying: boolean
  onVerify: (code: string) => void
  onCancel: () => void
}

export default function OtpEnrollmentPanel({
  otpData,
  isVerifying,
  onVerify,
  onCancel,
}: OtpEnrollmentPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrError, setQrError] = useState(false)

  useEffect(() => {
    let cancelled = false

    QRCode.toDataURL(otpData.qr_code_url, {
      width: 180,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrError(true)
      })

    return () => {
      cancelled = true
    }
  }, [otpData.qr_code_url])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Text
          strong
          style={{ display: 'block', fontSize: 15, marginBottom: 12 }}
        >
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
              // eslint-disable-next-line @next/next/no-img-element -- QR is a local data URL.
              <img
                src={qrDataUrl}
                alt="OTP 二维码"
                width={180}
                height={180}
                style={{ display: 'block', borderRadius: 4 }}
              />
            ) : (
              <div
                aria-live="polite"
                style={{
                  width: 180,
                  height: 180,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: 12,
                }}
              >
                {qrError ? '二维码生成失败' : '生成中...'}
              </div>
            )}
          </div>
          {qrError && (
            <Alert
              type="warning"
              showIcon
              title="二维码生成失败，请使用下方密钥手动添加"
              style={{ width: '100%', marginBottom: 12 }}
            />
          )}
          <Text
            type="secondary"
            style={{ fontSize: 13, textAlign: 'center', marginBottom: 8 }}
          >
            使用身份验证器应用扫描此二维码
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            支持 Google Authenticator、Microsoft Authenticator、1Password
          </Text>
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              或手动输入密钥：
              <Text copyable style={{ fontSize: 12 }}>
                {otpData.secret}
              </Text>
            </Text>
          </div>
        </div>
      </div>

      <Form<EnrollmentFields>
        layout="vertical"
        requiredMark={false}
        disabled={isVerifying}
        onFinish={({ otp_code }) => onVerify(otp_code.trim())}
      >
        <Form.Item
          name="otp_code"
          label={
            <Text style={{ fontSize: 13, color: '#8c8c8c' }}>
              输入 6 位验证码
            </Text>
          }
          rules={[
            { required: true, message: '请输入验证码' },
            { pattern: /^\d{6}$/, message: '请输入 6 位数字验证码' },
          ]}
          style={{ marginBottom: 20 }}
        >
          <Input
            prefix={<SafetyOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            style={{
              height: 42,
              borderRadius: 8,
              fontSize: 16,
              letterSpacing: 4,
            }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={isVerifying}
              style={{ height: 42, borderRadius: 8, minWidth: 120 }}
            >
              验证并启用
            </Button>
            <Button
              htmlType="button"
              disabled={isVerifying}
              onClick={onCancel}
              style={{ height: 42, borderRadius: 8 }}
            >
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}
