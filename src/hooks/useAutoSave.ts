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
  updateResume: (data: Record<string, unknown>) => Promise<{ revision?: number } | void>
  /** 设置保存状态 */
  setSaveStatus: (status: SaveStatus) => void
  /** 获取当前数据的函数 */
  getCurrentData: () => Record<string, unknown>
  /** 保存成功后同步 revision 等服务端状态 */
  onSaveSuccess?: (result: { revision?: number } | void) => void
  /** 自动保存延迟（毫秒），默认 AUTO_SAVE_DELAY */
  delay?: number
}

type SaveResult = { revision?: number } | void

export function useAutoSave({
  isInitializedRef,
  updateResume,
  setSaveStatus,
  getCurrentData,
  onSaveSuccess,
  delay = AUTO_SAVE_DELAY,
}: UseAutoSaveOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastManualSaveRef = useRef<number>(0)
  const processingRef = useRef(false)
  const saveRequestedRef = useRef(false)
  const manualRequestedRef = useRef(false)
  const mountedRef = useRef(true)
  const lastSaveResultRef = useRef<SaveResult>(undefined)
  const lastSaveErrorRef = useRef<unknown>(undefined)
  const flushWaitersRef = useRef<Array<{
    resolve: (result: SaveResult) => void
    reject: (reason: unknown) => void
  }>>([])

  const settleFlushWaiters = useCallback(() => {
    const waiters = flushWaitersRef.current.splice(0)
    for (const waiter of waiters) {
      if (lastSaveErrorRef.current) waiter.reject(lastSaveErrorRef.current)
      else waiter.resolve(lastSaveResultRef.current)
    }
  }, [])

  const scheduleIdle = useCallback(() => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    statusTimerRef.current = setTimeout(() => {
      if (mountedRef.current && !processingRef.current && !saveRequestedRef.current) {
        setSaveStatus('idle')
      }
    }, 3000)
  }, [setSaveStatus])

  // 单飞保存队列：在途请求完成后只提交最新快照，避免旧响应覆盖新编辑。
  const processSaveQueue = useCallback(async () => {
    if (processingRef.current || !isInitializedRef.current) return
    processingRef.current = true

    try {
      while (saveRequestedRef.current && mountedRef.current) {
        const isManual = manualRequestedRef.current
        saveRequestedRef.current = false
        manualRequestedRef.current = false
        setSaveStatus('saving')

        try {
          const result = await updateResume(getCurrentData())
          if (!mountedRef.current) return
          lastSaveResultRef.current = result
          lastSaveErrorRef.current = undefined
          onSaveSuccess?.(result)
          setSaveStatus(isManual ? 'manual_saved' : 'saved')
          scheduleIdle()
        } catch (saveError) {
          lastSaveErrorRef.current = saveError
          if (mountedRef.current) setSaveStatus('error')
          saveRequestedRef.current = false
          manualRequestedRef.current = false
        }
      }
    } finally {
      processingRef.current = false
      if (!saveRequestedRef.current) settleFlushWaiters()
    }
  }, [
    getCurrentData,
    isInitializedRef,
    onSaveSuccess,
    scheduleIdle,
    settleFlushWaiters,
    setSaveStatus,
    updateResume,
  ])

  const requestSave = useCallback((manual: boolean) => {
    if (!isInitializedRef.current) return
    saveRequestedRef.current = true
    manualRequestedRef.current = manualRequestedRef.current || manual
    void processSaveQueue()
  }, [isInitializedRef, processSaveQueue])

  const performAutoSave = useCallback(() => {
    const timeSinceManualSave = Date.now() - lastManualSaveRef.current
    if (timeSinceManualSave < 5000) {
      setSaveStatus('idle')
      return
    }
    requestSave(false)
  }, [requestSave, setSaveStatus])

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
    requestSave(true)
  }, [requestSave])

  /**
   * Use the existing single-flight queue to persist the newest editor state.
   * Version creation awaits this instead of issuing a competing PUT request.
   */
  const flushSave = useCallback(async (): Promise<SaveResult> => {
    if (!isInitializedRef.current) throw new Error('简历尚未加载完成')
    if (timerRef.current) clearTimeout(timerRef.current)
    lastManualSaveRef.current = Date.now()
    const completion = new Promise<SaveResult>((resolve, reject) => {
      flushWaitersRef.current.push({ resolve, reject })
    })
    requestSave(true)
    return completion
  }, [isInitializedRef, requestSave])

  // 清理
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    }
  }, [])

  return {
    triggerAutoSave,
    handleManualSave,
    flushSave,
  }
}
