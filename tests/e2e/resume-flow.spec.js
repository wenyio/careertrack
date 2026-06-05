/**
 * 核心业务流程测试
 */

const { test, expect } = require('playwright/test')
const fs = require('fs')
const path = require('path')
const { registerHooks, goto, screenshot, loginByUi, createUserByApi, createResumeByApi, writeJsonLine, DOWNLOAD_DIR, RUN_ID } = require('./helpers')

registerHooks(test)

test.describe('核心业务流程', () => {
  test('注册登录到创建档案、创建简历、编辑、预览、导出、发布并访问公开链接', async ({ page, request }) => {
    const account = await createUserByApi(request, 'flow')
    const resumeName = `E2E_TEST_主链路_${Date.now()}`
    const personName = `E2E_TEST_张三_${Date.now()}`
    const publicSlug = `e2e-test-${Date.now()}`

    await loginByUi(page, account.username, account.password)

    await goto(page, '/settings/profile')
    await expect(page.getByText('个人信息管理')).toBeVisible()
    await page.getByPlaceholder('请输入姓名').fill(personName)
    await page.getByPlaceholder('请输入电话').fill('13800138000')
    await page.getByPlaceholder('请输入邮箱').fill('e2e@example.com')
    await page.getByPlaceholder('请输入期望职位').fill('前端工程师')
    await page.getByPlaceholder('请输入期望工作地').fill('上海')
    const profileResponse = page.waitForResponse((r) => r.url().includes('/api/profile') && r.request().method() === 'PUT')
    await page.getByRole('button', { name: /保存更改/ }).click()
    expect((await profileResponse).ok()).toBeTruthy()
    await screenshot(page, '个人信息', '保存基本信息')

    await goto(page, '/resumes')
    await page.getByRole('button', { name: /新建简历/ }).click()
    const createModal = page.getByRole('dialog', { name: '新建简历' })
    await expect(createModal).toBeVisible()
    await createModal.getByPlaceholder(/前端工程师/).fill(resumeName)
    const createResponsePromise = page.waitForResponse((r) => r.url().endsWith('/api/resumes') && r.request().method() === 'POST')
    await createModal.getByRole('button', { name: /创\s*建/ }).click()
    const createResponse = await createResponsePromise
    expect(createResponse.status(), await createResponse.text()).toBe(201)
    const createdResume = await createResponse.json()
    await expect(page).toHaveURL(new RegExp(`/resumes/${createdResume.id}/edit`))
    await expect(page.getByPlaceholder('未命名简历')).toHaveValue(resumeName)
    await screenshot(page, '我的简历', '新建简历')
    await expect(page.locator('.module-switcher')).toBeVisible()
    await expect(page.locator('.resume-preview')).toBeVisible()
    await screenshot(page, '简历编辑', '编辑器初始加载')

    await page.getByPlaceholder('未命名简历').fill(`${resumeName}_已编辑`)
    await page.getByPlaceholder('请输入姓名').first().fill(`${personName}_简历`)
    await page.getByPlaceholder('请输入邮箱').first().fill('resume-e2e@example.com')
    const saveResponsePromise = page.waitForResponse((r) => r.url().includes(`/api/resumes/${createdResume.id}`) && r.request().method() === 'PUT')
    await page.locator('button').filter({ has: page.locator('[aria-label="save"]') }).click()
    expect((await saveResponsePromise).ok()).toBeTruthy()
    await expect(page.getByText('已保存')).toBeVisible()

    await page.locator('.module-switcher').getByText('专业技能').click()
    await expect(page.getByRole('button', { name: /添加专业技能/ })).toBeVisible()
    await page.getByRole('button', { name: /添加专业技能/ }).click()
    await page.getByPlaceholder(/JavaScript|React/).fill('Playwright 自动化测试')
    await screenshot(page, '简历编辑', '模块开关与内容编辑')

    await page.locator('button').filter({ has: page.locator('[aria-label="setting"]') }).click()
    await expect(page.getByText('选择模板')).toBeVisible()
    await page.getByText('现代').click()
    await screenshot(page, '简历模板', '模板选择')

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
    await page.getByRole('button', { name: /导出 PDF/ }).click()
    const download = await downloadPromise
    const pdfPath = path.join(DOWNLOAD_DIR, `简历导出_${RUN_ID}.pdf`)
    await download.saveAs(pdfPath)
    expect(fs.existsSync(pdfPath)).toBeTruthy()
    writeJsonLine({ type: 'download', module: '简历导出', path: `test-results/downloads/${path.basename(pdfPath)}` })

    // 点击工具栏"公开"按钮 → 弹出 Popover
    await page.getByRole('button', { name: /公开/ }).click()
    await expect(page.getByText('公开简历')).toBeVisible()
    // 填写 slug（Popover 内第二个 input，第一个是禁用的 URL 前缀）
    const popoverInputs = page.locator('.ant-popover input')
    await popoverInputs.nth(1).fill(publicSlug)
    // 点击 Switch 开关触发发布
    const publishResponsePromise = page.waitForResponse((r) => r.url().includes(`/api/resumes/${createdResume.id}/publish`) && r.request().method() === 'POST')
    await page.locator('.ant-popover .ant-switch').click()
    expect((await publishResponsePromise).ok()).toBeTruthy()

    const publicResponsePromise = page.waitForResponse((r) => r.url().includes(`/api/public/${publicSlug}`), { timeout: 35_000 })
    await goto(page, `/resume/${publicSlug}`)
    expect((await publicResponsePromise).ok()).toBeTruthy()
    await expect(page.getByText(`${personName}_简历`)).toBeVisible()
    await expect(page.getByText('由职迹 CareerTrack 生成')).toBeVisible()
    await screenshot(page, '公开简历', '公开链接访问')
  })

  test('创建简历后复制、修改副本并删除副本', async ({ page, request }) => {
    const account = await createUserByApi(request, 'copy')
    const sourceName = `E2E_TEST_复制源_${Date.now()}`
    await createResumeByApi(request, account.token, sourceName)
    await loginByUi(page, account.username, account.password)

    await goto(page, '/resumes')
    await expect(page.getByText(sourceName)).toBeVisible()
    const duplicateResponsePromise = page.waitForResponse((r) => r.url().includes('/duplicate') && r.request().method() === 'POST')
    await page.locator('button').filter({ has: page.locator('[aria-label="copy"]') }).first().click()
    const duplicateResponse = await duplicateResponsePromise
    expect(duplicateResponse.status(), await duplicateResponse.text()).toBe(201)
    const duplicated = await duplicateResponse.json()
    await expect(page.getByText(`${sourceName} (副本)`)).toBeVisible()

    await goto(page, `/resumes/${duplicated.id}/edit`)
    const copyName = `${sourceName}_副本已修改`
    await page.getByPlaceholder('未命名简历').fill(copyName)
    const saveResponsePromise = page.waitForResponse((r) => r.url().includes(`/api/resumes/${duplicated.id}`) && r.request().method() === 'PUT')
    await page.locator('button').filter({ has: page.locator('[aria-label="save"]') }).click()
    expect((await saveResponsePromise).ok()).toBeTruthy()

    await goto(page, '/resumes')
    await expect(page.getByText(copyName)).toBeVisible()
    const deleteCard = page.locator('.ant-card').filter({ hasText: copyName })
    await deleteCard.locator('button').filter({ has: page.locator('[aria-label="delete"]') }).click()
    await expect(page.locator('.ant-modal-confirm-title').filter({ hasText: '确认删除' })).toBeVisible()
    const deleteResponsePromise = page.waitForResponse((r) => r.url().includes(`/api/resumes/${duplicated.id}`) && r.request().method() === 'DELETE')
    await page.locator('.ant-modal-confirm-btns').getByRole('button', { name: /删\s*除/ }).click()
    expect((await deleteResponsePromise).status()).toBe(204)
    await expect(page.getByText(copyName)).toHaveCount(0)
    await screenshot(page, '我的简历', '复制修改删除副本')
  })
})
