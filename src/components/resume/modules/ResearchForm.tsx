/**
 * 研究经历表单
 */

'use client'

import type { Research } from '@/types/profile'
import { createEmptyItem } from '@/utils/module-defaults'
import ArrayModuleForm from '@/components/common/ArrayModuleForm'
import { RESEARCH_FIELDS } from '@/config/module-fields'
import { PROFILE_IMPORT_CONFIG } from '@/config/profile-import'

interface ResearchFormProps {
  value?: Partial<Research>[]
  defaultValue?: Research[]
  onChange: (value: Partial<Research>[]) => void
  /** profile 模式不显示导入按钮，resume 模式显示 */
  mode?: 'profile' | 'resume'
}

export default function ResearchForm({ value, defaultValue, onChange, mode }: ResearchFormProps) {
  const isResumeMode = mode === 'resume'
  const items = isResumeMode ? (value || []) : (value || defaultValue || [])

  const handleCreate = () => createEmptyItem('research') as Partial<Research>

  return (
    <ArrayModuleForm
      items={items}
      fields={RESEARCH_FIELDS}
      addText="添加研究经历"
      createItem={handleCreate}
      importItems={isResumeMode ? (defaultValue || []) : undefined}
      importConfig={isResumeMode ? PROFILE_IMPORT_CONFIG.research : undefined}
      onChange={onChange}
      mode={mode}
    />
  )
}
