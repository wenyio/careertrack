/**
 * 修改用户名组件
 *
 * 显示当前 username，输入新 username。
 * 账号密码用户需要输入当前密码。
 * GitHub-only 用户不显示密码框。
 */

'use client'

import { Form, Input, Button, Typography, App } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/useAuthStore'
import { useChangeUsername } from '@/hooks/useAuth'
import { AUTH_PROVIDER } from '@/constants/auth'

const { Text } = Typography

export default function ChangeUsernameForm() {
  const { user } = useAuthStore()
  const { message } = App.useApp()
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
            当前用户名
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
          label={<Text style={{ fontSize: 13, color: '#8c8c8c' }}>新用户名</Text>}
          rules={[
            { required: true, message: '请输入新用户名' },
            { min: 3, message: '用户名至少 3 个字符' },
            { max: 50, message: '用户名最多 50 个字符' },
            { pattern: /^[a-zA-Z0-9_一-鿿]+$/, message: '只能包含字母、数字、下划线和中文' },
          ]}
          style={{ marginBottom: 20 }}
        >
          <Input
            prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="输入新用户名"
            style={{ height: 42, borderRadius: 8 }}
          />
        </Form.Item>

        {hasPassword && (
          <Form.Item
            name="current_password"
            label={<Text style={{ fontSize: 13, color: '#8c8c8c' }}>当前密码</Text>}
            rules={[{ required: true, message: '请输入当前密码' }]}
            style={{ marginBottom: 20 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="输入当前密码以验证身份"
              style={{ height: 42, borderRadius: 8 }}
            />
          </Form.Item>
        )}

        {!hasPassword && (
          <div style={{ marginBottom: 20 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              当前账号通过 GitHub 登录，修改用户名无需输入密码。
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
            修改用户名
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}
