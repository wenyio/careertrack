import type { DatabaseQuery, DatabaseTransaction } from './types'

type StorageDriver = 'sqlite' | 'postgres'

interface Migration {
  version: string
  run: (driver: StorageDriver, query: DatabaseQuery) => Promise<void>
}

const migrations: Migration[] = [
  {
    version: '001_resume_revision_and_unique_codes',
    async run(driver, query) {
      if (driver === 'sqlite') {
        const columns = await query<{ name: string }>('PRAGMA table_info(resumes)')
        if (!columns.rows.some((column) => column.name === 'revision')) {
          await query(
            'ALTER TABLE resumes ADD COLUMN revision INTEGER NOT NULL DEFAULT 1',
          )
        }
      } else {
        await query(
          'ALTER TABLE resumes ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1',
        )
      }

      const duplicates = await query(
        `SELECT code_hash, COUNT(*) AS count
         FROM registration_codes
         GROUP BY code_hash
         HAVING COUNT(*) > 1
         LIMIT 1`,
      )
      if (duplicates.rows.length > 0) {
        throw new Error(
          '[migration] registration_codes 存在重复 code_hash，无法建立唯一索引；请先人工检查重复注册码',
        )
      }

      await query('DROP INDEX IF EXISTS idx_registration_codes_hash')
      await query(
        'CREATE UNIQUE INDEX idx_registration_codes_hash ON registration_codes(code_hash)',
      )
    },
  },
  {
    version: '002_revocable_auth_sessions',
    async run(driver, query) {
      if (driver === 'sqlite') {
        await query(
          `CREATE TABLE IF NOT EXISTS auth_sessions (
             id TEXT PRIMARY KEY,
             user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
             token_hash VARCHAR(64) UNIQUE NOT NULL,
             expires_at TEXT NOT NULL,
             revoked_at TEXT,
             created_at TEXT DEFAULT (datetime('now'))
           )`,
        )
      } else {
        await query(
          `CREATE TABLE IF NOT EXISTS auth_sessions (
             id UUID PRIMARY KEY,
             user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
             token_hash VARCHAR(64) UNIQUE NOT NULL,
             expires_at TIMESTAMPTZ NOT NULL,
             revoked_at TIMESTAMPTZ,
             created_at TIMESTAMPTZ DEFAULT NOW()
           )`,
        )
      }

      await query(
        'CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)',
      )
      await query(
        'CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at)',
      )
    },
  },
]

export async function runMigrations(
  driver: StorageDriver,
  transaction: DatabaseTransaction,
): Promise<void> {
  for (const migration of migrations) {
    await transaction(async (query) => {
      const applied = await query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [migration.version],
      )
      if (applied.rows.length > 0) return

      await migration.run(driver, query)
      await query(
        'INSERT INTO schema_migrations (version, applied_at) VALUES ($1, NOW())',
        [migration.version],
      )
    })
  }
}
