const { test, expect } = require('playwright/test')
const { registerHooks, goto, loginByUi, createUserByApi, createResumeByApi } = require('./helpers')

registerHooks(test)

test.describe('简历版本历史', () => {
  test('创建手动版本、查看旧版本并恢复为新的 revision', async ({ page, request }) => {
    const account = await createUserByApi(request, 'history')
    const originalName = `E2E_TEST_历史原版_${Date.now()}`
    const changedName = `${originalName}_修改后`
    const resume = await createResumeByApi(request, account.token, originalName)
    await loginByUi(page, account.username, account.password)
    await goto(page, `/resumes/${resume.id}/edit`)

    // The historical preview renders resume content, so store an identifiable
    // content field before taking the manual snapshot.
    await page.getByPlaceholder('请输入姓名').first().fill(originalName)
    const initialSave = page.waitForResponse((response) =>
      response.url().includes(`/api/resumes/${resume.id}`) && response.request().method() === 'PUT',
    )
    await page.getByRole('button', { name: '保存简历' }).click()
    expect((await initialSave).ok()).toBeTruthy()

    await page.getByRole('button', { name: '版本历史' }).click()
    const drawer = page.getByRole('dialog', { name: '版本历史' })
    await drawer.getByRole('button', { name: '创建手动版本' }).click()
    await expect(drawer.getByText('手动版本')).toBeVisible()

    await drawer.getByRole('button', { name: '关闭' }).click()
    await page.getByPlaceholder('未命名简历').fill(changedName)
    const save = page.waitForResponse((response) =>
      response.url().includes(`/api/resumes/${resume.id}`) && response.request().method() === 'PUT',
    )
    await page.getByRole('button', { name: '保存简历' }).click()
    expect((await save).ok()).toBeTruthy()

    await page.getByRole('button', { name: '版本历史' }).click()
    const manualItem = drawer.locator('.ant-list-item').filter({ hasText: '手动版本' })
    await manualItem.getByRole('button', { name: '查看' }).click()
    await expect(page.getByRole('dialog', { name: /版本预览/ })).toBeVisible()
    await expect(page.getByLabel('历史版本只读预览')).toContainText(originalName)
    await page.getByRole('button', { name: '关闭版本预览' }).click()

    const restoreResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/resumes/${resume.id}/versions/`)
      && response.url().endsWith('/restore')
      && response.request().method() === 'POST',
    )
    await manualItem.getByRole('button', { name: '恢复' }).click()
    const confirmation = page.getByRole('dialog', { name: '确认恢复此版本？' })
    await confirmation.getByRole('button', { name: '确认恢复' }).click()
    expect((await restoreResponse).status()).toBe(200)
    await expect(page.getByPlaceholder('未命名简历')).toHaveValue(originalName)

    await page.reload()
    await expect(page.getByPlaceholder('未命名简历')).toHaveValue(originalName)
    const restored = await request.get(`/api/resumes/${resume.id}`, { headers: { Cookie: account.token } })
    expect(restored.status()).toBe(200)
    expect((await restored.json()).revision).toBeGreaterThan(resume.revision)
  })

  test('版本 API validates inputs, hides foreign versions, and returns conflict for stale restore', async ({ request }) => {
    const owner = await createUserByApi(request, 'history-owner')
    const other = await createUserByApi(request, 'history-other')
    const resume = await createResumeByApi(request, owner.token, `E2E_TEST_历史权限_${Date.now()}`)
    const invalid = await request.get('/api/resumes/not-a-uuid/versions', { headers: { Cookie: owner.token } })
    expect(invalid.status()).toBe(400)

    const created = await request.post(`/api/resumes/${resume.id}/versions`, { headers: { Cookie: owner.token }, data: { label: '初版' } })
    expect(created.status()).toBe(201)
    const version = await created.json()
    const foreign = await request.get(`/api/resumes/${resume.id}/versions/${version.id}`, { headers: { Cookie: other.token } })
    expect(foreign.status()).toBe(404)

    const update = await request.put(`/api/resumes/${resume.id}`, {
      headers: { Cookie: owner.token },
      data: { name: '已更新', revision: resume.revision },
    })
    expect(update.status()).toBe(200)
    const staleRestore = await request.post(`/api/resumes/${resume.id}/versions/${version.id}/restore`, {
      headers: { Cookie: owner.token },
      data: { expected_revision: resume.revision },
    })
    expect(staleRestore.status()).toBe(409)
  })
})
