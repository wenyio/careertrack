/**
 * 工作经历表单
 */

'use client'

import type { WorkExperience } from '@/types/profile'
import { createEmptyItem } from '@/utils/module-defaults'
import ArrayModuleForm from '@/components/common/ArrayModuleForm'
import { WORK_EXPERIENCE_FIELDS } from '@/config/module-fields'
import { PROFILE_IMPORT_CONFIG } from '@/config/profile-import'

interface WorkExperienceFormProps {
  value?: Partial<WorkExperience>[]
  defaultValue?: WorkExperience[]
  onChange: (value: Partial<WorkExperience>[]) => void
  /** profile 模式不显示导入按钮，resume 模式显示 */
  mode?: 'profile' | 'resume'
}

export default function WorkExperienceForm({ value, defaultValue, onChange, mode }: WorkExperienceFormProps) {
  const isResumeMode = mode === 'resume'
  const items = isResumeMode ? (value || []) : (value || defaultValue || [])

  const handleCreate = () => createEmptyItem('work_experience') as Partial<WorkExperience>

  return (
    <ArrayModuleForm
      items={items}
      fields={WORK_EXPERIENCE_FIELDS}
      addText="添加工作经历"
      createItem={handleCreate}
      importItems={isResumeMode ? (defaultValue || []) : undefined}
      importConfig={isResumeMode ? PROFILE_IMPORT_CONFIG.work_experience : undefined}
      onChange={onChange}
      mode={mode}
    />
  )
}
