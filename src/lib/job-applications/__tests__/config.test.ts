import { describe, expect, it } from 'vitest'
import { getPriorityActionPolicy } from '@/lib/job-applications/config'

describe('job application priority action policy', () => {
  it.each([
    ['unplanned', 'applied', 'applications.priority.scheduleNext', 'follow_up', 'date'],
    ['overdue', 'applied', 'applications.priority.handle', 'follow_up', 'date'],
    ['due_today', 'interview', 'applications.priority.recordInterview', 'interview', 'date'],
    ['upcoming', 'applied', 'applications.priority.recordProgress', 'follow_up', 'keep'],
    ['upcoming', 'interview', 'applications.priority.recordInterview', 'interview', 'keep'],
  ] as const)('%s + %s -> %s / %s / %s', (bucket, status, primaryLabelKey, activity, initialNextActionMode) => {
    expect(getPriorityActionPolicy(bucket, status)).toEqual({
      primaryLabelKey,
      activity,
      initialNextActionMode,
    })
  })
})
