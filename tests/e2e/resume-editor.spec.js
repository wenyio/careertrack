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

    // 关闭教育经历模块
    const eduSwitch = page.getByRole('switch', { name: '显示教育经历' })
    await eduSwitch.click()
    await screenshot(page, '简历编辑', '关闭教育经历模块')

    // 重新开启
    await eduSwitch.click()
    await screenshot(page, '简历编辑', '重新开启教育经历模块')

    // 编辑专业技能 — 点击侧边栏模块切换到专业技能面板
    await page.locator('[data-module="skills"] > button').click()
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

    // 预览配置支持连续行距，并与字号一同持久化。
    const preview = page.locator('.resume-a4-preview')
    const fontSize = page.getByLabel('预览字号')
    const lineHeight = page.getByLabel('预览行距')
    await fontSize.selectOption('18')
    await lineHeight.fill('1.7')

    const saveBtn = page.locator('button').filter({
      has: page.locator('[aria-label="save"]'),
    })
    const saveResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/resumes/${resume.id}`)
        && response.request().method() === 'PUT',
    )
    await saveBtn.click()
    expect((await saveResponse).ok()).toBeTruthy()

    await expect.poll(async () => {
      const savedResponse = await request.get(`/api/resumes/${resume.id}`, {
        headers: { Cookie: account.token },
      })
      if (!savedResponse.ok()) return null
      const saved = await savedResponse.json()
      return saved.content.preview_config
    }).toEqual({
      fontSize: 18,
      lineHeight: 1.7,
    })

    await page.reload()
    await expect(fontSize).toHaveValue('18')
    await expect(lineHeight).toHaveValue('1.7')

    // 缩放是预览面板自身的局部状态，不触发简历保存。
    await page.getByRole('button', { name: '放大预览' }).click()
    await expect(preview).toHaveAttribute('style', /scale\(0\.9\)/)
    await page.getByRole('button', { name: '重置预览缩放' }).click()
    await expect(preview).toHaveAttribute('style', /scale\(0\.8\)/)

    await expect(preview).toBeVisible()
    await screenshot(page, '预览控制', '预览区域可见')
  })

  test('基本信息支持手动输入状态和薪资', async ({ page, request }) => {
    const account = await createUserByApi(request, 'resbasic')
    const resume = await createResumeByApi(request, account.token, `E2E_TEST_手输薪资_${Date.now()}`)
    await loginByUi(page, account.username, account.password)

    await goto(page, `/resumes/${resume.id}/edit`)
    await page.locator('.ant-form-item').filter({ hasText: '当前状态' }).getByRole('combobox').fill('在职-考虑机会')
    await page.locator('.ant-form-item').filter({ hasText: '期望薪资' }).getByRole('combobox').fill('30-40K·13薪')

    const saveButton = page.locator('button').filter({
      has: page.locator('[aria-label="save"]'),
    })
    const saveResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/resumes/${resume.id}`)
        && response.request().method() === 'PUT',
    )
    await saveButton.click()
    expect((await saveResponse).ok()).toBeTruthy()

    await expect.poll(async () => {
      const savedResponse = await request.get(`/api/resumes/${resume.id}`, {
        headers: { Cookie: account.token },
      })
      if (!savedResponse.ok()) return null
      const saved = await savedResponse.json()
      return saved.content.basic_info?.job_intention
    }).toMatchObject({
      current_status: '在职-考虑机会',
      expected_salary: '30-40K·13薪',
    })
  })

  test('基本信息区随英文语言环境渲染 label、placeholder 和下拉选项', async ({ page, request }) => {
    const account = await createUserByApi(request, 'i18n')
    const resume = await createResumeByApi(request, account.token, `E2E_TEST_I18N_${Date.now()}`)
    await loginByUi(page, account.username, account.password)

    await goto(page, '/resumes')
    await page.getByRole('button', { name: '语言' }).click()
    await page.getByRole('menuitem', { name: 'English' }).click()

    await goto(page, `/resumes/${resume.id}/edit`)
    await expect(page.locator('.ant-card-head-title').getByText('Basic Info', { exact: true })).toBeVisible()
    await expect(page.locator('.ant-form-item-label').getByText('Name', { exact: true })).toBeVisible()
    await expect(page.getByPlaceholder('Enter name')).toBeVisible()
    await expect(page.getByText('Job Intention', { exact: true })).toBeVisible()
    await expect(page.locator('.ant-form-item').filter({ hasText: 'Current Status' }))
      .toContainText('Select or enter current status')

    const statusField = page.locator('.ant-form-item').filter({ hasText: 'Current Status' }).getByRole('combobox')
    await statusField.click()
    await expect(page.getByText('Employed - Open to Opportunities')).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Add Highest Education field' }).click()
    const educationField = page.locator('.ant-form-item').filter({ hasText: 'Highest Education' }).getByRole('combobox')
    await educationField.click()
    await expect(page.getByText('Doctorate')).toBeVisible()
    await page.keyboard.press('Escape')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/基本信息|当前状态|请输入姓名|最高学历/)
  })

  test('额外字段隐藏时保留字段值和头像布局配置', async ({ page, request }) => {
    const account = await createUserByApi(request, 'basicinfo')
    const resume = await createResumeByApi(
      request,
      account.token,
      `E2E_TEST_基本信息_${Date.now()}`,
    )
    await loginByUi(page, account.username, account.password)
    await goto(page, `/resumes/${resume.id}/edit`)

    const avatarLeft = page.getByRole('switch', { name: '头像靠左' })
    await avatarLeft.click()
    await expect(avatarLeft).toBeChecked()

    // “更多字段”标签可通过键盘添加，不依赖鼠标。
    const addCity = page.getByRole('button', { name: '添加现居城市字段' })
    await addCity.focus()
    await addCity.press('Enter')
    const cityInput = page.getByPlaceholder('请输入现居城市')
    await cityInput.fill('上海')

    await page.getByRole('button', { name: '移除现居城市字段' }).click()
    await expect(cityInput).toBeHidden()
    await expect(avatarLeft).toBeChecked()

    // 隐藏只改变展示配置，再次添加应恢复原值。
    await page.getByRole('button', { name: '添加现居城市字段' }).click()
    await expect(cityInput).toHaveValue('上海')
    await page.getByRole('button', { name: '移除现居城市字段' }).click()

    const saveButton = page.locator('button').filter({
      has: page.locator('[aria-label="save"]'),
    })
    const saveResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/resumes/${resume.id}`)
        && response.request().method() === 'PUT',
    )
    await saveButton.click()
    expect((await saveResponse).ok()).toBeTruthy()

    const savedResponse = await request.get(`/api/resumes/${resume.id}`, {
      headers: { Cookie: account.token },
    })
    expect(savedResponse.status()).toBe(200)
    const saved = await savedResponse.json()
    expect(saved.content.basic_info_display).toMatchObject({
      avatar_left: true,
      visible_extra_fields: [],
    })
    expect(saved.content.basic_info.other.city).toBe('上海')
    await screenshot(page, '基本信息', '额外字段隐藏保留配置')
  })
})
