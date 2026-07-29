/**
 * 游客模式 E2E 测试
 *
 * 覆盖：
 * - 未登录用户可以进入游客模式
 * - 游客可以创建本地简历
 * - 游客可以编辑简历，刷新后数据仍存在
 * - 游客模式不显示 MCP 入口
 * - 游客模式不显示发布公开链接入口
 * - 游客模式不能访问管理后台
 * - 除会话探测外，游客模式不发起业务 API 请求
 */

import { test, expect } from 'playwright/test'

test.describe('游客模式', () => {
  test('未登录用户可以从登录页进入游客模式', async ({ page }) => {
    await page.goto('/auth/login')

    // 应该看到游客模式按钮
    const guestButton = page.getByText('以游客身份使用')
    await expect(guestButton).toBeVisible()

    // 点击进入游客模式
    await guestButton.click()

    // 应该跳转到游客简历列表页
    await expect(page).toHaveURL('/resumes')
    await expect(page.getByRole('heading', { name: '我的简历' })).toBeVisible()
    await expect(page.getByText('游客模式 · 数据保存在浏览器本地')).toBeVisible()
  })

  test('游客可以创建本地简历', async ({ page }) => {
    await page.goto('/resumes')

    // 点击新建简历
    await page.getByText('新建简历').click()

    // 输入简历名称
    const modal = page.locator('.ant-modal')
    await expect(modal).toBeVisible()
    await modal.locator('input').fill('测试简历')

    // 点击创建
    await modal.getByRole('button', { name: /创\s*建/ }).click()

    // 应该跳转到编辑页
    await expect(page).toHaveURL(/\/resumes\/.*\/edit/)
    await expect(page.locator('.editor-toolbar input')).toHaveValue('测试简历')
  })

  test('游客编辑简历后刷新数据仍存在', async ({ page }) => {
    await page.goto('/resumes')

    // 创建简历
    await page.getByText('新建简历').click()
    const modal = page.locator('.ant-modal')
    await modal.locator('input').fill('持久化测试')
    await modal.getByRole('button', { name: /创\s*建/ }).click()

    // 等待跳转到编辑页
    await expect(page).toHaveURL(/\/resumes\/.*\/edit/)

    // 获取当前 URL 中的简历 ID
    const url = page.url()
    const resumeId = url.match(/\/resumes\/(.+)\/edit/)?.[1]
    expect(resumeId).toBeTruthy()

    // 修改简历名称
    const nameInput = page.locator('.editor-toolbar input')
    await nameInput.clear()
    await nameInput.fill('修改后的名称')

    // 等待自动保存（3 秒防抖 + 保存时间）
    await page.waitForTimeout(5000)

    // 刷新页面
    await page.reload()

    // 验证数据仍然存在
    await expect(nameInput).toHaveValue('修改后的名称')
  })

  test('游客模式不显示 MCP 入口', async ({ page }) => {
    await page.goto('/resumes')

    // 检查页面中没有 MCP 相关文字
    const pageContent = await page.textContent('body')
    expect(pageContent).not.toContain('MCP 服务')
    expect(pageContent).not.toContain('MCP Key')
  })

  test('游客模式不显示发布公开链接入口', async ({ page }) => {
    // 先创建一个简历进入编辑页
    await page.goto('/resumes')
    await page.getByText('新建简历').click()
    const modal = page.locator('.ant-modal')
    await modal.locator('input').fill('公开测试')
    await modal.getByRole('button', { name: /创\s*建/ }).click()
    await expect(page).toHaveURL(/\/resumes\/.*\/edit/)

    // 检查编辑页中没有公开按钮
    const publicButton = page.getByText('公开')
    await expect(publicButton).not.toBeVisible()
  })

  test('游客模式不能访问管理后台', async ({ page }) => {
    await page.goto('/resumes')

    // 尝试直接访问管理后台
    await page.goto('/admin')

    // 应该被重定向或看不到管理后台内容
    // 由于没有登录态，应该跳转到登录页
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('游客模式除会话探测外不发起业务 API 请求', async ({ page }) => {
    const apiRequests: string[] = []

    // 监听所有网络请求
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/api/')) {
        apiRequests.push(url)
      }
    })

    // 进入游客模式
    await page.goto('/resumes')

    // 创建简历
    await page.getByText('新建简历').click()
    const modal = page.locator('.ant-modal')
    await modal.locator('input').fill('API 测试')
    await modal.getByRole('button', { name: /创\s*建/ }).click()
    await expect(page).toHaveURL(/\/resumes\/.*\/edit/)

    // 等待一段时间确保没有 API 请求
    await page.waitForTimeout(3000)

    // 全局会话恢复会探测 /auth/me；游客数据本身不应调用 profile/resumes 等业务 API。
    expect(apiRequests.every((url) => url.includes('/api/auth/me'))).toBe(true)
  })

  test('游客列表页正确显示简历卡片', async ({ page }) => {
    await page.goto('/resumes')

    // 创建两个简历
    await page.getByText('新建简历').click()
    const modal1 = page.locator('.ant-modal')
    await modal1.locator('input').fill('简历一')
    await modal1.getByRole('button', { name: /创\s*建/ }).click()
    await expect(page).toHaveURL(/\/resumes\/.*\/edit/)

    // 返回列表
    await page.locator('.editor-toolbar button').first().click()
    await expect(page).toHaveURL('/resumes')

    // 创建第二个
    await page.getByText('新建简历').click()
    const modal2 = page.locator('.ant-modal')
    await modal2.locator('input').fill('简历二')
    await modal2.getByRole('button', { name: /创\s*建/ }).click()
    await expect(page).toHaveURL(/\/resumes\/.*\/edit/)

    // 返回列表
    await page.locator('.editor-toolbar button').first().click()
    await expect(page).toHaveURL('/resumes')

    // 应该看到两个简历卡片
    await expect(page.getByText('简历一')).toBeVisible()
    await expect(page.getByText('简历二')).toBeVisible()
  })

  test('游客可以删除简历', async ({ page }) => {
    await page.goto('/resumes')

    // 创建简历
    await page.getByText('新建简历').click()
    const modal = page.locator('.ant-modal')
    await modal.locator('input').fill('待删除')
    await modal.getByRole('button', { name: /创\s*建/ }).click()
    await expect(page).toHaveURL(/\/resumes\/.*\/edit/)

    // 返回列表
    await page.locator('.editor-toolbar button').first().click()
    await expect(page).toHaveURL('/resumes')

    // 点击删除按钮
    await page.getByText('待删除').hover()
    const deleteButton = page.locator('.ant-card').getByRole('button').filter({ has: page.locator('.anticon-delete') })
    await deleteButton.click()

    // 确认删除
    const confirmModal = page.locator('.ant-modal-confirm')
    await confirmModal.getByRole('button', { name: /删\s*除/ }).click()

    // 验证简历已删除
    await expect(page.getByText('待删除')).not.toBeVisible()
  })
})
