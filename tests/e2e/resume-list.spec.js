/**
 * 简历列表页测试
 */

const { test, expect } = require('playwright/test')
const { registerHooks, goto, screenshot, loginByUi, createUserByApi, createResumeByApi } = require('./helpers')

registerHooks(test)

test.describe('简历列表页', () => {
  test('简历列表展示与编辑入口', async ({ page, request }) => {
    const account = await createUserByApi(request, 'list')
    const name1 = `E2E_TEST_列表1_${Date.now()}`
    const name2 = `E2E_TEST_列表2_${Date.now()}`
    const resume1 = await createResumeByApi(request, account.token, name1)
    await createResumeByApi(request, account.token, name2)

    await loginByUi(page, account.username, account.password)
    await goto(page, '/resumes')

    // 验证列表
    await expect(page.getByText('我的简历')).toBeVisible()
    await expect(page.getByText(name1)).toBeVisible()
    await expect(page.getByText(name2)).toBeVisible()
    await screenshot(page, '简历列表', '两份简历可见')

    // 点击编辑按钮进入编辑页
    const card1 = page.locator('.ant-card').filter({ hasText: name1 })
    await card1.locator('button').filter({ has: page.locator('[aria-label="edit"]') }).click()
    await expect(page).toHaveURL(new RegExp(`/resumes/${resume1.id}/edit`))
    await expect(page.locator('.resume-a4-preview')).toBeVisible()
    await screenshot(page, '简历列表', '点击编辑进入编辑页')

    // 返回列表
    const backBtn = page.locator('button').filter({ has: page.locator('[aria-label="arrow-left"]') })
    await backBtn.click()
    await expect(page).toHaveURL(/\/resumes/)
    await expect(page.getByText(name2)).toBeVisible()
    await screenshot(page, '简历列表', '返回列表页')
  })
})
