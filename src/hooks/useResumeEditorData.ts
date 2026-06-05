/**
 * 简历编辑器数据管理 Hook
 *
 * 职责：
 * - 加载简历数据并初始化 Zustand store
 * - 生成保存 payload（纯函数，不 merge profile）
 * - 自动保存与手动保存
 * - 打印
 */

import { useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useResume, useUpdateResume } from '@/hooks/useResume'
import { useProfile } from '@/hooks/useProfile'
import { useAutoSave } from '@/hooks/useAutoSave'
import { usePrint } from '@/hooks/usePrint'
import { useResumeEditorStore } from '@/stores/resume-editor'
import type { ResumeTemplateId } from '@/types/resume'
import { DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER } from '@/types/resume'
import { buildResumeSavePayload, getPreviewConfig } from '@/utils/resume-preview'
import { getTemplateConfig } from '@/components/resume/templates/registry'

export function useResumeEditorData(id: string) {
  const { data: resume, isLoading } = useResume(id)
  const { data: profile } = useProfile()

  const { mutate: updateResumeSilent } = useUpdateResume(id, { silent: true })

  // Zustand store
  const store = useResumeEditorStore()

  // 初始化标记
  const isInitializedRef = useRef(false)

  // 初始化数据（useLayoutEffect 确保在浏览器绘制前完成）
  useLayoutEffect(() => {
    if (resume && store.resumeId !== resume.id) {
      store.initResume({
        id: resume.id,
        name: resume.name || '未命名简历',
        modulesConfig: { ...(resume.modules_config || DEFAULT_MODULES_CONFIG), basic_info: true },
        modulesOrder: resume.modules_order || [...DEFAULT_MODULES_ORDER],
        content: {
          ...(resume.content || {}),
          basic_info: resume.content?.basic_info || {},
        },
        template: resume.template || 'classic',
      })
      isInitializedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Zustand store 引用稳定
  }, [resume])

  // 获取当前数据（用 ref 保证 timer 回调始终读到最新值）
  const getCurrentDataRef = useRef<() => Record<string, unknown>>(null!)

  // 在 effect 中同步 ref，避免 render 期间写入 ref
  useEffect(() => {
    getCurrentDataRef.current = () => buildResumeSavePayload(store, resume?.name)
  })

  // 手动保存用（同步读取）
  const getCurrentData = useCallback(
    () => getCurrentDataRef.current(),
    [],
  )

  // 自动保存 Hook
  const { triggerAutoSave, handleManualSave } = useAutoSave({
    isInitializedRef,
    updateResume: updateResumeSilent,
    setSaveStatus: store.setSaveStatus,
    getCurrentData,
  })

  // 打印 Hook
  const { handlePrint } = usePrint({
    resumeName: store.resumeName,
  })

  // 清理
  useEffect(() => {
    return () => {
      store.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在组件卸载时执行一次
  }, [])

  // 模板切换
  const handleTemplateChange = useCallback(
    (tpl: ResumeTemplateId) => {
      store.setTemplate(tpl)
      const { defaultPreviewConfig } = getTemplateConfig(tpl)
      if (defaultPreviewConfig) {
        store.setContent('preview_config', { ...getPreviewConfig(store.content.preview_config), ...defaultPreviewConfig })
      }
      triggerAutoSave()
    },
    [triggerAutoSave, store],
  )

  // 预览配置变更
  const handlePreviewFontSizeChange = useCallback(
    (fontSize: number) => {
      store.setContent('preview_config', { ...getPreviewConfig(store.content.preview_config), fontSize })
      triggerAutoSave()
    },
    [triggerAutoSave, store],
  )

  const handlePreviewLineHeightChange = useCallback(
    (lineHeight: number) => {
      store.setContent('preview_config', { ...getPreviewConfig(store.content.preview_config), lineHeight })
      triggerAutoSave()
    },
    [triggerAutoSave, store],
  )

  return {
    resume,
    profile,
    store,
    isLoading,
    triggerAutoSave,
    handleManualSave,
    handlePrint,
    handleTemplateChange,
    handlePreviewFontSizeChange,
    handlePreviewLineHeightChange,
    previewConfig: getPreviewConfig(store.content.preview_config),
  }
}
