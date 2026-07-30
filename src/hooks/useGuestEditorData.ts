/**
 * 游客简历编辑器数据管理 Hook
 *
 * 与 useResumeEditorData 功能对齐，但数据层替换为 localStorage：
 * - 用 getGuestResume 替代 useResume（React Query）
 * - 用 updateGuestResume 替代 useUpdateResume（API mutation）
 * - 用 getGuestProfile 替代 useProfile（React Query）
 *
 * 复用：编辑器初始化、自动保存、保存 payload 和 Zustand store
 */

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { getGuestResume, updateGuestResume } from '@/services/guest-resume'
import { getGuestProfile } from '@/services/guest-profile'
import type { GuestProfile } from '@/services/guest-profile'
import type { GuestResume } from '@/types/guest'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useResumeEditorStore } from '@/stores/resume-editor'
import { selectResumeEditorDataActions } from '@/stores/resume-editor-selectors'
import type { UpdateResumeRequest } from '@/types/resume'
import { buildResumeSavePayload } from '@/utils/resume-preview'
import { buildResumeEditorInitialData } from '@/utils/resume-editor'

export function useGuestEditorData(id: string) {
  const [resume, setResume] = useState<GuestResume | null>(null)
  const [profile, setProfile] = useState<GuestProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 与登录模式相同，只订阅稳定 action，正文通过保存回调按需读取。
  const {
    initResume,
    setSaveStatus,
    resetStore,
  } = useResumeEditorStore(useShallow(selectResumeEditorDataActions))

  // 初始化标记
  const isInitializedRef = useRef(false)

  // 加载数据（同步读取 localStorage）
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setResume(getGuestResume(id))
      setProfile(getGuestProfile())
      setIsLoading(false)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [id])

  // 初始化数据（useLayoutEffect 确保在浏览器绘制前完成）
  useLayoutEffect(() => {
    if (!resume) return
    if (useResumeEditorStore.getState().resumeId !== resume.id) {
      initResume(buildResumeEditorInitialData(resume))
    }
    isInitializedRef.current = true
  }, [initResume, resume])

  // 回调执行时读取最新 store，保持 debounce 期间的编辑不会被旧闭包覆盖。
  const getCurrentData = useCallback(
    () => buildResumeSavePayload(
      useResumeEditorStore.getState(),
      resume?.name,
    ),
    [resume?.name],
  )

  // 封装 update 函数，匹配 useAutoSave 期望的签名
  const updateGuestResumeSilent = useCallback(
    async (data: Record<string, unknown>) => {
      updateGuestResume(id, data as UpdateResumeRequest)
      // 同步更新本地 resume 状态
      const updated = getGuestResume(id)
      if (updated) setResume(updated)
    },
    [id],
  )

  // 自动保存 Hook
  const { triggerAutoSave, handleManualSave } = useAutoSave({
    isInitializedRef,
    updateResume: updateGuestResumeSilent,
    setSaveStatus,
    getCurrentData,
  })

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
  }
}
