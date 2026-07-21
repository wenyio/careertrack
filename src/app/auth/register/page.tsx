/**
 * 注册页面
 *
 * 分步流程：
 * 1. 输入注册码
 * 2. 设置用户名、密码
 * 3. 提交注册并自动登录
 */

'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Form, Input, Button, Steps, App } from 'antd'
import { KeyOutlined, UserOutlined, LockOutlined, GithubOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { register as registerApi } from '@/services/auth'
import { useAuthStore } from '@/stores/useAuthStore'
import { queryClient } from '@/lib/query-client'
import { hasGuestData } from '@/services/guest-migration'
import AuthShell from '@/components/layout/AuthShell'
import { COOKIE_MAX_AGE } from '@/constants'
import { getErrorMessage } from '@/utils/error'

function RegisterPageContent() {
  const [form] = Form.useForm()
  const router = useRouter()
  const searchParams = useSearchParams()
  const registrationCode = searchParams.get('code') || undefined
  const { loginSuccess } = useAuthStore()
  const { message } = App.useApp()
  const [currentStep, setCurrentStep] = useState(registrationCode ? 1 : 0)
  const [loading, setLoading] = useState(false)

  // Step 0 → 1: 校验注册码后前进
  const handleNext = async () => {
    try {
      await form.validateFields(['registration_code'])
      setCurrentStep(1)
    } catch {
      // 校验失败，antd 自动显示错误
    }
  }

  // Step 1 → 提交注册
  const handleSubmit = async () => {
    try {
      await form.validateFields(['username', 'password', 'confirmPassword'])
    } catch {
      return
    }

    const values = form.getFieldsValue()
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }

    setCurrentStep(2)
    setLoading(true)
    try {
      const data = await registerApi({
        username: values.username,
        password: values.password,
        registration_code: values.registration_code,
      })

      queryClient.clear()
      loginSuccess(data.token, data.user)
      document.cookie = `token=${data.token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
      message.success('注册成功')
      router.push(hasGuestData() ? '/auth/migrate' : '/resumes')
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '注册失败'))
      setCurrentStep(1)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { title: '注册码' },
    { title: '设置账号' },
    { title: '完成' },
  ]

  return (
    <AuthShell title="创建账号" subtitle="使用注册码注册职迹账号">
      <Steps
        current={currentStep}
        items={steps}
        size="small"
        style={{ marginBottom: 24 }}
      />

      {/* 单个 Form 贯穿所有步骤，切步骤时值不丢失 */}
      <Form
        form={form}
        autoComplete="off"
        size="large"
        initialValues={{ registration_code: registrationCode }}
        onFinish={handleSubmit}
      >
        {/* Step 0: 输入注册码 */}
        {currentStep === 0 && (
          <>
            <Form.Item
              name="registration_code"
              rules={[{ required: true, message: '请输入注册码' }]}
            >
              <Input prefix={<KeyOutlined />} placeholder="注册码" autoFocus />
            </Form.Item>
            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" onClick={handleNext} block>
                下一步
              </Button>
            </Form.Item>
          </>
        )}

        {/* Step 1: 设置用户名和密码 */}
        {currentStep === 1 && (
          <>
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少 3 个字符' },
                { max: 50, message: '用户名最多 50 个字符' },
              ]}
              style={{ marginBottom: 12 }}
            >
              <Input prefix={<UserOutlined />} placeholder="用户名" autoFocus />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少 6 个字符' },
              ]}
              style={{ marginBottom: 12 }}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              rules={[{ required: true, message: '请再次输入密码' }]}
              style={{ marginBottom: 16 }}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" htmlType="submit" loading={loading} block>
                注册
              </Button>
            </Form.Item>
            <Button block type="text" onClick={() => setCurrentStep(0)}>
              返回上一步
            </Button>
          </>
        )}

        {/* Step 2: 提交中 */}
        {currentStep === 2 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Button type="primary" loading block size="large">
              正在注册…
            </Button>
          </div>
        )}
      </Form>

      {/* GitHub 注册入口 */}
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Button
          block
          icon={<GithubOutlined />}
          href="/api/auth/github/start?mode=register"
        >
          使用 GitHub 注册（无需注册码）
        </Button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <span style={{ color: '#8c8c8c', fontSize: 13 }}>
          已有账号？{' '}
          <Link href="/auth/login">登录</Link>
        </span>
      </div>
    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  )
}
