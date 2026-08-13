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
import { useQueryClient } from '@tanstack/react-query'
import { useResume, useUpdateResume, resumeQueryKey } from '@/hooks/useResume'
import { useProfile } from '@/hooks/useProfile'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useResumeEditorStore } from '@/stores/resume-editor'
import { selectResumeEditorDataActions } from '@/stores/resume-editor-selectors'
import { buildResumeSavePayload } from '@/utils/resume-preview'
import { buildResumeEditorInitialData } from '@/utils/resume-editor'
import { getResume as fetchResume } from '@/services/resume'
import { getErrorCode } from '@/utils/error'
import type { Resume, UpdateResumeRequest } from '@/types/resume'

function isSameServerEditableState(a: Resume, b: Resume) {
  return JSON.stringify({
    name: a.name,
    template: a.template,
    modules_config: a.modules_config,
    modules_order: a.modules_order,
    content: a.content,
  }) === JSON.stringify({
    name: b.name,
    template: b.template,
    modules_config: b.modules_config,
    modules_order: b.modules_order,
    content: b.content,
  })
}

export function useResumeEditorData(id: string) {
  const queryClient = useQueryClient()
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
  const lastServerResumeRef = useRef<Resume | null>(null)

  // 初始化数据（useLayoutEffect 确保在浏览器绘制前完成）
  useLayoutEffect(() => {
    if (!resume) return
    if (useResumeEditorStore.getState().resumeId !== resume.id) {
      initResume(buildResumeEditorInitialData(resume))
      revisionRef.current = resume.revision
      lastServerResumeRef.current = resume
      isInitializedRef.current = true
    } else if (!isInitializedRef.current) {
      revisionRef.current = resume.revision
      lastServerResumeRef.current = resume
      isInitializedRef.current = true
    } else {
      revisionRef.current = resume.revision
      lastServerResumeRef.current = resume
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

  const updateResumeWithRevisionRetry = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        return await updateResumeSilent(data as UpdateResumeRequest)
      } catch (error) {
        if (getErrorCode(error) !== 'CONFLICT') throw error

        const lastServerResume = lastServerResumeRef.current
        const latestResume = await queryClient.fetchQuery({
          queryKey: resumeQueryKey(id),
          queryFn: () => fetchResume(id),
        })

        revisionRef.current = latestResume.revision
        lastServerResumeRef.current = latestResume

        if (!lastServerResume || !isSameServerEditableState(lastServerResume, latestResume)) {
          throw error
        }

        return updateResumeSilent({
          ...data,
          revision: latestResume.revision,
        } as UpdateResumeRequest)
      }
    },
    [id, queryClient, updateResumeSilent],
  )

  // 自动保存 Hook
  const { triggerAutoSave, handleManualSave, flushSave } = useAutoSave({
    isInitializedRef,
    updateResume: updateResumeWithRevisionRetry,
    setSaveStatus,
    getCurrentData,
    onSaveSuccess: (result) => {
      if (result?.revision !== undefined) {
        revisionRef.current = result.revision
      }
      if (result) {
        lastServerResumeRef.current = result as Resume
      }
    },
  })

  const flushCurrentSave = useCallback(async () => {
    const result = await flushSave()
    if (!result?.revision) throw new Error('保存未返回最新版本号')
    return result.revision
  }, [flushSave])

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
    flushCurrentSave,
    applyRestoredResume,
  }
}
