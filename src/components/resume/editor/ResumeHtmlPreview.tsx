/**
 * 简历 HTML 预览组件（交互版）
 *
 * 使用标准预览渲染内容，外层叠加编辑器交互：
 * 点击聚焦表单、模块拖拽排序、添加/删除条目、子条目上下移动。
 */

'use client'

import { useState } from 'react'
import type { ResumeContent, ModulesConfig, ResumeModuleType, ResumeTemplateId } from '@/types/resume'
import type { Profile } from '@/types/profile'
import { StandardResumePreview } from '@/components/resume/ResumePreviewShared'
import { SubItem, ModuleToolbar, previewHoverCSS } from './PreviewToolbar'

interface ResumeHtmlPreviewProps {
  content: ResumeContent
  modulesConfig: ModulesConfig
  modulesOrder: ResumeModuleType[]
  template: ResumeTemplateId
  profile?: Profile
  activeModule?: ResumeModuleType
  fontSize?: number
  lineHeight?: number
  onModuleClick?: (module: ResumeModuleType) => void
  onAddItem?: (module: ResumeModuleType) => void
  onDeleteItem?: (module: ResumeModuleType, index: number) => void
  onDeleteModule?: (module: ResumeModuleType) => void
  onMoveModule?: (module: ResumeModuleType, direction: 'up' | 'down' | number) => void
  onMoveItem?: (module: ResumeModuleType, index: number, direction: 'up' | 'down') => void
}

export default function ResumeHtmlPreview({
  content,
  modulesConfig,
  modulesOrder,
  template,
  profile,
  fontSize,
  lineHeight,
  onModuleClick,
  onAddItem,
  onDeleteItem,
  onDeleteModule,
  onMoveModule,
  onMoveItem,
}: ResumeHtmlPreviewProps) {
  const enabledModules = modulesOrder.filter((m) => modulesConfig[m])
  const getModuleIndex = (m: ResumeModuleType) => enabledModules.indexOf(m)
  const canMoveUp = (m: ResumeModuleType) => getModuleIndex(m) > 0
  const canMoveDown = (m: ResumeModuleType) => getModuleIndex(m) < enabledModules.length - 1

  function renderSection(module: ResumeModuleType, children: React.ReactNode) {
    return (
      <SectionDragWrapper
        key={module}
        module={module}
        onClick={() => onModuleClick?.(module)}
        onReorder={(from, to) => {
          const fromIdx = enabledModules.indexOf(from)
          const toIdx = enabledModules.indexOf(to)
          if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
          onMoveModule?.(from, toIdx)
        }}
      >
        <ModuleToolbar
          canMoveUp={canMoveUp(module)}
          canMoveDown={canMoveDown(module)}
          showAdd={!!onAddItem && module !== 'summary'}
          onAdd={() => onAddItem?.(module)}
          onDelete={() => onDeleteModule?.(module)}
          onMoveUp={() => onMoveModule?.(module, 'up')}
          onMoveDown={() => onMoveModule?.(module, 'down')}
        />
        {children}
      </SectionDragWrapper>
    )
  }

  return (
    <>
      <style>{previewHoverCSS}</style>
      <StandardResumePreview
        content={content}
        modulesConfig={modulesConfig}
        modulesOrder={modulesOrder}
        template={template}
        profile={profile}
        fontSize={fontSize}
        lineHeight={lineHeight}
        renderSection={renderSection}
        renderSubItem={(module, index, total, children) => (
          <SubItem
            key={`${module}-${index}`}
            index={index}
            total={total}
            onMoveUp={() => onMoveItem?.(module, index, 'up')}
            onMoveDown={() => onMoveItem?.(module, index, 'down')}
            onDelete={() => onDeleteItem?.(module, index)}
          >
            {children}
          </SubItem>
        )}
      />
    </>
  )
}

/** 模块 section 拖拽包装 */
function SectionDragWrapper({
  module,
  onReorder,
  onClick,
  children,
}: {
  module: ResumeModuleType
  onReorder: (from: ResumeModuleType, to: ResumeModuleType) => void
  onClick?: () => void
  children: React.ReactNode
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <section
      data-module={module}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', module)
        e.dataTransfer.effectAllowed = 'move'
        setIsDragging(true)
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const from = e.dataTransfer.getData('text/plain') as ResumeModuleType
        if (from && from !== module) onReorder(from, module)
      }}
      onClick={onClick}
      style={{
        position: 'relative',
        cursor: 'pointer',
        borderRadius: 3,
        padding: '4px 6px',
        marginLeft: -6,
        marginRight: -6,
        marginBottom: 0,
        backgroundColor: 'transparent',
        borderTop: isDragOver ? '2px solid #1677ff' : '2px solid transparent',
        opacity: isDragging ? 0.5 : 1,
        transition: 'background-color 0.15s, opacity 0.15s',
      }}
    >
      {children}
    </section>
  )
}
