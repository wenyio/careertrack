/**
 * 项目经历表单
 */

'use client'

import type { Project } from '@/types/profile'
import { createEmptyItem } from '@/utils/module-defaults'
import ArrayModuleForm from '@/components/common/ArrayModuleForm'
import { PROJECT_FIELDS } from '@/config/module-fields'
import { PROFILE_IMPORT_CONFIG } from '@/config/profile-import'

interface ProjectsFormProps {
  value?: Partial<Project>[]
  defaultValue?: Project[]
  onChange: (value: Partial<Project>[]) => void
  /** profile 模式不显示导入按钮，resume 模式显示 */
  mode?: 'profile' | 'resume'
}

export default function ProjectsForm({ value, defaultValue, onChange, mode }: ProjectsFormProps) {
  const isResumeMode = mode === 'resume'
  const items = isResumeMode ? (value || []) : (value || defaultValue || [])

  const handleCreate = () => createEmptyItem('projects') as Partial<Project>

  return (
    <ArrayModuleForm
      items={items}
      fields={PROJECT_FIELDS}
      addText="添加项目经历"
      createItem={handleCreate}
      importItems={isResumeMode ? (defaultValue || []) : undefined}
      importConfig={isResumeMode ? PROFILE_IMPORT_CONFIG.projects : undefined}
      onChange={onChange}
      mode={mode}
    />
  )
}
