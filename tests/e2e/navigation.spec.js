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
    await expect(page.getByRole('link', { name: '注册新账号' })).toBeVisible()
    await screenshot(page, '页面访问', '登录页')

    await goto(page, '/auth/register')
    await expect(page.getByRole('button', { name: '下一步' })).toBeVisible()
    await expect(page.getByRole('link', { name: '登录' })).toBeVisible()
    await screenshot(page, '页面访问', '注册页')

    await page.context().clearCookies()
    await goto(page, '/resumes')
    await expect(page).toHaveURL(/\/resumes/)
    await expect(page.getByText('游客模式 · 数据保存在浏览器本地')).toBeVisible()
    await screenshot(page, '游客模式', '未登录访问简历列表')

    await goto(page, '/settings/profile')
    await expect(page).toHaveURL(/\/auth\/login/)

    const missingPublicResponse = await page.goto('/resume/not-exists-e2e', {
      waitUntil: 'domcontentloaded',
    })
    expect(missingPublicResponse?.status()).toBe(404)
    await expect(page.locator('body')).toContainText(/404|This page could not be found/)
    await screenshot(page, '异常场景', '不存在公开简历')
  })
})
