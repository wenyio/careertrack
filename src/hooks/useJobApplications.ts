import { App } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createJobApplication, deleteJobApplication, getJobApplications, getJobApplicationSummary, updateJobApplication } from '@/services/job-application'
import { getErrorMessage } from '@/utils/error'
import type { CreateJobApplicationRequest, JobApplicationStatus, UpdateJobApplicationRequest } from '@/types/job-application'

export const JOB_APPLICATIONS_QUERY_KEY = ['job-applications'] as const
export const JOB_APPLICATION_SUMMARY_QUERY_KEY = ['job-applications', 'summary'] as const

export function useJobApplications(options: { page: number; pageSize: number; q: string; status: 'all' | JobApplicationStatus }) {
  return useQuery({ queryKey: [...JOB_APPLICATIONS_QUERY_KEY, options], queryFn: () => getJobApplications(options) })
}

export function useJobApplicationSummary() {
  return useQuery({ queryKey: JOB_APPLICATION_SUMMARY_QUERY_KEY, queryFn: getJobApplicationSummary })
}

export function useJobApplicationMutations() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: JOB_APPLICATIONS_QUERY_KEY })
  return {
    create: useMutation({ mutationFn: (data: CreateJobApplicationRequest) => createJobApplication(data), onSuccess: () => { invalidate(); message.success('申请已创建') }, onError: (e: Error) => message.error(getErrorMessage(e, '创建失败')) }),
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateJobApplicationRequest }) => updateJobApplication(id, data), onSuccess: () => { invalidate(); message.success('申请已更新') }, onError: (e: Error) => message.error(getErrorMessage(e, '更新失败')) }),
    remove: useMutation({ mutationFn: deleteJobApplication, onSuccess: () => { invalidate(); message.success('申请已删除') }, onError: (e: Error) => message.error(getErrorMessage(e, '删除失败')) }),
  }
}
