/**
 * 个人作品表单
 */

'use client'

import type { Portfolio } from '@/types/profile'
import { createEmptyItem } from '@/utils/module-defaults'
import ArrayModuleForm from '@/components/common/ArrayModuleForm'
import { PORTFOLIO_FIELDS } from '@/config/module-fields'
import { PROFILE_IMPORT_CONFIG } from '@/config/profile-import'

interface PortfolioFormProps {
  value?: Partial<Portfolio>[]
  defaultValue?: Portfolio[]
  onChange: (value: Partial<Portfolio>[]) => void
  /** profile 模式不显示导入按钮，resume 模式显示 */
  mode?: 'profile' | 'resume'
}

export default function PortfolioForm({ value, defaultValue, onChange, mode }: PortfolioFormProps) {
  const isResumeMode = mode === 'resume'
  const items = isResumeMode ? (value || []) : (value || defaultValue || [])

  const handleCreate = () => createEmptyItem('portfolio') as Partial<Portfolio>

  return (
    <ArrayModuleForm
      items={items}
      fields={PORTFOLIO_FIELDS}
      addText="添加个人作品"
      createItem={handleCreate}
      importItems={isResumeMode ? (defaultValue || []) : undefined}
      importConfig={isResumeMode ? PROFILE_IMPORT_CONFIG.portfolio : undefined}
      onChange={onChange}
      mode={mode}
    />
  )
}
