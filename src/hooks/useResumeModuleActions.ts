/**
 * 简历模块操作 Hook
 *
 * 职责：
 * - 模块内容变更
 * - 模块聚焦/展开
 * - 模块排序（上移/下移/拖拽）
 * - 模块删除（禁用）
 * - 模块重命名
 * - 展示配置变更
 */

import { useCallback } from 'react'
import type { ResumeModuleType, BasicInfoDisplayConfig } from '@/types/resume'
import type { ResumeEditorState } from '@/stores/resume-editor'

export function useResumeModuleActions(
  store: ResumeEditorState,
  triggerAutoSave: () => void,
) {
  // 内容变更
  const handleContentChange = useCallback(
    (module: ResumeModuleType, value: unknown) => {
      store.setContent(module as keyof typeof store.content, value as never)
      triggerAutoSave()
    },
    [triggerAutoSave, store],
  )

  // 聚焦到某个模块（折叠其他 + 滚动定位）
  const handleFocusModule = useCallback(
    (module: ResumeModuleType) => {
      store.focusModule(module)
      // 延迟滚动，等待 Collapse 动画完成
      setTimeout(() => {
        const panel = document.getElementById(`module-panel-${module}`)
        if (panel) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    },
    [store],
  )

  // 更新展开的模块集合
  const handleExpandModules = useCallback(
    (modules: Set<ResumeModuleType>) => {
      store.setExpandedModules(modules)
    },
    [store],
  )

  // 模块移动（支持 'up'/'down' 方向或目标 enabled 索引）
  const handleMoveModule = useCallback(
    (module: ResumeModuleType, direction: 'up' | 'down' | number) => {
      const order = store.modulesOrder
      const enabled = order.filter((m) => store.modulesConfig[m])
      const fromOrderIdx = order.indexOf(module)
      if (fromOrderIdx === -1) return

      let toOrderIdx: number
      if (typeof direction === 'number') {
        // 拖拽：direction 是目标 enabled 索引
        const targetModule = enabled[direction]
        if (!targetModule) return
        toOrderIdx = order.indexOf(targetModule)
      } else {
        // 按钮：基于 enabled 顺序上下移
        const enabledIdx = enabled.indexOf(module)
        if (enabledIdx === -1) return
        const targetEnabledIdx = direction === 'up' ? enabledIdx - 1 : enabledIdx + 1
        if (targetEnabledIdx < 0 || targetEnabledIdx >= enabled.length) return
        toOrderIdx = order.indexOf(enabled[targetEnabledIdx])
      }

      if (toOrderIdx === -1 || fromOrderIdx === toOrderIdx) return
      store.reorderModules(fromOrderIdx, toOrderIdx)
      triggerAutoSave()
    },
    [triggerAutoSave, store],
  )

  // 删除模块（禁用模块）
  const handleDeleteModule = useCallback(
    (module: ResumeModuleType) => {
      store.toggleModule(module, false)
      triggerAutoSave()
    },
    [triggerAutoSave, store],
  )

  // 展示配置变更
  const handleDisplayConfigChange = useCallback(
    (config: BasicInfoDisplayConfig) => {
      store.setContent('basic_info_display', config)
      triggerAutoSave()
    },
    [triggerAutoSave, store],
  )

  // 模块重命名
  const handleRenameModule = useCallback(
    (module: ResumeModuleType, name: string) => {
      const titles = { ...(store.content.module_titles || {}), [module]: name }
      store.setContent('module_titles', titles)
      triggerAutoSave()
    },
    [triggerAutoSave, store],
  )

  return {
    handleContentChange,
    handleFocusModule,
    handleExpandModules,
    handleMoveModule,
    handleDeleteModule,
    handleDisplayConfigChange,
    handleRenameModule,
  }
}
