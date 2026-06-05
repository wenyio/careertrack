/**
 * 简历缩略图预览组件（只读）
 *
 * 渲染与编辑器一致的 A4 标准预览，再通过 CSS transform 等比缩小。
 */

'use client'

import type { ResumeContent, ModulesConfig, ResumeModuleType, ResumeTemplateId } from '@/types/resume'
import type { Profile } from '@/types/profile'
import { StandardResumePreview } from '@/components/resume/ResumePreviewShared'

interface ResumeMiniPreviewProps {
  content: ResumeContent
  modulesConfig: ModulesConfig
  modulesOrder: ResumeModuleType[]
  template: ResumeTemplateId
  profile?: Profile
  /** 缩略图容器宽度（px），默认 120 */
  width?: number
}

const PAGE_WIDTH = 794
const PAGE_HEIGHT = 1123

/**
 * 简历缩略图预览
 *
 * 将完整的 A4 简历页面渲染后通过 CSS transform 缩放到指定宽度。
 * 适用于列表页、卡片等需要快速预览简历内容的场景。
 */
export default function ResumeMiniPreview({
  content,
  modulesConfig,
  modulesOrder,
  template,
  profile,
  width = 120,
}: ResumeMiniPreviewProps) {
  const visibleHeight = Math.round(width * (PAGE_HEIGHT / PAGE_WIDTH))
  const scale = width / PAGE_WIDTH

  return (
    <div style={{
      width,
      height: visibleHeight,
      overflow: 'hidden',
      borderRadius: 8,
      background: '#f0f0f0',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        pointerEvents: 'none',
      }}>
        <StandardResumePreview
          content={content}
          modulesConfig={modulesConfig}
          modulesOrder={modulesOrder}
          template={template}
          profile={profile}
        />
      </div>
    </div>
  )
}
