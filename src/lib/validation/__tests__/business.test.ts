import { describe, expect, it } from 'vitest'
import {
  MAX_JSON_BODY_BYTES,
  MAX_JSON_DEPTH,
  MAX_JSON_NODES,
  MAX_JSON_STRING_CHARS,
  parseJsonBody,
} from '@/lib/api-validation'
import {
  createMcpKeyBodySchema,
  createResumeBodySchema,
  profileUpdateBodySchema,
  publishResumeBodySchema,
  updateResumeBodySchema,
  createJobApplicationBodySchema,
  createJobApplicationEventBodySchema,
  updateJobApplicationBodySchema,
} from '@/lib/validation/business'
import {
  adminBatchDeleteUsersBodySchema,
  adminBatchUserRoleBodySchema,
  createRegistrationCodeBodySchema,
} from '@/lib/validation/admin'

describe('business request validation', () => {
  it('validates job application status, lengths, URLs, dates and optimistic updates', () => {
    const valid = createJobApplicationBodySchema.safeParse({
      company: '示例公司', position: '工程师', status: 'applied',
      job_url: 'https://example.com/jobs/1', applied_at: '2026-07-31', next_action_at: '2026-08-01',
    })
    expect(valid.success).toBe(true)
    expect(createJobApplicationBodySchema.safeParse({ company: 'x', position: 'y', status: 'unknown' }).success).toBe(false)
    expect(createJobApplicationBodySchema.safeParse({ company: 'x'.repeat(121), position: 'y' }).success).toBe(false)
    expect(createJobApplicationBodySchema.safeParse({ company: 'x', position: 'y', job_url: 'ftp://example.com' }).success).toBe(false)
    expect(createJobApplicationBodySchema.safeParse({ company: 'x', position: 'y', applied_at: '2026-02-30' }).success).toBe(false)
    expect(updateJobApplicationBodySchema.safeParse({ expected_revision: 1 }).success).toBe(false)
    expect(updateJobApplicationBodySchema.safeParse({ expected_revision: 1, notes: '已跟进' }).success).toBe(true)
  })

  it('validates an atomic progress record with its linked stage and next action', () => {
    expect(createJobApplicationEventBodySchema.safeParse({
      event_type: 'interview',
      metadata: { round: '一面', result: '通过' },
      next_status: 'interview',
      next_action_at: null,
      expected_revision: 1,
    }).success).toBe(true)
    expect(createJobApplicationEventBodySchema.safeParse({
      event_type: 'interview',
      next_status: 'paused',
    }).success).toBe(false)
    expect(createJobApplicationEventBodySchema.safeParse({
      event_type: 'follow_up',
      content: '   ',
    }).success).toBe(false)
    expect(createJobApplicationEventBodySchema.safeParse({
      event_type: 'note',
      content: null,
    }).success).toBe(false)
    expect(createJobApplicationEventBodySchema.safeParse({
      event_type: 'interview',
      metadata: { round: '一面', format: '鸽子传书' },
    }).success).toBe(false)
    expect(createJobApplicationEventBodySchema.safeParse({
      event_type: 'follow_up',
      content: '已邮件跟进',
      next_action_at: '2026-08-01',
    }).success).toBe(false)
    expect(createJobApplicationEventBodySchema.safeParse({
      event_type: 'follow_up',
      content: '已邮件跟进',
      next_action_at: '2026-08-01',
      expected_revision: 1,
    }).success).toBe(true)
  })
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

  it('validates rich-text semantics in profile and resume content', () => {
    const validDoc = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        attrs: { textAlign: null, indent: 0 },
        content: [{
          type: 'text',
          text: 'CareerTrack',
          marks: [{
            type: 'link',
            attrs: { href: 'https://example.com/careertrack' },
          }],
        }],
      }],
    }

    expect(profileUpdateBodySchema.safeParse({
      summary: validDoc,
      projects: [{ description: validDoc }],
    }).success).toBe(true)
    expect(profileUpdateBodySchema.safeParse({
      summary: JSON.stringify(validDoc),
    }).success).toBe(true)
    expect(updateResumeBodySchema.safeParse({
      content: { summary: validDoc },
    }).success).toBe(true)

    expect(profileUpdateBodySchema.safeParse({
      summary: {
        type: 'doc',
        content: [{ type: 'heading', content: [] }],
      },
    }).success).toBe(false)
    expect(updateResumeBodySchema.safeParse({
      content: {
        summary: {
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [{
              type: 'text',
              text: 'unsafe',
              marks: [{
                type: 'link',
                attrs: { href: 'javascript:alert(1)' },
              }],
            }],
          }],
        },
      },
    }).success).toBe(false)
    expect(profileUpdateBodySchema.safeParse({
      summary: JSON.stringify({
        type: 'doc',
        content: [{ type: 'heading', content: [] }],
      }),
    }).success).toBe(false)
  })

  it('normalizes nullable profile clearable fields from legacy payloads', () => {
    const parsed = profileUpdateBodySchema.parse({
      summary: null,
      basic_info: {
        avatar: null,
        other: {
          website: null,
          github: null,
        },
      },
      projects: [{
        id: 'project-1',
        name: 'Legacy Project',
        link: null,
        description: null,
      }],
      portfolio: [{
        id: 'portfolio-1',
        name: 'Legacy Portfolio',
        link: null,
        image: null,
        description: null,
      }],
      skills: [{
        id: 'skill-1',
        name: 'TypeScript',
        description: null,
      }],
    })

    expect(parsed.summary).toBe('')
    expect(parsed.basic_info?.avatar).toBe('')
    expect(parsed.basic_info?.other?.website).toBe('')
    expect(parsed.basic_info?.other?.github).toBe('')
    expect(parsed.projects?.[0].link).toBe('')
    expect(parsed.projects?.[0].description).toBe('')
    expect(parsed.portfolio?.[0].link).toBe('')
    expect(parsed.portfolio?.[0].image).toBe('')
    expect(parsed.portfolio?.[0].description).toBe('')
    expect(parsed.skills?.[0].description).toBe('')
  })

  it('validates resume preview configuration consistently with editor controls', () => {
    expect(updateResumeBodySchema.safeParse({
      content: {
        preview_config: { fontSize: 18, lineHeight: 1.7 },
      },
    }).success).toBe(true)

    expect(updateResumeBodySchema.safeParse({
      content: {
        preview_config: { fontSize: 13, lineHeight: 1.7 },
      },
    }).success).toBe(false)
    expect(updateResumeBodySchema.safeParse({
      content: {
        preview_config: { fontSize: 18, lineHeight: 3.1 },
      },
    }).success).toBe(false)
  })

  it('accepts relative and web URLs while rejecting unsafe protocols', () => {
    expect(profileUpdateBodySchema.safeParse({
      basic_info: {
        avatar: '/uploads/avatar.png',
        other: {
          website: 'https://example.com',
          github: 'github.com/example',
        },
      },
      projects: [{ link: 'https://example.com/project' }],
      portfolio: [{
        link: '/portfolio/example',
        image: 'https://cdn.example.com/work.png',
      }],
    }).success).toBe(true)

    expect(profileUpdateBodySchema.safeParse({
      basic_info: { avatar: 'data:image/svg+xml,<svg />' },
    }).success).toBe(false)
    expect(updateResumeBodySchema.safeParse({
      content: {
        projects: [{ link: 'javascript:alert(1)' }],
      },
    }).success).toBe(false)
    expect(updateResumeBodySchema.safeParse({
      content: {
        portfolio: [{ image: 'ftp://example.com/work.png' }],
      },
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

  it('stops oversized JSON while streaming the request body', async () => {
    const request = new Request('http://localhost/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: 'x'.repeat(MAX_JSON_BODY_BYTES),
      }),
    })

    const result = await parseJsonBody(request, profileUpdateBodySchema)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.response.status).toBe(413)
    await expect(result.response.json()).resolves.toEqual({
      code: 'PAYLOAD_TOO_LARGE',
      message: '请求体不能超过 1 MiB',
    })
  })

  it('rejects JSON that exceeds depth, node, or string budgets', async () => {
    let nested: Record<string, unknown> = { text: 'ok' }
    for (let depth = 0; depth <= MAX_JSON_DEPTH; depth += 1) {
      nested = { content: nested }
    }

    const deepRequest = new Request('http://localhost/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ summary: nested }),
    })
    const deepResult = await parseJsonBody(
      deepRequest,
      profileUpdateBodySchema,
    )
    expect(deepResult.success).toBe(false)
    if (!deepResult.success) {
      await expect(deepResult.response.json()).resolves.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: `JSON 嵌套层级不能超过 ${MAX_JSON_DEPTH} 层`,
      })
    }

    const broadRequest = new Request('http://localhost/api/profile', {
      method: 'PUT',
      body: JSON.stringify({
        basic_info: {
          values: Array.from({ length: MAX_JSON_NODES }, (_, index) => index),
        },
      }),
    })
    const broadResult = await parseJsonBody(
      broadRequest,
      profileUpdateBodySchema,
    )
    expect(broadResult.success).toBe(false)
    if (!broadResult.success) {
      await expect(broadResult.response.json()).resolves.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: `JSON 节点数量不能超过 ${MAX_JSON_NODES} 个`,
      })
    }

    const longStringRequest = new Request('http://localhost/api/profile', {
      method: 'PUT',
      body: JSON.stringify({
        summary: 'x'.repeat(MAX_JSON_STRING_CHARS + 1),
      }),
    })
    const longStringResult = await parseJsonBody(
      longStringRequest,
      profileUpdateBodySchema,
    )
    expect(longStringResult.success).toBe(false)
    if (!longStringResult.success) {
      await expect(longStringResult.response.json()).resolves.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: `单个文本字段不能超过 ${MAX_JSON_STRING_CHARS} 个字符`,
      })
    }
  })
})
