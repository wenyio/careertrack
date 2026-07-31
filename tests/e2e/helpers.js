/**
 * E2E 测试公共工具
 *
 * 提供截图、导航、用户创建、简历操作等辅助函数
 */

const { expect } = require('playwright/test')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.resolve(__dirname, '../..')
const RUN_ID = process.env.E2E_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-')
const SCREENSHOT_DIR = path.join(ROOT, 'screenshots')
const LOG_DIR = path.join(ROOT, 'logs')
const DOWNLOAD_DIR = path.join(ROOT, 'test-results', 'downloads')
const ARTIFACTS_FILE = path.join(LOG_DIR, 'e2e-artifacts.jsonl')
const CONSOLE_LOG = path.join(ROOT, 'logs', 'console-errors.log')
const NETWORK_LOG = path.join(ROOT, 'logs', 'network-errors.log')
const SUMMARY_LOG = path.join(ROOT, 'logs', 'test-summary.log')
const DATABASE_PATH = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.join(ROOT, '.careertrack', 'careertrack.db')

// ========== 测试管理员 bootstrap ==========
// 注册码机制要求先有管理员才能生成注册码。
// 测试 helper 通过 better-sqlite3 直接在数据库中创建管理员，
// 绕过 API 注册流程。

let _adminSession = null
const antdDeprecationWarnings = new WeakMap()

function testIp(seed) {
  const digest = crypto.createHash('sha256').update(`${RUN_ID}:${seed}`).digest()
  return `10.${digest[0]}.${digest[1]}.${Math.max(1, digest[2])}`
}

function getSessionCookie(response) {
  const setCookie = response.headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value)
    .join(', ')
  const match = setCookie.match(/careertrack_session=[^;,]+/)
  if (!match) {
    throw new Error('响应未设置 careertrack_session cookie')
  }
  return match[0]
}

async function getTestAdmin(request) {
  if (_adminSession) return _adminSession

  // 先通过应用健康检查完成 schema 与版本化迁移，避免 helper 在空库上直接写表。
  const healthRes = await request.get('/api/health')
  expect(healthRes.status(), `测试数据库初始化失败: ${await healthRes.text()}`).toBe(200)

  // 通过 better-sqlite3 直接创建管理员用户
  const Database = require('better-sqlite3')
  const db = new Database(DATABASE_PATH)

  const username = `E2E_ADMIN_${Date.now()}`
  const password = 'AdminTest123456!'

  // 同步哈希密码（测试专用，使用 crypto 而非 bcrypt，仅用于 E2E）
  // 注意：实际 API 使用 bcrypt，这里用 bcryptjs 同步版本
  const bcrypt = require('bcryptjs')
  const hash = bcrypt.hashSync(password, 4) // 低轮数加快测试

  db.exec(`
    INSERT OR IGNORE INTO users (username, password_hash, role, auth_provider)
    VALUES ('${username}', '${hash}', 'admin', 1)
  `)
  db.close()

  // 用管理员账号登录获取 HttpOnly session cookie
  const loginRes = await request.post('/api/auth/login', {
    headers: { 'X-Real-IP': testIp(`admin:${username}`) },
    data: { username, password },
  })
  expect(loginRes.status(), `管理员登录失败: ${await loginRes.text()}`).toBe(200)
  _adminSession = getSessionCookie(loginRes)
  return _adminSession
}

async function createRegistrationCodeByApi(request, label) {
  const adminSession = await getTestAdmin(request)
  const response = await request.post('/api/admin/registration-codes', {
    headers: { Cookie: adminSession },
    data: { label: label || `test-${Date.now()}` },
  })
  expect(response.status(), `创建注册码失败: ${await response.text()}`).toBe(201)
  return response.json()
}

