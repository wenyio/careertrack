/**
 * 个人信息管理测试
 */

const { test, expect } = require('playwright/test')
const { registerHooks, goto, screenshot, loginByUi, createUserByApi } = require('./helpers')

registerHooks(test)

test.describe('个人信息管理', () => {
  test('模块导航、填写保存与刷新持久化', async ({ page, request }) => {
    const account = await createUserByApi(request, 'profile')
    await loginByUi(page, account.username, account.password)

    await goto(page, '/settings/profile')
    await expect(page.getByText('个人信息管理')).toBeVisible()
    await screenshot(page, '个人信息', '初始页面')

    // 切换模块导航
    await page.getByText('教育经历', { exact: true }).click()
    await expect(page.getByText('教育经历').first()).toBeVisible()
    await page.getByText('工作经历', { exact: true }).click()
    await expect(page.getByText('工作经历').first()).toBeVisible()

    // 回到基本信息并填写
    await page.getByText('基本信息', { exact: true }).click()
    await page.getByPlaceholder('请输入姓名').fill('E2E_测试用户')
    await page.getByPlaceholder('请输入电话').fill('13900139000')
    await page.getByPlaceholder('请输入邮箱').fill('e2e@test.com')
    await page.getByPlaceholder('请输入期望职位').fill('全栈工程师')
    await page.getByPlaceholder('请输入期望工作地').fill('北京')

    const profileResponse = page.waitForResponse((r) => r.url().includes('/api/profile') && r.request().method() === 'PUT')
    await page.getByRole('button', { name: /保存更改/ }).click()
    expect((await profileResponse).ok()).toBeTruthy()
    await screenshot(page, '个人信息', '保存成功')

    // 刷新验证持久化
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(1_000)
    await expect(page.getByPlaceholder('请输入姓名')).toHaveValue('E2E_测试用户')
    await expect(page.getByPlaceholder('请输入电话')).toHaveValue('13900139000')
    await expect(page.getByPlaceholder('请输入邮箱')).toHaveValue('e2e@test.com')
    await screenshot(page, '个人信息', '刷新后数据持久化')
  })
})
