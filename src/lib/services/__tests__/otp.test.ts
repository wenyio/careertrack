import { describe, expect, it } from 'vitest'
import { hashRecoveryCodes } from '@/lib/security/totp-credentials'
import { consumeRecoveryCode } from '@/lib/services/otp'
import type { DatabaseQuery } from '@/lib/storage/types'

describe('OTP recovery-code service', () => {
  it('uses a conditional update so the same code cannot be consumed twice', async () => {
    const originalEncryptionKey = process.env.TOTP_ENCRYPTION_KEY
    process.env.TOTP_ENCRYPTION_KEY = (
      'unit-test-totp-encryption-key-with-at-least-32-characters'
    )
    const userId = 'user-1'
    const codes = ['AAAA-BBBB-CCCC-DDDD', '1111-2222-3333-4444']
    const hashes = hashRecoveryCodes(codes, userId)
    const originalValue = JSON.stringify(hashes)
    let currentValue = originalValue

    const database: DatabaseQuery = async (_text, params) => {
      if (params?.[2] !== currentValue) return { rows: [], rowCount: 0 }
      currentValue = String(params[0])
      return { rows: [], rowCount: 1 }
    }

    await expect(consumeRecoveryCode(
      userId,
      codes[0],
      originalValue,
      database,
    )).resolves.toEqual({ consumed: true, remaining: 1 })
    await expect(consumeRecoveryCode(
      userId,
      codes[0],
      originalValue,
      database,
    )).resolves.toEqual({ consumed: false, remaining: 1 })

    expect(JSON.parse(currentValue)).toEqual([hashes[1]])

    if (originalEncryptionKey === undefined) {
      delete process.env.TOTP_ENCRYPTION_KEY
    } else {
      process.env.TOTP_ENCRYPTION_KEY = originalEncryptionKey
    }
  })
})
