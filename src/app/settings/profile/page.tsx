/**
 * 个人信息管理页面
 *
 * 左侧竖导航切换模块 + 右侧表单内容
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, App, Space } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import SettingsPageLayout from '@/components/layout/SettingsPageLayout'
import { MODULES } from '@/config/modules'
import { AUTO_SAVE_DELAY } from '@/constants'
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

type ProfileSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

const SAVE_STATUS_MAP: Record<ProfileSaveStatus, { text: string; color: string }> = {
  idle: { text: '', color: '#8c8c8c' },
  pending: { text: '将自动保存', color: '#faad14' },
  saving: { text: '保存中...', color: '#1677ff' },
  saved: { text: '已保存', color: '#52c41a' },
  error: { text: '保存失败', color: '#ff4d4f' },
}

function hasProfileChanges(data: Partial<Profile>) {
  return Object.keys(data).length > 0
}

function isSameProfileValue(a: unknown, b: unknown) {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return Object.is(a, b)
  }
}

function removeSavedProfileFields(current: Partial<Profile>, saved: Partial<Profile>) {
  const next = { ...current }

  for (const key of Object.keys(saved) as Array<keyof Profile>) {
    if (isSameProfileValue(current[key], saved[key])) {
      delete next[key]
    }
  }

  return next
}

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile()
  const { mutate: updateProfile, isPending: isSaving } = useUpdateProfile()
  const { mutate: updateProfileSilently, isPending: isAutoSaving } = useUpdateProfile({ silent: true })
  const { message } = App.useApp()

  const [formData, setFormData] = useState<Partial<Profile>>({})
  const [saveStatus, setSaveStatus] = useState<ProfileSaveStatus>('idle')
  const [activeModule, setActiveModule] = useState<ResumeModuleType>('basic_info')
  const formDataRef = useRef<Partial<Profile>>({})
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const statusResetTimerRef = useRef<NodeJS.Timeout | null>(null)

  const clearAutoSaveTimer = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
  }

  const clearStatusResetTimer = () => {
    if (statusResetTimerRef.current) {
      clearTimeout(statusResetTimerRef.current)
      statusResetTimerRef.current = null
    }
  }

  const resetStatusLater = () => {
    clearStatusResetTimer()
    statusResetTimerRef.current = setTimeout(() => {
      setSaveStatus('idle')
    }, 3000)
  }

  const clearSavedFields = (savedData: Partial<Profile>) => {
    const next = removeSavedProfileFields(formDataRef.current, savedData)
    formDataRef.current = next
    setFormData(next)
    return next
  }

  const queueAutoSave = (nextData: Partial<Profile>) => {
    clearAutoSaveTimer()
    clearStatusResetTimer()

    if (!hasProfileChanges(nextData)) {
      setSaveStatus('idle')
      return
    }

    setSaveStatus('pending')
    autoSaveTimerRef.current = setTimeout(() => {
      const snapshot = { ...formDataRef.current }
      if (!hasProfileChanges(snapshot)) {
        setSaveStatus('idle')
        return
      }

      setSaveStatus('saving')
      updateProfileSilently(snapshot, {
        onSuccess: () => {
          const remaining = clearSavedFields(snapshot)
          if (hasProfileChanges(remaining)) {
            queueAutoSave(remaining)
          } else {
            setSaveStatus('saved')
            resetStatusLater()
          }
        },
        onError: () => {
          setSaveStatus('error')
        },
      })
    }, AUTO_SAVE_DELAY)
  }

  const handleChange = (field: keyof Profile, value: unknown) => {
    const next = { ...formDataRef.current, [field]: value } as Partial<Profile>
    formDataRef.current = next
    setFormData(next)
    queueAutoSave(next)
  }

  const handleSave = () => {
    clearAutoSaveTimer()

    const snapshot = { ...formDataRef.current }
    if (!hasProfileChanges(snapshot)) {
      message.info('没有需要保存的更改')
      return
    }

    clearStatusResetTimer()
    setSaveStatus('saving')
    updateProfile(snapshot, {
      onSuccess: () => {
        const remaining = clearSavedFields(snapshot)
        if (hasProfileChanges(remaining)) {
          queueAutoSave(remaining)
        } else {
          setSaveStatus('saved')
          resetStatusLater()
        }
      },
      onError: () => {
        setSaveStatus('error')
      },
    })
  }

  useEffect(() => {
    return () => {
      clearAutoSaveTimer()
      clearStatusResetTimer()
    }
  }, [])

  const FormComponent = FORM_COMPONENTS[activeModule]
  const hasChanges = hasProfileChanges(formData)
  const effectiveSaveStatus: ProfileSaveStatus = isSaving || isAutoSaving ? 'saving' : saveStatus
  const status = SAVE_STATUS_MAP[effectiveSaveStatus]
  const showFloatingSave = hasChanges || effectiveSaveStatus !== 'idle'
  const saveButtonDisabled = !hasChanges || isSaving || isAutoSaving

  return (
    <>
      <SettingsPageLayout
        title="个人信息管理"
        subtitle="维护您的个人信息，创建简历时可直接引用"
        navItems={[...MODULES]}
        activeKey={activeModule}
        onNavChange={(key) => setActiveModule(key as ResumeModuleType)}
        loading={isLoading}
        size="lg"
        extra={
          <Space size={12} align="center">
            {status.text && (
              <span style={{ fontSize: 13, color: status.color }}>
                {status.text}
              </span>
            )}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={isSaving}
              disabled={saveButtonDisabled}
              style={{ borderRadius: 8, height: 38, paddingLeft: 20, paddingRight: 20 }}
            >
              保存更改
            </Button>
          </Space>
        }
      >
        <FormComponent
          value={formData[activeModule]}
          defaultValue={profile?.[activeModule]}
          onChange={(val: unknown) => handleChange(activeModule, val)}
        />
      </SettingsPageLayout>

      {showFloatingSave && (
        <div
          style={{
            position: 'fixed',
            right: 32,
            bottom: 32,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.16)',
          }}
        >
          {status.text && (
            <span style={{ fontSize: 13, color: status.color, whiteSpace: 'nowrap' }}>
              {status.text}
            </span>
          )}
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={isSaving}
            disabled={saveButtonDisabled}
          >
            保存
          </Button>
        </div>
      )}
    </>
  )
}
