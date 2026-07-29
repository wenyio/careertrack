import { beforeEach, describe, expect, it } from 'vitest'
import {
  consumeRateLimit,
  resetRateLimitsForTesting,
} from '@/lib/security/rate-limit'

const policy = {
  namespace: 'test',
  limit: 2,
  windowMs: 1_000,
}

describe('consumeRateLimit', () => {
  beforeEach(() => resetRateLimitsForTesting())

  it('blocks requests over the configured fixed-window limit', () => {
    expect(consumeRateLimit(policy, 'client-a', 100).allowed).toBe(true)
    expect(consumeRateLimit(policy, 'client-a', 200).allowed).toBe(true)

    const blocked = consumeRateLimit(policy, 'client-a', 300)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBe(1)
  })

  it('isolates identities and resets after the window', () => {
    consumeRateLimit(policy, 'client-a', 100)
    consumeRateLimit(policy, 'client-a', 200)

    expect(consumeRateLimit(policy, 'client-b', 300).allowed).toBe(true)
    expect(consumeRateLimit(policy, 'client-a', 1_101).allowed).toBe(true)
  })
})
