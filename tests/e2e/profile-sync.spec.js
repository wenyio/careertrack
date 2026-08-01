const { test, expect } = require('playwright/test')
const { createUserByApi, createResumeByApi, goto, loginByUi, registerHooks } = require('./helpers')

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

  test('可从个人信息更新当前简历记录', async ({ page, request }) => {
    const account = await createUserByApi(request, 'profile-pull')
    const profileResponse = await request.put('/api/profile', {
      headers: { Cookie: account.token },
      data: {
        projects: [{
          id: 'profile-project-1',
          name: '个人信息项目',
          role: '产品负责人',
          start_date: '2025-01',
          end_date: '2025-03',
        }],
      },
    })
    expect(profileResponse.status(), await profileResponse.text()).toBe(200)

    const resume = await createResumeByApi(
      request,
      account.token,
      `E2E_TEST_同步拉取_${Date.now()}`,
      { initialize_from_profile: false },
    )
    const updateResumeResponse = await request.put(`/api/resumes/${resume.id}`, {
      headers: { Cookie: account.token },
      data: {
        revision: resume.revision,
        content: {
          projects: [{
            id: 'resume-project-1',
            name: '简历项目',
            role: '研发负责人',
            start_date: '2024-01',
            _hidden_fields: ['role'],
          }],
        },
      },
    })
    expect(updateResumeResponse.status(), await updateResumeResponse.text()).toBe(200)

    await loginByUi(page, account.username, account.password)
    await goto(page, `/resumes/${resume.id}/edit`)
    await expect(page.locator('.resume-a4-preview')).toBeVisible()

    await page.locator('div').filter({ hasText: /^项目经历$/ }).first().click()
    await expect(page.getByPlaceholder('请输入项目名称')).toHaveValue('简历项目')

    await page.getByRole('button', { name: '同步第 1 项记录' }).click()
    await page.getByLabel('从个人信息更新当前记录').check()
    await page.locator('.ant-select').last().click()
    await page.getByText(/个人信息项目/).click()
    await page.getByRole('button', { name: '更新当前记录' }).click()

    await expect(page.getByPlaceholder('请输入项目名称')).toHaveValue('个人信息项目')
    await expect(page.getByPlaceholder('请输入担任角色')).toHaveValue('产品负责人')
  })
})
