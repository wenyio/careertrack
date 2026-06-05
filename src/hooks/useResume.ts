/**
 * 简历相关 Hooks
 *
 * 使用 TanStack Query 管理简历的获取、创建、更新、删除等操作
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
export const resumeQueryKey = (id: string) => ['resume', id]

/**
 * 获取简历列表 Hook
 */
export function useResumes() {
  return useQuery({
    queryKey: RESUMES_QUERY_KEY,
    queryFn: getResumes,
  })
}

/**
 * 获取简历详情 Hook
 */
export function useResume(id: string) {
  return useQuery({
    queryKey: resumeQueryKey(id),
    queryFn: () => getResume(id),
    enabled: !!id,
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
      queryClient.setQueryData(resumeQueryKey(id), (old: Resume | undefined) => old ? { ...old, ...data } : data)
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
    onSuccess: () => {
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
