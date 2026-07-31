const { test, expect } = require('playwright/test')
const { createResumeByApi, createUserByApi, goto, loginByUi, registerHooks } = require('./helpers')

registerHooks(test)

test.describe('求职申请跟踪', () => {
  test('会话水合后直接访问和刷新 applications，提供空状态与响应式表单', async ({ page, request }) => {
    const account = await createUserByApi(request, 'applications-session')
    await loginByUi(page, account.username, account.password)
    const resumeRequests = []
    page.on('request', (route) => {
      if (/\/api\/resumes(?:\/|\?)/.test(route.url())) resumeRequests.push(route.url())
    })
    await page.waitForTimeout(300)
    resumeRequests.length = 0
    await goto(page, '/applications')
    await expect(page).toHaveURL(/\/applications$/)
    await expect(page.getByRole('heading', { name: '求职进展' })).toBeVisible()
    await expect(page.getByText('优先处理')).toBeVisible()
    await expect(page.getByText('暂时没有需要处理的申请')).toBeVisible()
    expect(resumeRequests).toEqual([])
    await page.reload()
    await expect(page).toHaveURL(/\/applications$/)
    await expect(page.getByRole('heading', { name: '求职进展' })).toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: '新建申请' }).click()
    await expect(page.getByRole('dialog', { name: /申请工作台/ })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  })

  test('页面创建、快速改状态、职位链接、投递快照和删除', async ({ page, request }) => {
    const account = await createUserByApi(request, 'applications-ui')
    const resume = await createResumeByApi(request, account.token, `E2E_TEST_UI快照_${Date.now()}`)
    const created = await request.post('/api/job-applications', {
      headers: { Cookie: account.token },
      data: { company: 'UI Acme', position: '工程师', status: 'applied', job_url: 'https://example.com/jobs/ui', resume_id: resume.id },
    })
    expect(created.status()).toBe(201)
    await loginByUi(page, account.username, account.password)
    await goto(page, '/applications')
    await page.getByRole('tab', { name: '全部申请' }).click()
    await expect(page.getByText('UI Acme', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: '打开 UI Acme 的职位链接' })).toHaveAttribute('target', '_blank')
    await page.getByRole('button', { name: '查看详情 UI Acme' }).click()
    await page.getByLabel('记录跟进').fill('已联系招聘方，等待安排')
    await page.getByRole('button', { name: '保存跟进' }).click()
    await expect(page.getByText('已联系招聘方，等待安排')).toBeVisible()
    await page.getByRole('button', { name: '查看快照' }).click()
    await expect(page.getByRole('dialog').getByText('UI Acme · 工程师')).toBeVisible()
    await page.keyboard.press('Escape')
    const quickStatus = page.getByLabel('快速修改 UI Acme 的状态')
    await quickStatus.press('ArrowDown')
    await quickStatus.press('ArrowDown')
    await quickStatus.press('ArrowDown')
    await quickStatus.press('Enter')
    await expect(
      page.locator('.ant-card').filter({ hasText: 'UI Acme' }).locator('.ant-tag').getByText('面试中', { exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: '删除 UI Acme 的申请' }).click()
    await page.locator('.ant-popconfirm-buttons .ant-btn-primary').click()
    await expect(page.getByText('还没有求职申请')).toBeVisible()
  })

  test('创建关联当前简历快照、更新、搜索、筛选、刷新与删除', async ({ request }) => {
    const account = await createUserByApi(request, 'applications-flow')
    const headers = { Cookie: account.token }
    const resume = await createResumeByApi(request, account.token, `E2E_TEST_申请简历_${Date.now()}`)
    const created = await request.post('/api/job-applications', {
      headers,
      data: { company: 'E2E Acme', position: 'Frontend Engineer', status: 'applied', resume_id: resume.id, next_action_at: '2026-08-01' },
    })
    expect(created.status(), await created.text()).toBe(201)
    const application = await created.json()
    expect(application.resume_version_id).toBeTruthy()
    expect(application.next_action_at).toBe('2026-08-01')

    const updated = await request.put(`/api/job-applications/${application.id}`, {
      headers,
      data: { expected_revision: application.revision, status: 'interview', applied_at: '2026-07-31' },
    })
    expect(updated.status(), await updated.text()).toBe(200)
    const afterUpdate = await updated.json()
    expect(afterUpdate.status).toBe('interview')
    expect(afterUpdate.revision).toBe(application.revision + 1)

    const followUp = await request.post(`/api/job-applications/${application.id}/events`, {
      headers,
      data: { event_type: 'follow_up', content: '已跟进', next_action_at: '2026-08-02', expected_revision: afterUpdate.revision },
    })
    expect(followUp.status(), await followUp.text()).toBe(201)
    const timeline = await request.get(`/api/job-applications/${application.id}/events`, { headers })
    expect((await timeline.json()).map((event) => event.event_type)).toEqual(expect.arrayContaining(['created', 'status_changed', 'follow_up']))

    const list = await request.get('/api/job-applications?q=acme&status=interview&page=1&pageSize=1', { headers })
    expect(list.status(), await list.text()).toBe(200)
    expect(list.headers()['x-page-size']).toBe('1')
    expect(await list.json()).toHaveLength(1)
    const refreshed = await request.get(`/api/job-applications/${application.id}`, { headers })
    expect((await refreshed.json()).status).toBe('interview')
    const deleted = await request.delete(`/api/job-applications/${application.id}`, { headers })
    expect(deleted.status()).toBe(204)
  })

  test('隔离用户并返回稳定的 revision 冲突和 404 删除语义', async ({ request }) => {
    const owner = await createUserByApi(request, 'applications-owner')
    const other = await createUserByApi(request, 'applications-other')
    const headers = { Cookie: owner.token }
    const created = await request.post('/api/job-applications', { headers, data: { company: '隔离公司', position: '产品经理' } })
    const application = await created.json()
    const foreignGet = await request.get(`/api/job-applications/${application.id}`, { headers: { Cookie: other.token } })
    expect(foreignGet.status()).toBe(404)
    const first = await request.put(`/api/job-applications/${application.id}`, { headers, data: { expected_revision: application.revision, status: 'applied' } })
    expect(first.status()).toBe(200)
    const stale = await request.put(`/api/job-applications/${application.id}`, { headers, data: { expected_revision: application.revision, status: 'screening' } })
    expect(stale.status()).toBe(409)
    const foreignDelete = await request.delete(`/api/job-applications/${application.id}`, { headers: { Cookie: other.token } })
    expect(foreignDelete.status()).toBe(404)
  })
})
