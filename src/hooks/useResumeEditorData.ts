/**
 * 简历编辑器数据管理 Hook
 *
 * 职责：
 * - 加载简历数据并初始化 Zustand store
 * - 生成保存 payload（纯函数，不 merge profile）
 * - 自动保存与手动保存
 *
 * UI 展示和打印由编辑器各 selector 容器负责。
 */

import { useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useResume, useUpdateResume } from '@/hooks/useResume'
import { useProfile } from '@/hooks/useProfile'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useResumeEditorStore } from '@/stores/resume-editor'
import { selectResumeEditorDataActions } from '@/stores/resume-editor-selectors'
import { buildResumeSavePayload } from '@/utils/resume-preview'
import { buildResumeEditorInitialData } from '@/utils/resume-editor'

export function useResumeEditorData(id: string) {
  const { data: resume, isLoading } = useResume(id)
  const { data: profile } = useProfile()

  const { mutateAsync: updateResumeSilent } = useUpdateResume(id, { silent: true })

  // 数据 Hook 只订阅稳定 action；保存时再读取最新快照，避免正文输入重渲染页面入口。
  const {
    initResume,
    setSaveStatus,
    resetStore,
  } = useResumeEditorStore(useShallow(selectResumeEditorDataActions))

  // 初始化标记
  const isInitializedRef = useRef(false)
  const revisionRef = useRef<number | null>(null)

  // 初始化数据（useLayoutEffect 确保在浏览器绘制前完成）
  useLayoutEffect(() => {
    if (!resume) return
    if (useResumeEditorStore.getState().resumeId !== resume.id) {
      initResume(buildResumeEditorInitialData(resume))
      revisionRef.current = resume.revision
      isInitializedRef.current = true
    } else if (!isInitializedRef.current) {
      revisionRef.current = resume.revision
      isInitializedRef.current = true
    }
  }, [initResume, resume])

  // 自动保存回调执行时同步读取最新 store，避免闭包拿到旧正文。
  const getCurrentData = useCallback(
    () => ({
      ...buildResumeSavePayload(
        useResumeEditorStore.getState(),
        resume?.name,
      ),
      revision: revisionRef.current,
    }),
    [resume?.name],
  )

  // 自动保存 Hook
  const { triggerAutoSave, handleManualSave } = useAutoSave({
    isInitializedRef,
    updateResume: updateResumeSilent,
    setSaveStatus,
    getCurrentData,
    onSaveSuccess: (result) => {
      if (result?.revision !== undefined) {
        revisionRef.current = result.revision
      }
    },
  })

  const applyRestoredResume = useCallback((restoredResume: NonNullable<typeof resume>) => {
    initResume(buildResumeEditorInitialData(restoredResume))
    revisionRef.current = restoredResume.revision
    isInitializedRef.current = true
  }, [initResume])

  // 清理
  useEffect(() => {
    return () => {
      resetStore()
    }
  }, [resetStore])

  return {
    resume,
    profile,
    isLoading,
    triggerAutoSave,
    handleManualSave,
    applyRestoredResume,
  }
}
