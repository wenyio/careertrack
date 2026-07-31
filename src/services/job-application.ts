import api from './api'
import { parsePaginatedResponse } from './pagination'
import type { CreateJobApplicationEventRequest, CreateJobApplicationRequest, JobApplication, JobApplicationActionCenter, JobApplicationEvent, JobApplicationSort, JobApplicationStatus, JobApplicationSummary, UpdateJobApplicationRequest } from '@/types/job-application'
import type { PaginatedData } from '@/types/pagination'

export async function getJobApplications(options: { page?: number; pageSize?: number; q?: string; status?: 'all' | JobApplicationStatus; sort?: JobApplicationSort } = {}): Promise<PaginatedData<JobApplication>> {
  const page = options.page || 1
  const pageSize = options.pageSize || 20
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (options.q) params.set('q', options.q)
  if (options.status && options.status !== 'all') params.set('status', options.status)
  if (options.sort) params.set('sort', options.sort)
  const response = await api.get<JobApplication[]>(`/job-applications?${params}`)
  return parsePaginatedResponse(response, page, pageSize)
}

export async function getJobApplication(id: string): Promise<JobApplication> {
  return (await api.get<JobApplication>(`/job-applications/${id}`)).data
}

export async function getJobApplicationSummary(): Promise<JobApplicationSummary> {
  return (await api.get<JobApplicationSummary>('/job-applications/summary')).data
}

export async function getJobApplicationActions(): Promise<JobApplicationActionCenter> {
  return (await api.get<JobApplicationActionCenter>('/job-applications/actions')).data
}

export async function getJobApplicationEvents(id: string, options: { page?: number; pageSize?: number } = {}): Promise<PaginatedData<JobApplicationEvent>> {
  const page = options.page || 1
  const pageSize = options.pageSize || 20
  const response = await api.get<JobApplicationEvent[]>(`/job-applications/${id}/events?page=${page}&pageSize=${pageSize}`)
  return parsePaginatedResponse(response, page, pageSize)
}

export async function createJobApplicationEvent(id: string, data: CreateJobApplicationEventRequest): Promise<JobApplicationEvent> {
  return (await api.post<JobApplicationEvent>(`/job-applications/${id}/events`, data)).data
}

export async function createJobApplication(data: CreateJobApplicationRequest): Promise<JobApplication> {
  return (await api.post<JobApplication>('/job-applications', data)).data
}

export async function updateJobApplication(id: string, data: UpdateJobApplicationRequest): Promise<JobApplication> {
  return (await api.put<JobApplication>(`/job-applications/${id}`, data)).data
}

export async function deleteJobApplication(id: string): Promise<void> {
  await api.delete(`/job-applications/${id}`)
}
