import { describe, expect, it } from 'vitest'
import {
  getTotpEncryptionSecret,
  validateProductionSecret,
} from '@/lib/security/secrets'

describe('validateProductionSecret', () => {
  it('rejects short and known default secrets', () => {
    expect(() => validateProductionSecret('JWT_SECRET', 'short')).toThrow(/至少需要/)
    expect(() => validateProductionSecret(
      'JWT_SECRET',
      'change-me-in-production'.padEnd(32, 'x'),
    )).not.toThrow()
    expect(() => validateProductionSecret('JWT_SECRET', 'change-me-in-production')).toThrow()
    expect(() => validateProductionSecret(
      'JWT_SECRET',
      'replace-with-at-least-32-random-characters',
    )).toThrow(/弱默认值/)
    expect(() => validateProductionSecret(
      'TOTP_ENCRYPTION_KEY',
      'replace-with-a-different-stable-random-key',
    )).toThrow(/弱默认值/)
  })

  it('accepts a sufficiently long non-default secret', () => {
    expect(() => validateProductionSecret(
      'JWT_SECRET',
      'a-unique-production-secret-with-more-than-32-characters',
    )).not.toThrow()
  })

  it('fails closed when the production TOTP encryption key is missing', () => {
    const originalNodeEnv = process.env.NODE_ENV
    const originalEncryptionKey = process.env.TOTP_ENCRYPTION_KEY
    process.env.NODE_ENV = 'production'
    delete process.env.TOTP_ENCRYPTION_KEY
    try {
      expect(() => getTotpEncryptionSecret()).toThrow(/未设置/)
    } finally {
      process.env.NODE_ENV = originalNodeEnv
      if (originalEncryptionKey === undefined) {
        delete process.env.TOTP_ENCRYPTION_KEY
      } else {
        process.env.TOTP_ENCRYPTION_KEY = originalEncryptionKey
      }
    }
  })
})
