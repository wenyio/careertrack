import type { DatabaseQuery, DatabaseTransaction } from './types'
import {
  encryptTotpSecret,
  isEncryptedTotpSecret,
} from '@/lib/security/totp-credentials'

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
  {
    version: '003_encrypt_totp_and_recovery_codes',
    async run(driver, query) {
      if (driver === 'sqlite') {
        const columns = await query<{ name: string }>('PRAGMA table_info(users)')
        if (!columns.rows.some((column) => column.name === 'otp_recovery_codes')) {
          await query(
            `ALTER TABLE users
             ADD COLUMN otp_recovery_codes TEXT NOT NULL DEFAULT '[]'`,
          )
        }
      } else {
        await query(
          `ALTER TABLE users
           ADD COLUMN IF NOT EXISTS otp_recovery_codes JSONB NOT NULL DEFAULT '[]'`,
        )
        await query(
          'ALTER TABLE users ALTER COLUMN otp_secret TYPE VARCHAR(512)',
        )
      }

      const users = await query<{ id: string; otp_secret: string }>(
        'SELECT id, otp_secret FROM users WHERE otp_secret IS NOT NULL',
      )
      for (const user of users.rows) {
        if (isEncryptedTotpSecret(user.otp_secret)) continue
        await query(
          'UPDATE users SET otp_secret = $1 WHERE id = $2 AND otp_secret = $3',
          [
            encryptTotpSecret(user.otp_secret, user.id),
            user.id,
            user.otp_secret,
          ],
        )
      }
    },
  },
  {
    version: '004_consolidate_postgres_resume_config',
    async run(driver, query) {
      if (driver !== 'postgres') return

      const legacyColumnNames = [
        'module_titles',
        'basic_info_display',
        'preview_config',
      ]
      const columns = await query<{ column_name: string }>(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'resumes'
           AND column_name IN (
             'module_titles',
             'basic_info_display',
             'preview_config'
           )`,
      )
      const existingColumns = new Set(
        columns.rows.map((column) => column.column_name),
      )

      for (const columnName of legacyColumnNames) {
        if (!existingColumns.has(columnName)) continue

        // content is the canonical location on both storage drivers. Preserve
        // an existing content key and only import non-empty legacy values.
        await query(
          `UPDATE resumes
           SET content = COALESCE(content, '{}'::jsonb)
             || jsonb_build_object($1, ${columnName})
           WHERE ${columnName} IS NOT NULL
             AND ${columnName} <> '{}'::jsonb
             AND NOT (COALESCE(content, '{}'::jsonb) ? $1)`,
          [columnName],
        )
        await query(
          `ALTER TABLE resumes DROP COLUMN IF EXISTS ${columnName}`,
        )
      }
    },
  },
  {
    version: '005_resume_versions',
    async run(driver, query) {
      if (driver === 'sqlite') {
        await query(
          `CREATE TABLE IF NOT EXISTS resume_versions (
             id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
             resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
             revision INTEGER NOT NULL,
             source VARCHAR(20) NOT NULL CHECK (source IN ('auto', 'manual', 'restore', 'application')),
             label VARCHAR(100),
             snapshot TEXT NOT NULL,
             created_at TEXT NOT NULL DEFAULT (datetime('now')),
             UNIQUE (resume_id, revision, source)
           )`,
        )
      } else {
        await query(
          `CREATE TABLE IF NOT EXISTS resume_versions (
             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
             resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
             revision INTEGER NOT NULL,
             source VARCHAR(20) NOT NULL CHECK (source IN ('auto', 'manual', 'restore', 'application')),
             label VARCHAR(100),
             snapshot JSONB NOT NULL,
             created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
             UNIQUE (resume_id, revision, source)
           )`,
        )
      }
      await query(
        'CREATE INDEX IF NOT EXISTS idx_resume_versions_resume_created ON resume_versions(resume_id, created_at DESC, id DESC)',
      )
      await query(
        'CREATE INDEX IF NOT EXISTS idx_resume_versions_auto_created ON resume_versions(resume_id, source, created_at DESC, id DESC)',
      )
    },
  },
  {
    version: '006_job_applications',
    async run(driver, query) {
      if (driver === 'sqlite') {
        await query(
          `CREATE TABLE IF NOT EXISTS job_applications (
             id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
             user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
             company VARCHAR(120) NOT NULL,
             position VARCHAR(120) NOT NULL,
             status VARCHAR(20) NOT NULL CHECK (status IN ('wishlist', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn')),
             job_url TEXT, location VARCHAR(120), channel VARCHAR(80), salary VARCHAR(80), notes TEXT,
             applied_at TEXT, next_action_at TEXT,
             status_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
             resume_id TEXT REFERENCES resumes(id) ON DELETE SET NULL,
             resume_version_id TEXT REFERENCES resume_versions(id) ON DELETE SET NULL,
             revision INTEGER NOT NULL DEFAULT 1,
             created_at TEXT NOT NULL DEFAULT (datetime('now')),
             updated_at TEXT NOT NULL DEFAULT (datetime('now'))
           )`,
        )
      } else {
        await query(
          `CREATE TABLE IF NOT EXISTS job_applications (
             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
             user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
             company VARCHAR(120) NOT NULL, position VARCHAR(120) NOT NULL,
             status VARCHAR(20) NOT NULL CHECK (status IN ('wishlist', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn')),
             job_url TEXT, location VARCHAR(120), channel VARCHAR(80), salary VARCHAR(80), notes TEXT,
             applied_at TIMESTAMPTZ, next_action_at TIMESTAMPTZ,
             status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
             resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
             resume_version_id UUID REFERENCES resume_versions(id) ON DELETE SET NULL,
             revision INTEGER NOT NULL DEFAULT 1,
             created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
           )`,
        )
      }
      await query('CREATE INDEX IF NOT EXISTS idx_job_applications_user_status_updated ON job_applications(user_id, status, updated_at DESC, id DESC)')
      await query('CREATE INDEX IF NOT EXISTS idx_job_applications_user_updated ON job_applications(user_id, updated_at DESC, id DESC)')
      await query('CREATE INDEX IF NOT EXISTS idx_job_applications_next_action ON job_applications(user_id, next_action_at, id)')
    },
  },
  {
    version: '007_job_application_date_only',
    async run(driver, query) {
      if (driver !== 'postgres') return
      const columns = await query<{ column_name: string; data_type: string }>(
        `SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'job_applications'
           AND column_name IN ('applied_at', 'next_action_at')`,
      )
      for (const column of columns.rows) {
        if (column.data_type === 'date') continue
        // During this feature branch's initial implementation these columns
        // were timestamps. API values were serialized at UTC midnight, so UTC
        // preserves that calendar value while changing the representation.
        await query(
          `ALTER TABLE job_applications
           ALTER COLUMN ${column.column_name}
           TYPE DATE USING (${column.column_name} AT TIME ZONE 'UTC')::date`,
        )
      }
    },
  },
  {
    version: '008_job_application_events',
    async run(driver, query) {
      if (driver === 'sqlite') {
        await query(
          `CREATE TABLE IF NOT EXISTS job_application_events (
             id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
             application_id TEXT NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
             user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
             event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('created', 'status_changed', 'follow_up', 'interview', 'note', 'offer')),
             content TEXT, metadata TEXT NOT NULL DEFAULT '{}',
             occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
             created_at TEXT NOT NULL DEFAULT (datetime('now'))
           )`,
        )
      } else {
        await query(
          `CREATE TABLE IF NOT EXISTS job_application_events (
             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
             application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
             user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
             event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('created', 'status_changed', 'follow_up', 'interview', 'note', 'offer')),
             content TEXT, metadata JSONB NOT NULL DEFAULT '{}',
             occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
             created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
           )`,
        )
      }
      await query('CREATE INDEX IF NOT EXISTS idx_job_application_events_user_application_time ON job_application_events(user_id, application_id, occurred_at DESC, id DESC)')
      await query('CREATE INDEX IF NOT EXISTS idx_job_application_events_application_time ON job_application_events(application_id, occurred_at DESC, id DESC)')
    },
  },
  {
    version: '009_job_application_event_utc_ordering',
    async run(driver, query) {
      if (driver === 'sqlite') {
        await query(
          `UPDATE job_application_events
           SET occurred_at = strftime('%Y-%m-%dT%H:%M:%fZ', datetime(occurred_at)),
               created_at = strftime('%Y-%m-%dT%H:%M:%fZ', datetime(created_at))
           WHERE occurred_at IS NOT NULL`,
        )
      }
      await query(
        'CREATE INDEX IF NOT EXISTS idx_job_application_events_user_application_utc_time ON job_application_events(user_id, application_id, occurred_at DESC, created_at DESC, id DESC)',
      )
    },
  },
  {
    version: '010_profile_self_evaluations',
    async run(driver, query) {
      if (driver === 'sqlite') {
        const table = await query<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'profiles'",
        )
        if (table.rows.length === 0) return

        const columns = await query<{ name: string }>('PRAGMA table_info(profiles)')
        if (!columns.rows.some((column) => column.name === 'self_evaluations')) {
          await query(
            "ALTER TABLE profiles ADD COLUMN self_evaluations TEXT DEFAULT '[]'",
          )
        }
        await query(
          `UPDATE profiles
           SET self_evaluations = json_array(json_object(
             'id', lower(hex(randomblob(8))),
             'title', '默认自我评价',
             'description', summary
           ))
           WHERE summary IS NOT NULL
             AND summary <> ''
             AND (self_evaluations IS NULL OR self_evaluations = '[]')`,
        )
        return
      }

      const table = await query<{ table_name: string }>(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = current_schema()
           AND table_name = 'profiles'`,
      )
      if (table.rows.length === 0) return

      await query(
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS self_evaluations JSONB DEFAULT '[]'",
      )
      await query(
        `UPDATE profiles
         SET self_evaluations = jsonb_build_array(jsonb_build_object(
           'id', gen_random_uuid()::text,
           'title', '默认自我评价',
           'description', summary
         ))
         WHERE summary IS NOT NULL
           AND summary <> ''
           AND (self_evaluations IS NULL OR self_evaluations = '[]'::jsonb)`,
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
