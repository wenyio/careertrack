/**
 * 简历条目操作 Hook
 *
 * 职责：
 * - 新增条目（数组模块）
 * - 删除条目
 * - 条目上下移动
 */

import { useCallback } from 'react'
import type { ResumeModuleType, ResumeContent } from '@/types/resume'
import type { ResumeEditorState } from '@/stores/resume-editor'
import { ARRAY_MODULES, createEmptyItem } from '@/utils/module-defaults'

export function useResumeItemActions(
  store: ResumeEditorState,
  triggerAutoSave: () => void,
  handleFocusModule: (module: ResumeModuleType) => void,
) {
  // 新增条目（预览区添加按钮，仅支持数组类型模块）
  const handleAddItem = useCallback(
    (module: ResumeModuleType) => {
      if (!ARRAY_MODULES.includes(module)) return
      const currentContent = store.content as Record<string, unknown>
      const existing = (currentContent[module] as unknown[]) || []
      const newItem = createEmptyItem(module)
      const updated = [...existing, newItem]
      store.setContent(module as keyof ResumeContent, updated as never)
      triggerAutoSave()
      // 聚焦到对应表单模块
      handleFocusModule(module)
    },
    [triggerAutoSave, handleFocusModule, store],
  )

  // 删除条目（预览区删除按钮）
  const handleDeleteItem = useCallback(
    (module: ResumeModuleType, index: number) => {
      const currentContent = store.content as Record<string, unknown>
      const existing = [...((currentContent[module] as unknown[]) || [])]
      existing.splice(index, 1)
      store.setContent(module as keyof ResumeContent, existing as never)
      triggerAutoSave()
    },
    [triggerAutoSave, store],
  )

  // 子条目上下移动
  const handleMoveItem = useCallback(
    (module: ResumeModuleType, index: number, direction: 'up' | 'down') => {
      const currentContent = store.content as Record<string, unknown>
      const existing = [...((currentContent[module] as unknown[]) || [])]
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= existing.length) return
      const [moved] = existing.splice(index, 1)
      existing.splice(newIndex, 0, moved)
      store.setContent(module as keyof ResumeContent, existing as never)
      triggerAutoSave()
    },
    [triggerAutoSave, store],
  )

  return {
    handleAddItem,
    handleDeleteItem,
    handleMoveItem,
  }
}
