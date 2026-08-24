/**
 * 简历相关 Hooks
 *
 * 使用 TanStack Query 管理简历的获取、创建、更新、删除等操作
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { App } from 'antd'
import {
  getResumes,
  getResume,
  createResume,
  updateResume,
  deleteResume,
  duplicateResume,
  publishResume,
  unpublishResume,
} from '@/services/resume'
import { getErrorMessage } from '@/utils/error'
import type { Resume, CreateResumeRequest, UpdateResumeRequest, PublishResumeRequest } from '@/types/resume'

/**
 * 查询 key 常量
 */
export const RESUMES_QUERY_KEY = ['resumes']
export const resumesQueryKey = (page: number, pageSize: number, q = '') =>
  [...RESUMES_QUERY_KEY, page, pageSize, q]
export const resumeQueryKey = (id: string) => ['resume', id]

export function cacheResumeDetail(queryClient: QueryClient, resume: Resume) {
  queryClient.setQueryData(resumeQueryKey(resume.id), resume)
}

/**
 * 获取简历列表 Hook
 */
export function useResumes(page = 1, pageSize = 20, options?: { enabled?: boolean; q?: string }) {
  return useQuery({
    queryKey: resumesQueryKey(page, pageSize, options?.q),
    queryFn: () => getResumes(page, pageSize, options?.q),
    enabled: options?.enabled ?? true,
  })
}

/**
 * 获取单份简历详情。
 *
 * `enabled` 允许列表等非编辑入口在真正需要正文时再发起请求，同时仍复用
 * 编辑器已写入的同一份 Query 缓存。
 */
export function useResume(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: resumeQueryKey(id),
    queryFn: () => getResume(id),
    enabled: !!id && (options.enabled ?? true),
  })
}

/**
 * 创建简历 Hook
 */
export function useCreateResume() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { message } = App.useApp()

  return useMutation({
    mutationFn: (data: CreateResumeRequest) => createResume(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY })
      message.success('简历创建成功')
      router.push(`/resumes/${data.id}/edit`)
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, '创建失败'))
    },
  })
}

/**
 * 更新简历 Hook
 *
 * @param id 简历 ID
 * @param options.silent 是否静默模式（不显示消息）
 */
export function useUpdateResume(id: string, options?: { silent?: boolean }) {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const silent = options?.silent ?? false

  return useMutation({
    mutationFn: (data: UpdateResumeRequest) => updateResume(id, data),
    onSuccess: (data) => {
      cacheResumeDetail(queryClient, data)
      queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY })
      if (!silent) {
        message.success('保存成功')
      }
    },
    onError: (error: Error) => {
      if (!silent) {
        message.error(getErrorMessage(error, '保存失败'))
      }
    },
  })
}

/**
 * 删除简历 Hook
 */
export function useDeleteResume() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  return useMutation({
    mutationFn: (id: string) => deleteResume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY })
      message.success('删除成功')
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, '删除失败'))
    },
  })
}

/**
 * 复制简历 Hook
 */
export function useDuplicateResume() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  return useMutation({
    mutationFn: (id: string) => duplicateResume(id),
    onSuccess: (data) => {
      cacheResumeDetail(queryClient, data)
      queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY })
      message.success('复制成功')
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, '复制失败'))
    },
  })
}

/**
 * 公开简历 Hook
 */
export function usePublishResume(id: string) {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  return useMutation({
    mutationFn: (data: PublishResumeRequest) => publishResume(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeQueryKey(id) })
      queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY })
      message.success('简历已公开')
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, '公开失败'))
    },
  })
}

/**
 * 取消公开简历 Hook
 */
export function useUnpublishResume(id: string) {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  return useMutation({
    mutationFn: () => unpublishResume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeQueryKey(id) })
      queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY })
      message.success('已取消公开')
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, '操作失败'))
    },
  })
}
