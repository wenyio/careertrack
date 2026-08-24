/**
 * 修改密码表单组件
 *
 * 有密码的用户：输入当前密码 + 新密码。
 * GitHub-only 用户（无密码）：直接设置新密码，设置后可启用 OTP。
 */

'use client'

import { useState } from 'react'
import { Form, Input, Button, Typography, App } from 'antd'
import { LockOutlined, CheckCircleOutlined, GithubOutlined } from '@ant-design/icons'
import { changePassword } from '@/services/auth'
import { useAuthStore } from '@/stores/useAuthStore'
import { AUTH_PROVIDER } from '@/constants/auth'
import { getErrorMessage } from '@/utils/error'
import { useI18n } from '@/i18n'

const { Text } = Typography

export default function ChangePasswordForm() {
  const { user, updateUser } = useAuthStore()
  const { message } = App.useApp()
  const { t } = useI18n()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const hasPassword = user ? (user.auth_provider & AUTH_PROVIDER.PASSWORD) !== 0 : false

  const handleSubmit = async (values: {
    current_password?: string
    new_password: string
    confirm_password: string
  }) => {
    if (values.new_password !== values.confirm_password) {
      message.error(t('security.passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      await changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      })
      message.success(hasPassword ? t('security.passwordChanged') : t('security.passwordSet'))
      form.resetFields()
      // 如果是首次设置密码，更新本地 auth_provider
      if (!hasPassword && user) {
        updateUser({ auth_provider: user.auth_provider | AUTH_PROVIDER.PASSWORD })
      }
    } catch (error: unknown) {
      message.error(getErrorMessage(error, t('security.passwordChangeFailed')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      {/* 头部说明 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 28,
          padding: '16px 18px',
          backgroundColor: hasPassword ? '#f6ffed' : '#e6f4ff',
          borderRadius: 10,
          border: `1px solid ${hasPassword ? '#b7eb8f' : '#91caff'}`,
        }}
      >
        {hasPassword ? (
          <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a', flexShrink: 0 }} />
        ) : (
          <GithubOutlined style={{ fontSize: 20, color: '#1677ff', flexShrink: 0 }} />
        )}
        <div>
          <Text strong style={{ display: 'block', fontSize: 14, marginBottom: 2 }}>
            {hasPassword ? t('security.passwordSafe') : t('security.setupPasswordTitle')}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {hasPassword
              ? t('security.passwordSafeHint')
              : t('security.setupPasswordHint')}
          </Text>
        </div>
      </div>

      {/* 表单 */}
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        requiredMark={false}
        style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        {hasPassword && (
          <Form.Item
            name="current_password"
            label={<Text style={{ fontSize: 13, color: '#8c8c8c' }}>{t('security.currentPassword')}</Text>}
            rules={[{ required: true, message: t('security.currentPasswordRequired') }]}
            style={{ marginBottom: 16 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder={t('security.enterCurrentPassword')}
              style={{ height: 42, borderRadius: 8 }}
            />
          </Form.Item>
        )}

        <Form.Item
          name="new_password"
          label={<Text style={{ fontSize: 13, color: '#8c8c8c' }}>{hasPassword ? t('security.newPassword') : t('security.setupPassword')}</Text>}
          rules={[
            { required: true, message: t('security.newPasswordRequired') },
            { min: 10, message: t('auth.passwordMin') },
          ]}
          style={{ marginBottom: 16 }}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
            placeholder={t('security.newPasswordPlaceholder')}
            style={{ height: 42, borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          name="confirm_password"
          label={<Text style={{ fontSize: 13, color: '#8c8c8c' }}>{t('security.confirmNewPassword')}</Text>}
          rules={[{ required: true, message: t('security.confirmNewPasswordRequired') }]}
          style={{ marginBottom: 24 }}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
            placeholder={t('security.confirmNewPasswordPlaceholder')}
            style={{ height: 42, borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            style={{ height: 42, borderRadius: 8, width: '100%', fontSize: 15 }}
          >
            {hasPassword ? t('security.changePassword') : t('security.setupPassword')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}
