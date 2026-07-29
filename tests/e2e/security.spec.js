/**
 * 异常场景与安全测试
 */

const { test, expect } = require('playwright/test')
const { registerHooks, goto, screenshot, writeJsonLine, createUserByApi, createResumeByApi, publishResumeByApi, createRegistrationCodeByApi, getTestAdmin, getSessionCookie, testIp, DATABASE_PATH } = require('./helpers')

registerHooks(test)

test.describe('认证请求 Schema', () => {
  test('非法 JSON 和错误字段类型稳定返回 400', async ({ request }) => {
    const malformed = await request.post('/api/auth/login', {
      headers: {
        'Content-Type': 'application/json',
        'X-Real-IP': testIp('malformed-login-json'),
      },
      data: Buffer.from('{"username":'),
    })
    expect(malformed.status()).toBe(400)
    await expect(malformed.json()).resolves.toEqual({
      code: 'VALIDATION_ERROR',
      message: '请求体必须是有效的 JSON',
    })

    const wrongType = await request.post('/api/auth/register', {
      headers: { 'X-Real-IP': testIp('wrong-register-field-type') },
      data: {
        username: { unexpected: true },
        password: 'ValidPassword123!',
        registration_code: 'unused-code',
      },
    })
    expect(wrongType.status()).toBe(400)
    await expect(wrongType.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '用户名和密码不能为空',
    })
  })
})

test.describe('异常场景与安全测试', () => {
  test('API 未授权、越权访问、删除不存在数据和公开接口字段暴露检查', async ({ request }) => {
    const unauth = await request.get('/api/resumes')
    expect(unauth.status()).toBe(401)

    const owner = await createUserByApi(request, 'owner')
    const attacker = await createUserByApi(request, 'attacker')
    const resume = await createResumeByApi(request, owner.token, `E2E_TEST_越权_${Date.now()}`)

    const forbiddenRead = await request.get(`/api/resumes/${resume.id}`, {
      headers: { Cookie: attacker.token },
    })
    expect(forbiddenRead.status()).toBe(404)

    const deleteMissing = await request.delete('/api/resumes/00000000-0000-0000-0000-000000000000', {
      headers: { Cookie: owner.token },
    })
    expect(deleteMissing.status()).toBe(404)

    const slug = `security-${Date.now()}`
    await publishResumeByApi(request, owner.token, resume.id, slug)
    const publicResponse = await request.get(`/api/public/${slug}`)
    expect(publicResponse.status()).toBe(200)
    const publicBody = await publicResponse.json()
    writeJsonLine({ type: 'security-observation', module: '公开简历', bodyKeys: Object.keys(publicBody) })
    expect(publicBody.user_id, '公开 API 不应暴露内部 user_id 字段').toBeUndefined()
    expect(publicBody.id, '公开 API 不应暴露内部 resume id 字段').toBeUndefined()
  })

  test('XSS 输入在公开页面应作为文本呈现且不执行脚本', async ({ page, request }) => {
    const account = await createUserByApi(request, 'xss')
    const resume = await createResumeByApi(request, account.token, `E2E_TEST_XSS_${Date.now()}`)
    const slug = `xss-${Date.now()}`
    const updateResponse = await request.put(`/api/resumes/${resume.id}`, {
      headers: { Cookie: account.token },
      data: {
        content: {
          basic_info: {
            name: '</script><script>window.__E2E_XSS__=true</script>',
            email: 'xss@example.com',
          },
        },
        modules_config: { basic_info: true },
      },
    })
    expect(updateResponse.status(), await updateResponse.text()).toBe(200)
    await publishResumeByApi(request, account.token, resume.id, slug)
    await goto(page, `/resume/${slug}`)
    const executed = await page.evaluate(() => Boolean(window.__E2E_XSS__))
    expect(executed).toBe(false)
    await expect(page.locator('body')).toContainText('</script><script>window.__E2E_XSS__=true</script>')
    await screenshot(page, '安全测试', 'XSS文本呈现')
  })
})

