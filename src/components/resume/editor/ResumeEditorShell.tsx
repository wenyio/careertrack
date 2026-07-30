/**
 * 简历编辑器 Shell 组件（正式用户和游客共享）
 *
 * 负责渲染编辑器 UI：
 * - EditorToolbar
 * - SortableModuleList
 * - ModuleForm
 * - ResumePreviewPane
 * - TemplateSelector
 * - 移动端响应式样式
 *
 * 不直接调用 useResumeEditorData 或 useGuestEditorData，
 * 由父页面传入 store 和 profile。
 * 内部调用 useResumeModuleActions 和 useResumeItemActions 以减少页面层重复。
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Spin } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { useResumeModuleActions } from '@/hooks/useResumeModuleActions'
import { useResumeItemActions } from '@/hooks/useResumeItemActions'
import SortableModuleList from './SortableModuleList'
import EditorToolbar from './EditorToolbar'
import ModuleForm from '@/components/resume/ModuleForm'
import ResumePreviewPane from './ResumePreviewPane'
import TemplateSelector from './TemplateSelector'
import type { Profile } from '@/types/profile'
import type { ResumeTemplateId } from '@/types/resume'
import type { ResumeEditorState } from '@/stores/resume-editor'

interface ResumeEditorShellProps {
  store: ResumeEditorState
  profile?: Profile | null
  isLoading: boolean
  /** 简历不存在时显示兜底 UI（游客专用） */
  resumeNotFound?: boolean
  /** 工具栏隐藏公开链接按钮 */
  hidePublic?: boolean
  /** 返回路径 */
  backPath: string
  /** 模板切换回调 */
  onTemplateChange: (tpl: ResumeTemplateId) => void
  /** 预览字号变更回调 */
  onPreviewFontSizeChange: (fontSize: number) => void
  /** 预览行高变更回调 */
  onPreviewLineHeightChange: (lineHeight: number) => void
  /** 预览配置 */
  previewConfig: { fontSize: number; lineHeight: number }
  /** 手动保存回调 */
  onSave: () => void
  /** 打印回调 */
  onPrint: () => void
  /** 触发自动保存 */
  triggerAutoSave: () => void
  /** 公开/取消公开回调（仅正式用户） */
  onTogglePublic?: (isPublic: boolean, slug?: string) => void
  /** 服务端简历数据（用于公开状态显示） */
  isPublic?: boolean
  publicSlug?: string | null
  resumeId?: string
}

export default function ResumeEditorShell({
  store,
  profile,
  isLoading,
  resumeNotFound,
  hidePublic,
  backPath,
  onTemplateChange,
  onPreviewFontSizeChange,
  onPreviewLineHeightChange,
  previewConfig,
  onSave,
  onPrint,
  triggerAutoSave,
  onTogglePublic,
  isPublic,
  publicSlug,
  resumeId,
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
  } = useResumeModuleActions(store, triggerAutoSave)

  const { handleAddItem, handleDeleteItem, handleMoveItem } = useResumeItemActions(store, triggerAutoSave, handleFocusModule)

  // 设置面板
  const [showSettings, setShowSettings] = useState(false)

  // 公开/取消公开（薄包装，处理 optional 回调）
  const handleTogglePublic = useCallback(
    (isPublic: boolean, slug?: string) => {
      onTogglePublic?.(isPublic, slug)
    },
    [onTogglePublic],
  )

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
        <a onClick={handleBack}>返回列表</a>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部工具栏 */}
      <EditorToolbar
        resumeName={store.resumeName}
        saveStatus={store.saveStatus}
        showPreview={store.showPreview}
        isPublic={isPublic}
        publicSlug={publicSlug}
        resumeId={resumeId}
        onNameChange={(name) => {
          store.setResumeName(name)
          triggerAutoSave()
        }}
        onSave={onSave}
        onTogglePreview={() => store.setShowPreview(!store.showPreview)}
        onPrint={onPrint}
        onTogglePublic={handleTogglePublic}
        onBack={handleBack}
        onOpenSettings={() => setShowSettings(!showSettings)}
        hidePublic={hidePublic}
      />

      {/* 主体内容 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧：模块列表 */}
        <div
          style={{
            width: store.sidebarCollapsed ? 64 : 200,
            borderRight: '1px solid #f0f0f0',
            overflowY: 'auto',
            overflowX: 'hidden',
            backgroundColor: '#fafafa',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
          className="module-switcher"
        >
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: store.sidebarCollapsed ? 'center' : 'flex-end',
              cursor: 'pointer',
            }}
            onClick={() => store.setSidebarCollapsed(!store.sidebarCollapsed)}
          >
            {store.sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px' }}>
            <SortableModuleList
              modulesOrder={store.modulesOrder}
              modulesConfig={store.modulesConfig}
              activeModule={store.activeModule}
              content={store.content}
              collapsed={store.sidebarCollapsed}
              onReorder={(from, to) => {
                store.reorderModules(from, to)
                triggerAutoSave()
              }}
              onToggle={(module, enabled) => {
                if (module === 'basic_info') return // basic_info 始终启用
                store.toggleModule(module, enabled)
                triggerAutoSave()
              }}
              onSelect={(module) => handleFocusModule(module)}
            />
          </div>
        </div>

        {/* 中间 + 右侧 */}
        <div style={{ flex: 1, display: 'flex', overflow: 'auto' }}>
          {/* 中间：表单编辑区 */}
          <div
            className="editor-form-area"
            style={{
              flex: 1,
              minWidth: 0,
              overflowY: 'auto',
              padding: 24,
            }}
          >
            {/* 模板选择器（设置面板） */}
            {showSettings && (
              <div
                style={{
                  marginBottom: 24,
                  padding: 16,
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#333' }}>
                  选择模板
                </div>
                <TemplateSelector
                  value={store.template}
                  onChange={onTemplateChange}
                />
              </div>
            )}

            <ModuleForm
              modulesOrder={store.modulesOrder}
              modulesConfig={store.modulesConfig}
              expandedModules={store.expandedModules}
              content={store.content}
              profile={profile ?? undefined}
              onChange={handleContentChange}
              onExpand={handleExpandModules}
              onDisplayConfigChange={handleDisplayConfigChange}
              onRenameModule={handleRenameModule}
              onMoveModule={handleMoveModule}
              onDeleteModule={handleDeleteModule}
            />
          </div>

          {/* 右侧：HTML 实时预览 */}
          {store.showPreview && (
            <ResumePreviewPane
              store={store}
              profile={profile ?? undefined}
              previewConfig={previewConfig}
              onFontSizeChange={onPreviewFontSizeChange}
              onLineHeightChange={onPreviewLineHeightChange}
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
