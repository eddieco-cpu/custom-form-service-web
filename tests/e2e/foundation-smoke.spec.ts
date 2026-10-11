import { expect, test } from '@playwright/test'

test('CSR, local UI icons, feedback, responsive layout and public config', async ({ page, request }, testInfo) => {
  const errors: string[] = []
  const unexpectedRequests: string[] = []
  const requestUrls: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('request', outgoing => {
    const url = outgoing.url()
    requestUrls.push(url)
    if (!url.startsWith('http://localhost:3000/') || /\/(?:_nuxt_icon|api\/.*icon)\b/i.test(url)) {
      unexpectedRequests.push(url)
    }
  })

  const html = await (await request.get('/')).text()
  expect(html).not.toContain('工程環境已就緒')
  await page.goto('/')
  // Dev cold compilation can continue after the HTML server is ready.
  await expect(page.getByRole('heading', { name: '工程環境已就緒' })).toBeVisible({ timeout: 30_000 })
  const expectedUrl = process.env.F1_EXPECT_API_BASE_URL ?? 'http://localhost:5000/api/v1'
  await expect(page.getByTestId('api-base-url')).toHaveText(expectedUrl)
  const actualUrl = await page.getByTestId('api-base-url').innerText()
  const mainStyle = await page.locator('main').evaluate(element => {
    const style = getComputedStyle(element)
    return { maxWidth: style.maxWidth, paddingLeft: style.paddingLeft }
  })
  expect(mainStyle).toEqual({ maxWidth: '1280px', paddingLeft: '16px' })

  await page.getByRole('button', { name: '顯示測試提示' }).click()
  await expect(page.getByText('本地提示測試', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '關閉', exact: true })).toBeVisible()
  // Icons must render, not merely avoid network by failing silently.
  const iconStyles = await page.locator('[class*="i-lucide-"]').evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element)
    return { mask: style.maskImage, width: element.getBoundingClientRect().width }
  }))
  expect(iconStyles.length).toBeGreaterThanOrEqual(3)
  for (const icon of iconStyles) {
    expect(icon.mask).toContain('data:image/svg+xml')
    expect(icon.width).toBeGreaterThan(0)
  }
  await page.getByRole('button', { name: '關閉', exact: true }).click()
  const trigger = page.getByRole('button', { name: '開啟測試對話框' })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: '本地對話框測試' })).toBeVisible()
  const close = dialog.getByRole('button', { name: '關閉', exact: true })
  await expect(close.locator('[class*="i-lucide-"]')).toBeVisible()
  await close.click()
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.screenshot({ path: testInfo.outputPath('foundation-mobile.png'), fullPage: true })
  await testInfo.attach('public-config-and-network', {
    body: JSON.stringify({ mode: process.env.F1_SMOKE_MODE ?? 'preview', injectionStage: process.env.F1_INJECTION_STAGE ?? 'none', expectedUrl, actualUrl, requestUrls, errors, unexpectedRequests, iconStyles, browser: page.context().browser()?.version() }, null, 2),
    contentType: 'application/json',
  })
  expect(errors).toEqual([])
  expect(unexpectedRequests).toEqual([])
})
