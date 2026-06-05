/**
 * 简历编辑器测试
 */

const { test, expect } = require('playwright/test')
const { registerHooks, goto, screenshot, loginByUi, createUserByApi, createResumeByApi } = require('./helpers')

registerHooks(test)

test.describe('简历编辑器', () => {
  test('模块开关切换与多模块内容编辑', async ({ page, request }) => {
    const account = await createUserByApi(request, 'editor')
    const resume = await createResumeByApi(request, account.token, `E2E_TEST_编辑器_${Date.now()}`)
    await loginByUi(page, account.username, account.password)

    await goto(page, `/resumes/${resume.id}/edit`)
    await expect(page.locator('.resume-a4-preview')).toBeVisible()
    await screenshot(page, '简历编辑', '编辑器初始加载')

    // 关闭教育经历模块 — 模块项是 button，内含 switch
    const eduButton = page.getByRole('button', { name: /🎓.*教育经历|教育经历/ })
    const eduSwitch = eduButton.locator('.ant-switch')
    await eduSwitch.click()
    await screenshot(page, '简历编辑', '关闭教育经历模块')

    // 重新开启
    await eduSwitch.click()
    await screenshot(page, '简历编辑', '重新开启教育经历模块')

    // 编辑专业技能 — 点击侧边栏模块切换到专业技能面板
    await page.getByRole('button', { name: /⚡.*专业技能|专业技能/ }).first().click()
    await page.getByRole('button', { name: /添加专业技能/ }).click()
    const skillInput = page.getByPlaceholder(/JavaScript|React|技能/)
    await skillInput.fill('Playwright 自动化测试')
    await screenshot(page, '简历编辑', '添加专业技能')

    // 保存
    const saveBtn = page.locator('button').filter({ has: page.locator('[aria-label="save"]') })
    const saveResponse = page.waitForResponse((r) => r.url().includes(`/api/resumes/${resume.id}`) && r.request().method() === 'PUT')
    await saveBtn.click()
    expect((await saveResponse).ok()).toBeTruthy()
    await expect(page.getByText('已保存')).toBeVisible()
    await screenshot(page, '简历编辑', '保存成功')
  })

  test('模板切换与预览控制', async ({ page, request }) => {
    const account = await createUserByApi(request, 'tpl')
    const resume = await createResumeByApi(request, account.token, `E2E_TEST_模板_${Date.now()}`)
    await loginByUi(page, account.username, account.password)

    await goto(page, `/resumes/${resume.id}/edit`)

    // 打开模板设置
    const settingsBtn = page.locator('button').filter({ has: page.locator('[aria-label="setting"]') })
    await settingsBtn.click()
    await expect(page.getByText('选择模板')).toBeVisible()
    await screenshot(page, '模板选择', '打开设置面板')

    // 切换模板
    await page.getByText('现代', { exact: true }).click()
    await screenshot(page, '模板选择', '选择现代模板')

    await page.getByText('极简', { exact: true }).click()
    await screenshot(page, '模板选择', '选择极简模板')

    await page.getByText('经典', { exact: true }).click()
    await screenshot(page, '模板选择', '选择经典模板')

    await page.getByText('黑白整齐', { exact: true }).click()
    await screenshot(page, '模板选择', '选择黑白整齐模板')

    // 验证预览区域
    await expect(page.locator('.resume-a4-preview')).toBeVisible()
    await screenshot(page, '预览控制', '预览区域可见')
  })
})
