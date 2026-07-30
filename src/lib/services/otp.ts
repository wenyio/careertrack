import { query } from '@/lib/db'
import {
  matchingRecoveryCodeHash,
} from '@/lib/security/totp-credentials'
import type { DatabaseQuery } from '@/lib/storage/types'

export function recoveryCodeHashes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

/**
 * Atomically consume one recovery code.
 *
 * The old JSON value participates in the UPDATE condition. Two concurrent
 * login attempts using the same code cannot both remove the same digest.
 */
export async function consumeRecoveryCode(
  userId: string,
  code: string,
  storedValue: unknown,
  database: DatabaseQuery = query,
): Promise<{ consumed: boolean; remaining: number }> {
  const storedHashes = recoveryCodeHashes(storedValue)
  const matchingHash = matchingRecoveryCodeHash(code, storedHashes, userId)
  if (!matchingHash) return { consumed: false, remaining: storedHashes.length }

  const remainingHashes = storedHashes.filter((hash) => hash !== matchingHash)
  const result = await database(
    `UPDATE users
     SET otp_recovery_codes = $1, updated_at = NOW()
     WHERE id = $2 AND otp_recovery_codes = $3`,
    [
      JSON.stringify(remainingHashes),
      userId,
      JSON.stringify(storedHashes),
    ],
  )
  return {
    consumed: (result.rowCount || 0) === 1,
    remaining: remainingHashes.length,
  }
}
