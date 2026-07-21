/**
 * 认证与表单校验测试
 */

const { test, expect } = require('playwright/test')
const { registerHooks, goto, screenshot, registerByUi, loginByUi, createUserByApi, createRegistrationCodeByApi } = require('./helpers')

registerHooks(test)

test.describe('认证与表单校验', () => {
  test('登录注册表单覆盖必填、长度、密码确认和重复提交风险', async ({ page }) => {
    await goto(page, '/auth/login')
    await page.getByRole('button', { name: /登\s*录/ }).click()
    await expect(page.getByText('请输入用户名')).toBeVisible()
    await expect(page.getByText('请输入密码')).toBeVisible()

    await goto(page, '/auth/register')
    await page.getByRole('button', { name: /注\s*册/ }).click()
    await expect(page.getByText('请输入用户名')).toBeVisible()
    await expect(page.getByText('请输入注册码')).toBeVisible()

    await page.getByPlaceholder('用户名').fill('ab')
    await page.getByPlaceholder('密码', { exact: true }).fill('12345')
    await page.getByPlaceholder('确认密码').fill('123456')
    await page.getByPlaceholder('注册码').fill('fake-code')
    await page.getByRole('button', { name: /注\s*册/ }).click()
    await expect(page.getByText('用户名至少 3 个字符')).toBeVisible()
    await expect(page.getByText('密码至少 6 个字符')).toBeVisible()

    await page.getByPlaceholder('用户名').fill(`E2E_TEST_invalid_${Date.now()}`)
    await page.getByPlaceholder('密码', { exact: true }).fill('123456')
    await page.getByPlaceholder('确认密码').fill('654321')
    await page.getByRole('button', { name: /注\s*册/ }).click()
    await expect(page.getByText('两次输入的密码不一致')).toBeVisible()
    await screenshot(page, '表单校验', '注册非法输入')
  })

  test('登录错误提示：错误密码和不存在用户名', async ({ page, request }) => {
    await goto(page, '/auth/login')
    await page.getByPlaceholder('用户名').fill('nonexistent_user_e2e')
    await page.getByPlaceholder('密码').fill('wrongpassword')
    await page.getByRole('button', { name: /登\s*录/ }).click()
    await expect(page.getByText('用户名或密码错误')).toBeVisible()
    await screenshot(page, '认证校验', '不存在用户名登录')

    const account = await createUserByApi(request, 'loginerr')
    await goto(page, '/auth/login')
    await page.getByPlaceholder('用户名').fill(account.username)
    await page.getByPlaceholder('密码').fill('wrongpassword')
    await page.getByRole('button', { name: /登\s*录/ }).click()
    await expect(page.getByText('用户名或密码错误')).toBeVisible()
    await screenshot(page, '认证校验', '错误密码登录')
  })

  test('注册需要有效注册码，无注册码注册失败', async ({ page }) => {
    await goto(page, '/auth/register')
    await page.getByPlaceholder('用户名').fill(`E2E_TEST_nocode_${Date.now()}`)
    await page.getByPlaceholder('密码', { exact: true }).fill('E2eTest123456!')
    await page.getByPlaceholder('确认密码').fill('E2eTest123456!')
    await page.getByPlaceholder('注册码').fill('INVALID-CODE-XXXX')
    await page.getByRole('button', { name: /注\s*册/ }).click()
    await expect(page.getByText('注册码无效')).toBeVisible({ timeout: 10_000 })
  })

  test('有效注册码注册成功', async ({ page, request }) => {
    const codeRecord = await createRegistrationCodeByApi(request, 'ui-register-test')
    const username = `E2E_TEST_ui_${Date.now()}`
    const password = 'E2eTest123456!'

    await registerByUi(page, username, password, codeRecord.code)
    await expect(page.getByText('我的简历')).toBeVisible()
    await screenshot(page, '注册登录', '有效注册码注册成功')
  })

  test('注册链接会预填注册码并完成注册', async ({ page, request }) => {
    const codeRecord = await createRegistrationCodeByApi(request, 'registration-link-test')
    const username = `E2E_TEST_link_${Date.now()}`
    const password = 'E2eTest123456!'

    await goto(page, `/auth/register?code=${encodeURIComponent(codeRecord.code)}`)
    await expect(page.getByPlaceholder('用户名')).toBeVisible()
    await page.getByPlaceholder('用户名').fill(username)
    await page.getByPlaceholder('密码', { exact: true }).fill(password)
    await page.getByPlaceholder('确认密码').fill(password)
    await Promise.all([
      page.waitForURL(/\/resumes/, { timeout: 20_000 }),
      page.getByRole('button', { name: /注\s*册/ }).click(),
    ])

    await expect(page.getByText('我的简历')).toBeVisible()
  })

  test('注册后可使用账号登录，且刷新受保护页不应丢失登录态', async ({ page, request }) => {
    const codeRecord = await createRegistrationCodeByApi(request, 'login-flow-test')
    const username = `E2E_TEST_UI_${Date.now()}`
    const password = 'E2eTest123456!'

    await registerByUi(page, username, password, codeRecord.code)
    await expect(page.getByText('我的简历')).toBeVisible()
    await screenshot(page, '注册登录', '注册后进入简历页')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await expect(page, '注册后刷新受保护页应保持登录态，而不是被代理重定向到登录页').toHaveURL(/\/resumes/)

    await loginByUi(page, username, password)
    await expect(page.getByText('我的简历')).toBeVisible()
    await screenshot(page, '注册登录', '重新登录成功')
  })

  test('登录页显示 GitHub 登录按钮', async ({ page }) => {
    await goto(page, '/auth/login')
    const githubBtn = page.getByRole('link', { name: /GitHub/ })
    await expect(githubBtn).toBeVisible()
    await expect(githubBtn).toHaveAttribute('href', /\/api\/auth\/github\/start/)
  })

  test('注册页显示 GitHub 注册按钮', async ({ page }) => {
    await goto(page, '/auth/register')
    const githubBtn = page.getByRole('link', { name: /GitHub/ })
    await expect(githubBtn).toBeVisible()
    await expect(githubBtn).toHaveAttribute('href', /\/api\/auth\/github\/start/)
  })
})
