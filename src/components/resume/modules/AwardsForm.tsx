/**
 * 荣誉奖项表单
 */

'use client'

import type { Award } from '@/types/profile'
import { createEmptyItem } from '@/utils/module-defaults'
import ArrayModuleForm from '@/components/common/ArrayModuleForm'
import { AWARD_FIELDS } from '@/config/module-fields'
import { PROFILE_IMPORT_CONFIG } from '@/config/profile-import'

interface AwardsFormProps {
  value?: Partial<Award>[]
  defaultValue?: Award[]
  onChange: (value: Partial<Award>[]) => void
  /** profile 模式不显示导入按钮，resume 模式显示 */
  mode?: 'profile' | 'resume'
}

export default function AwardsForm({ value, defaultValue, onChange, mode }: AwardsFormProps) {
  const isResumeMode = mode === 'resume'
  const items = isResumeMode ? (value || []) : (value || defaultValue || [])

  const handleCreate = () => createEmptyItem('awards') as Partial<Award>

  return (
    <ArrayModuleForm
      items={items}
      fields={AWARD_FIELDS}
      addText="添加荣誉奖项"
      createItem={handleCreate}
      importItems={isResumeMode ? (defaultValue || []) : undefined}
      importConfig={isResumeMode ? PROFILE_IMPORT_CONFIG.awards : undefined}
      onChange={onChange}
      mode={mode}
    />
  )
}
