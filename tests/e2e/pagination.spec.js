/**
 * Server-side pagination and lightweight list DTO regression tests.
 */

const { test, expect } = require('playwright/test')
const {
  registerHooks,
  createUserByApi,
  createResumeByApi,
  createRegistrationCodeByApi,
  getTestAdmin,
} = require('./helpers')

registerHooks(test)

function expectPaginationHeaders(response, expectedPage, expectedPageSize) {
  const headers = response.headers()
  expect(headers['x-page']).toBe(String(expectedPage))
  expect(headers['x-page-size']).toBe(String(expectedPageSize))
  expect(Number(headers['x-total-count'])).toBeGreaterThanOrEqual(0)
  expect(Number(headers['x-total-pages'])).toBeGreaterThanOrEqual(0)
}

test.describe('列表分页', () => {
  test('个人简历列表分页且不返回完整正文', async ({ request }) => {
    const account = await createUserByApi(request, 'pagination-resume')
    await createResumeByApi(request, account.token, `E2E_TEST_page_a_${Date.now()}`)
    await createResumeByApi(request, account.token, `E2E_TEST_page_b_${Date.now()}`)

    const firstResponse = await request.get('/api/resumes?page=1&page_size=1', {
      headers: { Cookie: account.token },
    })
    expect(firstResponse.status(), await firstResponse.text()).toBe(200)
    expectPaginationHeaders(firstResponse, 1, 1)

    const firstPage = await firstResponse.json()
    expect(firstPage).toHaveLength(1)
    expect(Number(firstResponse.headers()['x-total-count'])).toBe(2)
    expect(firstPage[0].preview_sections).toBeInstanceOf(Array)
    expect(firstPage[0].content).toBeUndefined()
    expect(firstPage[0].modules_config).toBeUndefined()
    expect(firstPage[0].modules_order).toBeUndefined()

    const secondResponse = await request.get('/api/resumes?page=2&page_size=1', {
      headers: { Cookie: account.token },
    })
    expect(secondResponse.status(), await secondResponse.text()).toBe(200)
    expectPaginationHeaders(secondResponse, 2, 1)
    const secondPage = await secondResponse.json()
    expect(secondPage).toHaveLength(1)
    expect(secondPage[0].id).not.toBe(firstPage[0].id)
  })

  test('后台用户、简历和注册码列表使用统一分页契约', async ({ request }) => {
    const adminSession = await getTestAdmin(request)
    const account = await createUserByApi(request, 'pagination-admin')
    await createResumeByApi(request, account.token, `E2E_TEST_admin_page_${Date.now()}`)
    await createRegistrationCodeByApi(request, `pagination-${Date.now()}`)

    for (const url of [
      '/api/admin/users?page=1&page_size=1',
      '/api/admin/resumes?page=1&page_size=1',
      '/api/admin/registration-codes?page=1&page_size=1',
      `/api/admin/users/${account.user.id}/resumes?page=1&page_size=1`,
    ]) {
      const response = await request.get(url, {
        headers: { Cookie: adminSession },
      })
      expect(response.status(), `${url}: ${await response.text()}`).toBe(200)
      expectPaginationHeaders(response, 1, 1)
      const body = await response.json()
      expect(body.length).toBeLessThanOrEqual(1)
      expect(Number(response.headers()['x-total-count'])).toBeGreaterThan(0)
    }
  })

  test('分页参数拒绝越界值与重复值', async ({ request }) => {
    const account = await createUserByApi(request, 'pagination-invalid')

    for (const query of [
      'page=0',
      'page_size=101',
      'page=1&page=2',
    ]) {
      const response = await request.get(`/api/resumes?${query}`, {
        headers: { Cookie: account.token },
      })
      expect(response.status()).toBe(400)
      await expect(response.json()).resolves.toMatchObject({
        code: 'VALIDATION_ERROR',
      })
    }
  })
})
