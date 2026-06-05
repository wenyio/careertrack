/**
 * 页面访问与导航测试
 */

const { test, expect } = require('playwright/test')
const { registerHooks, goto, screenshot } = require('./helpers')

registerHooks(test)

test.describe('页面访问与导航', () => {
  test('首页、登录页、注册页、受保护页面和公开页访问行为符合预期', async ({ page }) => {
    await goto(page, '/')
    await expect(page.locator('body')).not.toBeEmpty()
    await screenshot(page, '页面访问', '首页')

    await goto(page, '/auth/login')
    await expect(page.getByRole('button', { name: /登\s*录/ })).toBeVisible()
    await expect(page.getByText('立即注册')).toBeVisible()
    await screenshot(page, '页面访问', '登录页')

    await goto(page, '/auth/register')
    await expect(page.getByRole('button', { name: /注\s*册/ })).toBeVisible()
    await expect(page.getByText('立即登录')).toBeVisible()
    await screenshot(page, '页面访问', '注册页')

    await page.context().clearCookies()
    await goto(page, '/resumes')
    await expect(page).toHaveURL(/\/auth\/login/)
    await screenshot(page, '权限控制', '未登录访问我的简历重定向')

    await goto(page, '/settings/profile')
    await expect(page).toHaveURL(/\/auth\/login/)

    const missingPublicResponse = page.waitForResponse((r) => r.url().includes('/api/public/not-exists-e2e'), { timeout: 35_000 })
    await goto(page, '/resume/not-exists-e2e')
    expect((await missingPublicResponse).status()).toBe(404)
    await expect(page.getByText(/简历不存在|未公开|加载失败/)).toBeVisible()
    await screenshot(page, '异常场景', '不存在公开简历')
  })
})
