export const JOB_APPLICATION_STATUSES = [
  'wishlist', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn',
] as const

export type JobApplicationStatus = typeof JOB_APPLICATION_STATUSES[number]

export const JOB_APPLICATION_SORTS = [
  'updated', 'next_action', 'applied_at', 'company',
] as const

export type JobApplicationSort = typeof JOB_APPLICATION_SORTS[number]

export const JOB_APPLICATION_EVENT_TYPES = [
  'created', 'status_changed', 'follow_up', 'interview', 'note', 'offer',
] as const

export type JobApplicationEventType = typeof JOB_APPLICATION_EVENT_TYPES[number]

export interface JobApplicationEvent {
  id: string
  application_id: string
  user_id: string
  event_type: JobApplicationEventType
  content: string | null
  metadata: Record<string, unknown>
  occurred_at: string
  created_at: string
}

export interface CreateJobApplicationEventRequest {
  event_type: Exclude<JobApplicationEventType, 'created' | 'status_changed'>
  content?: string | null
  metadata?: Record<string, unknown>
  occurred_at?: string
  expected_revision?: number
  next_action_at?: string | null
  next_status?: JobApplicationStatus
}

export interface JobApplication {
  id: string
  user_id: string
  company: string
  position: string
  status: JobApplicationStatus
  job_url: string | null
  location: string | null
  channel: string | null
  salary: string | null
  notes: string | null
  applied_at: string | null
  next_action_at: string | null
  status_changed_at: string
  resume_id: string | null
  resume_version_id: string | null
  revision: number
  created_at: string
  updated_at: string
  /** Joined display metadata; never used as an authorization decision. */
  resume_name?: string | null
  resume_version_revision?: number | null
}

export interface JobApplicationSummary {
  total: number
  active: number
  interview: number
  offer: number
  due_today: number
  overdue: number
  by_status: Record<JobApplicationStatus, number>
}

export interface JobApplicationActionCenter {
  overdue: JobApplication[]
  due_today: JobApplication[]
  upcoming: JobApplication[]
  unplanned: JobApplication[]
}

export interface CreateJobApplicationRequest {
  company: string
  position: string
  status?: JobApplicationStatus
  job_url?: string | null
  location?: string | null
  channel?: string | null
  salary?: string | null
  notes?: string | null
  applied_at?: string | null
  next_action_at?: string | null
  resume_id?: string | null
  resume_version_id?: string | null
}

export interface UpdateJobApplicationRequest extends Partial<CreateJobApplicationRequest> {
  expected_revision: number
}
