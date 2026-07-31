export const JOB_APPLICATION_STATUSES = [
  'wishlist', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn',
] as const

export type JobApplicationStatus = typeof JOB_APPLICATION_STATUSES[number]

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
