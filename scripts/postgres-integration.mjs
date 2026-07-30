/**
 * PostgreSQL integration gate.
 *
 * The supplied POSTGRES_TEST_URL names a disposable CI/test database server.
 * This script derives a unique child database, lets CareerTrack auto-create it,
 * exercises real HTTP routes, simulates the legacy resume-column migration,
 * and drops only that generated child database during cleanup.
 */

import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { Pool } from 'pg'
import { generateSync } from 'otplib'

const sourceDatabaseUrl = process.env.POSTGRES_TEST_URL?.trim()
if (!sourceDatabaseUrl) {
  throw new Error('POSTGRES_TEST_URL is required for the PostgreSQL integration test')
}

const sourceUrl = new URL(sourceDatabaseUrl)
if (!['postgres:', 'postgresql:'].includes(sourceUrl.protocol)) {
  throw new Error('POSTGRES_TEST_URL must use the postgres or postgresql protocol')
}

const sourceDatabaseName = decodeURIComponent(sourceUrl.pathname.slice(1))
if (!/(?:^|[_-])(ci|test)(?:$|[_-])/i.test(sourceDatabaseName)) {
  throw new Error(
    'POSTGRES_TEST_URL must point to a database whose name contains a ci/test segment',
  )
}

const generatedMarker = '_careertrack_test_'
const safeBaseName = sourceDatabaseName
  .toLowerCase()
  .replace(/[^a-z0-9_]/g, '_')
  .slice(0, 24)
const generatedSuffix = `${Date.now()}_${process.pid}`
const testDatabaseName = (
  `${safeBaseName}${generatedMarker}${generatedSuffix}`
).slice(0, 63)
if (!testDatabaseName.includes(generatedMarker)) {
  throw new Error('Failed to derive a safe PostgreSQL test database name')
}

const testDatabaseUrl = new URL(sourceUrl)
testDatabaseUrl.pathname = `/${testDatabaseName}`
const maintenanceUrl = new URL(sourceUrl)
maintenanceUrl.pathname = '/postgres'

const port = process.env.POSTGRES_TEST_PORT || '3101'
const baseUrl = `http://127.0.0.1:${port}`
const runId = randomUUID().replace(/-/g, '').slice(0, 12)
const adminUsername = `pg_admin_${runId}`
const adminPassword = 'PostgresAdminPassword123!'
const userPassword = 'PostgresUserPassword123!'
const jwtSecret = 'careertrack-postgres-integration-jwt-secret-32-characters'
const totpEncryptionKey = (
  'careertrack-postgres-integration-totp-key-32-characters'
)

let server = null
let serverOutput = ''
const testPools = new Set()

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function captureServerOutput(chunk) {
  serverOutput = `${serverOutput}${chunk.toString()}`.slice(-30_000)
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function createTestPool() {
  const pool = new Pool({
    connectionString: testDatabaseUrl.toString(),
    connectionTimeoutMillis: 10_000,
  })
  testPools.add(pool)
  return pool
}

async function closeTestPool(pool) {
  testPools.delete(pool)
  await pool.end()
}

async function closeLeakedTestPools() {
  await Promise.allSettled(
    Array.from(testPools, async (pool) => closeTestPool(pool)),
  )
}

async function request(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.cookie ? { Cookie: options.cookie } : {}),
    ...(options.headers || {}),
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    redirect: 'manual',
  })
  const text = await response.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }
  return { response, body, text }
}

function sessionCookie(result, label) {
  const setCookie = typeof result.response.headers.getSetCookie === 'function'
    ? result.response.headers.getSetCookie().join(', ')
    : result.response.headers.get('set-cookie') || ''
  assert(setCookie.includes('HttpOnly'), `${label}: session cookie must be HttpOnly`)
  const match = setCookie.match(/careertrack_session=[^;,]*/)
  assert(match, `${label}: missing careertrack_session cookie`)
  return match[0]
}

async function startServer() {
  serverOutput = ''
  const nextCli = join(
    process.cwd(),
    'node_modules',
    'next',
    'dist',
    'bin',
    'next',
  )
  server = spawn(process.execPath, [nextCli, 'dev'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: port,
      HOSTNAME: '127.0.0.1',
      STORAGE_DRIVER: 'postgres',
      DATABASE_URL: testDatabaseUrl.toString(),
      JWT_SECRET: jwtSecret,
      TOTP_ENCRYPTION_KEY: totpEncryptionKey,
      ADMIN_USERNAME: adminUsername,
      ADMIN_PASSWORD: adminPassword,
    },
  })
  server.stdout.on('data', captureServerOutput)
  server.stderr.on('data', captureServerOutput)

  for (let attempt = 0; attempt < 180; attempt++) {
    if (server.exitCode !== null) {
      throw new Error(`PostgreSQL test server exited early:\n${serverOutput}`)
    }
    try {
      const health = await request('/api/health')
      if (health.response.status === 200) return
    } catch {
      // The application or PostgreSQL initialization is still starting.
    }
    await delay(500)
  }
  throw new Error(`Timed out waiting for PostgreSQL test server:\n${serverOutput}`)
}

