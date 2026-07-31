const { test, expect } = require('playwright/test')
const { createResumeByApi, createUserByApi, registerHooks } = require('./helpers')

registerHooks(test)

test.describe('求职申请跟踪', () => {
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
