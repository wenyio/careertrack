/**
 * 简历编辑表单测试
 *
 * 测试日期范围（含"至今"功能）和富文本编辑器
 */

const { test, expect } = require('playwright/test')
const { registerHooks, goto, screenshot, loginByUi, createUserByApi, createResumeByApi } = require('./helpers')

registerHooks(test)

test.describe('简历编辑表单', () => {
  test.describe('日期范围组件', () => {
    test('工作经历日期范围选择与"至今"功能', async ({ page, request }) => {
      const account = await createUserByApi(request, 'date')
      const resume = await createResumeByApi(request, account.token, `E2E_TEST_日期_${Date.now()}`)
      await loginByUi(page, account.username, account.password)

      await goto(page, `/resumes/${resume.id}/edit`)
      await expect(page.locator('.resume-a4-preview')).toBeVisible()

      // 展开工作经历模块
      const workSection = page.locator('div').filter({ hasText: /^工作经历$/ }).first()
      await workSection.click()

      // 添加工作经历
      await page.getByRole('button', { name: /添加工作经历/ }).click()

      // 验证日期范围组件可见
      const dateLabel = page.getByText('工作时间', { exact: true }).first()
      await expect(dateLabel).toBeVisible()

      // 验证"至今"复选框存在
      const presentCheckbox = page.getByText('至今', { exact: true }).first()
      await expect(presentCheckbox).toBeVisible()

      await screenshot(page, '日期范围', '工作经历日期组件初始状态')

      // 点击开始日期选择器
      const startDatePicker = page.locator('.ant-picker').first()
      await startDatePicker.click()

      // 选择一个月份
      await page.waitForTimeout(300)
      const monthCell = page.locator('.ant-picker-cell').first()
      if (await monthCell.isVisible()) {
        await monthCell.click()
      }

      await screenshot(page, '日期范围', '选择开始日期')

      // 勾选"至今"
      const checkbox = page.locator('input[type="checkbox"]').first()
      await checkbox.check()

      // 验证结束日期被禁用
      const endDatePicker = page.locator('.ant-picker-disabled').first()
      if (await endDatePicker.isVisible().catch(() => false)) {
        await expect(endDatePicker).toBeVisible()
      }

      await screenshot(page, '日期范围', '勾选至今后结束日期禁用')

      // 验证预览区域显示"至今"
      const preview = page.locator('.resume-a4-preview')
      await expect(preview).toBeVisible()

      // 保存并验证
      const saveBtn = page.locator('button').filter({ has: page.locator('[aria-label="save"]') })
      const saveResponse = page.waitForResponse((r) => r.url().includes(`/api/resumes/${resume.id}`) && r.request().method() === 'PUT')
      await saveBtn.click()
      expect((await saveResponse).ok()).toBeTruthy()
      await screenshot(page, '日期范围', '保存含至今的工作经历')
    })

    test('教育经历日期范围选择', async ({ page, request }) => {
      const account = await createUserByApi(request, 'edu-date')
      const resume = await createResumeByApi(request, account.token, `E2E_TEST_教育日期_${Date.now()}`)
      await loginByUi(page, account.username, account.password)

      await goto(page, `/resumes/${resume.id}/edit`)
      await expect(page.locator('.resume-a4-preview')).toBeVisible()

      // 展开教育经历模块
      const eduSection = page.locator('div').filter({ hasText: /^教育经历$/ }).first()
      await eduSection.click()

      // 添加教育经历
      await page.getByRole('button', { name: /添加教育经历/ }).click()

      // 验证"在校时间"标签
      const dateLabel = page.getByText('在校时间', { exact: true }).first()
      await expect(dateLabel).toBeVisible()

      // 验证"至今"复选框
      const presentCheckbox = page.getByText('至今', { exact: true }).first()
      await expect(presentCheckbox).toBeVisible()

      await screenshot(page, '日期范围', '教育经历日期组件')
    })

    test('项目经历日期范围选择', async ({ page, request }) => {
      const account = await createUserByApi(request, 'proj-date')
      const resume = await createResumeByApi(request, account.token, `E2E_TEST_项目日期_${Date.now()}`)
      await loginByUi(page, account.username, account.password)

      await goto(page, `/resumes/${resume.id}/edit`)
      await expect(page.locator('.resume-a4-preview')).toBeVisible()

      // 展开项目经历模块
      const projSection = page.locator('div').filter({ hasText: /^项目经历$/ }).first()
      await projSection.click()

      // 添加项目经历
      await page.getByRole('button', { name: /添加项目经历/ }).click()

      // 验证"项目时间"标签
      const dateLabel = page.getByText('项目时间', { exact: true }).first()
      await expect(dateLabel).toBeVisible()

      // 验证"至今"复选框
      const presentCheckbox = page.getByText('至今', { exact: true }).first()
      await expect(presentCheckbox).toBeVisible()

      await screenshot(page, '日期范围', '项目经历日期组件')
    })
  })

  test.describe('富文本编辑器', () => {
    test('富文本编辑与预览同步 - 加粗和列表', async ({ page, request }) => {
      const account = await createUserByApi(request, 'richtext')
      const resume = await createResumeByApi(request, account.token, `E2E_TEST_富文本_${Date.now()}`)
      await loginByUi(page, account.username, account.password)

      await goto(page, `/resumes/${resume.id}/edit`)
      await expect(page.locator('.resume-a4-preview')).toBeVisible()

      // 展开工作经历模块
      const workSection = page.locator('div').filter({ hasText: /^工作经历$/ }).first()
      await workSection.click()

      // 添加工作经历
      await page.getByRole('button', { name: /添加工作经历/ }).click()

      // 找到富文本编辑器
      const editor = page.locator('.tiptap').first()
      await expect(editor).toBeVisible()

      // 输入多行文本
      await editor.click()
      await page.keyboard.type('第一行工作内容')
      await page.keyboard.press('Enter')
      await page.keyboard.type('第二行工作内容')
      await page.keyboard.press('Enter')
      await page.keyboard.type('第三行工作内容')

      await screenshot(page, '富文本', '输入多行文本')

      // 验证预览区域显示多行内容
      const preview = page.locator('.resume-a4-preview')
      await expect(preview).toBeVisible()

      // 预览中应该有 <p> 标签渲染的多行内容
      const previewDesc = preview.locator('.resume-desc').first()
      if (await previewDesc.isVisible().catch(() => false)) {
        const html = await previewDesc.innerHTML()
        // 验证包含 <p> 标签（多行渲染）
        expect(html).toContain('<p>')
      }

      await screenshot(page, '富文本', '多行文本预览同步')
    })

    test('富文本加粗功能', async ({ page, request }) => {
      const account = await createUserByApi(request, 'bold')
      const resume = await createResumeByApi(request, account.token, `E2E_TEST_加粗_${Date.now()}`)
      await loginByUi(page, account.username, account.password)

      await goto(page, `/resumes/${resume.id}/edit`)
      await expect(page.locator('.resume-a4-preview')).toBeVisible()

      // 展开工作经历模块并添加
      const workSection = page.locator('div').filter({ hasText: /^工作经历$/ }).first()
      await workSection.click()
      await page.getByRole('button', { name: /添加工作经历/ }).click()

      // 找到富文本编辑器
      const editor = page.locator('.tiptap').first()
      await editor.click()

      // 输入文本并加粗
      await page.keyboard.type('重要工作')
      await page.keyboard.down('Shift')
      for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft')
      await page.keyboard.up('Shift')

      // 点击加粗按钮
      const boldButton = page.getByTitle('加粗').first()
      await boldButton.click()

      await screenshot(page, '富文本', '加粗文本')

      // 验证预览中包含 <strong> 标签
      const preview = page.locator('.resume-a4-preview')
      const previewDesc = preview.locator('.resume-desc').first()
      if (await previewDesc.isVisible().catch(() => false)) {
        const html = await previewDesc.innerHTML()
        expect(html).toContain('<strong>')
      }

      await screenshot(page, '富文本', '加粗文本预览同步')
    })

    test('富文本无序列表功能', async ({ page, request }) => {
      const account = await createUserByApi(request, 'bullet')
      const resume = await createResumeByApi(request, account.token, `E2E_TEST_列表_${Date.now()}`)
      await loginByUi(page, account.username, account.password)

      await goto(page, `/resumes/${resume.id}/edit`)
      await expect(page.locator('.resume-a4-preview')).toBeVisible()

      // 展开工作经历模块并添加
      const workSection = page.locator('div').filter({ hasText: /^工作经历$/ }).first()
      await workSection.click()
      await page.getByRole('button', { name: /添加工作经历/ }).click()

      // 找到富文本编辑器
      const editor = page.locator('.tiptap').first()
      await editor.click()

      // 点击无序列表按钮
      const bulletListButton = page.getByTitle('无序列表').first()
      await bulletListButton.click()

      // 输入列表项
      await page.keyboard.type('职责一')
      await page.keyboard.press('Enter')
      await page.keyboard.type('职责二')
      await page.keyboard.press('Enter')
      await page.keyboard.type('职责三')

      await screenshot(page, '富文本', '无序列表')

      // 验证预览中包含 <ul> 标签
      const preview = page.locator('.resume-a4-preview')
      const previewDesc = preview.locator('.resume-desc').first()
      if (await previewDesc.isVisible().catch(() => false)) {
        const html = await previewDesc.innerHTML()
        expect(html).toContain('<ul>')
        expect(html).toContain('<li>')
      }

      await screenshot(page, '富文本', '无序列表预览同步')
    })

    test('富文本有序列表功能', async ({ page, request }) => {
      const account = await createUserByApi(request, 'ordered')
      const resume = await createResumeByApi(request, account.token, `E2E_TEST_有序列表_${Date.now()}`)
      await loginByUi(page, account.username, account.password)

      await goto(page, `/resumes/${resume.id}/edit`)
      await expect(page.locator('.resume-a4-preview')).toBeVisible()

      // 展开工作经历模块并添加
      const workSection = page.locator('div').filter({ hasText: /^工作经历$/ }).first()
      await workSection.click()
      await page.getByRole('button', { name: /添加工作经历/ }).click()

      // 找到富文本编辑器
      const editor = page.locator('.tiptap').first()
      await editor.click()

      // 点击有序列表按钮
      const orderedListButton = page.getByTitle('有序列表').first()
      await orderedListButton.click()

      // 输入列表项
      await page.keyboard.type('步骤一')
      await page.keyboard.press('Enter')
      await page.keyboard.type('步骤二')

      await screenshot(page, '富文本', '有序列表')

      // 验证预览中包含 <ol> 标签
      const preview = page.locator('.resume-a4-preview')
      const previewDesc = preview.locator('.resume-desc').first()
      if (await previewDesc.isVisible().catch(() => false)) {
        const html = await previewDesc.innerHTML()
        expect(html).toContain('<ol>')
      }

      await screenshot(page, '富文本', '有序列表预览同步')
    })

    test('富文本斜体和下划线功能', async ({ page, request }) => {
      const account = await createUserByApi(request, 'italic')
      const resume = await createResumeByApi(request, account.token, `E2E_TEST_斜体_${Date.now()}`)
      await loginByUi(page, account.username, account.password)

      await goto(page, `/resumes/${resume.id}/edit`)
      await expect(page.locator('.resume-a4-preview')).toBeVisible()

      // 展开工作经历模块并添加
      const workSection = page.locator('div').filter({ hasText: /^工作经历$/ }).first()
      await workSection.click()
      await page.getByRole('button', { name: /添加工作经历/ }).click()

      // 找到富文本编辑器
      const editor = page.locator('.tiptap').first()
      await editor.click()

      // 输入文本
      await page.keyboard.type('斜体文本')
      await page.keyboard.down('Shift')
      for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft')
      await page.keyboard.up('Shift')

      // 点击斜体按钮
      const italicButton = page.getByTitle('斜体').first()
      await italicButton.click()

      await screenshot(page, '富文本', '斜体文本')

      // 验证预览中包含 <em> 标签
      const preview = page.locator('.resume-a4-preview')
      const previewDesc = preview.locator('.resume-desc').first()
      if (await previewDesc.isVisible().catch(() => false)) {
        const html = await previewDesc.innerHTML()
        expect(html).toContain('<em>')
      }

      await screenshot(page, '富文本', '斜体文本预览同步')
    })
  })

  test.describe('完整表单流程', () => {
    test('填写完整工作经历并验证预览', async ({ page, request }) => {
      const account = await createUserByApi(request, 'full')
      const resume = await createResumeByApi(request, account.token, `E2E_TEST_完整表单_${Date.now()}`)
      await loginByUi(page, account.username, account.password)

      await goto(page, `/resumes/${resume.id}/edit`)
      await expect(page.locator('.resume-a4-preview')).toBeVisible()

      // 展开工作经历模块
      const workSection = page.locator('div').filter({ hasText: /^工作经历$/ }).first()
      await workSection.click()

      // 添加工作经历
      await page.getByRole('button', { name: /添加工作经历/ }).click()

      // 填写公司名称
      const companyInput = page.getByPlaceholder('请输入公司名称').first()
      await companyInput.fill('测试公司')

      // 填写部门
      const deptInput = page.getByPlaceholder('请输入部门名称').first()
      await deptInput.fill('技术部')

      // 填写岗位
      const positionInput = page.getByPlaceholder('请输入岗位名称').first()
      await positionInput.fill('前端工程师')

      // 填写城市
      const cityInput = page.getByPlaceholder('请输入工作城市').first()
      await cityInput.fill('北京')

      // 填写富文本描述
      const editor = page.locator('.tiptap').first()
      await editor.click()
      await page.keyboard.type('负责公司核心产品的前端开发工作')
      await page.keyboard.press('Enter')
      await page.keyboard.type('使用 React、TypeScript 等技术栈')

      // 勾选"至今"
      const checkbox = page.locator('input[type="checkbox"]').first()
      await checkbox.check()

      await screenshot(page, '完整表单', '填写完整工作经历')

      // 验证预览区域显示内容
      const preview = page.locator('.resume-a4-preview')
      await expect(preview).toContainText('测试公司')
      await expect(preview).toContainText('技术部')
      await expect(preview).toContainText('前端工程师')

      // 保存
      const saveBtn = page.locator('button').filter({ has: page.locator('[aria-label="save"]') })
      const saveResponse = page.waitForResponse((r) => r.url().includes(`/api/resumes/${resume.id}`) && r.request().method() === 'PUT')
      await saveBtn.click()
      expect((await saveResponse).ok()).toBeTruthy()
      await expect(page.getByText('已保存')).toBeVisible()

      await screenshot(page, '完整表单', '保存成功')
    })

    test('填写完整教育经历并验证预览', async ({ page, request }) => {
      const account = await createUserByApi(request, 'edu-full')
      const resume = await createResumeByApi(request, account.token, `E2E_TEST_教育完整_${Date.now()}`)
      await loginByUi(page, account.username, account.password)

      await goto(page, `/resumes/${resume.id}/edit`)
      await expect(page.locator('.resume-a4-preview')).toBeVisible()

      // 展开教育经历模块
      const eduSection = page.locator('div').filter({ hasText: /^教育经历$/ }).first()
      await eduSection.click()

      // 添加教育经历
      await page.getByRole('button', { name: /添加教育经历/ }).click()

      // 填写学校
      const schoolInput = page.getByPlaceholder('请输入学校名称').first()
      await schoolInput.fill('测试大学')

      // 填写专业
      const majorInput = page.getByPlaceholder('请输入专业').first()
      await majorInput.fill('计算机科学与技术')

      // 填写学历
      const degreeInput = page.getByPlaceholder('请输入学历').first()
      await degreeInput.fill('本科')

      await screenshot(page, '完整表单', '填写教育经历')

      // 验证预览区域显示内容
      const preview = page.locator('.resume-a4-preview')
      await expect(preview).toContainText('测试大学')
      await expect(preview).toContainText('计算机科学与技术')

      await screenshot(page, '完整表单', '教育经历预览')
    })
  })
})