async function stopServer() {
  if (!server || server.exitCode !== null) {
    server = null
    return
  }

  server.kill('SIGTERM')
  await Promise.race([once(server, 'exit'), delay(5_000)])
  if (server.exitCode === null) server.kill('SIGKILL')
  server = null
  await delay(250)
}

async function dropGeneratedDatabase() {
  if (!testDatabaseName.includes(generatedMarker)) {
    throw new Error('Refusing to drop an unrecognized PostgreSQL database')
  }

  const maintenancePool = new Pool({
    connectionString: maintenanceUrl.toString(),
    connectionTimeoutMillis: 10_000,
  })
  try {
    await maintenancePool.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [testDatabaseName],
    )
    await maintenancePool.query(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(testDatabaseName)}`,
    )
  } finally {
    await maintenancePool.end()
  }
}

async function runApiFlow() {
  const health = await request('/api/health')
  assert(health.response.status === 200, `health failed: ${health.text}`)

  const database = createTestPool()
  const migrationRows = await database.query(
    'SELECT version FROM schema_migrations ORDER BY version',
  )
  assert(
    migrationRows.rows.some(
      (row) => row.version === '004_consolidate_postgres_resume_config',
    ),
    'latest PostgreSQL migration was not applied',
  )

  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: adminUsername, password: adminPassword },
  })
  assert(adminLogin.response.status === 200, `admin login failed: ${adminLogin.text}`)
  const adminCookie = sessionCookie(adminLogin, 'admin login')

  const registrationCode = await request('/api/admin/registration-codes', {
    method: 'POST',
    cookie: adminCookie,
    body: { label: 'postgres-integration' },
  })
  assert(
    registrationCode.response.status === 201,
    `registration code failed: ${registrationCode.text}`,
  )

  const registrationPayloads = [
    {
      username: `pg_user_a_${runId}`,
      password: userPassword,
      registration_code: registrationCode.body.code,
    },
    {
      username: `pg_user_b_${runId}`,
      password: userPassword,
      registration_code: registrationCode.body.code,
    },
  ]
  const registrations = await Promise.all(
    registrationPayloads.map((body) => request('/api/auth/register', {
      method: 'POST',
      body,
    })),
  )
  const registrationStatuses = registrations
    .map((result) => result.response.status)
    .sort((left, right) => left - right)
  assert(
    JSON.stringify(registrationStatuses) === JSON.stringify([201, 400]),
    `PostgreSQL registration-code race failed: ${registrationStatuses.join(', ')}`,
  )

  const registered = registrations.find(
    (result) => result.response.status === 201,
  )
  assert(registered, 'PostgreSQL registration did not create one user')
  const userCookie = sessionCookie(registered, 'user registration')
  const userId = registered.body.user.id
  const username = registered.body.user.username

  const profileRows = await database.query(
    'SELECT id FROM profiles WHERE user_id = $1',
    [userId],
  )
  assert(profileRows.rowCount === 1, 'registration transaction did not create profile')

  const createdResume = await request('/api/resumes', {
    method: 'POST',
    cookie: userCookie,
    body: {
      name: 'PostgreSQL integration resume',
      initialize_from_profile: false,
    },
  })
  assert(
    createdResume.response.status === 201,
    `PostgreSQL resume creation failed: ${createdResume.text}`,
  )
  assert(createdResume.body.revision === 1, 'new PostgreSQL resume revision is not 1')

  const updatedResume = await request(`/api/resumes/${createdResume.body.id}`, {
    method: 'PUT',
    cookie: userCookie,
    body: {
      revision: 1,
      content: {
        basic_info: { name: 'PostgreSQL User' },
        preview_config: { fontSize: 14, lineHeight: 1.5 },
      },
    },
  })
  assert(
    updatedResume.response.status === 200,
    `PostgreSQL resume update failed: ${updatedResume.text}`,
  )
  assert(updatedResume.body.revision === 2, 'PostgreSQL revision did not increment')

  const staleUpdate = await request(`/api/resumes/${createdResume.body.id}`, {
    method: 'PUT',
    cookie: userCookie,
    body: { revision: 1, name: 'stale write' },
  })
  assert(staleUpdate.response.status === 409, 'PostgreSQL stale write was accepted')

  const persistedResume = await database.query(
    'SELECT content FROM resumes WHERE id = $1',
    [createdResume.body.id],
  )
  assert(
    persistedResume.rows[0]?.content?.basic_info?.name === 'PostgreSQL User',
    'PostgreSQL JSONB resume content did not round-trip',
  )

  const otpSetup = await request('/api/auth/setup-otp', {
    method: 'POST',
    cookie: userCookie,
    body: { password: userPassword },
  })
  assert(otpSetup.response.status === 200, `PostgreSQL OTP setup failed: ${otpSetup.text}`)

  const otpVerify = await request('/api/auth/verify-otp', {
    method: 'POST',
    cookie: userCookie,
    body: { code: generateSync({ secret: otpSetup.body.secret }) },
  })
  assert(
    otpVerify.response.status === 200,
    `PostgreSQL OTP verification failed: ${otpVerify.text}`,
  )
  assert(
    Array.isArray(otpVerify.body.recovery_codes)
      && otpVerify.body.recovery_codes.length === 10,
    'PostgreSQL OTP verification did not return recovery codes',
  )

  const otpRow = await database.query(
    `SELECT otp_secret, otp_recovery_codes
     FROM users WHERE id = $1`,
    [userId],
  )
  assert(
    otpRow.rows[0]?.otp_secret?.startsWith('v1:'),
    'PostgreSQL stored a plaintext TOTP secret',
  )
  assert(
    Array.isArray(otpRow.rows[0]?.otp_recovery_codes)
      && otpRow.rows[0].otp_recovery_codes.length === 10,
    'PostgreSQL recovery-code JSONB storage is invalid',
  )
  assert(
    !JSON.stringify(otpRow.rows[0].otp_recovery_codes)
      .includes(otpVerify.body.recovery_codes[0]),
    'PostgreSQL stored a plaintext recovery code',
  )

  const recoveryAttempts = await Promise.all([
    request('/api/auth/login', {
      method: 'POST',
      body: {
        username,
        password: userPassword,
        recovery_code: otpVerify.body.recovery_codes[0],
      },
    }),
    request('/api/auth/login', {
      method: 'POST',
      body: {
        username,
        password: userPassword,
        recovery_code: otpVerify.body.recovery_codes[0],
      },
    }),
  ])
  const recoveryStatuses = recoveryAttempts
    .map((result) => result.response.status)
    .sort((left, right) => left - right)
  assert(
    JSON.stringify(recoveryStatuses) === JSON.stringify([200, 400]),
    `PostgreSQL recovery-code race failed: ${recoveryStatuses.join(', ')}`,
  )

  await closeTestPool(database)
  return { resumeId: createdResume.body.id }
}

async function simulateLegacyMigration(resumeId) {
  await stopServer()

  const database = createTestPool()
  try {
    await database.query(`
      ALTER TABLE resumes
        ADD COLUMN module_titles JSONB DEFAULT '{}',
        ADD COLUMN basic_info_display JSONB DEFAULT '{}',
        ADD COLUMN preview_config JSONB DEFAULT '{}'
    `)
    await database.query(
      `UPDATE resumes
       SET module_titles = $1,
         basic_info_display = $2,
         preview_config = $3
       WHERE id = $4`,
      [
        { education: 'Legacy Education' },
        { avatar_left: true },
        { fontSize: 20, lineHeight: 1.9 },
        resumeId,
      ],
    )
    await database.query(
      `DELETE FROM schema_migrations
       WHERE version = '004_consolidate_postgres_resume_config'`,
    )
  } finally {
    await closeTestPool(database)
  }

  await startServer()

  const migratedDatabase = createTestPool()
  try {
    const columns = await migratedDatabase.query(
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
    assert(columns.rowCount === 0, 'legacy PostgreSQL resume columns were not dropped')

    const resume = await migratedDatabase.query(
      'SELECT content FROM resumes WHERE id = $1',
      [resumeId],
    )
    assert(
      resume.rows[0]?.content?.module_titles?.education === 'Legacy Education',
      'legacy module_titles were not moved into content',
    )
    assert(
      resume.rows[0]?.content?.basic_info_display?.avatar_left === true,
      'legacy basic_info_display was not moved into content',
    )
    assert(
      resume.rows[0]?.content?.preview_config?.fontSize === 14,
      'canonical content.preview_config was overwritten by a legacy column',
    )
  } finally {
    await closeTestPool(migratedDatabase)
  }
}

try {
  // The random child database does not exist yet. Starting the application
  // verifies the adapter's automatic database-creation path.
  await startServer()
  const { resumeId } = await runApiFlow()
  await simulateLegacyMigration(resumeId)
  console.log(JSON.stringify({
    status: 'ok',
    checks: [
      'postgres-auto-create',
      'postgres-migrations',
      'postgres-registration-transaction',
      'postgres-jsonb-resume-revision',
      'postgres-totp-recovery',
      'postgres-legacy-config-consolidation',
    ],
  }))
} catch (error) {
  console.error(error)
  if (serverOutput) console.error(serverOutput)
  process.exitCode = 1
} finally {
  await stopServer()
  await closeLeakedTestPools()
  await dropGeneratedDatabase().catch((error) => {
    console.error('Failed to drop generated PostgreSQL test database:', error)
    process.exitCode = 1
  })
}
