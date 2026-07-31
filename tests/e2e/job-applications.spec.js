const { test, expect } = require('playwright/test')
const { createResumeByApi, createUserByApi, goto, loginByUi, registerHooks } = require('./helpers')

registerHooks(test)

function appDateOnlyAfter(days) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = Number(parts.find((part) => part.type === 'year').value)
  const month = Number(parts.find((part) => part.type === 'month').value)
  const day = Number(parts.find((part) => part.type === 'day').value)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

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
    await expect(page.getByText('暂无待办，当前申请都已安排妥当')).toBeVisible()
    expect(resumeRequests).toEqual([])
    await page.reload()
    await expect(page).toHaveURL(/\/applications$/)
    await expect(page.getByRole('heading', { name: '求职进展' })).toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: '新建申请' }).click()
    await expect(page.getByRole('dialog', { name: /新建申请/ })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  })

  test('优先处理按真实分桶决定按钮和记录器默认行为', async ({ page, request }) => {
    const account = await createUserByApi(request, 'app-priority')
    const headers = { Cookie: account.token }
    const earlierOverdue = appDateOnlyAfter(-2)
    const yesterday = appDateOnlyAfter(-1)
    const today = appDateOnlyAfter(0)
    const tomorrow = appDateOnlyAfter(1)
    const later = appDateOnlyAfter(2)
    const records = [
      { company: '逾期更早公司', position: '工程师', status: 'applied', next_action_at: earlierOverdue },
      { company: '逾期较晚公司', position: '工程师', status: 'applied', next_action_at: yesterday },
      { company: '今日面试公司', position: '工程师', status: 'interview', next_action_at: today },
      { company: '未来普通公司', position: '工程师', status: 'applied', next_action_at: tomorrow },
      { company: '未来面试公司', position: '工程师', status: 'interview', next_action_at: later },
      { company: '待规划公司', position: '工程师', status: 'applied' },
    ]
    for (const data of records) {
      const created = await request.post('/api/job-applications', { headers, data })
      expect(created.status(), await created.text()).toBe(201)
    }

    await loginByUi(page, account.username, account.password)
    await page.route('**/api/job-applications/actions', async (route) => {
      await page.waitForTimeout(1500)
      await route.continue()
    }, { times: 1 })
    await page.goto('/applications', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: '求职进展' })).toBeVisible()
    await expect(page.getByText('暂无待办，当前申请都已安排妥当')).toBeHidden()
    await expect(page.getByLabel('正在加载优先处理')).toBeVisible()

    const priority = page.getByLabel('优先处理申请')
    await expect(priority).toBeVisible()
    const row = (company) => priority.locator('[class*="priorityRow"]', { hasText: company })
    await expect(priority.locator('[class*="priorityRow"]')).toHaveCount(5)
    const priorityTexts = await priority.locator('[class*="priorityRow"]').evaluateAll((rows) => rows.map((node) => node.textContent || ''))
    expect(priorityTexts[0]).toContain('逾期更早公司')
    expect(priorityTexts[1]).toContain('逾期较晚公司')
    expect(priorityTexts[2]).toContain('今日面试公司')
    expect(priorityTexts[3]).toContain('未来普通公司')
    expect(priorityTexts[4]).toContain('未来面试公司')
    await expect(row('待规划公司')).toHaveCount(0)
    await expect(row('逾期更早公司').getByRole('button', { name: /处\s*理/ })).toBeVisible()
    await expect(row('逾期较晚公司').getByRole('button', { name: /处\s*理/ })).toBeVisible()
    await expect(row('今日面试公司').getByRole('button', { name: '记录面试' })).toBeVisible()
    await expect(row('未来普通公司').getByRole('button', { name: '记录进展' })).toBeVisible()
    await expect(row('未来面试公司').getByRole('button', { name: '记录面试' })).toBeVisible()
    await expect(page.getByRole('button', { name: /查看全部/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /收\s*起/ })).toHaveCount(0)

    await page.getByLabel('求职申请概览').locator('button', { hasText: '待跟进' }).click()
    await expect(priority.locator('[class*="priorityRow"]')).toHaveCount(5)
    await expect(row('待规划公司')).toHaveCount(0)

    const priorityDetailButton = row('逾期更早公司').getByRole('button', { name: '查看优先事项详情 逾期更早公司' })
    await priorityDetailButton.click()
    await expect(page.getByRole('dialog', { name: /逾期更早公司/ })).toBeVisible()
    await expect(page.getByRole('dialog', { name: '记录一次进展' })).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: /逾期更早公司/ })).toBeHidden()
    await priorityDetailButton.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: /逾期更早公司/ })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: /逾期更早公司/ })).toBeHidden()

    await row('今日面试公司').getByRole('button', { name: '记录面试' }).click()
    const recorder = page.getByRole('dialog', { name: '记录一次进展' })
    await expect(recorder).toBeVisible()
    await expect(recorder.locator('.ant-segmented-item-selected', { hasText: '面试' })).toBeVisible()
    await expect(recorder.locator('.ant-segmented-item-selected', { hasText: '指定日期' })).toBeVisible()
    await recorder.getByRole('button', { name: '取消记录进展' }).click()
  })

  test('优先处理可将待规划申请安排到未来七天', async ({ page, request }) => {
    const account = await createUserByApi(request, 'app-unplanned')
    const headers = { Cookie: account.token }
    const futureDate = appDateOnlyAfter(3)
    const created = await request.post('/api/job-applications', {
      headers,
      data: { company: '待规划成功公司', position: '工程师', status: 'applied' },
    })
    expect(created.status(), await created.text()).toBe(201)

    await loginByUi(page, account.username, account.password)
    await goto(page, '/applications')

    const priority = page.getByLabel('优先处理申请')
    const row = priority.locator('[class*="priorityRow"]', { hasText: '待规划成功公司' })
    await expect(row.getByText('待规划', { exact: true })).toBeVisible()
    await row.getByRole('button', { name: '安排下一步' }).click()
    const recorder = page.getByRole('dialog', { name: '记录一次进展' })
    await expect(recorder).toBeVisible()
    await expect(recorder.locator('.ant-segmented-item-selected', { hasText: '指定日期' })).toBeVisible()
    await recorder.getByLabel('记录跟进').fill('准备明确下一次跟进时间')
    await recorder.getByRole('button', { name: '保存跟进' }).click()
    await expect(recorder.getByText('请选择提醒日期')).toBeVisible()
    const dateInput = recorder.locator('#next_action_at')
    await dateInput.click()
    await page.locator('.ant-picker-dropdown:visible').locator(`[title="${futureDate}"]`).click()
    await expect(dateInput).toHaveValue(futureDate)
    await recorder.getByRole('button', { name: '保存跟进' }).click()
    await expect(recorder).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: /待规划成功公司/ })).toBeHidden()
    await expect(row.getByText('未来七天', { exact: true })).toBeVisible()
    await expect(row.getByText('待规划', { exact: true })).toHaveCount(0)
  })

  test('页面创建、进展联动阶段、职位链接、投递快照和删除', async ({ page, request }) => {
    const account = await createUserByApi(request, 'applications-ui')
    const resume = await createResumeByApi(request, account.token, `E2E_TEST_UI快照_${Date.now()}`)
    const created = await request.post('/api/job-applications', {
      headers: { Cookie: account.token },
      data: { company: 'UI Acme', position: '工程师', status: 'applied', job_url: 'https://example.com/jobs/ui', resume_id: resume.id, notes: '需要重点关注岗位要求' },
    })
    expect(created.status()).toBe(201)
    let application = await created.json()
    for (let index = 0; index < 6; index += 1) {
      const event = await request.post(`/api/job-applications/${application.id}/events`, {
        headers: { Cookie: account.token },
        data: { event_type: 'note', content: `历史备注 ${index + 1}`, expected_revision: application.revision },
      })
      expect(event.status(), await event.text()).toBe(201)
      const refreshed = await request.get(`/api/job-applications/${application.id}`, { headers: { Cookie: account.token } })
      expect(refreshed.status(), await refreshed.text()).toBe(200)
      application = await refreshed.json()
    }
    await loginByUi(page, account.username, account.password)
    await goto(page, '/applications')
    await page.getByRole('tab', { name: '全部申请' }).click()
    const applicationList = page.getByLabel('求职申请列表')
    const uiRow = applicationList.locator('[class*="applicationRow"]', { hasText: 'UI Acme' })
    await expect(uiRow.getByText('UI Acme', { exact: true })).toBeVisible()
    await expect(uiRow.getByRole('link', { name: '打开 UI Acme 的职位链接' })).toHaveAttribute('target', '_blank')
    const [jobPage] = await Promise.all([
      page.context().waitForEvent('page'),
      uiRow.getByRole('link', { name: '打开 UI Acme 的职位链接' }).click(),
    ])
    await jobPage.close()
    await expect(page.getByRole('dialog', { name: /UI Acme/ })).toBeHidden()
    await uiRow.getByRole('button', { name: 'UI Acme 的更多操作' }).click()
    await expect(page.getByRole('menuitem', { name: '编辑申请' })).toBeVisible()
    await expect(page.getByRole('dialog', { name: /UI Acme/ })).toBeHidden()
    await page.keyboard.press('Escape')
    const applicationDetailButton = uiRow.getByRole('button', { name: '查看申请详情 UI Acme' })
    await applicationDetailButton.focus()
    await page.keyboard.press('Space')
    const workbench = page.getByRole('dialog', { name: /UI Acme/ })
    await expect(workbench.getByText('备注：需要重点关注岗位要求')).toBeVisible()
    await workbench.getByRole('button', { name: '编辑' }).click()
    const editDrawer = page.getByRole('dialog', { name: /编辑申请/ })
    await expect(editDrawer).toBeVisible()
    await editDrawer.getByRole('button', { name: /取\s*消/ }).click()
    await expect(editDrawer).toBeHidden()
    await expect(workbench).toBeVisible()
    await expect(page.getByLabel('记录跟进')).toBeHidden()
    await workbench.getByRole('button', { name: '记录一次进展' }).click()
    let recorder = page.getByRole('dialog', { name: '记录一次进展' })
    await expect(recorder).toBeVisible()
    await recorder.getByLabel('记录跟进').fill('准备取消的草稿')
    await recorder.getByRole('button', { name: '取消记录进展' }).click()
    await expect(recorder).toBeHidden()
    await expect(page.getByLabel('记录跟进')).toBeHidden()
    await workbench.getByRole('button', { name: '记录一次进展' }).click()
    recorder = page.getByRole('dialog', { name: '记录一次进展' })
    await expect(recorder.getByLabel('记录跟进')).toHaveValue('')
    await recorder.getByLabel('记录跟进').fill('已联系招聘方，等待安排')
    await recorder.getByRole('button', { name: '保存跟进' }).click()
    await expect(recorder).toBeHidden()
    await expect(page.getByText('已联系招聘方，等待安排')).toBeVisible()
    await workbench.getByRole('tab', { name: '简历' }).click()
    await expect(workbench.getByLabel('关联简历')).toBeVisible()
    await expect(workbench.getByLabel('投递版本')).toBeVisible()
    await expect(workbench.getByLabel('投递简历只读预览')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(workbench).toBeHidden()
    await applicationList.getByRole('button', { name: '查看申请详情 UI Acme' }).click()
    await workbench.getByRole('button', { name: '记录一次进展' }).click()
    const interviewRecorder = page.getByRole('dialog', { name: '记录一次进展' })
    await interviewRecorder.locator('.ant-segmented-item-label').getByText('面试', { exact: true }).click()
    await interviewRecorder.locator('#round').click()
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option-content', { hasText: '一面' }).click()
    await interviewRecorder.getByLabel('记录面试').fill('一面通过，等待下一轮安排')
    await interviewRecorder.getByRole('button', { name: '保存面试记录并更新阶段' }).click()
    await expect(interviewRecorder).toBeHidden()
    await expect(workbench.locator('section').filter({ hasText: '当前阶段' }).getByText('面试中', { exact: true })).toBeVisible()
    await workbench.getByRole('button', { name: /查看全部 .* 条记录/ }).click()
    await expect(workbench.getByRole('tab', { name: '时间线' })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Escape')
    await expect(workbench).toBeHidden()
    await page.getByRole('button', { name: 'UI Acme 的更多操作' }).click()
    await page.getByRole('menuitem', { name: '删除申请' }).click()
    await page.locator('.ant-modal-confirm-btns .ant-btn-primary').click()
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
      data: { event_type: 'follow_up', content: '已跟进', next_status: 'offer', next_action_at: null, expected_revision: afterUpdate.revision },
    })
    expect(followUp.status(), await followUp.text()).toBe(201)
    const timeline = await request.get(`/api/job-applications/${application.id}/events`, { headers })
    expect((await timeline.json()).map((event) => event.event_type)).toEqual(expect.arrayContaining(['created', 'status_changed', 'follow_up']))

    const list = await request.get('/api/job-applications?q=acme&status=offer&sort=next_action&page=1&pageSize=1', { headers })
    expect(list.status(), await list.text()).toBe(200)
    expect(list.headers()['x-page-size']).toBe('1')
    expect(await list.json()).toHaveLength(1)
    const refreshed = await request.get(`/api/job-applications/${application.id}`, { headers })
    expect(await refreshed.json()).toMatchObject({ status: 'offer', next_action_at: null, revision: afterUpdate.revision + 1 })
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
