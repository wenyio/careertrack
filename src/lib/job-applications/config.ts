import type { JobApplicationStatus } from '@/types/job-application'

export const APPLICATION_STATUS_LABELS: Record<JobApplicationStatus, string> = {
  wishlist: '心愿单', applied: '已投递', screening: '筛选中', interview: '面试中',
  offer: '已获 Offer', rejected: '未通过', withdrawn: '已撤回',
}

export const APPLICATION_STATUS_COLORS: Record<JobApplicationStatus, string> = {
  wishlist: 'default', applied: 'blue', screening: 'cyan', interview: 'purple',
  offer: 'green', rejected: 'red', withdrawn: 'orange',
}

export const APPLICATION_ACTIVE_STATUSES: JobApplicationStatus[] = ['wishlist', 'applied', 'screening', 'interview', 'offer']
export const APPLICATION_ARCHIVED_STATUSES: JobApplicationStatus[] = ['rejected', 'withdrawn']

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
