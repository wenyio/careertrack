const { test, expect } = require('playwright/test')
const { registerHooks, goto, loginByUi, createUserByApi, createResumeByApi } = require('./helpers')

registerHooks(test)

function manualVersionRow(drawer, label) {
  return drawer.getByRole('listitem').filter({ hasText: label })
}

test.describe('简历版本历史', () => {
  test('立即保存未落库内容后创建版本、查看并恢复为新的 revision', async ({ page, request }) => {
    const account = await createUserByApi(request, 'history')
    const originalName = `E2E_TEST_历史原版_${Date.now()}`
    const unsavedName = `${originalName}_立即保存`
    const changedName = `${originalName}_修改后`
    const resume = await createResumeByApi(request, account.token, originalName)
    await loginByUi(page, account.username, account.password)
    await goto(page, `/resumes/${resume.id}/edit`)

    // Do not use the main save control or wait for debounce: version creation
    // must drain the same editor save queue before it snapshots the resume.
    await page.getByPlaceholder('请输入姓名').first().fill(unsavedName)
    await page.getByRole('button', { name: '版本历史' }).click()
    const drawer = page.getByRole('dialog', { name: '版本历史' })
    const createResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/resumes/${resume.id}/versions`)
      && response.request().method() === 'POST',
    )
    await drawer.getByRole('button', { name: '创建手动版本' }).click()
    expect((await createResponse).status()).toBe(201)

    const manualItem = manualVersionRow(drawer, '手动版本')
    await expect(manualItem).toBeVisible()
    await manualItem.getByRole('button', { name: /^查看版本 revision/ }).click()
    await expect(page.getByRole('dialog', { name: /版本预览/ })).toBeVisible()
    await expect(page.getByLabel('历史版本只读预览')).toContainText(unsavedName)
    await page.getByRole('button', { name: '关闭版本预览' }).click()

    await drawer.getByRole('button', { name: '关闭' }).click()
    await page.getByPlaceholder('请输入姓名').first().fill(changedName)
    const save = page.waitForResponse((response) =>
      response.url().includes(`/api/resumes/${resume.id}`) && response.request().method() === 'PUT',
    )
    await page.getByRole('button', { name: '保存简历' }).click()
    const saved = await save
    expect(saved.ok()).toBeTruthy()
    const revisionBeforeRestore = (await saved.json()).revision

    await page.getByRole('button', { name: '版本历史' }).click()
    const restoredItem = manualVersionRow(drawer, '手动版本')
    const restoreResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/resumes/${resume.id}/versions/`)
      && response.url().endsWith('/restore')
      && response.request().method() === 'POST',
    )
    await restoredItem.getByRole('button', { name: /^恢复版本 revision/ }).click()
    const confirmation = page.getByRole('dialog', { name: '确认恢复此版本？' })
    await confirmation.getByRole('button', { name: '确认恢复' }).click()
    const restoredResponse = await restoreResponse
    expect(restoredResponse.status()).toBe(200)
    expect((await restoredResponse.json()).revision).toBeGreaterThan(revisionBeforeRestore)
    await expect(page.getByPlaceholder('请输入姓名').first()).toHaveValue(unsavedName)

    await page.reload()
    await expect(page.getByPlaceholder('请输入姓名').first()).toHaveValue(unsavedName)
  })

  test('版本 API validates inputs, hides foreign versions, and rejects stale manual creation and restore', async ({ request }) => {
    const owner = await createUserByApi(request, 'history-owner')
    const other = await createUserByApi(request, 'history-other')
    const resume = await createResumeByApi(request, owner.token, `E2E_TEST_历史权限_${Date.now()}`)
    const headers = { Cookie: owner.token }
    const invalid = await request.get('/api/resumes/not-a-uuid/versions', { headers })
    expect(invalid.status()).toBe(400)
    const missingExpectedRevision = await request.post(`/api/resumes/${resume.id}/versions`, {
      headers,
      data: { label: '缺少 revision' },
    })
    expect(missingExpectedRevision.status()).toBe(400)

    const created = await request.post(`/api/resumes/${resume.id}/versions`, {
      headers,
      data: { label: '初版', expected_revision: resume.revision },
    })
    expect(created.status()).toBe(201)
    const version = await created.json()
    const foreign = await request.get(`/api/resumes/${resume.id}/versions/${version.id}`, { headers: { Cookie: other.token } })
    expect(foreign.status()).toBe(404)

    const update = await request.put(`/api/resumes/${resume.id}`, {
      headers,
      data: { name: '已更新', revision: resume.revision },
    })
    expect(update.status()).toBe(200)
    const staleCreate = await request.post(`/api/resumes/${resume.id}/versions`, {
      headers,
      data: { label: '过期版本', expected_revision: resume.revision },
    })
    expect(staleCreate.status()).toBe(409)
    const staleRestore = await request.post(`/api/resumes/${resume.id}/versions/${version.id}/restore`, {
      headers,
      data: { expected_revision: resume.revision },
    })
    expect(staleRestore.status()).toBe(409)
  })

  test('lists more than twenty versions and views and restores one from the second page', async ({ page, request }) => {
    const account = await createUserByApi(request, 'history-pagination')
    const resume = await createResumeByApi(request, account.token, `E2E_TEST_分页_${Date.now()}`)
    const headers = { Cookie: account.token }
    let revision = resume.revision

    for (let index = 1; index <= 24; index++) {
      const update = await request.put(`/api/resumes/${resume.id}`, {
        headers,
        data: { name: `分页内容 ${index}`, revision },
      })
      expect(update.status()).toBe(200)
      revision = (await update.json()).revision
      const version = await request.post(`/api/resumes/${resume.id}/versions`, {
        headers,
        data: { label: `分页版本 ${index}`, expected_revision: revision },
      })
      expect(version.status()).toBe(201)
    }

    const firstPage = await request.get(`/api/resumes/${resume.id}/versions?page=1&page_size=20`, { headers })
    expect(firstPage.status()).toBe(200)
    const firstPageItems = await firstPage.json()
    expect(firstPageItems).toHaveLength(20)
    expect(firstPageItems[0]).not.toHaveProperty('snapshot')
    const secondPage = await request.get(`/api/resumes/${resume.id}/versions?page=2&page_size=20`, { headers })
    expect(secondPage.status()).toBe(200)
    const secondPageItems = await secondPage.json()
    const target = secondPageItems.find((item) => item.source === 'manual')
    expect(target).toBeTruthy()

    await loginByUi(page, account.username, account.password)
    await goto(page, `/resumes/${resume.id}/edit`)
    await page.getByRole('button', { name: '版本历史' }).click()
    const drawer = page.getByRole('dialog', { name: '版本历史' })
    await drawer.getByRole('navigation', { name: '版本历史分页' }).getByRole('listitem', { name: '2', exact: true }).click()
    const targetRow = manualVersionRow(drawer, target.label)
    await expect(targetRow).toBeVisible()

    await targetRow.getByRole('button', { name: new RegExp(`^查看版本 revision ${target.revision}`) }).click()
    await expect(page.getByLabel('历史版本只读预览')).toBeVisible()
    await page.getByRole('button', { name: '关闭版本预览' }).click()

    const restoreResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/resumes/${resume.id}/versions/`)
      && response.url().endsWith('/restore')
      && response.request().method() === 'POST',
    )
    await targetRow.getByRole('button', { name: new RegExp(`^恢复版本 revision ${target.revision}`) }).click()
    await page.getByRole('dialog', { name: '确认恢复此版本？' }).getByRole('button', { name: '确认恢复' }).click()
    const restored = await restoreResponse
    expect(restored.status()).toBe(200)
    const restoredBody = await restored.json()
    expect(restoredBody.revision).toBeGreaterThan(revision)
    await expect(page.getByPlaceholder('未命名简历')).toHaveValue(`分页内容 ${target.revision - 1}`)

    await page.reload()
    await expect(page.getByPlaceholder('未命名简历')).toHaveValue(`分页内容 ${target.revision - 1}`)
  })
})