test.describe('注册码安全测试', () => {
  test('错误注册码不能注册', async ({ request }) => {
    const username = `E2E_TEST_badcode_${Date.now()}`
    const response = await request.post('/api/auth/register', {
      data: { username, password: 'E2eTest123456!', registration_code: 'INVALID-CODE-XXXX' },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.message).toContain('注册码')
  })

  test('已使用注册码不能再次注册', async ({ request }) => {
    const codeRecord = await createRegistrationCodeByApi(request, 'reuse-test')

    // 第一次使用 — 应成功
    const username1 = `E2E_TEST_reuse1_${Date.now()}`
    const res1 = await request.post('/api/auth/register', {
      data: { username: username1, password: 'E2eTest123456!', registration_code: codeRecord.code },
    })
    expect(res1.status(), await res1.text()).toBe(201)

    // 第二次使用同一注册码 — 应失败
    const username2 = `E2E_TEST_reuse2_${Date.now()}`
    const res2 = await request.post('/api/auth/register', {
      data: { username: username2, password: 'E2eTest123456!', registration_code: codeRecord.code },
    })
    expect(res2.status()).toBe(400)
  })

  test('非管理员不能生成注册码', async ({ request }) => {
    const user = await createUserByApi(request, 'nonadmin')
    const response = await request.post('/api/admin/registration-codes', {
      headers: { Cookie: user.token },
      data: {},
    })
    expect(response.status()).toBe(403)
  })

  test('管理员可以生成一次性注册码，明文只在创建响应中返回', async ({ request }) => {
    const adminToken = await getTestAdmin(request)
    const response = await request.post('/api/admin/registration-codes', {
      headers: { Cookie: adminToken },
      data: { label: 'test-plaintext' },
    })
    expect(response.status()).toBe(201)
    const body = await response.json()
    expect(body.code).toBeTruthy()
    expect(body.code.length).toBeGreaterThan(10)

    // 查询列表中不应包含明文
    const listRes = await request.get('/api/admin/registration-codes', {
      headers: { Cookie: adminToken },
    })
    expect(listRes.status()).toBe(200)
    const list = await listRes.json()
    const found = list.find(c => c.id === body.id)
    expect(found).toBeTruthy()
    expect(found.code).toBeUndefined()
  })
})

test.describe('用户禁用安全测试', () => {
  test('管理员可以禁用用户，被禁用用户不能登录', async ({ request }) => {
    const adminToken = await getTestAdmin(request)
    const user = await createUserByApi(request, 'disableme')

    // 管理员禁用用户
    const disableRes = await request.patch(`/api/admin/users/${user.user.id}/status`, {
      headers: { Cookie: adminToken },
      data: { disabled: true },
    })
    expect(disableRes.status(), await disableRes.text()).toBe(200)

    // 被禁用用户尝试登录
    const loginRes = await request.post('/api/auth/login', {
      data: { username: user.username, password: user.password },
    })
    expect(loginRes.status()).toBe(403)
  })

  test('禁用账号会撤销旧会话', async ({ request }) => {
    const adminToken = await getTestAdmin(request)
    const user = await createUserByApi(request, 'disableapi')

    // 禁用前 API 正常
    const beforeRes = await request.get('/api/auth/me', {
      headers: { Cookie: user.token },
    })
    expect(beforeRes.status()).toBe(200)

    // 禁用用户
    await request.patch(`/api/admin/users/${user.user.id}/status`, {
      headers: { Cookie: adminToken },
      data: { disabled: true },
    })

    // 旧 token 调用受保护 API 应失败
    const afterRes = await request.get('/api/auth/me', {
      headers: { Cookie: user.token },
    })
    expect(afterRes.status()).toBe(401)
  })

  test('管理员不能禁用自己', async ({ request }) => {
    const adminToken = await getTestAdmin(request)

    // 获取管理员自己的 ID
    const meRes = await request.get('/api/auth/me', {
      headers: { Cookie: adminToken },
    })
    const me = await meRes.json()

    // 尝试禁用自己
    const res = await request.patch(`/api/admin/users/${me.id}/status`, {
      headers: { Cookie: adminToken },
      data: { disabled: true },
    })
    expect(res.status()).toBe(400)
  })
})

test.describe('OTP 与密码安全测试', () => {
  test('password_hash 为空用户不能账号密码登录', async ({ request }) => {
    // 创建 GitHub-only 用户（直接写数据库）
    const Database = require('better-sqlite3')
    const db = new Database(DATABASE_PATH)

    const username = `E2E_GHONLY_${Date.now()}`
    db.exec(`INSERT INTO users (username, auth_provider) VALUES ('${username}', 2)`)
    db.close()

    // 尝试密码登录
    const loginRes = await request.post('/api/auth/login', {
      data: { username, password: 'anypassword' },
    })
    expect(loginRes.status()).toBe(400)
    const body = await loginRes.json()
    expect(body.message).toContain('未设置密码')
  })

  test('password_hash 为空用户不能 setup OTP', async ({ request }) => {
    const Database = require('better-sqlite3')
    const { createHash, randomUUID } = require('node:crypto')
    const db = new Database(DATABASE_PATH)

    const username = `E2E_GHOTP_${Date.now()}`
    const githubOnlyUser = db.prepare(
      'INSERT INTO users (username, auth_provider) VALUES (?, 2) RETURNING id',
    ).get(username)

    const { SignJWT } = await import('jose')
    const jwtSecret = process.env.JWT_SECRET
    expect(jwtSecret, 'E2E 必须显式设置 JWT_SECRET').toBeTruthy()
    const sessionId = randomUUID()
    const token = await new SignJWT({ username, auth_provider: 2 })
      .setProtectedHeader({ alg: 'HS256' })
      .setJti(sessionId)
      .setSubject(githubOnlyUser.id)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(jwtSecret))
    db.prepare(
      `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`,
    ).run(
      sessionId,
      githubOnlyUser.id,
      createHash('sha256').update(token).digest('hex'),
      new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    )
    db.close()

    const otpRes = await request.post('/api/auth/setup-otp', {
      headers: { Authorization: `Bearer ${token}` },
      data: { password: 'not-applicable' },
    })
    expect(otpRes.status()).toBe(400)
    expect((await otpRes.json()).message).toContain('GitHub')
  })
})

