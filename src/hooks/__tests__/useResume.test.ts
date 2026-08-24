import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { cacheResumeDetail, resumeQueryKey } from '@/hooks/useResume'
import type { Resume } from '@/types/resume'

const MODULES_CONFIG = {
  basic_info: true,
  education: true,
  skills: true,
  work_experience: true,
  projects: true,
  portfolio: true,
  awards: true,
  other_experience: true,
  research: true,
  summary: true,
}

function makeResume(overrides: Partial<Resume> = {}): Resume {
  return {
    id: 'resume-1',
    user_id: 'user-1',
    name: '旧名称',
    modules_config: MODULES_CONFIG,
    modules_order: ['basic_info', 'summary'],
    content: { basic_info: { name: '张三' } },
    template: 'classic',
    is_public: false,
    public_slug: null,
    revision: 1,
    created_at: '2026-08-24T00:00:00.000Z',
    updated_at: '2026-08-24T00:00:00.000Z',
    ...overrides,
  }
}

describe('resume query cache helpers', () => {
  it('replaces stale resume detail cache with the latest server revision', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(resumeQueryKey('resume-1'), makeResume())

    cacheResumeDetail(queryClient, makeResume({
      name: '新名称',
      revision: 2,
      updated_at: '2026-08-24T01:00:00.000Z',
    }))

    expect(queryClient.getQueryData<Resume>(resumeQueryKey('resume-1'))).toMatchObject({
      name: '新名称',
      revision: 2,
      updated_at: '2026-08-24T01:00:00.000Z',
    })
  })
})
