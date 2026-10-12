import { expect, test } from '@playwright/test'

test('current CSR shell, local Header icons, responsive layout and public config (synthetic Auth)', async ({ page, request }, info) => {
  const expectedUrl = process.env.F1_EXPECT_API_BASE_URL ?? 'http://localhost:5000/api/v1'
  const errors: string[] = []
  const unexpected: string[] = []
  let me = 0
  await page.route(`${expectedUrl}/users/me`, async route => {
    me++
    await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': 'http://localhost:3000', 'access-control-allow-credentials': 'true' }, json: { id: '11111111-1111-4111-8111-111111111111', email: 'smoke@example.test', displayName: '工程合成測資', avatarUrl: null } })
  })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('request', outgoing => {
    const url = outgoing.url()
    if ((!url.startsWith('http://localhost:3000/') && url !== `${expectedUrl}/users/me`) || /\/(?:_nuxt_icon|api\/.*icon)\b/i.test(url)) unexpected.push(url)
  })
  const html = await (await request.get('/')).text()
  expect(html).not.toContain('歡迎，工程合成測資')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '歡迎，工程合成測資' })).toBeVisible({ timeout: 30_000 })
  const actualUrl = await page.evaluate(() => (window as unknown as { __NUXT__: { config: { public: { apiBaseUrl: string } } } }).__NUXT__.config.public.apiBaseUrl)
  expect(actualUrl).toBe(expectedUrl)
  const mainStyle = await page.locator('main').evaluate(element => ({ maxWidth: getComputedStyle(element).maxWidth, paddingLeft: getComputedStyle(element).paddingLeft }))
  expect(mainStyle).toEqual({ maxWidth: '1280px', paddingLeft: '16px' })
  const iconStyles = await page.locator('[class*="i-lucide-"]:visible').evaluateAll(elements => elements.map(element => ({ mask: getComputedStyle(element).maskImage, width: element.getBoundingClientRect().width })))
  expect(iconStyles.length).toBeGreaterThanOrEqual(1)
  for (const icon of iconStyles) { expect(icon.mask).toContain('data:image/svg+xml'); expect(icon.width).toBeGreaterThan(0) }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: '展開導覽' }).click()
  await expect(page.getByRole('navigation', { name: '手機導覽' })).toBeVisible()
  await page.screenshot({ path: info.outputPath('current-shell-mobile.png') })
  await info.attach('public-config-and-network', { body: JSON.stringify({ expectedUrl, actualUrl, me, errors, unexpected, iconStyles, browser: page.context().browser()?.version(), auth: 'synthetic' }, null, 2), contentType: 'application/json' })
  expect(me).toBe(1); expect(errors).toEqual([]); expect(unexpected).toEqual([])
})
