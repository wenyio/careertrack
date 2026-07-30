import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  hashRecoveryCodes,
  matchingRecoveryCodeHash,
} from '@/lib/security/totp-credentials'

const originalEncryptionKey = process.env.TOTP_ENCRYPTION_KEY

beforeAll(() => {
  process.env.TOTP_ENCRYPTION_KEY = (
    'unit-test-totp-encryption-key-with-at-least-32-characters'
  )
})

afterAll(() => {
  if (originalEncryptionKey === undefined) {
    delete process.env.TOTP_ENCRYPTION_KEY
  } else {
    process.env.TOTP_ENCRYPTION_KEY = originalEncryptionKey
  }
})

describe('TOTP credential protection', () => {
  it('encrypts secrets and binds ciphertext to one user', () => {
    const secret = 'SZXVJNBXDEJR6EMY7ARWTOHL5CVCZ7ZI'
    const encrypted = encryptTotpSecret(secret, 'user-1')

    expect(encrypted).toMatch(/^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/)
    expect(encrypted).not.toContain(secret)
    expect(decryptTotpSecret(encrypted, 'user-1')).toBe(secret)
    expect(() => decryptTotpSecret(encrypted, 'user-2')).toThrow(
      /无法解密/,
    )
  })

  it('keeps legacy plaintext readable during migration', () => {
    expect(decryptTotpSecret('LEGACYBASE32SECRET', 'user-1'))
      .toBe('LEGACYBASE32SECRET')
  })

  it('generates one-time codes and stores only user-bound digests', () => {
    const codes = generateRecoveryCodes()
    const hashes = hashRecoveryCodes(codes, 'user-1')

    expect(codes).toHaveLength(10)
    expect(new Set(codes)).toHaveLength(10)
    expect(codes.every((code) => (
      /^[A-F0-9]{4}(?:-[A-F0-9]{4}){3}$/.test(code)
    ))).toBe(true)
    expect(hashes.every((hash) => /^[a-f0-9]{64}$/.test(hash))).toBe(true)
    expect(hashes.join(':')).not.toContain(codes[0])

    const normalized = codes[0].replace(/-/g, '').toLowerCase()
    expect(matchingRecoveryCodeHash(normalized, hashes, 'user-1'))
      .toBe(hashes[0])
    expect(matchingRecoveryCodeHash(codes[0], hashes, 'user-2')).toBeNull()
    expect(matchingRecoveryCodeHash('0000-0000-0000-0000', hashes, 'user-1'))
      .toBeNull()
  })
})
