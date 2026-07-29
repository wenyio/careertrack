import { describe, expect, it } from 'vitest'
import { parseJsonBody } from '@/lib/api-validation'
import {
  disableOtpBodySchema,
  passwordBodySchema,
  registerBodySchema,
  usernameBodySchema,
} from '@/lib/validation/auth'

async function responseBody(response: Response) {
  return {
    status: response.status,
    json: await response.json(),
  }
}

describe('authentication request validation', () => {
  it('maps malformed JSON to a stable validation response', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"username":',
    })

    const parsed = await parseJsonBody(request, registerBodySchema)
    expect(parsed.success).toBe(false)
    if (parsed.success) return

    await expect(responseBody(parsed.response)).resolves.toEqual({
      status: 400,
      json: {
        code: 'VALIDATION_ERROR',
        message: '请求体必须是有效的 JSON',
      },
    })
  })

  it('rejects wrong field types before they reach password verification', async () => {
    const request = new Request('http://localhost/api/auth/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: { unexpected: true },
        new_password: 'ValidPassword123!',
      }),
    })

    const parsed = await parseJsonBody(request, passwordBodySchema)
    expect(parsed.success).toBe(false)
    if (parsed.success) return

    await expect(responseBody(parsed.response)).resolves.toMatchObject({
      status: 400,
      json: { code: 'VALIDATION_ERROR', message: '当前密码格式错误' },
    })
  })

  it('rejects valid JSON values that are not request objects', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('not-an-object'),
    })

    const parsed = await parseJsonBody(request, registerBodySchema)
    expect(parsed.success).toBe(false)
    if (parsed.success) return

    await expect(responseBody(parsed.response)).resolves.toMatchObject({
      status: 400,
      json: {
        code: 'VALIDATION_ERROR',
        message: '请求体必须是 JSON 对象',
      },
    })
  })

  it('normalizes username whitespace and keeps the documented character set', async () => {
    const request = new Request('http://localhost/api/auth/username', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '  新用户_01  ' }),
    })

    await expect(parseJsonBody(request, usernameBodySchema)).resolves.toEqual({
      success: true,
      data: { username: '新用户_01' },
    })
  })

  it('enforces password, registration and six-digit OTP boundaries', async () => {
    expect(registerBodySchema.safeParse({
      username: 'ab',
      password: 'short',
      registration_code: '',
    }).success).toBe(false)
    expect(disableOtpBodySchema.safeParse({
      password: 'ValidPassword123!',
      code: '12ab56',
    }).success).toBe(false)
    expect(disableOtpBodySchema.safeParse({
      password: 'ValidPassword123!',
      code: '123456',
    }).success).toBe(true)
  })
})
