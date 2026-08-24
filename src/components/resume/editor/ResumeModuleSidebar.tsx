'use client'

import { useCallback, useMemo } from 'react'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { useShallow } from 'zustand/react/shallow'
import { useResumeEditorStore } from '@/stores/resume-editor'
import { selectResumeModuleSidebar } from '@/stores/resume-editor-selectors'
import type { ResumeContent, ResumeModuleType } from '@/types/resume'
import { useI18n } from '@/i18n'
import SortableModuleList from './SortableModuleList'

interface ResumeModuleSidebarProps {
  triggerAutoSave: () => void
  onFocusModule: (module: ResumeModuleType) => void
}

/**
 * 模块侧栏 store 订阅边界。
 *
 * 侧栏只需要模块结构、当前焦点和自定义标题。正文内容变化不会触发它
 * 重渲染，只有 module_titles 变化时才更新显示标题。
 */
export default function ResumeModuleSidebar({
  triggerAutoSave,
  onFocusModule,
}: ResumeModuleSidebarProps) {
  const {
    modulesOrder,
    modulesConfig,
    activeModule,
    sidebarCollapsed,
    moduleTitles,
  } = useResumeEditorStore(useShallow(selectResumeModuleSidebar))
  const { t } = useI18n()

  const titleContent = useMemo<ResumeContent>(
    () => ({ module_titles: moduleTitles }),
    [moduleTitles],
  )

  const handleCollapse = useCallback(() => {
    const store = useResumeEditorStore.getState()
    store.setSidebarCollapsed(!store.sidebarCollapsed)
  }, [])

  const handleReorder = useCallback((from: number, to: number) => {
    useResumeEditorStore.getState().reorderModules(from, to)
    triggerAutoSave()
  }, [triggerAutoSave])

  const handleToggle = useCallback((
    module: ResumeModuleType,
    enabled: boolean,
  ) => {
    if (module === 'basic_info') return
    useResumeEditorStore.getState().toggleModule(module, enabled)
    triggerAutoSave()
  }, [triggerAutoSave])

  return (
    <div
      style={{
        width: sidebarCollapsed ? 64 : 200,
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
      <button
        type="button"
        aria-label={sidebarCollapsed ? t('resumeEditor.expandSidebar') : t('resumeEditor.collapseSidebar')}
        style={{
          padding: '8px 12px',
          border: 0,
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-end',
          cursor: 'pointer',
          background: 'transparent',
        }}
        onClick={handleCollapse}
      >
        {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </button>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px' }}>
        <SortableModuleList
          modulesOrder={modulesOrder}
          modulesConfig={modulesConfig}
          activeModule={activeModule}
          content={titleContent}
          collapsed={sidebarCollapsed}
          onReorder={handleReorder}
          onToggle={handleToggle}
          onSelect={onFocusModule}
        />
      </div>
    </div>
  )
}
