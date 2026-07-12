/**
 * 个人信息管理页面
 *
 * 左侧竖导航切换模块 + 右侧表单内容
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, App } from 'antd'
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

const SAVE_STATUS_MAP: Record<ProfileSaveStatus, { text: string; color: string; background: string; border: string }> = {
  idle: { text: '', color: '#8c8c8c', background: '#fff', border: '#e5e7eb' },
  pending: { text: '将自动保存', color: '#ad6800', background: '#fffbe6', border: '#ffe58f' },
  saving: { text: '保存中...', color: '#0958d9', background: '#e6f4ff', border: '#91caff' },
  saved: { text: '已保存', color: '#237804', background: '#f6ffed', border: '#b7eb8f' },
  error: { text: '保存失败，请重试', color: '#cf1322', background: '#fff1f0', border: '#ffa39e' },
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
  const showFloatingAction = hasChanges
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
          className="profile-save-float"
          style={{ backgroundColor: status.background, borderColor: status.border }}
        >
          {status.text && (
            <span className="profile-save-status" style={{ color: status.color }}>
              <span className="profile-save-dot" style={{ backgroundColor: status.color }} />
              <span>{status.text}</span>
            </span>
          )}
          {showFloatingAction && (
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={isSaving}
              disabled={saveButtonDisabled}
              style={{ borderRadius: 6 }}
            >
              保存
            </Button>
          )}
        </div>
      )}

      <style jsx global>{`
        .profile-save-float {
          position: fixed;
          right: 32px;
          bottom: 32px;
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 44px;
          padding: 8px 10px 8px 14px;
          border: 1px solid;
          border-radius: 999px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
        }

        .profile-save-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 500;
          line-height: 1;
          white-space: nowrap;
        }

        .profile-save-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .profile-save-float {
            right: 16px;
            left: 16px;
            bottom: 18px;
            justify-content: space-between;
            border-radius: 10px;
            padding: 10px 12px;
          }
        }
      `}</style>
    </>
  )
}
