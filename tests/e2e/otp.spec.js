/**
 * TOTP 密钥保护与恢复码完整流程。
 */

const { test, expect } = require('playwright/test')
const Database = require('better-sqlite3')
const { generateSync } = require('otplib')
const {
  DATABASE_PATH,
  createUserByApi,
  getSessionCookie,
  goto,
  registerHooks,
  testIp,
} = require('./helpers')

const TOTP_PERIOD_MS = 30_000
const TOTP_MIN_VALIDITY_MS = 2_000

registerHooks(test)

/**
 * Avoid generating a token just before its 30-second period expires.
 *
 * The API request may otherwise arrive after the boundary and make this
 * end-to-end test fail intermittently even though both clocks are correct.
 */
async function generateStableTotp(secret) {
  const remainingMs = TOTP_PERIOD_MS - (Date.now() % TOTP_PERIOD_MS)
  if (remainingMs < TOTP_MIN_VALIDITY_MS) {
    await new Promise((resolve) => setTimeout(resolve, remainingMs + 50))
  }
  return generateSync({ secret })
}

test.describe('OTP 二次验证', () => {
  test('加密密钥、一次性恢复码、会话轮换和登录切换形成闭环', async ({
    page,
    request,
  }) => {
    const account = await createUserByApi(request, 'otp')

    const setupResponse = await request.post('/api/auth/setup-otp', {
      headers: { Cookie: account.token },
      data: { password: account.password },
    })
    expect(setupResponse.status(), await setupResponse.text()).toBe(200)
    const setup = await setupResponse.json()
    expect(setup.secret).toMatch(/^[A-Z2-7]+$/)

    const database = new Database(DATABASE_PATH)
    const pendingOtp = database.prepare(
      `SELECT otp_secret, otp_recovery_codes, otp_enabled
       FROM users WHERE id = ?`,
    ).get(account.user.id)
    expect(pendingOtp.otp_secret).toMatch(/^v1:/)
    expect(pendingOtp.otp_secret).not.toContain(setup.secret)
    expect(JSON.parse(pendingOtp.otp_recovery_codes)).toEqual([])
    expect(pendingOtp.otp_enabled).toBe(0)

    const token = await generateStableTotp(setup.secret)
    const verifyResponse = await request.post('/api/auth/verify-otp', {
      headers: { Cookie: account.token },
      data: { code: token },
    })
    expect(verifyResponse.status(), await verifyResponse.text()).toBe(200)
    const verify = await verifyResponse.json()
    const verifiedCookie = getSessionCookie(verifyResponse)
    expect(verify.recovery_codes).toHaveLength(10)
    expect(new Set(verify.recovery_codes).size).toBe(10)

    const enabledOtp = database.prepare(
      `SELECT otp_secret, otp_recovery_codes, otp_enabled
       FROM users WHERE id = ?`,
    ).get(account.user.id)
    const storedHashes = JSON.parse(enabledOtp.otp_recovery_codes)
    expect(enabledOtp.otp_enabled).toBe(1)
    expect(storedHashes).toHaveLength(10)
    expect(storedHashes.every((hash) => /^[a-f0-9]{64}$/.test(hash))).toBe(true)
    expect(enabledOtp.otp_recovery_codes).not.toContain(verify.recovery_codes[0])

    const oldSession = await request.get('/api/auth/me', {
      headers: { Cookie: account.token },
    })
    expect(oldSession.status()).toBe(401)
    const rotatedSession = await request.get('/api/auth/me', {
      headers: { Cookie: verifiedCookie },
    })
    expect(rotatedSession.status()).toBe(200)

    const missingSecondFactor = await request.post('/api/auth/login', {
      headers: { 'X-Real-IP': testIp(`otp-missing:${account.username}`) },
      data: {
        username: account.username,
        password: account.password,
      },
    })
    expect(missingSecondFactor.status()).toBe(400)
    await expect(missingSecondFactor.json()).resolves.toMatchObject({
      code: 'OTP_REQUIRED',
    })

    // 两个并发请求带同一个恢复码，条件更新保证最多只有一个成功。
    const concurrentRecovery = await Promise.all([
      request.post('/api/auth/login', {
        headers: { 'X-Real-IP': testIp(`otp-race-a:${account.username}`) },
        data: {
          username: account.username,
          password: account.password,
          recovery_code: verify.recovery_codes[0],
        },
      }),
      request.post('/api/auth/login', {
        headers: { 'X-Real-IP': testIp(`otp-race-b:${account.username}`) },
        data: {
          username: account.username,
          password: account.password,
          recovery_code: verify.recovery_codes[0],
        },
      }),
    ])
    expect(concurrentRecovery.map((response) => response.status()).sort())
      .toEqual([200, 400])
    const successfulRecovery = concurrentRecovery.find(
      (response) => response.status() === 200,
    )
    await expect(successfulRecovery.json()).resolves.toMatchObject({
      recovery_code_used: true,
      recovery_codes_remaining: 9,
    })

    const totpLogin = await request.post('/api/auth/login', {
      headers: { 'X-Real-IP': testIp(`otp-code:${account.username}`) },
      data: {
        username: account.username,
        password: account.password,
        otp_code: await generateStableTotp(setup.secret),
      },
    })
    expect(totpLogin.status(), await totpLogin.text()).toBe(200)

    const regenerateResponse = await request.post('/api/auth/recovery-codes', {
      headers: { Cookie: verifiedCookie },
      data: {
        password: account.password,
        code: await generateStableTotp(setup.secret),
      },
    })
    expect(regenerateResponse.status(), await regenerateResponse.text()).toBe(200)
    const regenerated = await regenerateResponse.json()
    expect(regenerated.recovery_codes).toHaveLength(10)

    const oldRecoveryLogin = await request.post('/api/auth/login', {
      headers: { 'X-Real-IP': testIp(`otp-old-code:${account.username}`) },
      data: {
        username: account.username,
        password: account.password,
        recovery_code: verify.recovery_codes[1],
      },
    })
    expect(oldRecoveryLogin.status()).toBe(400)

    // 浏览器端先触发 OTP_REQUIRED，再切换为恢复码完成登录。
    await page.context().setExtraHTTPHeaders({
      'X-Real-IP': testIp(`otp-ui:${account.username}`),
    })
    await goto(page, '/auth/login')
    await page.getByPlaceholder('用户名').fill(account.username)
    await page.getByPlaceholder('密码').fill(account.password)
    await page.getByRole('button', { name: /登\s*录/ }).click()
    await expect(page.getByRole('button', { name: '改用恢复码' })).toBeVisible()
    await page.getByRole('button', { name: '改用恢复码' }).click()
    await page.getByPlaceholder('XXXX-XXXX-XXXX-XXXX')
      .fill(regenerated.recovery_codes[0])
    await Promise.all([
      page.waitForURL(/\/resumes/, { timeout: 20_000 }),
      page.getByRole('button', { name: /登\s*录/ }).click(),
    ])

    const reusedRecoveryLogin = await request.post('/api/auth/login', {
      headers: { 'X-Real-IP': testIp(`otp-reuse:${account.username}`) },
      data: {
        username: account.username,
        password: account.password,
        recovery_code: regenerated.recovery_codes[0],
      },
    })
    expect(reusedRecoveryLogin.status()).toBe(400)

    const disableResponse = await request.delete('/api/auth/disable-otp', {
      headers: { Cookie: verifiedCookie },
      data: {
        password: account.password,
        code: regenerated.recovery_codes[1],
      },
    })
    expect(disableResponse.status(), await disableResponse.text()).toBe(200)
    const disabledCookie = getSessionCookie(disableResponse)

    const disabledOtp = database.prepare(
      `SELECT otp_secret, otp_recovery_codes, otp_enabled
       FROM users WHERE id = ?`,
    ).get(account.user.id)
    database.close()
    expect(disabledOtp.otp_secret).toBeNull()
    expect(JSON.parse(disabledOtp.otp_recovery_codes)).toEqual([])
    expect(disabledOtp.otp_enabled).toBe(0)

    const disabledSession = await request.get('/api/auth/me', {
      headers: { Cookie: disabledCookie },
    })
    expect(disabledSession.status()).toBe(200)
    const passwordOnlyLogin = await request.post('/api/auth/login', {
      headers: { 'X-Real-IP': testIp(`otp-disabled:${account.username}`) },
      data: {
        username: account.username,
        password: account.password,
      },
    })
    expect(passwordOnlyLogin.status(), await passwordOnlyLogin.text()).toBe(200)
  })
})
