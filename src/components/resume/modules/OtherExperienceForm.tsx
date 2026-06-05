/**
 * 其他经历表单
 */

'use client'

import type { OtherExperience } from '@/types/profile'
import { createEmptyItem } from '@/utils/module-defaults'
import ArrayModuleForm from '@/components/common/ArrayModuleForm'
import { OTHER_EXPERIENCE_FIELDS } from '@/config/module-fields'
import { PROFILE_IMPORT_CONFIG } from '@/config/profile-import'

interface OtherExperienceFormProps {
  value?: Partial<OtherExperience>[]
  defaultValue?: OtherExperience[]
  onChange: (value: Partial<OtherExperience>[]) => void
  /** profile 模式不显示导入按钮，resume 模式显示 */
  mode?: 'profile' | 'resume'
}

export default function OtherExperienceForm({ value, defaultValue, onChange, mode }: OtherExperienceFormProps) {
  const isResumeMode = mode === 'resume'
  const items = isResumeMode ? (value || []) : (value || defaultValue || [])

  const handleCreate = () => createEmptyItem('other_experience') as Partial<OtherExperience>

  return (
    <ArrayModuleForm
      items={items}
      fields={OTHER_EXPERIENCE_FIELDS}
      addText="添加其他经历"
      createItem={handleCreate}
      importItems={isResumeMode ? (defaultValue || []) : undefined}
      importConfig={isResumeMode ? PROFILE_IMPORT_CONFIG.other_experience : undefined}
      onChange={onChange}
      mode={mode}
    />
  )
}
