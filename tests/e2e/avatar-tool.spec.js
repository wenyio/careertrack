/**
 * Browser-only avatar processing regression.
 */

const { test, expect } = require('playwright/test')
const {
  createUserByApi,
  goto,
  loginByUi,
  registerHooks,
  screenshot,
} = require('./helpers')

registerHooks(test)

test.describe('证件照处理工具', () => {
  test('切换 PNG/JPEG 会立即按所选格式重新编码预览', async ({
    page,
    request,
  }) => {
    const account = await createUserByApi(request, 'avatartool')
    await loginByUi(page, account.username, account.password)
    await goto(page, '/settings/avatar-tool')

    // A valid transparent 1×1 PNG keeps the fixture small while exercising
    // the real FileReader, Image, Canvas and toDataURL browser pipeline.
    const imageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    )
    await page.locator('input[type="file"]').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: imageBuffer,
    })

    const preview = page.getByAltText('1:1 方图预览')
    await expect(preview).toHaveAttribute('src', /^data:image\/png/)

    await page.getByText('JPEG', { exact: true }).click()
    await expect(preview).toHaveAttribute('src', /^data:image\/jpeg/)

    await page.getByText('PNG', { exact: true }).click()
    await expect(preview).toHaveAttribute('src', /^data:image\/png/)
    await screenshot(page, '证件照工具', 'PNG与JPEG格式切换')
  })
})
