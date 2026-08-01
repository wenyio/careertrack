const { test, expect } = require('playwright/test')
const { createUserByApi, registerHooks } = require('./helpers')

registerHooks(test)

test.describe('简历条目同步到个人信息', () => {
  test('可新增记录并覆盖指定 profile 条目', async ({ request }) => {
    const account = await createUserByApi(request, 'profile-sync')

    const createResponse = await request.post('/api/profile/sync-entry', {
      headers: { Cookie: account.token },
      data: {
        field: 'projects',
        mode: 'create',
        entry: {
          id: 'resume-project-1',
          _hidden_fields: ['city'],
          name: '优化后的项目',
          role: '负责人',
          link: 'https://example.com/project',
        },
      },
    })
    expect(createResponse.status(), await createResponse.text()).toBe(200)
    const createdProfile = await createResponse.json()
    expect(createdProfile.projects).toHaveLength(1)
    const targetId = createdProfile.projects[0].id
    expect(targetId).toBeTruthy()
    expect(targetId).not.toBe('resume-project-1')
    expect(createdProfile.projects[0]).toMatchObject({
      name: '优化后的项目',
      role: '负责人',
      link: 'https://example.com/project',
    })
    expect(createdProfile.projects[0]._hidden_fields).toBeUndefined()

    const replaceResponse = await request.post('/api/profile/sync-entry', {
      headers: { Cookie: account.token },
      data: {
        field: 'projects',
        mode: 'replace',
        target_id: targetId,
        entry: {
          id: 'resume-project-2',
          _hidden_fields: ['role'],
          name: '二次优化项目',
        },
      },
    })
    expect(replaceResponse.status(), await replaceResponse.text()).toBe(200)
    const replacedProfile = await replaceResponse.json()
    expect(replacedProfile.projects).toEqual([{
      id: targetId,
      name: '二次优化项目',
    }])
  })
})
