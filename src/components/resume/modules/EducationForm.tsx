/**
 * 教育经历表单
 */

'use client'

import type { Education } from '@/types/profile'
import { createEmptyItem } from '@/utils/module-defaults'
import ArrayModuleForm from '@/components/common/ArrayModuleForm'
import { EDUCATION_FIELDS } from '@/config/module-fields'
import { PROFILE_IMPORT_CONFIG } from '@/config/profile-import'

interface EducationFormProps {
  value?: Partial<Education>[]
  defaultValue?: Education[]
  onChange: (value: Partial<Education>[]) => void
  /** profile 模式不显示导入按钮，resume 模式显示 */
  mode?: 'profile' | 'resume'
}

export default function EducationForm({ value, defaultValue, onChange, mode }: EducationFormProps) {
  const isResumeMode = mode === 'resume'
  const items = isResumeMode ? (value || []) : (value || defaultValue || [])

  const handleCreate = () => createEmptyItem('education') as Partial<Education>

  return (
    <ArrayModuleForm
      items={items}
      fields={EDUCATION_FIELDS}
      addText="添加教育经历"
      createItem={handleCreate}
      importItems={isResumeMode ? (defaultValue || []) : undefined}
      importConfig={isResumeMode ? PROFILE_IMPORT_CONFIG.education : undefined}
      onChange={onChange}
      mode={mode}
    />
  )
}
