import { describe, expect, it } from 'vitest'
import { types } from 'pg'
import '@/lib/storage/postgres'

describe('PostgreSQL DATE parser', () => {
  it('keeps a calendar date as text in an Asia/Shanghai process', () => {
    // DATE is not an instant. This catches the former Date → toISOString path
    // that could turn an east-Asia calendar day into the preceding UTC date.
    expect(types.getTypeParser(1082)('2026-08-01')).toBe('2026-08-01')
  })
})
