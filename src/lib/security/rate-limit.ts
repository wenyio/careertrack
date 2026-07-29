import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'

interface RateLimitBucket {
  count: number
  resetAt: number
}

interface RateLimitStore {
  buckets: Map<string, RateLimitBucket>
}

const globalForRateLimit = globalThis as unknown as {
  careertrackRateLimit: RateLimitStore | undefined
}

const store = globalForRateLimit.careertrackRateLimit ?? {
  buckets: new Map<string, RateLimitBucket>(),
}
globalForRateLimit.careertrackRateLimit = store

export interface RateLimitPolicy {
  namespace: string
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

function hashIdentity(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function cleanupExpiredBuckets(now: number): void {
  if (store.buckets.size < 10_000) return
  for (const [key, bucket] of store.buckets) {
    if (bucket.resetAt <= now) store.buckets.delete(key)
  }

  // Fail safe against unbounded memory use when an attacker keeps rotating keys.
  if (store.buckets.size > 50_000) {
    const excess = store.buckets.size - 50_000
    let removed = 0
    for (const key of store.buckets.keys()) {
      store.buckets.delete(key)
      removed++
      if (removed >= excess) break
    }
  }
}

export function consumeRateLimit(
  policy: RateLimitPolicy,
  identity: string,
  now = Date.now(),
): RateLimitResult {
  cleanupExpiredBuckets(now)

  const key = `${policy.namespace}:${hashIdentity(identity)}`
  let bucket = store.buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + policy.windowMs }
    store.buckets.set(key, bucket)
  }

  bucket.count += 1
  const allowed = bucket.count <= policy.limit
  const remaining = Math.max(0, policy.limit - bucket.count)

  return {
    allowed,
    limit: policy.limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  }
}

export function getClientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
}

export function enforceRateLimit(
  request: Request,
  policy: RateLimitPolicy,
  identitySuffix = '',
): NextResponse | null {
  const identity = `${getClientIp(request)}:${identitySuffix}`
  const result = consumeRateLimit(policy, identity)
  if (result.allowed) return null

  return NextResponse.json(
    {
      code: 'RATE_LIMITED',
      message: '请求过于频繁，请稍后重试',
      retry_after: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    },
  )
}

export function resetRateLimitsForTesting(): void {
  store.buckets.clear()
}
