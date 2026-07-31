import { describe, expect, it } from 'vitest'
import { getPriorityActionPolicy } from '@/lib/job-applications/config'

describe('job application priority action policy', () => {
  it.each([
    ['unplanned', 'applied', '安排下一步', 'follow_up', 'date'],
    ['overdue', 'applied', '处理', 'follow_up', 'date'],
    ['due_today', 'interview', '记录面试', 'interview', 'date'],
    ['upcoming', 'applied', '记录进展', 'follow_up', 'keep'],
    ['upcoming', 'interview', '记录面试', 'interview', 'keep'],
  ] as const)('%s + %s -> %s / %s / %s', (bucket, status, primaryLabel, activity, initialNextActionMode) => {
    expect(getPriorityActionPolicy(bucket, status)).toEqual({
      primaryLabel,
      activity,
      initialNextActionMode,
    })
  })
})
