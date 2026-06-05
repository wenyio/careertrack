/**
 * 账号安全页面
 *
 * 左侧竖导航（用户名 / 修改密码 / 二次验证 / GitHub 绑定）+ 右侧内容
 *
 * 支持 URL query param `tab` 来指定初始激活的 tab（如绑定 GitHub 后跳回）
 */

'use client'

import { Suspense, useState, useEffect } from 'react'
import { Spin } from 'antd'
import { useSearchParams } from 'next/navigation'
import SettingsPageLayout from '@/components/layout/SettingsPageLayout'
import ChangePasswordForm from '@/components/settings/ChangePasswordForm'
import OtpSettings from '@/components/settings/OtpSettings'
import ChangeUsernameForm from '@/components/settings/ChangeUsernameForm'
import GitHubBindingCard from '@/components/settings/GitHubBindingCard'

const SECURITY_NAV = [
  { key: 'username', label: '用户名', icon: '👤' },
  { key: 'password', label: '修改密码', icon: '🔒' },
  { key: 'otp', label: '二次验证', icon: '🛡️' },
  { key: 'github', label: 'GitHub 绑定', icon: '🔗' },
]

function SecurityPageInner() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'username')

  // URL 中 tab 参数变化时同步切换（如 OAuth 回调跳回）
  useEffect(() => {
    if (tabParam) setActiveTab(tabParam)
  }, [tabParam])

  return (
    <SettingsPageLayout
      title="账号安全"
      subtitle="管理您的账号安全设置"
      navItems={SECURITY_NAV}
      activeKey={activeTab}
      onNavChange={setActiveTab}
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
