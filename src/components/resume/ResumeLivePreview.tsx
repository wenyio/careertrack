/**
 * 公开简历 HTML 预览组件
 *
 * 复用编辑器标准预览渲染，保证公开页与编辑器中看到的内容一致。
 */

'use client'

import type { ReactNode } from 'react'
import type {
  ResumeContent,
  ModulesConfig,
  ResumeModuleType,
  ResumeTemplateId,
} from '@/types/resume'
import { StandardResumePreview } from '@/components/resume/ResumePreviewShared'

export interface ResumeLivePreviewProps {
  content: ResumeContent
  basicInfo: ResumeContent['basic_info']
  config: ModulesConfig
  modulesOrder: ResumeModuleType[]
  template: ResumeTemplateId
}

export function ResumeLivePreview({
  content,
  basicInfo,
  config,
  modulesOrder,
  template,
}: ResumeLivePreviewProps): ReactNode {
  return (
    <StandardResumePreview
      content={{ ...content, basic_info: basicInfo }}
      modulesConfig={config}
      modulesOrder={modulesOrder}
      template={template}
    />
  )
}
