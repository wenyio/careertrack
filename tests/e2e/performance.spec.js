/**
 * 编辑器性能防退化基线
 *
 * 阈值刻意留有 CI 波动余量，用于发现数量级退化，不作为实验室级 Web Vitals。
 * 测试先预热路由，再测量同一浏览器内的页面加载和输入到预览可见延迟。
 */

const { test, expect } = require('playwright/test')
const {
  registerHooks,
  goto,
  createUserByApi,
  createResumeByApi,
  loginByUi,
} = require('./helpers')

const BUDGETS = {
  domContentLoadedMs: 5_000,
  loadMs: 8_000,
  scriptDecodedBytes: 20 * 1024 * 1024,
  inputToPreviewMs: 1_000,
}

registerHooks(test)

test('编辑器加载与实时预览保持在防退化预算内', async ({ page, request }, testInfo) => {
  const account = await createUserByApi(request, 'performance')
  const resume = await createResumeByApi(
    request,
    account.token,
    `E2E_TEST_性能_${Date.now()}`,
    { initialize_from_profile: false },
  )
  await loginByUi(page, account.username, account.password)
  await goto(page, `/resumes/${resume.id}/edit`)

  // 首次访问可能包含开发服务器按需编译；预热后刷新才作为可比较基线。
  await page.reload({ waitUntil: 'load' })
  await expect(page.locator('.resume-a4-preview')).toBeVisible()

  const navigation = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0]
    if (!(entry instanceof PerformanceNavigationTiming)) return null
    const scripts = performance.getEntriesByType('resource')
      .filter((resource) => resource.name.includes('.js'))
    return {
      domContentLoadedMs: entry.domContentLoadedEventEnd,
      loadMs: entry.loadEventEnd,
      scriptDecodedBytes: scripts.reduce(
        (total, resource) => total + resource.decodedBodySize,
        0,
      ),
      scriptCount: scripts.length,
    }
  })
  expect(navigation).not.toBeNull()

  const nameInput = page.getByPlaceholder('请输入姓名').first()
  const preview = page.locator('.resume-a4-preview')
  const inputLatencies = []
  for (let index = 0; index < 5; index++) {
    const value = `性能基准-${index}-${Date.now()}`
    const startedAt = Date.now()
    await nameInput.fill(value)
    await expect(preview).toContainText(value)
    inputLatencies.push(Date.now() - startedAt)
  }

  const metrics = {
    ...navigation,
    inputToPreviewMaxMs: Math.max(...inputLatencies),
    inputToPreviewAverageMs: Math.round(
      inputLatencies.reduce((sum, value) => sum + value, 0) / inputLatencies.length,
    ),
  }
  await testInfo.attach('performance-baseline', {
    body: Buffer.from(JSON.stringify({ budgets: BUDGETS, metrics }, null, 2)),
    contentType: 'application/json',
  })

  expect(metrics.domContentLoadedMs).toBeLessThan(BUDGETS.domContentLoadedMs)
  expect(metrics.loadMs).toBeLessThan(BUDGETS.loadMs)
  expect(metrics.scriptDecodedBytes).toBeLessThan(BUDGETS.scriptDecodedBytes)
  expect(metrics.inputToPreviewMaxMs).toBeLessThan(BUDGETS.inputToPreviewMs)
})
