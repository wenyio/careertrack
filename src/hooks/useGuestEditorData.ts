/**
 * 游客简历编辑器数据管理 Hook
 *
 * 与 useResumeEditorData 功能对齐，但数据层替换为 localStorage：
 * - 用 getGuestResume 替代 useResume（React Query）
 * - 用 updateGuestResume 替代 useUpdateResume（API mutation）
 * - 用 getGuestProfile 替代 useProfile（React Query）
 *
 * 复用：useAutoSave、usePrint、buildResumeSavePayload、resume-editor store
 */

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { getGuestResume, updateGuestResume } from '@/services/guest-resume'
import { getGuestProfile } from '@/services/guest-profile'
import type { GuestProfile } from '@/services/guest-profile'
import type { GuestResume } from '@/types/guest'
import { useAutoSave } from '@/hooks/useAutoSave'
import { usePrint } from '@/hooks/usePrint'
import { useResumeEditorStore } from '@/stores/resume-editor'
import type { ResumeTemplateId, UpdateResumeRequest } from '@/types/resume'
import { DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER } from '@/types/resume'
import { buildResumeSavePayload, getPreviewConfig } from '@/utils/resume-preview'
import { getTemplateConfig } from '@/components/resume/templates/registry'

export function useGuestEditorData(id: string) {
  const [resume, setResume] = useState<GuestResume | null>(null)
  const [profile, setProfile] = useState<GuestProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Zustand store
  const store = useResumeEditorStore()

  // 初始化标记
  const isInitializedRef = useRef(false)

  // 加载数据（同步读取 localStorage）
  useEffect(() => {
    const loaded = getGuestResume(id)
    setResume(loaded)
    setProfile(getGuestProfile())
    setIsLoading(false)
  }, [id])

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

  // 在 effect 中同步 ref
  useEffect(() => {
    getCurrentDataRef.current = () => buildResumeSavePayload(store, resume?.name)
  })

  // 手动保存用（同步读取）
  const getCurrentData = useCallback(
    () => getCurrentDataRef.current(),
    [],
  )

  // 封装 update 函数，匹配 useAutoSave 期望的签名
  const updateGuestResumeSilent = useCallback(
    (data: Record<string, unknown>, options: { onSuccess?: () => void; onError?: () => void }) => {
      try {
        updateGuestResume(id, data as UpdateResumeRequest)
        // 同步更新本地 resume 状态
        const updated = getGuestResume(id)
        if (updated) setResume(updated)
        options?.onSuccess?.()
      } catch (e) {
        options?.onError?.()
      }
    },
    [id],
  )

  // 自动保存 Hook
  const { triggerAutoSave, handleManualSave } = useAutoSave({
    isInitializedRef,
    updateResume: updateGuestResumeSilent,
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
