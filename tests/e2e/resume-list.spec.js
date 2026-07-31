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

    // 列表 DTO 保持轻量；首屏卡片进入视口后才按需读取详情并渲染真实缩略图。
    await expect.poll(async () => (
      await page.locator('[data-preview-mode="live"]').count()
    )).toBeGreaterThan(0)

    // 验证列表
    await expect(page.getByRole('heading', { name: '我的简历' })).toBeVisible()
    await expect(page.getByText(name1)).toBeVisible()
    await expect(page.getByText(name2)).toBeVisible()
    await screenshot(page, '简历列表', '两份简历可见')

    // 点击编辑按钮进入编辑页
    await page.getByRole('link', { name: `编辑 ${name1}` }).click()
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

  test('真实缩略图按视口延迟读取详情', async ({ page, request }) => {
    const account = await createUserByApi(request, 'list-lazy-preview')
    const resumes = await Promise.all(Array.from({ length: 12 }, (_, index) => (
      createResumeByApi(request, account.token, `E2E_TEST_延迟预览_${index}_${Date.now()}`)
    )))
    const requestedResumeIds = new Set()

    await page.setViewportSize({ width: 1280, height: 300 })
    page.on('request', (networkRequest) => {
      if (networkRequest.method() !== 'GET') return
      const match = new URL(networkRequest.url()).pathname.match(/^\/api\/resumes\/([\w-]+)$/)
      if (match) requestedResumeIds.add(match[1])
    })

    await loginByUi(page, account.username, account.password)
    await goto(page, '/resumes')

    await expect.poll(() => requestedResumeIds.size).toBeGreaterThan(0)
    expect(requestedResumeIds.size).toBeLessThan(resumes.length)

    const deferredResume = resumes.find(({ id }) => !requestedResumeIds.has(id))
    expect(deferredResume).toBeDefined()
    await page.getByRole('link', { name: `编辑 ${deferredResume.name}` }).scrollIntoViewIfNeeded()
    await expect.poll(() => requestedResumeIds.has(deferredResume.id)).toBe(true)
  })
})
