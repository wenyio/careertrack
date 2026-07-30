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
import { useResumeEditorPreferences } from '@/hooks/useResumeEditorPreferences'
import { useResumeEditorStore } from '@/stores/resume-editor'
import { buildResumeSavePayload } from '@/utils/resume-preview'
import { buildResumeEditorInitialData } from '@/utils/resume-editor'

export function useResumeEditorData(id: string) {
  const { data: resume, isLoading } = useResume(id)
  const { data: profile } = useProfile()

  const { mutateAsync: updateResumeSilent } = useUpdateResume(id, { silent: true })

  // Zustand store
  const store = useResumeEditorStore()

  // 初始化标记
  const isInitializedRef = useRef(false)
  const revisionRef = useRef<number | null>(null)

  // 初始化数据（useLayoutEffect 确保在浏览器绘制前完成）
  useLayoutEffect(() => {
    if (resume && store.resumeId !== resume.id) {
      store.initResume(buildResumeEditorInitialData(resume))
      revisionRef.current = resume.revision
      isInitializedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Zustand store 引用稳定
  }, [resume])

  // 获取当前数据（用 ref 保证 timer 回调始终读到最新值）
  const getCurrentDataRef = useRef<() => Record<string, unknown>>(null!)

  // 在 effect 中同步 ref，避免 render 期间写入 ref
  useEffect(() => {
    getCurrentDataRef.current = () => ({
      ...buildResumeSavePayload(store, resume?.name),
      revision: revisionRef.current,
    })
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
    onSaveSuccess: (result) => {
      if (result?.revision !== undefined) {
        revisionRef.current = result.revision
      }
    },
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

  const preferences = useResumeEditorPreferences(store, triggerAutoSave)

  return {
    resume,
    profile,
    store,
    isLoading,
    triggerAutoSave,
    handleManualSave,
    handlePrint,
    ...preferences,
  }
}