function ensureDirs() {
  for (const dir of [SCREENSHOT_DIR, LOG_DIR, DOWNLOAD_DIR, path.join(ROOT, 'test-results'), path.join(ROOT, 'playwright-report')]) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function append(file, line) {
  fs.appendFileSync(file, `${line}\n`)
}

function writeJsonLine(entry) {
  append(ARTIFACTS_FILE, JSON.stringify({ runId: RUN_ID, timestamp: new Date().toISOString(), ...entry }))
}

function safeName(text) {
  return text.replace(/[^\w一-龥-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

async function screenshot(page, moduleName, featureName) {
  const filename = `${safeName(moduleName)}_${safeName(featureName)}_${RUN_ID}.png`
  const fullPath = path.join(SCREENSHOT_DIR, filename)
  await page.screenshot({ path: fullPath, fullPage: true })
  writeJsonLine({ type: 'screenshot', module: moduleName, feature: featureName, path: `screenshots/${filename}` })
  return fullPath
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  await page.waitForTimeout(1_000)
}

async function registerByUi(page, username, password, registrationCode) {
  await page.context().setExtraHTTPHeaders({
    'X-Real-IP': testIp(`browser-register:${username}`),
  })
  await goto(page, '/auth/register')
  await page.getByPlaceholder('注册码').fill(registrationCode)
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByPlaceholder('用户名').fill(username)
  await page.getByPlaceholder('密码', { exact: true }).fill(password)
  await page.getByPlaceholder('确认密码').fill(password)
  await Promise.all([
    page.waitForURL(/\/resumes/, { timeout: 20_000 }),
    page.getByRole('button', { name: /注\s*册/ }).click(),
  ])
}

async function loginByUi(page, username, password) {
  await page.context().clearCookies()
  await page.context().setExtraHTTPHeaders({
    'X-Real-IP': testIp(`browser-login:${username}`),
  })
  await goto(page, '/auth/login')
  await page.evaluate(() => localStorage.clear())
  await page.getByPlaceholder('用户名').fill(username)
  await page.getByPlaceholder('密码', { exact: true }).fill(password)
  await Promise.all([
    page.waitForURL(/\/resumes/, { timeout: 20_000 }),
    page.getByRole('button', { name: /登\s*录/ }).click(),
  ])
}

async function createUserByApi(request, baseName = 'api') {
  // 先获取注册码
  const codeRecord = await createRegistrationCodeByApi(request, `e2e-${baseName}`)

  const username = `E2E_TEST_${baseName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const password = 'E2eTest123456!'
  const response = await request.post('/api/auth/register', {
    headers: { 'X-Real-IP': testIp(`register:${username}`) },
    data: { username, password, registration_code: codeRecord.code },
  })
  expect(response.status(), `创建用户失败: ${await response.text()}`).toBe(201)
  const body = await response.json()
  return {
    username,
    password,
    token: getSessionCookie(response),
    user: body.user,
  }
}

async function createResumeByApi(request, sessionCookie, name, options = {}) {
  const response = await request.post('/api/resumes', {
    headers: { Cookie: sessionCookie },
    data: { name, ...options },
  })
  expect(response.status(), await response.text()).toBe(201)
  return response.json()
}

async function publishResumeByApi(request, sessionCookie, resumeId, slug) {
  const response = await request.post(`/api/resumes/${resumeId}/publish`, {
    headers: { Cookie: sessionCookie },
    data: { slug },
  })
  expect(response.status(), await response.text()).toBe(200)
}

/** 注册公共生命周期钩子，每个 spec 文件调用一次 */
function registerHooks(test) {
  test.beforeAll(() => {
    ensureDirs()
    fs.writeFileSync(CONSOLE_LOG, `CareerTrack E2E console log\nRun ID: ${RUN_ID}\n`)
    fs.writeFileSync(NETWORK_LOG, `CareerTrack E2E network log\nRun ID: ${RUN_ID}\n`)
    fs.writeFileSync(SUMMARY_LOG, `CareerTrack E2E summary\nRun ID: ${RUN_ID}\n`)
    fs.writeFileSync(ARTIFACTS_FILE, '')
  })

  test.beforeEach(async ({ page }, testInfo) => {
    const warnings = []
    antdDeprecationWarnings.set(page, warnings)

    page.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) {
        const location = msg.location()
        append(CONSOLE_LOG, `[${testInfo.title}] ${msg.type().toUpperCase()} ${msg.text()} ${location.url || ''}:${location.lineNumber || ''}`)
        writeJsonLine({ type: 'console', level: msg.type(), test: testInfo.title, text: msg.text(), location })
      }
      if (msg.type() === 'warning' && msg.text().includes('[antd:')) warnings.push(msg.text())
    })

    page.on('pageerror', (error) => {
      append(CONSOLE_LOG, `[${testInfo.title}] PAGEERROR ${error.message}`)
      writeJsonLine({ type: 'pageerror', test: testInfo.title, text: error.message, stack: error.stack })
    })

    page.on('response', (response) => {
      if (response.status() >= 400) {
        const request = response.request()
        append(NETWORK_LOG, `[${testInfo.title}] ${request.method()} ${response.url()} ${response.status()} ${response.statusText()}`)
        writeJsonLine({ type: 'network', test: testInfo.title, method: request.method(), url: response.url(), status: response.status(), statusText: response.statusText() })
      }
    })
  })

  test.afterEach(async ({ page }, testInfo) => {
    expect(antdDeprecationWarnings.get(page), `Ant Design 弃用警告：${antdDeprecationWarnings.get(page)?.join('\n')}`).toEqual([])

    if (testInfo.status !== testInfo.expectedStatus) {
      const shot = await screenshot(page, '失败截图', testInfo.title).catch(() => null)
      if (shot) {
        await testInfo.attach('failure-screenshot', { path: shot, contentType: 'image/png' })
      }
    }

    append(SUMMARY_LOG, `${testInfo.status.toUpperCase()} ${testInfo.title}`)
    writeJsonLine({
      type: 'test-result',
      test: testInfo.title,
      status: testInfo.status,
      expectedStatus: testInfo.expectedStatus,
      errors: testInfo.errors.map((err) => err.message),
    })
  })
}

module.exports = {
  ROOT,
  RUN_ID,
  SCREENSHOT_DIR,
  LOG_DIR,
  DOWNLOAD_DIR,
  ARTIFACTS_FILE,
  CONSOLE_LOG,
  NETWORK_LOG,
  SUMMARY_LOG,
  DATABASE_PATH,
  ensureDirs,
  append,
  writeJsonLine,
  safeName,
  screenshot,
  goto,
  registerByUi,
  loginByUi,
  createUserByApi,
  createResumeByApi,
  publishResumeByApi,
  createRegistrationCodeByApi,
  getTestAdmin,
  getSessionCookie,
  testIp,
  registerHooks,
}
