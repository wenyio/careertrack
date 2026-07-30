/**
 * 简历公开测试
 */

const { test, expect } = require('playwright/test')
const { registerHooks, goto, screenshot, createUserByApi, createResumeByApi, publishResumeByApi } = require('./helpers')

registerHooks(test)

test.describe('简历公开', () => {
  test('发布简历、公开页多板块渲染', async ({ page, request }) => {
    const account = await createUserByApi(request, 'publish')
    const resume = await createResumeByApi(request, account.token, `E2E_TEST_公开_${Date.now()}`)

    // 通过 API 填充多模块内容
    const updateRes = await request.put(`/api/resumes/${resume.id}`, {
      headers: { Cookie: account.token },
      data: {
        content: {
          basic_info: { name: 'E2E_公开用户', email: 'pub@test.com', phone: '13800000001' },
          education: [{ school: '测试大学', major: '计算机科学', degree: '本科', date_range: '2018-2022' }],
          work_experience: [{ company: '测试公司', position: '前端工程师', date_range: '2022-至今', description: '负责前端开发' }],
          skills: [{ name: 'React', description: '熟练掌握' }],
        },
        modules_config: { basic_info: true, education: true, work_experience: true, skills: true },
      },
    })
    expect(updateRes.status(), await updateRes.text()).toBe(200)

    // 发布
    const slug = `e2e-pub-${Date.now()}`
    await publishResumeByApi(request, account.token, resume.id, slug)

    // 访问公开页
    await goto(page, `/resume/${slug}`)

    // 验证多板块渲染
    await expect(page.getByText('E2E_公开用户').filter({ visible: true })).toBeVisible()
    await expect(page.getByText('测试大学').filter({ visible: true })).toBeVisible()
    await expect(page.getByText('测试公司').filter({ visible: true })).toBeVisible()
    await expect(page.getByText('React').filter({ visible: true })).toBeVisible()
    await expect(page.getByRole('link', { name: '职迹 CareerTrack' })).toBeVisible()
    await screenshot(page, '公开简历', '多板块渲染')

    // 验证不暴露内部字段
    const publicBody = await (await request.get(`/api/public/${slug}`)).json()
    expect(publicBody.user_id).toBeUndefined()
    expect(publicBody.id).toBeUndefined()
  })

  test('编辑简历后公开内容同步更新', async ({ page, request }) => {
    const account = await createUserByApi(request, 'pubupdate')
    const resume = await createResumeByApi(request, account.token, `E2E_TEST_更新公开_${Date.now()}`)
    const slug = `e2e-update-${Date.now()}`

    // 初始内容并发布
    await request.put(`/api/resumes/${resume.id}`, {
      headers: { Cookie: account.token },
      data: {
        content: { basic_info: { name: '更新前姓名' } },
        modules_config: { basic_info: true },
      },
    })
    await publishResumeByApi(request, account.token, resume.id, slug)

    // 验证初始公开内容
    await goto(page, `/resume/${slug}`)
    await expect(page.getByText('更新前姓名').filter({ visible: true })).toBeVisible()

    // 通过 API 更新内容
    const updateRes = await request.put(`/api/resumes/${resume.id}`, {
      headers: { Cookie: account.token },
      data: {
        content: { basic_info: { name: '更新后姓名', email: 'updated@test.com' } },
        modules_config: { basic_info: true },
      },
    })
    expect(updateRes.status()).toBe(200)

    // 重新访问公开页验证更新
    await goto(page, `/resume/${slug}`)
    await expect(page.getByText('更新后姓名').filter({ visible: true })).toBeVisible()
    await expect(page.getByText('updated@test.com').filter({ visible: true })).toBeVisible()
    await screenshot(page, '公开简历', '内容同步更新')
  })

  test('长简历按 A4 高度分页并支持分页器切换', async ({ page, request }) => {
    const account = await createUserByApi(request, 'publicpages')
    const resume = await createResumeByApi(
      request,
      account.token,
      `E2E_TEST_公开分页_${Date.now()}`,
    )

    const workExperience = Array.from({ length: 12 }, (_, index) => ({
      company: `分页测试公司 ${index + 1}`,
      position: '高级工程师',
      date_range: '2020-2026',
      description: '负责核心功能设计、跨团队协作和稳定性治理，持续交付高质量结果。'.repeat(6),
    }))
    const updateResponse = await request.put(`/api/resumes/${resume.id}`, {
      headers: { Cookie: account.token },
      data: {
        content: {
          basic_info: { name: 'E2E_分页用户' },
          work_experience: workExperience,
        },
        modules_config: {
          basic_info: true,
          work_experience: true,
        },
      },
    })
    expect(updateResponse.status(), await updateResponse.text()).toBe(200)

    const slug = `e2e-pages-${Date.now()}`
    await publishResumeByApi(request, account.token, resume.id, slug)
    await goto(page, `/resume/${slug}`)

    const nextPageButton = page.getByRole('button', { name: '下一页' })
    await expect(nextPageButton).toBeVisible({ timeout: 10_000 })
    await nextPageButton.click()
    await expect(page.getByRole('button', { name: '第 2 页' }))
      .toHaveAttribute('aria-current', 'page')
    await screenshot(page, '公开简历', 'A4分页切换')
  })
})
