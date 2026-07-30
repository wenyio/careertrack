import Database from 'better-sqlite3'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { decryptTotpSecret } from '@/lib/security/totp-credentials'
import { runMigrations } from '@/lib/storage/migrations'
import type {
  DatabaseQuery,
  DatabaseTransaction,
} from '@/lib/storage/types'

const originalEncryptionKey = process.env.TOTP_ENCRYPTION_KEY

beforeAll(() => {
  process.env.TOTP_ENCRYPTION_KEY = (
    'migration-test-totp-encryption-key-with-at-least-32-characters'
  )
})

afterAll(() => {
  if (originalEncryptionKey === undefined) {
    delete process.env.TOTP_ENCRYPTION_KEY
  } else {
    process.env.TOTP_ENCRYPTION_KEY = originalEncryptionKey
  }
})

function sqliteQuery(database: Database.Database): DatabaseQuery {
  return async (text, params = []) => {
    const orderedParams: unknown[] = []
    const sql = text
      .replace(/\$(\d+)/g, (_match, index: string) => {
        orderedParams.push(params[Number(index) - 1])
        return '?'
      })
      .replace(/NOW\(\)/gi, "datetime('now')")

    if (/^\s*(SELECT|PRAGMA)/i.test(sql) || /RETURNING/i.test(sql)) {
      const rows = database.prepare(sql).all(...orderedParams)
      return { rows, rowCount: rows.length }
    }
    const result = database.prepare(sql).run(...orderedParams)
    return { rows: [], rowCount: result.changes }
  }
}

describe('versioned storage migrations', () => {
  it('encrypts legacy plaintext TOTP secrets and adds recovery storage', async () => {
    const database = new Database(':memory:')
    database.pragma('foreign_keys = ON')
    database.exec(`
      CREATE TABLE schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        otp_secret VARCHAR(100)
      );
      CREATE TABLE resumes (
        id TEXT PRIMARY KEY,
        revision INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE registration_codes (
        id TEXT PRIMARY KEY,
        code_hash VARCHAR(64) NOT NULL
      );
      INSERT INTO users (id, otp_secret)
      VALUES ('user-legacy', 'SZXVJNBXDEJR6EMY7ARWTOHL5CVCZ7ZI');
    `)

    const query = sqliteQuery(database)
    const transaction: DatabaseTransaction = async (callback) => {
      database.exec('BEGIN')
      try {
        const result = await callback(query)
        database.exec('COMMIT')
        return result
      } catch (error) {
        database.exec('ROLLBACK')
        throw error
      }
    }

    await runMigrations('sqlite', transaction)

    const migrated = database.prepare(
      `SELECT otp_secret, otp_recovery_codes
       FROM users WHERE id = 'user-legacy'`,
    ).get()
    const versions = database.prepare(
      'SELECT version FROM schema_migrations ORDER BY version',
    ).all().map((row) => row.version)
    database.close()

    expect(migrated.otp_secret).toMatch(/^v1:/)
    expect(migrated.otp_secret).not.toContain('SZXVJNBX')
    expect(decryptTotpSecret(migrated.otp_secret, 'user-legacy'))
      .toBe('SZXVJNBXDEJR6EMY7ARWTOHL5CVCZ7ZI')
    expect(migrated.otp_recovery_codes).toBe('[]')
    expect(versions).toContain('003_encrypt_totp_and_recovery_codes')
    expect(versions).toContain('004_consolidate_postgres_resume_config')
  })
})
