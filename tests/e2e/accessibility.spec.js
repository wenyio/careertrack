/**
 * 关键交互可访问性基线
 *
 * 不替代完整 WCAG 审计；在不引入外部扫描依赖的前提下，锁定主导航、
 * 编辑器模块与模板选择的语义名称和键盘操作。
 */

const { test, expect } = require('playwright/test')
const {
  registerHooks,
  goto,
  createUserByApi,
  createResumeByApi,
  loginByUi,
} = require('./helpers')

registerHooks(test)

test.describe('关键交互可访问性', () => {
  test('主导航和用户菜单可通过键盘操作', async ({ page, request }) => {
    const account = await createUserByApi(request, 'a11y-nav')
    await loginByUi(page, account.username, account.password)

    const resumeNav = page.getByRole('button', { name: '我的简历' })
    await expect(resumeNav).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('button', { name: '个人信息', exact: true })).toBeVisible()

    const userMenu = page.getByRole('button', { name: /用户菜单/ })
    await userMenu.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menuitem', { name: '账号安全' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'MCP 服务' })).toBeVisible()
  })

  test('编辑器核心操作具备名称并支持键盘激活', async ({ page, request }) => {
    const account = await createUserByApi(request, 'a11y-editor')
    const resume = await createResumeByApi(
      request,
      account.token,
      `E2E_TEST_可访问性_${Date.now()}`,
    )
    await loginByUi(page, account.username, account.password)
    await goto(page, `/resumes/${resume.id}/edit`)

    await expect(page.getByRole('button', { name: '返回简历列表' })).toBeVisible()
    await expect(page.getByRole('button', { name: '保存简历' })).toBeVisible()
    await expect(page.getByRole('button', { name: '拖动教育经历排序' })).toBeVisible()
    await expect(page.getByRole('switch', { name: '显示教育经历' })).toBeVisible()

    const settings = page.getByRole('button', { name: '模板与设置' })
    await settings.focus()
    await page.keyboard.press('Enter')

    const modernTemplate = page.getByRole('button', { name: '选择现代模板' })
    await modernTemplate.focus()
    await page.keyboard.press('Space')
    await expect(modernTemplate).toHaveAttribute('aria-pressed', 'true')
  })
})
