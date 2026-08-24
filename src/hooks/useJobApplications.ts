import { App } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createJobApplication, createJobApplicationEvent, deleteJobApplication, getJobApplication, getJobApplicationActions, getJobApplicationEvents, getJobApplications, getJobApplicationSummary, updateJobApplication } from '@/services/job-application'
import { getErrorMessage } from '@/utils/error'
import type { CreateJobApplicationRequest, JobApplicationSort, JobApplicationStatus, UpdateJobApplicationRequest } from '@/types/job-application'
import { useI18n } from '@/i18n'

export const JOB_APPLICATIONS_QUERY_KEY = ['job-applications'] as const
export const JOB_APPLICATION_SUMMARY_QUERY_KEY = ['job-applications', 'summary'] as const
export const JOB_APPLICATION_ACTIONS_QUERY_KEY = ['job-applications', 'actions'] as const
export const jobApplicationDetailQueryKey = (id: string) => ['job-applications', 'detail', id] as const

export function useJobApplications(options: { page: number; pageSize: number; q: string; status: 'all' | JobApplicationStatus; sort: JobApplicationSort }) {
  return useQuery({ queryKey: [...JOB_APPLICATIONS_QUERY_KEY, options], queryFn: () => getJobApplications(options) })
}

export function useJobApplicationSummary() {
  return useQuery({ queryKey: JOB_APPLICATION_SUMMARY_QUERY_KEY, queryFn: getJobApplicationSummary })
}

export function useJobApplicationActions() {
  return useQuery({ queryKey: JOB_APPLICATION_ACTIONS_QUERY_KEY, queryFn: getJobApplicationActions })
}

/** The detail drawer reads a fresh record so its revision follows every write. */
export function useJobApplication(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: id ? jobApplicationDetailQueryKey(id) : ['job-applications', 'detail', 'none'],
    queryFn: () => getJobApplication(id!),
    enabled: Boolean(id) && enabled,
  })
}

export function useJobApplicationEvents(id: string | undefined, enabled = true) {
  return useQuery({ queryKey: ['job-applications', id, 'events'], queryFn: () => getJobApplicationEvents(id!), enabled: Boolean(id) && enabled })
}

export function useJobApplicationMutations() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { t } = useI18n()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: JOB_APPLICATIONS_QUERY_KEY })
  return {
    create: useMutation({ mutationFn: (data: CreateJobApplicationRequest) => createJobApplication(data), onSuccess: () => { invalidate(); message.success(t('applications.applicationCreated')) }, onError: (e: Error) => message.error(getErrorMessage(e, t('applications.createFailed'))) }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: string; data: UpdateJobApplicationRequest }) => updateJobApplication(id, data),
      onSuccess: (application) => {
        queryClient.setQueryData(jobApplicationDetailQueryKey(application.id), application)
        invalidate()
        message.success(t('applications.applicationUpdated'))
      },
      onError: (e: Error) => message.error(getErrorMessage(e, t('applications.updateFailed'))),
    }),
    remove: useMutation({ mutationFn: deleteJobApplication, onSuccess: () => { invalidate(); message.success(t('applications.applicationDeleted')) }, onError: (e: Error) => message.error(getErrorMessage(e, t('applications.deleteFailed'))) }),
    addEvent: useMutation({ mutationFn: ({ id, data }: { id: string; data: Parameters<typeof createJobApplicationEvent>[1] }) => createJobApplicationEvent(id, data), onSuccess: () => { invalidate(); message.success(t('applications.eventRecorded')) }, onError: (e: Error) => message.error(getErrorMessage(e, t('applications.recordFailed'))) }),
  }
}
