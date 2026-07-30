'use client'

import { useRef, useState } from 'react'
import { A4_PAGE_HEIGHT_PX, A4_PAGE_WIDTH_PX } from '@/constants'
import type { Profile } from '@/types/profile'
import type {
  ResumeModuleType,
  ResumePreviewConfig,
} from '@/types/resume'
import type { ResumeEditorState } from '@/stores/resume-editor'
import PageBreakHints from './PageBreakHints'
import PreviewControlBar from './PreviewControlBar'
import ResumeHtmlPreview from './ResumeHtmlPreview'

interface ResumePreviewPaneProps {
  store: ResumeEditorState
  profile?: Profile
  previewConfig: ResumePreviewConfig
  onFontSizeChange: (fontSize: number) => void
  onLineHeightChange: (lineHeight: number) => void
  onFocusModule: (module: ResumeModuleType) => void
  onAddItem: (module: ResumeModuleType) => void
  onDeleteItem: (module: ResumeModuleType, index: number) => void
  onDeleteModule: (module: ResumeModuleType) => void
  onMoveModule: (
    module: ResumeModuleType,
    direction: 'up' | 'down' | number,
  ) => void
  onMoveItem: (
    module: ResumeModuleType,
    index: number,
    direction: 'up' | 'down',
  ) => void
}

/**
 * 编辑器右侧 A4 预览区。
 *
 * 缩放比例和分页测量引用只服务于预览生命周期，留在独立组件内可以避免
 * 工具栏、表单或侧栏的更新干扰这部分局部 UI 状态。
 */
export default function ResumePreviewPane({
  store,
  profile,
  previewConfig,
  onFontSizeChange,
  onLineHeightChange,
  onFocusModule,
  onAddItem,
  onDeleteItem,
  onDeleteModule,
  onMoveModule,
  onMoveItem,
}: ResumePreviewPaneProps) {
  const [zoom, setZoom] = useState(0.8)
  const previewRef = useRef<HTMLDivElement>(null)

  return (
    <div
      style={{
        flex: 1,
        borderLeft: '1px solid #f0f0f0',
        overflow: 'auto',
        backgroundColor: '#eee',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="resume-preview"
    >
      <PreviewControlBar
        fontSize={previewConfig.fontSize}
        onFontSizeChange={onFontSizeChange}
        lineHeight={previewConfig.lineHeight}
        onLineHeightChange={onLineHeightChange}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div style={{ width: A4_PAGE_WIDTH_PX * zoom, margin: '0 auto' }}>
          <div
            ref={previewRef}
            className="resume-a4-preview"
            style={{
              position: 'relative',
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
              borderRadius: 4,
              backgroundColor: '#fff',
              width: A4_PAGE_WIDTH_PX,
              minHeight: A4_PAGE_HEIGHT_PX,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            <ResumeHtmlPreview
              content={store.content}
              modulesConfig={store.modulesConfig}
              modulesOrder={store.modulesOrder}
              template={store.template}
              profile={profile}
              fontSize={previewConfig.fontSize}
              lineHeight={previewConfig.lineHeight}
              onModuleClick={onFocusModule}
              onAddItem={onAddItem}
              onDeleteItem={onDeleteItem}
              onDeleteModule={onDeleteModule}
              onMoveModule={onMoveModule}
              onMoveItem={onMoveItem}
            />
            <PageBreakHints previewRef={previewRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
