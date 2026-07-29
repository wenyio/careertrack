import { describe, expect, it } from 'vitest'
import { validateProductionSecret } from '@/lib/security/secrets'

describe('validateProductionSecret', () => {
  it('rejects short and known default secrets', () => {
    expect(() => validateProductionSecret('JWT_SECRET', 'short')).toThrow(/至少需要/)
    expect(() => validateProductionSecret(
      'JWT_SECRET',
      'change-me-in-production'.padEnd(32, 'x'),
    )).not.toThrow()
    expect(() => validateProductionSecret('JWT_SECRET', 'change-me-in-production')).toThrow()
  })

  it('accepts a sufficiently long non-default secret', () => {
    expect(() => validateProductionSecret(
      'JWT_SECRET',
      'a-unique-production-secret-with-more-than-32-characters',
    )).not.toThrow()
  })
})
