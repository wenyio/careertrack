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
import { getErrorMessage } from '@/utils/error'
import { useI18n } from '@/i18n'

function RegisterPageContent() {
  const [form] = Form.useForm()
  const router = useRouter()
  const { t } = useI18n()
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

    // 第一步的注册码字段在第二步不会渲染；读取完整表单状态以保留该值。
    const values = form.getFieldsValue(true)
    if (values.password !== values.confirmPassword) {
      message.error(t('auth.passwordMismatch'))
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
      loginSuccess(data.user)
      message.success(t('auth.registerSuccess'))
      router.push(hasGuestData() ? '/auth/migrate' : '/resumes')
    } catch (error: unknown) {
      message.error(getErrorMessage(error, t('auth.registerFailed')))
      setCurrentStep(1)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { title: t('auth.registrationCode') },
    { title: t('auth.setupAccount') },
    { title: t('auth.done') },
  ]

  return (
    <AuthShell title={t('auth.createAccount')} subtitle={t('auth.registerSubtitle')}>
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
              rules={[{ required: true, message: t('auth.registrationCodeRequired') }]}
            >
              <Input prefix={<KeyOutlined />} placeholder={t('auth.registrationCode')} autoFocus />
            </Form.Item>
            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" onClick={handleNext} block>
                {t('auth.next')}
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
                { required: true, message: t('auth.usernameRequired') },
                { min: 3, message: t('auth.usernameMin') },
                { max: 50, message: t('auth.usernameMax') },
              ]}
              style={{ marginBottom: 12 }}
            >
              <Input prefix={<UserOutlined />} placeholder={t('auth.username')} autoFocus />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[
                { required: true, message: t('auth.passwordRequired') },
                { min: 10, message: t('auth.passwordMin') },
              ]}
              style={{ marginBottom: 12 }}
            >
              <Input.Password prefix={<LockOutlined />} placeholder={t('auth.password')} />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              rules={[{ required: true, message: t('auth.confirmPasswordRequired') }]}
              style={{ marginBottom: 16 }}
            >
              <Input.Password prefix={<LockOutlined />} placeholder={t('auth.confirmPassword')} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" htmlType="submit" loading={loading} block>
                {t('auth.register')}
              </Button>
            </Form.Item>
            <Button block type="text" onClick={() => setCurrentStep(0)}>
              {t('auth.previous')}
            </Button>
          </>
        )}

        {/* Step 2: 提交中 */}
        {currentStep === 2 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Button type="primary" loading block size="large">
              {t('auth.registering')}
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
          {t('auth.githubRegister')}
        </Button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <span style={{ color: '#8c8c8c', fontSize: 13 }}>
          {t('auth.hasAccount')}{' '}
          <Link href="/auth/login">{t('auth.login')}</Link>
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
