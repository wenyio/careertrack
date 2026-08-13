'use client'

import { useCallback } from 'react'
import { getTemplateConfig } from '@/components/resume/templates/registry'
import { useResumeEditorStore } from '@/stores/resume-editor'
import type { BlackWhiteTemplateSettings, ResumeTemplateId } from '@/types/resume'
import { getPreviewConfig } from '@/utils/resume-preview'

/**
 * 登录与游客编辑器共用的展示偏好操作。
 *
 * 这里不关心保存落到 API 还是 localStorage，只负责同步 store，并在每次
 * 用户变更后触发所属数据源提供的自动保存。
 */
export function useResumeEditorPreferences(
  triggerAutoSave: () => void,
) {
  const handleTemplateChange = useCallback(
    (template: ResumeTemplateId) => {
      const store = useResumeEditorStore.getState()
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
    [triggerAutoSave],
  )

  const handlePreviewFontSizeChange = useCallback(
    (fontSize: number) => {
      const store = useResumeEditorStore.getState()
      store.setContent('preview_config', {
        ...getPreviewConfig(store.content.preview_config),
        fontSize,
      })
      triggerAutoSave()
    },
    [triggerAutoSave],
  )

  const handlePreviewLineHeightChange = useCallback(
    (lineHeight: number) => {
      const store = useResumeEditorStore.getState()
      store.setContent('preview_config', {
        ...getPreviewConfig(store.content.preview_config),
        lineHeight,
      })
      triggerAutoSave()
    },
    [triggerAutoSave],
  )

  const handleBlackWhiteTemplateSettingChange = useCallback(
    (setting: keyof BlackWhiteTemplateSettings, enabled: boolean) => {
      const store = useResumeEditorStore.getState()
      store.setContent('template_settings', {
        ...store.content.template_settings,
        black_white: {
          ...store.content.template_settings?.black_white,
          [setting]: enabled,
        },
      })
      triggerAutoSave()
    },
    [triggerAutoSave],
  )

  return {
    handleTemplateChange,
    handlePreviewFontSizeChange,
    handlePreviewLineHeightChange,
    handleBlackWhiteTemplateSettingChange,
  }
}
