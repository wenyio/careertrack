import { describe, expect, it } from 'vitest'
import { error } from '@/lib/api'
import {
  parseRouteParams,
  parseSearchParams,
} from '@/lib/api-validation'
import {
  adminResumesQuerySchema,
  idPathParamsSchema,
  jobApplicationsQuerySchema,
  mcpKeyActionQuerySchema,
  registrationCodesQuerySchema,
  resumesQuerySchema,
} from '@/lib/validation/params'

const VALID_ID = '00000000-0000-4000-8000-000000000000'

async function responseBody(response: Response) {
  return {
    status: response.status,
    json: await response.json(),
  }
}

describe('route and query parameter validation', () => {
  it('accepts UUID route parameters and rejects malformed IDs', async () => {
    await expect(parseRouteParams(
      Promise.resolve({ id: VALID_ID }),
      idPathParamsSchema,
    )).resolves.toEqual({
      success: true,
      data: { id: VALID_ID },
    })

    const invalid = await parseRouteParams(
      Promise.resolve({ id: '../resume' }),
      idPathParamsSchema,
    )
    expect(invalid.success).toBe(false)
  })

  it('normalizes bounded search filters and applies enum defaults', () => {
    const request = new Request(
      'http://localhost/api/admin/resumes?q=%20test%20',
    )
    expect(parseSearchParams(request, adminResumesQuerySchema)).toEqual({
      success: true,
      data: {
        q: 'test',
        public: 'all',
        page: 1,
        page_size: 20,
      },
    })
  })

  it('parses bounded pagination and rejects invalid or duplicate values', () => {
    const valid = new Request(
      'http://localhost/api/resumes?page=3&page_size=48',
    )
    expect(parseSearchParams(valid, resumesQuerySchema)).toEqual({
      success: true,
      data: { page: 3, page_size: 48 },
    })

    for (const query of [
      '?page=0',
      '?page=-1',
      '?page=1.5',
      '?page_size=101',
      '?page=1&page=2',
    ]) {
      expect(parseSearchParams(
        new Request(`http://localhost/api/resumes${query}`),
        resumesQuerySchema,
      ).success).toBe(false)
    }
  })

  it('supports job application search, status and pageSize compatibility', () => {
    expect(parseSearchParams(
      new Request('http://localhost/api/job-applications?q=%20Acme%20&status=applied&page=2&pageSize=10'),
      jobApplicationsQuerySchema,
    )).toEqual({
      success: true,
      data: { q: 'Acme', status: 'applied', page: 2, page_size: 10 },
    })
    for (const query of ['?status=paused', `?q=${'x'.repeat(101)}`, '?page_size=10&pageSize=10']) {
      expect(parseSearchParams(new Request(`http://localhost/api/job-applications${query}`), jobApplicationsQuerySchema).success).toBe(false)
    }
  })

  it('rejects unknown enum values and ambiguous duplicate parameters', () => {
    const invalidStatus = new Request(
      'http://localhost/api/admin/registration-codes?status=pending',
    )
    expect(parseSearchParams(
      invalidStatus,
      registrationCodesQuerySchema,
    ).success).toBe(false)

    const duplicateAction = new Request(
      'http://localhost/api/mcp-keys/key?action=delete&action=delete',
    )
    expect(parseSearchParams(
      duplicateAction,
      mcpKeyActionQuerySchema,
    ).success).toBe(false)
  })

  it('maps common HTTP statuses to stable API error codes', async () => {
    await expect(responseBody(error('未授权', 401))).resolves.toEqual({
      status: 401,
      json: { code: 'UNAUTHORIZED', message: '未授权' },
    })
    await expect(responseBody(error('简历不存在', 404))).resolves.toEqual({
      status: 404,
      json: { code: 'NOT_FOUND', message: '简历不存在' },
    })
    await expect(responseBody(error('版本冲突', 409))).resolves.toEqual({
      status: 409,
      json: { code: 'CONFLICT', message: '版本冲突' },
    })
  })
})