test.describe('修改用户名安全测试', () => {
  test('修改 username 时重复名称会失败', async ({ request }) => {
    const user1 = await createUserByApi(request, 'nameuser1')
    const user2 = await createUserByApi(request, 'nameuser2')

    // user2 尝试使用 user1 的用户名
    const res = await request.put('/api/auth/username', {
      headers: { Cookie: user2.token },
      data: { username: user1.username, current_password: user2.password },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.message).toContain('已被占用')
  })

  test('账号密码用户修改 username 需要当前密码', async ({ request }) => {
    const user = await createUserByApi(request, 'needpwd')

    // 不提供密码
    const noPwdRes = await request.put('/api/auth/username', {
      headers: { Cookie: user.token },
      data: { username: `newname_${Date.now()}` },
    })
    expect(noPwdRes.status()).toBe(400)

    // 提供错误密码
    const wrongPwdRes = await request.put('/api/auth/username', {
      headers: { Cookie: user.token },
      data: { username: `newname_${Date.now()}`, current_password: 'wrongpassword' },
    })
    expect(wrongPwdRes.status()).toBe(400)
  })

  test('修改 username 成功后轮换 HttpOnly session 并返回新 user', async ({ request }) => {
    const user = await createUserByApi(request, 'changetest')
    const newUsername = `renamed_${Date.now()}`

    const res = await request.put('/api/auth/username', {
      headers: { Cookie: user.token },
      data: { username: newUsername, current_password: user.password },
    })
    expect(res.status(), await res.text()).toBe(200)
    const body = await res.json()
    expect(body.token).toBeUndefined()
    expect(body.user.username).toBe(newUsername)
    expect(getSessionCookie(res)).not.toBe(user.token)

    // 用新 username 登录应成功
    const loginRes = await request.post('/api/auth/login', {
      data: { username: newUsername, password: user.password },
    })
    expect(loginRes.status()).toBe(200)

    // 用旧 username 登录应失败
    const oldLoginRes = await request.post('/api/auth/login', {
      data: { username: user.username, password: user.password },
    })
    expect(oldLoginRes.status()).toBe(400)
  })
})

test.describe('服务端会话撤销', () => {
  test('登出后复制的原会话不能继续访问 API', async ({ request }) => {
    const user = await createUserByApi(request, 'logout-revoke')
    const logoutRes = await request.post('/api/auth/logout', {
      headers: { Cookie: user.token },
    })
    expect(logoutRes.status()).toBe(204)

    const replay = await request.get('/api/auth/me', {
      headers: { Cookie: user.token },
    })
    expect(replay.status()).toBe(401)
  })

  test('修改密码撤销其他设备并轮换当前会话', async ({ request }) => {
    const user = await createUserByApi(request, 'password-rotate')
    const secondLogin = await request.post('/api/auth/login', {
      headers: { 'X-Real-IP': testIp(`second-login:${user.username}`) },
      data: { username: user.username, password: user.password },
    })
    expect(secondLogin.status()).toBe(200)
    const secondCookie = getSessionCookie(secondLogin)

    const changed = await request.put('/api/auth/password', {
      headers: { Cookie: user.token },
      data: {
        current_password: user.password,
        new_password: 'RotatedPassword123!',
      },
    })
    expect(changed.status(), await changed.text()).toBe(200)
    const rotatedCookie = getSessionCookie(changed)

    for (const revokedCookie of [user.token, secondCookie]) {
      const revoked = await request.get('/api/auth/me', {
        headers: { Cookie: revokedCookie },
      })
      expect(revoked.status()).toBe(401)
    }
    const current = await request.get('/api/auth/me', {
      headers: { Cookie: rotatedCookie },
    })
    expect(current.status()).toBe(200)
  })
})
