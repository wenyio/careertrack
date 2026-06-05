/**
 * Profile / Resume 隔离测试
 *
 * 验证：
 * - 修改 profile 不影响已有简历
 * - 打开已有简历不触发非用户行为的 PUT 保存
 * - 简历保存内容与公开页展示内容一致
 * - 从个人信息导入后，编辑导入项不影响 profile
 */

const { test, expect } = require('playwright/test')
const { registerHooks, goto, screenshot, loginByUi, createUserByApi, createResumeByApi } = require('./helpers')

registerHooks(test)

test.describe('Profile / Resume 数据隔离', () => {
  test('修改 profile 后已有简历内容不变', async ({ page, request }) => {
    const account = await createUserByApi(request, 'isolation')
    await loginByUi(page, account.username, account.password)

    // 1. 设置 profile
    await goto(page, '/settings/profile')
    await page.getByPlaceholder('请输入姓名').fill('Profile_原始姓名')
    await page.getByPlaceholder('请输入电话').fill('13800000001')
    await page.getByPlaceholder('请输入邮箱').fill('profile-original@test.com')
    const profileSave1 = page.waitForResponse((r) => r.url().includes('/api/profile') && r.request().method() === 'PUT')
    await page.getByRole('button', { name: /保存更改/ }).click()
    expect((await profileSave1).ok()).toBeTruthy()

    // 2. 创建简历并编辑保存
    await goto(page, '/resumes')
    await page.getByRole('button', { name: /新建简历/ }).click()
    const createModal = page.getByRole('dialog', { name: '新建简历' })
    await expect(createModal).toBeVisible()
    await createModal.getByPlaceholder(/前端工程师/).fill('隔离测试简历')
    const createResp = page.waitForResponse((r) => r.url().endsWith('/api/resumes') && r.request().method() === 'POST')
    await createModal.getByRole('button', { name: /创\s*建/ }).click()
    const created = await (await createResp).json()
    await expect(page).toHaveURL(new RegExp(`/resumes/${created.id}/edit`))

    // 编辑简历姓名（不同于 profile）
    await page.getByPlaceholder('请输入姓名').first().fill('简历_独立姓名')
    await page.getByPlaceholder('请输入电话').first().fill('13900000001')
    const saveResp = page.waitForResponse((r) => r.url().includes(`/api/resumes/${created.id}`) && r.request().method() === 'PUT')
    await page.locator('button').filter({ has: page.locator('[aria-label="save"]') }).click()
    expect((await saveResp).ok()).toBeTruthy()
    await expect(page.getByText('已保存')).toBeVisible()

    // 3. 修改 profile
    await goto(page, '/settings/profile')
    await page.getByPlaceholder('请输入姓名').fill('Profile_新姓名')
    await page.getByPlaceholder('请输入电话').fill('13800000002')
    const profileSave2 = page.waitForResponse((r) => r.url().includes('/api/profile') && r.request().method() === 'PUT')
    await page.getByRole('button', { name: /保存更改/ }).click()
    expect((await profileSave2).ok()).toBeTruthy()

    // 4. 重新打开简历，验证内容未被 profile 覆盖
    await goto(page, `/resumes/${created.id}/edit`)
    await page.waitForTimeout(2000) // 等待可能的自动保存完成
    await expect(page.getByPlaceholder('请输入姓名').first()).toHaveValue('简历_独立姓名')
    await expect(page.getByPlaceholder('请输入电话').first()).toHaveValue('13900000001')
    await screenshot(page, '隔离测试', '修改profile后简历内容不变')
  })

  test('打开已有简历不触发非用户行为的 PUT 保存', async ({ page, request }) => {
    const account = await createUserByApi(request, 'noput')
    const resume = await createResumeByApi(request, account.token, `不自动保存_${Date.now()}`)
    await loginByUi(page, account.username, account.password)

    // 先打开编辑页，手动保存一些内容
    await goto(page, `/resumes/${resume.id}/edit`)
    await page.getByPlaceholder('请输入姓名').first().fill('手动保存测试')
    const saveResp = page.waitForResponse((r) => r.url().includes(`/api/resumes/${resume.id}`) && r.request().method() === 'PUT')
    await page.locator('button').filter({ has: page.locator('[aria-label="save"]') }).click()
    expect((await saveResp).ok()).toBeTruthy()
    await expect(page.getByText('已保存')).toBeVisible()

    // 重新打开简历，监听 PUT 请求
    const putRequests = []
    page.on('request', (req) => {
      if (req.url().includes(`/api/resumes/${resume.id}`) && req.method() === 'PUT') {
        putRequests.push(req)
      }
    })

    await goto(page, `/resumes/${resume.id}/edit`)
    // 等待足够时间让可能的自动保存 effect 触发
    await page.waitForTimeout(5000)

    // 验证没有因 profile 加载而触发 PUT
    expect(putRequests.length).toBe(0)
    await screenshot(page, '隔离测试', '打开简历不触发PUT')
  })

  test('新建简历自动继承 profile 快照，公开页有内容', async ({ page, request }) => {
    const account = await createUserByApi(request, 'snapshot')
    await loginByUi(page, account.username, account.password)

    // 1. 设置 profile
    await goto(page, '/settings/profile')
    await page.getByPlaceholder('请输入姓名').fill('快照测试用户')
    await page.getByPlaceholder('请输入电话').fill('13800000099')
    await page.getByPlaceholder('请输入邮箱').fill('snapshot@test.com')
    const profileSave = page.waitForResponse((r) => r.url().includes('/api/profile') && r.request().method() === 'PUT')
    await page.getByRole('button', { name: /保存更改/ }).click()
    expect((await profileSave).ok()).toBeTruthy()

    // 2. 创建简历（不编辑内容，直接发布）
    await goto(page, '/resumes')
    await page.getByRole('button', { name: /新建简历/ }).click()
    const createModal = page.getByRole('dialog', { name: '新建简历' })
    await expect(createModal).toBeVisible()
    await createModal.getByPlaceholder(/前端工程师/).fill('快照测试简历')
    const createResp = page.waitForResponse((r) => r.url().endsWith('/api/resumes') && r.request().method() === 'POST')
    await createModal.getByRole('button', { name: /创\s*建/ }).click()
    const created = await (await createResp).json()
    await expect(page).toHaveURL(new RegExp(`/resumes/${created.id}/edit`))

    // 验证编辑器已加载 profile 数据（姓名字段应有值）
    await expect(page.getByPlaceholder('请输入姓名').first()).toHaveValue('快照测试用户')

    // 3. 不做任何编辑，直接发布
    const publicSlug = `snapshot-${Date.now()}`
    await page.getByRole('button', { name: /公开/ }).click()
    await expect(page.getByText('公开简历')).toBeVisible()
    const popoverInputs = page.locator('.ant-popover input')
    await popoverInputs.nth(1).fill(publicSlug)
    const publishResp = page.waitForResponse((r) => r.url().includes(`/api/resumes/${created.id}/publish`) && r.request().method() === 'POST')
    await page.locator('.ant-popover .ant-switch').click()
    expect((await publishResp).ok()).toBeTruthy()

    // 4. 访问公开页，验证 profile 快照数据已显示
    const publicPageResp = page.waitForResponse((r) => r.url().includes(`/api/public/${publicSlug}`))
    await goto(page, `/resume/${publicSlug}`)
    expect((await publicPageResp).ok()).toBeTruthy()
    await expect(page.getByText('快照测试用户')).toBeVisible()
    await screenshot(page, '隔离测试', '新建简历公开页有内容')
  })

  test('取消勾选后创建空白简历', async ({ page, request }) => {
    const account = await createUserByApi(request, 'blank')
    await loginByUi(page, account.username, account.password)

    // 1. 设置 profile
    await goto(page, '/settings/profile')
    await page.getByPlaceholder('请输入姓名').fill('空白简历测试用户')
    await page.getByPlaceholder('请输入电话').fill('13800000088')
    const profileSave = page.waitForResponse((r) => r.url().includes('/api/profile') && r.request().method() === 'PUT')
    await page.getByRole('button', { name: /保存更改/ }).click()
    expect((await profileSave).ok()).toBeTruthy()

    // 2. 创建简历，取消勾选"从个人信息初始化简历"
    await goto(page, '/resumes')
    await page.getByRole('button', { name: /新建简历/ }).click()
    const createModal = page.getByRole('dialog', { name: '新建简历' })
    await expect(createModal).toBeVisible()
    await createModal.getByPlaceholder(/前端工程师/).fill('空白测试简历')
    // 取消勾选
    await createModal.getByText('从个人信息初始化简历').click()
    const createResp = page.waitForResponse((r) => r.url().endsWith('/api/resumes') && r.request().method() === 'POST')
    await createModal.getByRole('button', { name: /创\s*建/ }).click()
    const created = await (await createResp).json()
    await expect(page).toHaveURL(new RegExp(`/resumes/${created.id}/edit`))

    // 3. 验证编辑器未加载 profile 数据（姓名字段应为空）
    await expect(page.getByPlaceholder('请输入姓名').first()).toHaveValue('')
    await screenshot(page, '隔离测试', '空白简历无profile数据')
  })

  test('简历保存内容与公开页展示内容一致', async ({ page, request }) => {
    const account = await createUserByApi(request, 'pubconsist')
    await loginByUi(page, account.username, account.password)

    // 设置 profile
    await goto(page, '/settings/profile')
    await page.getByPlaceholder('请输入姓名').fill('公开页一致性测试')
    await page.getByPlaceholder('请输入邮箱').fill('consistency@test.com')
    const profileSave = page.waitForResponse((r) => r.url().includes('/api/profile') && r.request().method() === 'PUT')
    await page.getByRole('button', { name: /保存更改/ }).click()
    expect((await profileSave).ok()).toBeTruthy()

    // 创建简历并编辑
    await goto(page, '/resumes')
    await page.getByRole('button', { name: /新建简历/ }).click()
    const createModal = page.getByRole('dialog', { name: '新建简历' })
    await expect(createModal).toBeVisible()
    await createModal.getByPlaceholder(/前端工程师/).fill('一致性测试简历')
    const createResp = page.waitForResponse((r) => r.url().endsWith('/api/resumes') && r.request().method() === 'POST')
    await createModal.getByRole('button', { name: /创\s*建/ }).click()
    const created = await (await createResp).json()

    // 编辑简历姓名
    await page.getByPlaceholder('请输入姓名').first().fill('公开页_简历姓名')
    const saveResp = page.waitForResponse((r) => r.url().includes(`/api/resumes/${created.id}`) && r.request().method() === 'PUT')
    await page.locator('button').filter({ has: page.locator('[aria-label="save"]') }).click()
    expect((await saveResp).ok()).toBeTruthy()

    // 发布简历
    const publicSlug = `consistency-${Date.now()}`
    await page.getByRole('button', { name: /公开/ }).click()
    await expect(page.getByText('公开简历')).toBeVisible()
    const popoverInputs = page.locator('.ant-popover input')
    await popoverInputs.nth(1).fill(publicSlug)
    const publishResp = page.waitForResponse((r) => r.url().includes(`/api/resumes/${created.id}/publish`) && r.request().method() === 'POST')
    await page.locator('.ant-popover .ant-switch').click()
    expect((await publishResp).ok()).toBeTruthy()

    // 访问公开页，验证显示的是保存的内容
    const publicPageResp = page.waitForResponse((r) => r.url().includes(`/api/public/${publicSlug}`))
    await goto(page, `/resume/${publicSlug}`)
    expect((await publicPageResp).ok()).toBeTruthy()
    await expect(page.getByText('公开页_简历姓名')).toBeVisible()
    await screenshot(page, '隔离测试', '公开页显示保存快照')
  })
})
