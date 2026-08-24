const { test, expect } = require('playwright/test')
const { createUserByApi, createResumeByApi, goto, loginByUi, registerHooks } = require('./helpers')

registerHooks(test)

test.describe('简历条目同步到个人信息', () => {
  test('profile 可保存多条自我评价但新建简历只初始化一条', async ({ request }) => {
    const account = await createUserByApi(request, 'eval')
    const profileResponse = await request.put('/api/profile', {
      headers: { Cookie: account.token },
      data: {
        self_evaluations: [
          { id: 'eval-1', title: '技术岗位', description: '面向技术岗位' },
          { id: 'eval-2', title: '产品岗位', description: '面向产品岗位' },
        ],
      },
    })
    expect(profileResponse.status(), await profileResponse.text()).toBe(200)
    const profile = await profileResponse.json()
    expect(profile.self_evaluations).toHaveLength(2)
    expect(profile.summary).toBe('面向技术岗位')

    const resume = await createResumeByApi(
      request,
      account.token,
      `E2E_TEST_自我评价_${Date.now()}`,
    )
    expect(resume.content.summary).toBe('面向技术岗位')
    expect(resume.content.self_evaluations).toBeUndefined()
  })

  test('profile 可保存多条求职意向但新建简历只初始化一条', async ({ request }) => {
    const account = await createUserByApi(request, 'job-intentions')
    const profileResponse = await request.put('/api/profile', {
      headers: { Cookie: account.token },
      data: {
        basic_info: { name: '求职意向用户' },
        job_intentions: [
          {
            id: 'job-1',
            title: '技术岗位',
            current_status: '在职',
            position: '前端工程师',
            expected_city: '上海',
            expected_salary: '30-40K',
          },
          {
            id: 'job-2',
            title: '产品岗位',
            current_status: '离职',
            position: '产品经理',
            expected_city: '北京',
            expected_salary: '25-35K',
          },
        ],
      },
    })
    expect(profileResponse.status(), await profileResponse.text()).toBe(200)
    const profile = await profileResponse.json()
    expect(profile.job_intentions).toHaveLength(2)
    expect(profile.basic_info.job_intention).toMatchObject({
      position: '前端工程师',
      expected_city: '上海',
    })

    const resume = await createResumeByApi(
      request,
      account.token,
      `E2E_TEST_求职意向_${Date.now()}`,
    )
    expect(resume.content.basic_info.job_intention).toMatchObject({
      position: '前端工程师',
      expected_city: '上海',
    })
    expect(resume.content.job_intentions).toBeUndefined()
  })

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

  test('简历编辑页从多条自我评价中只导入一条', async ({ page, request }) => {
    const account = await createUserByApi(request, 'summary-import-one')
    const profileResponse = await request.put('/api/profile', {
      headers: { Cookie: account.token },
      data: {
        self_evaluations: [
          { id: 'eval-tech', title: '技术岗位版本', description: '面向技术岗位' },
          { id: 'eval-product', title: '产品岗位版本', description: '面向产品岗位' },
        ],
      },
    })
    expect(profileResponse.status(), await profileResponse.text()).toBe(200)

    const resume = await createResumeByApi(
      request,
      account.token,
      `E2E_TEST_自我评价导入_${Date.now()}`,
      { initialize_from_profile: false },
    )
    const updateResumeResponse = await request.put(`/api/resumes/${resume.id}`, {
      headers: { Cookie: account.token },
      data: {
        revision: resume.revision,
        modules_config: { ...resume.modules_config, summary: true },
        content: { summary: '当前简历自我评价' },
      },
    })
    expect(updateResumeResponse.status(), await updateResumeResponse.text()).toBe(200)

    await loginByUi(page, account.username, account.password)
    await goto(page, `/resumes/${resume.id}/edit`)
    await expect(page.locator('.resume-a4-preview')).toBeVisible()

    await page.locator('div').filter({ hasText: /^自我评价$/ }).first().click()
    await page.locator('#module-panel-summary').getByRole('button', { name: '从个人信息填充' }).click()
    await expect(page.getByText('选择一条自我评价')).toBeVisible()
    await page.getByText('产品岗位版本').click()
    await page.locator('.ant-modal-footer .ant-btn-primary').click()

    await expect(page.locator('.tiptap, [contenteditable="true"], .ProseMirror').first()).toContainText('面向产品岗位')
    await expect(page.locator('.tiptap, [contenteditable="true"], .ProseMirror').first()).not.toContainText('面向技术岗位')
  })

  test('简历编辑页从多条求职意向中只导入一条', async ({ page, request }) => {
    const account = await createUserByApi(request, 'job-intention-import')
    const profileResponse = await request.put('/api/profile', {
      headers: { Cookie: account.token },
      data: {
        basic_info: {
          name: '导入用户',
          phone: '13800000000',
          email: 'job-import@test.com',
        },
        job_intentions: [
          {
            id: 'job-tech',
            title: '技术岗位版本',
            current_status: '在职',
            position: '前端工程师',
            expected_city: '上海',
            expected_salary: '30-40K',
          },
          {
            id: 'job-product',
            title: '产品岗位版本',
            current_status: '离职',
            position: '产品经理',
            expected_city: '北京',
            expected_salary: '25-35K',
          },
        ],
      },
    })
    expect(profileResponse.status(), await profileResponse.text()).toBe(200)

    const resume = await createResumeByApi(
      request,
      account.token,
      `E2E_TEST_求职意向导入_${Date.now()}`,
      { initialize_from_profile: false },
    )
    const updateResumeResponse = await request.put(`/api/resumes/${resume.id}`, {
      headers: { Cookie: account.token },
      data: {
        revision: resume.revision,
        content: {
          basic_info: {
            name: '当前简历用户',
            job_intention: {
              position: '当前岗位',
              expected_city: '杭州',
            },
          },
        },
      },
    })
    expect(updateResumeResponse.status(), await updateResumeResponse.text()).toBe(200)

    await loginByUi(page, account.username, account.password)
    await goto(page, `/resumes/${resume.id}/edit`)
    await expect(page.locator('.resume-a4-preview')).toBeVisible()

    await page.locator('#module-panel-basic_info').getByRole('button', { name: '从个人信息填充' }).click()
    await expect(page.getByText('选择一条求职意向')).toBeVisible()
    await page.getByText('产品岗位版本').click()
    await page.locator('.ant-modal-footer .ant-btn-primary').click()

    await expect(page.getByPlaceholder('请输入姓名')).toHaveValue('导入用户')
    await expect(page.getByPlaceholder('请输入期望职位')).toHaveValue('产品经理')
    await expect(page.getByPlaceholder('请输入期望工作地')).toHaveValue('北京')
  })

  test('简历编辑页可将自我评价新增或覆盖到个人信息', async ({ page, request }) => {
    const account = await createUserByApi(request, 'summary-sync')
    const profileResponse = await request.put('/api/profile', {
      headers: { Cookie: account.token },
      data: {
        self_evaluations: [
          { id: 'eval-old', title: '旧版本', description: '旧自我评价' },
        ],
      },
    })
    expect(profileResponse.status(), await profileResponse.text()).toBe(200)

    const resume = await createResumeByApi(
      request,
      account.token,
      `E2E_TEST_自我评价同步_${Date.now()}`,
      { initialize_from_profile: false },
    )
    const updateResumeResponse = await request.put(`/api/resumes/${resume.id}`, {
      headers: { Cookie: account.token },
      data: {
        revision: resume.revision,
        modules_config: { ...resume.modules_config, summary: true },
        content: { summary: '新的简历自我评价' },
      },
    })
    expect(updateResumeResponse.status(), await updateResumeResponse.text()).toBe(200)

    await loginByUi(page, account.username, account.password)
    await goto(page, `/resumes/${resume.id}/edit`)
    await expect(page.locator('.resume-a4-preview')).toBeVisible()

    await page.locator('div').filter({ hasText: /^自我评价$/ }).first().click()
    await page.locator('#module-panel-summary').getByRole('button', { name: '同步到个人信息' }).click()
    await page.getByPlaceholder('例如：技术岗位版本').fill('新版本')
    await page.locator('.ant-modal-footer .ant-btn-primary').click()
    await expect(page.getByRole('dialog', { name: '同步到个人信息' })).not.toBeVisible()

    let saved = await request.get('/api/profile', { headers: { Cookie: account.token } })
    expect(saved.status(), await saved.text()).toBe(200)
    let profile = await saved.json()
    expect(profile.self_evaluations).toHaveLength(2)
    expect(profile.self_evaluations[1]).toMatchObject({
      title: '新版本',
      description: '新的简历自我评价',
    })

    await page.locator('#module-panel-summary').locator('.tiptap, [contenteditable="true"], .ProseMirror').first().fill('覆盖后的自我评价')
    await page.locator('#module-panel-summary').getByRole('button', { name: '同步到个人信息' }).click()
    await page.getByLabel('覆盖已有自我评价').check()
    await page.locator('.ant-select').last().click()
    await page.getByText('旧版本').click()
    await page.locator('.ant-modal-footer .ant-btn-primary').click()

    saved = await request.get('/api/profile', { headers: { Cookie: account.token } })
    expect(saved.status(), await saved.text()).toBe(200)
    profile = await saved.json()
    expect(profile.self_evaluations[0]).toMatchObject({
      id: 'eval-old',
      title: '旧版本',
    })
    expect(JSON.stringify(profile.self_evaluations[0].description)).toContain('覆盖后的自我评价')
    expect(JSON.stringify(profile.summary)).toContain('覆盖后的自我评价')
  })
})
