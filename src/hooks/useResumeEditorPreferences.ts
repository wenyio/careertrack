'use client'

import { useCallback } from 'react'
import { getTemplateConfig } from '@/components/resume/templates/registry'
import type { ResumeEditorState } from '@/stores/resume-editor'
import type { ResumeTemplateId } from '@/types/resume'
import { getPreviewConfig } from '@/utils/resume-preview'

/**
 * 登录与游客编辑器共用的展示偏好操作。
 *
 * 这里不关心保存落到 API 还是 localStorage，只负责同步 store，并在每次
 * 用户变更后触发所属数据源提供的自动保存。
 */
export function useResumeEditorPreferences(
  store: ResumeEditorState,
  triggerAutoSave: () => void,
) {
  const handleTemplateChange = useCallback(
    (template: ResumeTemplateId) => {
      store.setTemplate(template)
      const { defaultPreviewConfig } = getTemplateConfig(template)
      if (defaultPreviewConfig) {
        store.setContent('preview_config', {
          ...getPreviewConfig(store.content.preview_config),
          ...defaultPreviewConfig,
        })
      }
      triggerAutoSave()
    },
    [store, triggerAutoSave],
  )

  const handlePreviewFontSizeChange = useCallback(
    (fontSize: number) => {
      store.setContent('preview_config', {
        ...getPreviewConfig(store.content.preview_config),
        fontSize,
      })
      triggerAutoSave()
    },
    [store, triggerAutoSave],
  )

  const handlePreviewLineHeightChange = useCallback(
    (lineHeight: number) => {
      store.setContent('preview_config', {
        ...getPreviewConfig(store.content.preview_config),
        lineHeight,
      })
      triggerAutoSave()
    },
    [store, triggerAutoSave],
  )

  return {
    handleTemplateChange,
    handlePreviewFontSizeChange,
    handlePreviewLineHeightChange,
    previewConfig: getPreviewConfig(store.content.preview_config),
  }
}
