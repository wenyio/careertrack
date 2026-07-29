import { beforeAll, describe, expect, it, vi } from 'vitest'
import { SignJWT } from 'jose'
import type { DatabaseQuery } from '@/lib/storage/types'
import {
  issueAuthSession,
  resolveAuthSessionToken,
  revokeAllAuthSessions,
  revokeAuthSessionToken,
} from '@/lib/security/auth-session'

beforeAll(() => {
  process.env.JWT_SECRET = 'unit-test-jwt-secret-with-at-least-32-characters'
})

describe('auth sessions', () => {
  it('stores only a token digest and resolves an active session', async () => {
    const writes: Array<{ text: string; params?: unknown[] }> = []
    const writeQuery: DatabaseQuery = async (text, params) => {
      writes.push({ text, params })
      return { rows: [], rowCount: 1 }
    }

    const token = await issueAuthSession(
      { id: 'user-1', username: 'tester', auth_provider: 1 },
      writeQuery,
    )
    const insert = writes.find((write) => write.text.includes('INSERT INTO auth_sessions'))
    expect(insert).toBeDefined()
    expect(insert?.params?.[2]).toMatch(/^[a-f0-9]{64}$/)
    expect(insert?.params).not.toContain(token)

    const sessionId = insert?.params?.[0]
    const readQuery: DatabaseQuery = async () => ({
      rows: [{
        session_id: sessionId,
        id: 'user-1',
        username: 'tester',
        otp_enabled: false,
        role: 'user',
        auth_provider: 1,
        disabled_at: null,
      }],
      rowCount: 1,
    })

    await expect(resolveAuthSessionToken(token, readQuery)).resolves.toEqual({
      id: sessionId,
      user: {
        id: 'user-1',
        username: 'tester',
        otp_enabled: false,
        role: 'user',
        auth_provider: 1,
        disabled_at: null,
      },
    })
  })

  it('rejects signed legacy tokens without a server-side session id', async () => {
    const token = await new SignJWT({ username: 'legacy' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-legacy')
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET))
    const database = vi.fn()

    await expect(
      resolveAuthSessionToken(token, database as unknown as DatabaseQuery),
    ).resolves.toBeNull()
    expect(database).not.toHaveBeenCalled()
  })

  it('revokes one token or all sessions without persisting the raw token', async () => {
    const calls: Array<{ text: string; params?: unknown[] }> = []
    const database: DatabaseQuery = async (text, params) => {
      calls.push({ text, params })
      return { rows: [], rowCount: 1 }
    }

    await revokeAuthSessionToken('raw-session-token', database)
    await revokeAllAuthSessions('user-1', database)

    expect(calls[0].params?.[0]).toMatch(/^[a-f0-9]{64}$/)
    expect(calls[0].params).not.toContain('raw-session-token')
    expect(calls[1].params).toEqual(['user-1'])
  })
})
