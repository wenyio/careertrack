/**
 * 个人信息管理页面
 *
 * 左侧竖导航切换模块 + 右侧表单内容
 */

'use client'

import { useState } from 'react'
import { Button, App } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import SettingsPageLayout from '@/components/layout/SettingsPageLayout'
import { MODULES } from '@/config/modules'
import BasicInfoForm from '@/components/resume/modules/BasicInfoForm'
import EducationForm from '@/components/resume/modules/EducationForm'
import SkillsForm from '@/components/resume/modules/SkillsForm'
import WorkExperienceForm from '@/components/resume/modules/WorkExperienceForm'
import ProjectsForm from '@/components/resume/modules/ProjectsForm'
import PortfolioForm from '@/components/resume/modules/PortfolioForm'
import AwardsForm from '@/components/resume/modules/AwardsForm'
import OtherExperienceForm from '@/components/resume/modules/OtherExperienceForm'
import ResearchForm from '@/components/resume/modules/ResearchForm'
import SummaryForm from '@/components/resume/modules/SummaryForm'
import type { Profile } from '@/types/profile'
import type { ResumeModuleType } from '@/types/resume'

// 动态渲染不同模块表单，各表单 Props 不同，此处使用 any 做类型擦除
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FORM_COMPONENTS: Record<ResumeModuleType, React.ComponentType<any>> = {
  basic_info: BasicInfoForm,
  education: EducationForm,
  skills: SkillsForm,
  work_experience: WorkExperienceForm,
  projects: ProjectsForm,
  portfolio: PortfolioForm,
  awards: AwardsForm,
  other_experience: OtherExperienceForm,
  research: ResearchForm,
  summary: SummaryForm,
}

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile()
  const { mutate: updateProfile, isPending: isSaving } = useUpdateProfile()
  const { message } = App.useApp()

  const [formData, setFormData] = useState<Partial<Profile>>({})
  const [activeModule, setActiveModule] = useState<ResumeModuleType>('basic_info')

  const handleChange = (field: keyof Profile, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    if (Object.keys(formData).length === 0) {
      message.info('没有需要保存的更改')
      return
    }
    updateProfile(formData, {
      onSuccess: () => {
        setFormData({})
      },
    })
  }

  const FormComponent = FORM_COMPONENTS[activeModule]

  return (
    <SettingsPageLayout
      title="个人信息管理"
      subtitle="维护您的个人信息，创建简历时可直接引用"
      navItems={[...MODULES]}
      activeKey={activeModule}
      onNavChange={(key) => setActiveModule(key as ResumeModuleType)}
      loading={isLoading}
      size="lg"
      extra={
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={isSaving}
          style={{ borderRadius: 8, height: 38, paddingLeft: 20, paddingRight: 20 }}
        >
          保存更改
        </Button>
      }
    >
      <FormComponent
        value={formData[activeModule]}
        defaultValue={profile?.[activeModule]}
        onChange={(val: unknown) => handleChange(activeModule, val)}
      />
    </SettingsPageLayout>
  )
}
