/**
 * 简历编辑器 Shell 组件（正式用户和游客共享）
 *
 * 只负责页面布局、加载状态和共享事件编排。工具栏、模块侧栏、表单和预览
 * 各自通过 selector 订阅所需 store 切片，正文输入不再重渲染整个 Shell。
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Spin } from 'antd'
import { useResumeModuleActions } from '@/hooks/useResumeModuleActions'
import { useResumeItemActions } from '@/hooks/useResumeItemActions'
import { useResumeEditorPreferences } from '@/hooks/useResumeEditorPreferences'
import { useResumeEditorStore } from '@/stores/resume-editor'
import ResumeEditorToolbar from './ResumeEditorToolbar'
import ResumeModuleSidebar from './ResumeModuleSidebar'
import ResumeFormPane from './ResumeFormPane'
import ResumePreviewPane from './ResumePreviewPane'
import type { Profile } from '@/types/profile'
import type { Resume } from '@/types/resume'

interface ResumeEditorShellProps {
  profile?: Profile | null
  isLoading: boolean
  /** 简历不存在时显示兜底 UI（游客专用） */
  resumeNotFound?: boolean
  /** 工具栏隐藏公开链接按钮 */
  hidePublic?: boolean
  /** 是否允许从简历条目同步到账号个人信息 */
  canSyncProfile?: boolean
  /** 返回路径 */
  backPath: string
  /** 手动保存回调 */
  onSave: () => void
  /** 触发自动保存 */
  triggerAutoSave: () => void
  /** 公开/取消公开回调（仅正式用户） */
  onTogglePublic?: (isPublic: boolean, slug?: string) => void
  /** 服务端简历数据（用于公开状态显示） */
  isPublic?: boolean
  publicSlug?: string | null
  resumeId?: string
  revision?: number
  onResumeRestored?: (resume: Resume) => void
  flushCurrentSave?: () => Promise<number>
}

export default function ResumeEditorShell({
  profile,
  isLoading,
  resumeNotFound,
  hidePublic,
  canSyncProfile,
  backPath,
  onSave,
  triggerAutoSave,
  onTogglePublic,
  isPublic,
  publicSlug,
  resumeId,
  revision,
  onResumeRestored,
  flushCurrentSave,
}: ResumeEditorShellProps) {
  const router = useRouter()

  // 返回列表
  const handleBack = useCallback(() => {
    router.push(backPath)
  }, [router, backPath])

  // 模块和条目操作（复用 hooks，减少页面层重复）
  const {
    handleContentChange,
    handleFocusModule,
    handleExpandModules,
    handleMoveModule,
    handleDeleteModule,
    handleDisplayConfigChange,
    handleRenameModule,
  } = useResumeModuleActions(triggerAutoSave)

  const {
    handleAddItem,
    handleDeleteItem,
    handleMoveItem,
  } = useResumeItemActions(triggerAutoSave, handleFocusModule)
  const {
    handleTemplateChange,
    handlePreviewFontSizeChange,
    handlePreviewLineHeightChange,
    handleBlackWhiteTemplateSettingChange,
  } = useResumeEditorPreferences(triggerAutoSave)
  const showPreview = useResumeEditorStore((state) => state.showPreview)

  // 设置面板
  const [showSettings, setShowSettings] = useState(false)
  const handleOpenSettings = useCallback(() => {
    setShowSettings((current) => !current)
  }, [])

  // 加载中
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  // 简历不存在（游客兜底）
  if (resumeNotFound) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <span>简历不存在</span>
        <Button type="link" onClick={handleBack}>返回列表</Button>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ResumeEditorToolbar
        isPublic={isPublic}
        publicSlug={publicSlug}
        resumeId={resumeId}
        onSave={onSave}
        triggerAutoSave={triggerAutoSave}
        onTogglePublic={onTogglePublic}
        onBack={handleBack}
        onOpenSettings={handleOpenSettings}
        hidePublic={hidePublic}
        revision={revision}
        onResumeRestored={onResumeRestored}
        flushCurrentSave={flushCurrentSave}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ResumeModuleSidebar
          triggerAutoSave={triggerAutoSave}
          onFocusModule={handleFocusModule}
        />

        <div style={{ flex: 1, display: 'flex', overflow: 'auto' }}>
          <ResumeFormPane
            profile={profile ?? undefined}
            canSyncProfile={canSyncProfile}
            showSettings={showSettings}
            onCloseSettings={() => setShowSettings(false)}
            onTemplateChange={handleTemplateChange}
            onBlackWhiteTemplateSettingChange={handleBlackWhiteTemplateSettingChange}
            onContentChange={handleContentChange}
            onExpandModules={handleExpandModules}
            onDisplayConfigChange={handleDisplayConfigChange}
            onRenameModule={handleRenameModule}
            onMoveModule={handleMoveModule}
            onDeleteModule={handleDeleteModule}
          />

          {showPreview && (
            <ResumePreviewPane
              profile={profile ?? undefined}
              onFontSizeChange={handlePreviewFontSizeChange}
              onLineHeightChange={handlePreviewLineHeightChange}
              onFocusModule={handleFocusModule}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
              onDeleteModule={handleDeleteModule}
              onMoveModule={handleMoveModule}
              onMoveItem={handleMoveItem}
            />
          )}
        </div>
      </div>

      {/* 响应式 */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .module-switcher {
            display: none !important;
          }
          .resume-preview {
            display: none !important;
          }
          .editor-form-area {
            padding: 16px 12px !important;
          }
        }
      `}</style>
    </div>
  )
}
