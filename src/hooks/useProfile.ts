/**
 * 个人信息相关 Hooks
 *
 * 使用 TanStack Query 管理个人信息的获取和更新
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { getProfile, updateProfile, syncProfileEntry } from '@/services/profile'
import { getErrorMessage } from '@/utils/error'
import type { Profile, SyncProfileEntryRequest } from '@/types/profile'

/**
 * 查询 key 常量
 */
export const PROFILE_QUERY_KEY = ['profile']

/**
 * 获取个人信息 Hook
 *
 * @param enabled 是否启用查询，默认 true。未登录时传 false 可避免无意义的 401 请求。
 */
export function useProfile(enabled = true) {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: getProfile,
    staleTime: 10 * 60 * 1000, // 10 分钟
    enabled,
  })
}

/**
 * 更新个人信息 Hook
 */
export function useUpdateProfile(options?: { silent?: boolean }) {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const silent = options?.silent ?? false

  return useMutation({
    mutationFn: (profile: Partial<Profile>) => updateProfile(profile),
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data)
      if (!silent) message.success('保存成功')
    },
    onError: (error: Error) => {
      if (!silent) message.error(getErrorMessage(error, '保存失败'))
    },
  })
}

/**
 * 将简历条目同步到个人信息
 */
export function useSyncProfileEntry(options?: { silent?: boolean }) {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const silent = options?.silent ?? false

  return useMutation({
    mutationFn: (data: SyncProfileEntryRequest) => syncProfileEntry(data),
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data)
      if (!silent) message.success('已同步到个人信息')
    },
    onError: (error: Error) => {
      if (!silent) message.error(getErrorMessage(error, '同步失败'))
    },
  })
}
