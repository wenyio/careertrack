/**
 * 自动保存 Hook
 *
 * 从编辑页面提取的自动保存逻辑，支持：
 * - 防抖触发（可配置延迟）
 * - 手动保存后抑制自动保存（5 秒内）
 * - 保存状态管理
 */

import { useRef, useEffect, useCallback } from 'react'
import { AUTO_SAVE_DELAY } from '@/constants'
import type { SaveStatus } from '@/stores/resume-editor'

interface UseAutoSaveOptions {
  /** 是否已初始化的 ref（防止未加载数据时触发保存） */
  isInitializedRef: React.RefObject<boolean>
  /** 执行保存的 mutation 函数 */
  updateResume: (data: Record<string, unknown>, options: { onSuccess?: () => void; onError?: () => void }) => void
  /** 设置保存状态 */
  setSaveStatus: (status: SaveStatus) => void
  /** 获取当前数据的函数 */
  getCurrentData: () => Record<string, unknown>
  /** 自动保存延迟（毫秒），默认 AUTO_SAVE_DELAY */
  delay?: number
}

export function useAutoSave({
  isInitializedRef,
  updateResume,
  setSaveStatus,
  getCurrentData,
  delay = AUTO_SAVE_DELAY,
}: UseAutoSaveOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const lastManualSaveRef = useRef<number>(0)

  // 自动保存执行
  const performAutoSave = useCallback(() => {
    if (!isInitializedRef.current) return

    const timeSinceManualSave = Date.now() - lastManualSaveRef.current
    if (timeSinceManualSave < 5000) {
      setSaveStatus('idle')
      return
    }

    setSaveStatus('saving')
    updateResume(getCurrentData(), {
      onSuccess: () => {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      },
      onError: () => {
        setSaveStatus('idle')
      },
    })
  }, [isInitializedRef, updateResume, setSaveStatus, getCurrentData])

  // 触发自动保存（防抖）
  const triggerAutoSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaveStatus('pending')
    timerRef.current = setTimeout(performAutoSave, delay)
  }, [performAutoSave, setSaveStatus, delay])

  // 手动保存
  const handleManualSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    lastManualSaveRef.current = Date.now()
    setSaveStatus('saving')

    updateResume(getCurrentData(), {
      onSuccess: () => {
        setSaveStatus('manual_saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      },
      onError: () => {
        setSaveStatus('idle')
      },
    })
  }, [updateResume, setSaveStatus, getCurrentData])

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return {
    triggerAutoSave,
    handleManualSave,
  }
}
