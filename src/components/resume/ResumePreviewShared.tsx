/**
 * 简历公共预览组件
 *
 * 从 templates/ 架构重新导出，保持 API 兼容。
 * 所有模板渲染逻辑已迁移到 templates/ 目录下。
 */

'use client'

export { DescriptionHtml, SectionTitle } from '@/components/resume/templates/common'
export { DefaultBasicInfoHeader as BasicInfoHeader } from '@/components/resume/templates/common'

import type { ResumeContent, ModulesConfig, ResumeModuleType, ResumeTemplateId } from '@/types/resume'
import type { Profile } from '@/types/profile'
import type { SubItemRenderer, SectionRenderer } from '@/components/resume/templates/types'
import { BaseResumePreview } from '@/components/resume/templates/base-resume-renderer'

export function StandardResumePreview({
  content,
  modulesConfig,
  modulesOrder,
  template,
  profile,
  fontSize,
  lineHeight,
  renderSection,
  renderSubItem,
}: {
  content: ResumeContent
  modulesConfig: ModulesConfig
  modulesOrder: ResumeModuleType[]
  template: ResumeTemplateId
  profile?: Profile
  fontSize?: number
  lineHeight?: number
  renderSection?: SectionRenderer
  renderSubItem?: SubItemRenderer
}) {
  return (
    <BaseResumePreview
      content={content}
      modulesConfig={modulesConfig}
      modulesOrder={modulesOrder}
      template={template}
      profile={profile}
      fontSize={fontSize}
      lineHeight={lineHeight}
      renderSection={renderSection}
      renderSubItem={renderSubItem}
    />
  )
}
