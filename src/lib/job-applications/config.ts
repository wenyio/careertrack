import type { JobApplicationStatus } from '@/types/job-application'

export type PriorityBucket = 'overdue' | 'due_today' | 'upcoming' | 'unplanned'
export type PriorityActivity = 'follow_up' | 'interview'
export type PriorityNextActionMode = 'keep' | 'date' | 'snooze' | 'clear'

export interface PriorityActionPolicy {
  primaryLabel: string
  activity: PriorityActivity
  initialNextActionMode: PriorityNextActionMode
}

export const APPLICATION_STATUS_LABELS: Record<JobApplicationStatus, string> = {
  wishlist: '心愿单', applied: '已投递', screening: '沟通中', interview: '面试中',
  offer: 'Offer', rejected: '未通过', withdrawn: '已撤回',
}

export const APPLICATION_STATUS_COLORS: Record<JobApplicationStatus, string> = {
  wishlist: 'default', applied: 'blue', screening: 'gold', interview: 'purple',
  offer: 'green', rejected: 'red', withdrawn: 'orange',
}

export const APPLICATION_STATUS_PROGRESS_COLORS: Record<JobApplicationStatus, string> = {
  wishlist: '#8c8c8c', applied: '#1677ff', screening: '#faad14', interview: '#722ed1',
  offer: '#52c41a', rejected: '#ff4d4f', withdrawn: '#fa8c16',
}

export const APPLICATION_ACTIVE_STATUSES: JobApplicationStatus[] = ['wishlist', 'applied', 'screening', 'interview', 'offer']

/** Stage order is a product rule shared by action controls and stage grouping. */
export const APPLICATION_STAGE_ORDER: JobApplicationStatus[] = ['wishlist', 'applied', 'screening', 'interview', 'offer']

export function nextApplicationStatus(status: JobApplicationStatus): JobApplicationStatus | null {
  const index = APPLICATION_STAGE_ORDER.indexOf(status)
  return index >= 0 && index < APPLICATION_STAGE_ORDER.length - 1 ? APPLICATION_STAGE_ORDER[index + 1] : null
}

export function previousApplicationStatus(status: JobApplicationStatus): JobApplicationStatus | null {
  const index = APPLICATION_STAGE_ORDER.indexOf(status)
  return index > 0 ? APPLICATION_STAGE_ORDER[index - 1] : null
}

export function getPriorityActionPolicy(bucket: PriorityBucket, status: JobApplicationStatus): PriorityActionPolicy {
  if (bucket === 'unplanned') {
    return {
      primaryLabel: '安排下一步',
      activity: 'follow_up',
      initialNextActionMode: 'date',
    }
  }

  if (status === 'interview') {
    return {
      primaryLabel: '记录面试',
      activity: 'interview',
      initialNextActionMode: bucket === 'upcoming' ? 'keep' : 'date',
    }
  }

  if (bucket === 'overdue' || bucket === 'due_today') {
    return {
      primaryLabel: '处理',
      activity: 'follow_up',
      initialNextActionMode: 'date',
    }
  }

  return {
    primaryLabel: '记录进展',
    activity: 'follow_up',
    initialNextActionMode: 'keep',
  }
}
