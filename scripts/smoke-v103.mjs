import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const externalBaseUrl = process.env.E2E_BASE_URL
const managesServer = !externalBaseUrl
const port = process.env.E2E_PORT || '3000'
const baseUrl = externalBaseUrl || `http://127.0.0.1:${port}`
const adminUsername = process.env.ADMIN_USERNAME || (managesServer ? 'smoke_admin' : '')
const adminPassword = process.env.ADMIN_PASSWORD || (managesServer ? 'SmokeAdminPassword123!' : '')
const temporaryDirectory = managesServer ? mkdtempSync(join(tmpdir(), 'careertrack-smoke-')) : null
let server = null
let serverOutput = ''

if (!adminUsername || !adminPassword) {
  throw new Error('Using E2E_BASE_URL requires ADMIN_USERNAME and ADMIN_PASSWORD')
}

function captureServerOutput(chunk) {
  serverOutput = `${serverOutput}${chunk.toString()}`.slice(-20_000)
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function startManagedServer() {
  if (!managesServer || !temporaryDirectory) return

  server = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: port,
      STORAGE_DRIVER: 'sqlite',
      SQLITE_DB_PATH: join(temporaryDirectory, 'smoke.db'),
      JWT_SECRET: 'careertrack-smoke-jwt-secret-at-least-32-characters',
      ADMIN_USERNAME: adminUsername,
      ADMIN_PASSWORD: adminPassword,
    },
  })
  server.stdout.on('data', captureServerOutput)
  server.stderr.on('data', captureServerOutput)

  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) {
      throw new Error(`Smoke server exited early:\n${serverOutput}`)
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.status === 200) return
    } catch {
      // Server is still starting.
    }
    await delay(500)
  }

  throw new Error(`Timed out waiting for smoke server:\n${serverOutput}`)
}

