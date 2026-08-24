/**
 * 账号安全页面
 *
 * 左侧竖导航（用户名 / 修改密码 / 二次验证 / GitHub 绑定）+ 右侧内容
 *
 * 支持 URL query param `tab` 来指定初始激活的 tab（如绑定 GitHub 后跳回）
 */

'use client'

import { Suspense } from 'react'
import { Spin } from 'antd'
import { useRouter, useSearchParams } from 'next/navigation'
import SettingsPageLayout from '@/components/layout/SettingsPageLayout'
import ChangePasswordForm from '@/components/settings/ChangePasswordForm'
import OtpSettings from '@/components/settings/OtpSettings'
import ChangeUsernameForm from '@/components/settings/ChangeUsernameForm'
import GitHubBindingCard from '@/components/settings/GitHubBindingCard'
import { useI18n } from '@/i18n'

function SecurityPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useI18n()
  const tabParam = searchParams.get('tab')
  const activeTab = tabParam || 'username'
  const securityNav = [
    { key: 'username', label: t('security.usernameTab'), icon: '👤' },
    { key: 'password', label: t('security.passwordTab'), icon: '🔒' },
    { key: 'otp', label: t('security.otpTab'), icon: '🛡️' },
    { key: 'github', label: t('security.githubTab'), icon: '🔗' },
  ]

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`/settings/security?${params.toString()}`)
  }

  return (
    <SettingsPageLayout
      title={t('security.title')}
      subtitle={t('security.subtitle')}
      navItems={securityNav}
      activeKey={activeTab}
      onNavChange={handleTabChange}
      size="lg"
    >
      {activeTab === 'username' && <ChangeUsernameForm />}
      {activeTab === 'password' && <ChangePasswordForm />}
      {activeTab === 'otp' && <OtpSettings />}
      {activeTab === 'github' && <GitHubBindingCard />}
    </SettingsPageLayout>
  )
}

export default function SecurityPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin /></div>}>
      <SecurityPageInner />
    </Suspense>
  )
}
