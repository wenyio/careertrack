/**
 * 修改用户名组件
 *
 * 显示当前 username，输入新 username。
 * 账号密码用户需要输入当前密码。
 * GitHub-only 用户不显示密码框。
 */

'use client'

import { Form, Input, Button, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/useAuthStore'
import { useChangeUsername } from '@/hooks/useAuth'
import { AUTH_PROVIDER } from '@/constants/auth'
import { useI18n } from '@/i18n'

const { Text } = Typography

export default function ChangeUsernameForm() {
  const { user } = useAuthStore()
  const { t } = useI18n()
  const [form] = Form.useForm()
  const { mutate: changeUsername, isPending } = useChangeUsername()

  const hasPassword = user ? (user.auth_provider & AUTH_PROVIDER.PASSWORD) !== 0 : false

  const handleSubmit = (values: { username: string; current_password?: string }) => {
    changeUsername(
      {
        username: values.username,
        current_password: values.current_password,
      },
      {
        onSuccess: () => form.resetFields(),
      }
    )
  }

  return (
    <div style={{ maxWidth: 480 }}>
      {/* 当前用户名 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 28,
          padding: '16px 18px',
          backgroundColor: '#f6f8fa',
          borderRadius: 10,
          border: '1px solid #f0f0f0',
        }}
      >
        <UserOutlined style={{ fontSize: 20, color: '#1677ff', flexShrink: 0 }} />
        <div>
          <Text strong style={{ display: 'block', fontSize: 14, marginBottom: 2 }}>
            {t('security.currentUsername')}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {user?.username || '-'}
          </Text>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="username"
          label={<Text style={{ fontSize: 13, color: '#8c8c8c' }}>{t('security.newUsername')}</Text>}
          rules={[
            { required: true, message: t('security.newUsernameRequired') },
            { min: 3, message: t('auth.usernameMin') },
            { max: 50, message: t('auth.usernameMax') },
            { pattern: /^[a-zA-Z0-9_一-鿿]+$/, message: t('security.usernamePattern') },
          ]}
          style={{ marginBottom: 20 }}
        >
          <Input
            prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
            placeholder={t('security.newUsernamePlaceholder')}
            style={{ height: 42, borderRadius: 8 }}
          />
        </Form.Item>

        {hasPassword && (
          <Form.Item
            name="current_password"
            label={<Text style={{ fontSize: 13, color: '#8c8c8c' }}>{t('security.currentPassword')}</Text>}
            rules={[{ required: true, message: t('security.currentPasswordRequired') }]}
            style={{ marginBottom: 20 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder={t('security.currentPasswordVerifyPlaceholder')}
              style={{ height: 42, borderRadius: 8 }}
            />
          </Form.Item>
        )}

        {!hasPassword && (
          <div style={{ marginBottom: 20 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('security.githubOnlyUsernameHint')}
            </Text>
          </div>
        )}

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={isPending}
            style={{ height: 42, borderRadius: 8, width: '100%', fontSize: 15 }}
          >
            {t('security.changeUsername')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}