async function stopManagedServer() {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM')
    await Promise.race([once(server, 'exit'), delay(5_000)])
    if (server.exitCode === null) server.kill('SIGKILL')
  }
  if (temporaryDirectory) {
    rmSync(temporaryDirectory, { recursive: true, force: true })
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
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

async function runSmoke() {
const health = await request('/api/health')
assert(health.response.status === 200, `health failed: ${health.text}`)

const adminLogin = await request('/api/auth/login', {
  method: 'POST',
  body: { username: adminUsername, password: adminPassword },
})
assert(adminLogin.response.status === 200, `admin login failed: ${adminLogin.text}`)
assert(!('token' in adminLogin.body), 'login response must not expose JWT')
const adminCookie = sessionCookie(adminLogin, 'admin login')

const codeResult = await request('/api/admin/registration-codes', {
  method: 'POST',
  cookie: adminCookie,
  body: { label: 'v1.0.3-concurrency-smoke' },
})
assert(codeResult.response.status === 201, `registration code failed: ${codeResult.text}`)

const suffix = Date.now()
const registrationPayloads = [
  {
    username: `smoke_a_${suffix}`,
    password: 'SmokePassword123!',
    registration_code: codeResult.body.code,
  },
  {
    username: `smoke_b_${suffix}`,
    password: 'SmokePassword123!',
    registration_code: codeResult.body.code,
  },
]

const registrationResults = await Promise.all(
  registrationPayloads.map((body) => request('/api/auth/register', {
    method: 'POST',
    body,
  })),
)
const registrationStatuses = registrationResults
  .map((result) => result.response.status)
  .sort((a, b) => a - b)
assert(
  JSON.stringify(registrationStatuses) === JSON.stringify([201, 400]),
  `one-time code race failed: ${registrationStatuses.join(', ')}`,
)

const registered = registrationResults.find((result) => result.response.status === 201)
assert(registered && !('token' in registered.body), 'register response must not expose JWT')
const userCookie = sessionCookie(registered, 'registration')
const userId = registered.body.user.id

const me = await request('/api/auth/me', { cookie: userCookie })
assert(me.response.status === 200, `cookie session failed: ${me.text}`)

const createdResume = await request('/api/resumes', {
  method: 'POST',
  cookie: userCookie,
  body: { name: 'v1.0.3 smoke resume', initialize_from_profile: false },
})
assert(createdResume.response.status === 201, `create resume failed: ${createdResume.text}`)
assert(createdResume.body.revision === 1, 'new resume must start at revision 1')

const maliciousName = '</script><script>window.__careertrack_xss = true</script>'
const firstUpdate = await request(`/api/resumes/${createdResume.body.id}`, {
  method: 'PUT',
  cookie: userCookie,
  body: {
    revision: createdResume.body.revision,
    content: {
      basic_info: {
        name: maliciousName,
        email: 'smoke@example.com',
      },
    },
  },
})
assert(firstUpdate.response.status === 200, `first update failed: ${firstUpdate.text}`)
assert(firstUpdate.body.revision === 2, 'successful update must increment revision')

const staleUpdate = await request(`/api/resumes/${createdResume.body.id}`, {
  method: 'PUT',
  cookie: userCookie,
  body: {
    revision: 1,
    name: 'stale update must fail',
  },
})
assert(staleUpdate.response.status === 409, `stale update was not rejected: ${staleUpdate.text}`)

const slug = `smoke-${suffix}`
const publish = await request(`/api/resumes/${createdResume.body.id}/publish`, {
  method: 'POST',
  cookie: userCookie,
  body: { slug },
})
assert(publish.response.status === 200, `publish failed: ${publish.text}`)

const publicApi = await request(`/api/public/${slug}`)
assert(publicApi.response.status === 200, `public API failed: ${publicApi.text}`)
assert(!('id' in publicApi.body), 'public API exposed internal resume id')
assert(!('user_id' in publicApi.body), 'public API exposed internal user id')

const publicPage = await request(`/resume/${slug}`, {
  headers: { Accept: 'text/html' },
})
assert(publicPage.response.status === 200, `public page failed: ${publicPage.response.status}`)
assert(
  !publicPage.text.includes('</script><script>window.__careertrack_xss'),
  'public page contains an executable JSON-LD break-out sequence',
)
assert(
  publicPage.text.includes('\\u003c/script\\u003e'),
  'public page did not HTML-escape JSON-LD content',
)

const mcpKey = await request('/api/mcp-keys', {
  method: 'POST',
  cookie: userCookie,
  body: { scope: 'read_only' },
})
assert(mcpKey.response.status === 201, `MCP key creation failed: ${mcpKey.text}`)

const initializeMcp = () => request('/api/mcp', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${mcpKey.body.secret}`,
    Accept: 'application/json, text/event-stream',
  },
  body: {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'careertrack-smoke', version: '1.0.3' },
    },
  },
})

const mcpBeforeDisable = await initializeMcp()
assert(mcpBeforeDisable.response.status === 200, `valid MCP key failed: ${mcpBeforeDisable.text}`)

const disableUser = await request(`/api/admin/users/${userId}/status`, {
  method: 'PATCH',
  cookie: adminCookie,
  body: { disabled: true },
})
assert(disableUser.response.status === 200, `disable user failed: ${disableUser.text}`)

const mcpAfterDisable = await initializeMcp()
assert(mcpAfterDisable.response.status === 401, 'disabled user MCP key remained active')

const logout = await request('/api/auth/logout', {
  method: 'POST',
  cookie: adminCookie,
})
assert(logout.response.status === 204, `logout failed: ${logout.text}`)
const clearedCookie = sessionCookie(logout, 'logout')
const meAfterLogout = await request('/api/auth/me', { cookie: clearedCookie })
assert(meAfterLogout.response.status === 401, 'cleared session remained usable')
const replayAfterLogout = await request('/api/auth/me', { cookie: adminCookie })
assert(replayAfterLogout.response.status === 401, 'server-side session remained usable after logout')

console.log(JSON.stringify({
  status: 'ok',
  checks: [
    'httpOnly-session',
    'atomic-registration-code',
    'resume-revision-conflict',
    'public-dto',
    'json-ld-xss',
    'mcp-disabled-user',
    'server-session-revocation',
  ],
}))
}

try {
  await startManagedServer()
  await runSmoke()
} catch (error) {
  console.error(error)
  if (serverOutput) console.error(serverOutput)
  process.exitCode = 1
} finally {
  await stopManagedServer()
}
