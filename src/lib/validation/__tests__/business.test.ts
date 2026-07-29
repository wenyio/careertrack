import { describe, expect, it } from 'vitest'
import { parseJsonBody } from '@/lib/api-validation'
import {
  createMcpKeyBodySchema,
  createResumeBodySchema,
  profileUpdateBodySchema,
  publishResumeBodySchema,
  updateResumeBodySchema,
} from '@/lib/validation/business'
import {
  adminBatchDeleteUsersBodySchema,
  adminBatchUserRoleBodySchema,
  createRegistrationCodeBodySchema,
} from '@/lib/validation/admin'

describe('business request validation', () => {
  it('normalizes resume names and rejects empty updates', () => {
    expect(createResumeBodySchema.parse({
      name: '  我的简历  ',
    })).toEqual({
      name: '我的简历',
    })
    expect(updateResumeBodySchema.safeParse({}).success).toBe(false)
  })

  it('validates full module config and a unique complete order', () => {
    const valid = {
      modules_config: {
        basic_info: true,
        education: true,
        skills: true,
        work_experience: true,
        projects: true,
        portfolio: false,
        awards: false,
        other_experience: false,
        research: false,
        summary: false,
      },
      modules_order: [
        'basic_info',
        'summary',
        'education',
        'work_experience',
        'projects',
        'skills',
        'awards',
        'portfolio',
        'research',
        'other_experience',
      ],
      revision: 3,
    }
    expect(updateResumeBodySchema.safeParse(valid).success).toBe(true)
    // PUT historically accepts partial module switches; keep that API contract.
    expect(updateResumeBodySchema.safeParse({
      modules_config: { basic_info: true },
    }).success).toBe(true)
    expect(updateResumeBodySchema.safeParse({
      ...valid,
      modules_order: Array(10).fill('summary'),
    }).success).toBe(false)
  })

  it('keeps profile rich text compatible while rejecting primitive entries', () => {
    expect(profileUpdateBodySchema.safeParse({
      summary: {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
      skills: [{ id: 'skill-1', name: 'TypeScript' }],
    }).success).toBe(true)
    expect(profileUpdateBodySchema.safeParse({
      skills: ['TypeScript'],
    }).success).toBe(false)
  })

  it('validates public slugs and defaults MCP scope', () => {
    expect(publishResumeBodySchema.parse({
      slug: '  中文-resume_01  ',
    })).toEqual({ slug: '中文-resume_01' })
    expect(publishResumeBodySchema.safeParse({
      slug: '../private',
    }).success).toBe(false)
    expect(createMcpKeyBodySchema.parse({})).toEqual({
      scope: 'read_write',
    })
  })

  it('deduplicates bounded admin batches and validates role', () => {
    expect(adminBatchDeleteUsersBodySchema.parse({
      ids: ['user-1', 'user-1', 'user-2'],
    })).toEqual({ ids: ['user-1', 'user-2'] })
    expect(adminBatchUserRoleBodySchema.safeParse({
      ids: ['user-1'],
      role: 'owner',
    }).success).toBe(false)
    expect(adminBatchDeleteUsersBodySchema.safeParse({
      ids: [{ id: 'user-1' }],
    }).success).toBe(false)
  })

  it('validates registration code metadata', () => {
    expect(createRegistrationCodeBodySchema.safeParse({
      label: '  测试邀请  ',
      expires_at: '2026-12-31T23:59:59.000Z',
    }).success).toBe(true)
    expect(createRegistrationCodeBodySchema.safeParse({
      expires_at: 'tomorrow',
    }).success).toBe(false)
  })

  it('allows an empty body only for endpoints with explicit defaults', async () => {
    const allowed = new Request('http://localhost/api/mcp-keys', {
      method: 'POST',
    })
    await expect(parseJsonBody(
      allowed,
      createMcpKeyBodySchema,
      { allowEmpty: true },
    )).resolves.toEqual({
      success: true,
      data: { scope: 'read_write' },
    })

    const rejected = new Request('http://localhost/api/resumes', {
      method: 'POST',
    })
    const result = await parseJsonBody(rejected, createResumeBodySchema)
    expect(result.success).toBe(false)
  })
})
