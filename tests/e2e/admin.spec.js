/**
 * 后台管理功能测试
 *
 * 覆盖：
 * - 用户 OAuth 绑定查看与解绑
 * - 注册码禁用/启用/删除
 * - 权限校验
 */

const { test, expect } = require('playwright/test')
const { registerHooks, createUserByApi, createRegistrationCodeByApi, getTestAdmin } = require('./helpers')

registerHooks(test)

test.describe('管理员 OAuth 绑定管理', () => {
  test('非管理员不能访问用户 OAuth 绑定列表', async ({ request }) => {
    const user = await createUserByApi(request, 'nonadmin-oauth')
    const adminToken = await getTestAdmin(request)

    // 获取管理员自己的 ID
    const meRes = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const adminId = (await meRes.json()).id

    const response = await request.get(`/api/admin/users/${adminId}/oauth-accounts`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
    expect(response.status()).toBe(403)
  })

  test('管理员可以查看指定用户 OAuth 绑定列表', async ({ request }) => {
    const adminToken = await getTestAdmin(request)
    const user = await createUserByApi(request, 'oauth-list')

    const response = await request.get(`/api/admin/users/${user.user.id}/oauth-accounts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(Array.isArray(body)).toBe(true)
    // 新注册的密码用户应无 OAuth 绑定
    expect(body.length).toBe(0)
  })

  test('管理员查看不存在用户的 OAuth 绑定返回 404', async ({ request }) => {
    const adminToken = await getTestAdmin(request)

    const response = await request.get('/api/admin/users/00000000-0000-0000-0000-000000000000/oauth-accounts', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(response.status()).toBe(404)
  })

  test('管理员解绑不存在的 OAuth 记录返回 404', async ({ request }) => {
    const adminToken = await getTestAdmin(request)
    const user = await createUserByApi(request, 'unbind-404')

    const response = await request.delete(
      `/api/admin/users/${user.user.id}/oauth-accounts/00000000-0000-0000-0000-000000000000`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    )
    expect(response.status()).toBe(404)
  })
})

test.describe('管理员注册码管理', () => {
  test('管理员可以禁用未使用注册码', async ({ request }) => {
    const adminToken = await getTestAdmin(request)
    const codeRecord = await createRegistrationCodeByApi(request, 'disable-test')

    const response = await request.patch(`/api/admin/registration-codes/${codeRecord.id}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { disabled: true },
    })
    expect(response.status(), await response.text()).toBe(200)
    const body = await response.json()
    expect(body.disabled_at).toBeTruthy()
  })

  test('管理员可以启用已禁用且未使用的注册码', async ({ request }) => {
    const adminToken = await getTestAdmin(request)
    const codeRecord = await createRegistrationCodeByApi(request, 'enable-test')

    // 先禁用
    await request.patch(`/api/admin/registration-codes/${codeRecord.id}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { disabled: true },
    })

    // 再启用
    const response = await request.patch(`/api/admin/registration-codes/${codeRecord.id}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { disabled: false },
    })
    expect(response.status(), await response.text()).toBe(200)
    const body = await response.json()
    expect(body.disabled_at).toBeFalsy()
  })

  test('禁用后的注册码不能注册', async ({ request }) => {
    const adminToken = await getTestAdmin(request)
    const codeRecord = await createRegistrationCodeByApi(request, 'disabled-register')

    // 禁用注册码
    await request.patch(`/api/admin/registration-codes/${codeRecord.id}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { disabled: true },
    })

    // 尝试用禁用的注册码注册
    const username = `E2E_TEST_disabled_${Date.now()}`
    const response = await request.post('/api/auth/register', {
      data: { username, password: 'E2eTest123456!', registration_code: codeRecord.code },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.message).toContain('注册码')
  })

  test('管理员可以删除未使用注册码', async ({ request }) => {
    const adminToken = await getTestAdmin(request)
    const codeRecord = await createRegistrationCodeByApi(request, 'delete-test')

    const response = await request.delete(`/api/admin/registration-codes/${codeRecord.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(response.status(), await response.text()).toBe(200)

    // 删除后查询列表应不包含该注册码
    const listRes = await request.get('/api/admin/registration-codes', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const list = await listRes.json()
    const found = list.find(c => c.id === codeRecord.id)
    expect(found).toBeUndefined()
  })

  test('管理员不能删除已使用注册码', async ({ request }) => {
    const adminToken = await getTestAdmin(request)
    const codeRecord = await createRegistrationCodeByApi(request, 'used-delete')

    // 使用注册码注册一个用户
    const username = `E2E_TEST_used_${Date.now()}`
    const regRes = await request.post('/api/auth/register', {
      data: { username, password: 'E2eTest123456!', registration_code: codeRecord.code },
    })
    expect(regRes.status(), await regRes.text()).toBe(201)

    // 尝试删除已使用的注册码
    const response = await request.delete(`/api/admin/registration-codes/${codeRecord.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.message).toContain('已使用')
  })

  test('已使用的注册码不能启用', async ({ request }) => {
    const adminToken = await getTestAdmin(request)
    const codeRecord = await createRegistrationCodeByApi(request, 'used-enable')

    // 先禁用
    await request.patch(`/api/admin/registration-codes/${codeRecord.id}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { disabled: true },
    })

    // 使用注册码注册（需要先启用才能使用，这里直接操作数据库模拟已使用状态）
    // 改为：先启用，再使用，再禁用，再尝试启用
    await request.patch(`/api/admin/registration-codes/${codeRecord.id}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { disabled: false },
    })

    const username = `E2E_TEST_used_en_${Date.now()}`
    await request.post('/api/auth/register', {
      data: { username, password: 'E2eTest123456!', registration_code: codeRecord.code },
    })

    // 禁用
    await request.patch(`/api/admin/registration-codes/${codeRecord.id}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { disabled: true },
    })

    // 尝试启用已使用的注册码
    const response = await request.patch(`/api/admin/registration-codes/${codeRecord.id}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { disabled: false },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.message).toContain('已使用')
  })

  test('注册码列表不会返回明文注册码', async ({ request }) => {
    const adminToken = await getTestAdmin(request)
    // 创建一个注册码（会返回明文）
    await createRegistrationCodeByApi(request, 'no-plaintext')

    // 查询列表
    const response = await request.get('/api/admin/registration-codes', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(response.status()).toBe(200)
    const list = await response.json()
    expect(list.length).toBeGreaterThan(0)
    // 列表中不应包含明文 code 字段
    for (const item of list) {
      expect(item.code).toBeUndefined()
    }
  })

  test('非管理员不能禁用注册码', async ({ request }) => {
    const user = await createUserByApi(request, 'nonadmin-disable')
    const codeRecord = await createRegistrationCodeByApi(request, 'nonadmin-target')

    const response = await request.patch(`/api/admin/registration-codes/${codeRecord.id}/status`, {
      headers: { Authorization: `Bearer ${user.token}` },
      data: { disabled: true },
    })
    expect(response.status()).toBe(403)
  })

  test('非管理员不能删除注册码', async ({ request }) => {
    const user = await createUserByApi(request, 'nonadmin-delete')
    const codeRecord = await createRegistrationCodeByApi(request, 'nonadmin-del-target')

    const response = await request.delete(`/api/admin/registration-codes/${codeRecord.id}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
    expect(response.status()).toBe(403)
  })
})
