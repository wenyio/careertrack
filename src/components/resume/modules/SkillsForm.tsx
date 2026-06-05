/**
 * 专业技能表单
 */

'use client'

import type { Skill } from '@/types/profile'
import { createEmptyItem } from '@/utils/module-defaults'
import ArrayModuleForm from '@/components/common/ArrayModuleForm'
import { SKILLS_FIELDS } from '@/config/module-fields'
import { PROFILE_IMPORT_CONFIG } from '@/config/profile-import'

interface SkillsFormProps {
  value?: Partial<Skill>[]
  defaultValue?: Skill[]
  onChange: (value: Partial<Skill>[]) => void
  /** profile 模式不显示导入按钮，resume 模式显示 */
  mode?: 'profile' | 'resume'
}

export default function SkillsForm({ value, defaultValue, onChange, mode }: SkillsFormProps) {
  const isResumeMode = mode === 'resume'
  const items = isResumeMode ? (value || []) : (value || defaultValue || [])

  const handleCreate = () => createEmptyItem('skills') as Partial<Skill>

  return (
    <ArrayModuleForm
      items={items}
      fields={SKILLS_FIELDS}
      addText="添加专业技能"
      createItem={handleCreate}
      importItems={isResumeMode ? (defaultValue || []) : undefined}
      importConfig={isResumeMode ? PROFILE_IMPORT_CONFIG.skills : undefined}
      onChange={onChange}
      mode={mode}
    />
  )
}
