import { expect, test } from '@playwright/test'

test('built CSR shell and product Toast/Dialog lifecycle, focus, local icons and network (synthetic API)', async ({ page, request }, info) => {
  const expectedUrl = process.env.F1_EXPECT_API_BASE_URL ?? 'http://localhost:5000/api/v1'
  const errors: string[] = []
  const expectedHttpErrors: string[] = []
  const unexpected: string[] = []
  let me = 0
  let patch = 0
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'smoke@example.test', displayName: '工程合成測資', avatarUrl: null }
  await page.route(`${expectedUrl}/users/me`, async route => {
    if (route.request().method() === 'PATCH') patch++; else me++
    const failed = route.request().method() === 'PATCH' && patch > 1
    await route.fulfill({ status: failed ? 403 : 200, headers: { 'access-control-allow-origin': 'http://localhost:3000', 'access-control-allow-credentials': 'true' }, json: failed ? { error: { code: 'AUTH_USER_DISABLED', message: 'synthetic' } } : route.request().method() === 'PATCH' ? { ...user, displayName: '已保存合成姓名' } : user })
  })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() !== 'error') return
    // Two intercepted PATCH 403s are the deliberate Dialog stimulus. Keep
    // their diagnostics separate; every other console/page error still fails.
    if (message.location().url === `${expectedUrl}/users/me` && message.text() === 'Failed to load resource: the server responded with a status of 403 (Forbidden)') expectedHttpErrors.push(message.text())
    else errors.push(message.text())
  })
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
  const iconStyles = await page.locator('[class*="i-lucide-"]:visible').evaluateAll(elements => elements.map(element => ({ mask: getComputedStyle(element).maskImage, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })))
  expect(iconStyles.length).toBeGreaterThanOrEqual(1)
  for (const icon of iconStyles) { expect(icon.mask).toContain('data:image/svg+xml'); expect(icon.width).toBeGreaterThan(0); expect(icon.height).toBeGreaterThan(0) }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: '展開導覽' }).click()
  await expect(page.getByRole('navigation', { name: '手機導覽' })).toBeVisible()
  await page.screenshot({ path: info.outputPath('current-shell-mobile.png') })
  await page.getByRole('navigation', { name: '手機導覽' }).getByRole('button', { name: '個人資訊', exact: true }).click()
  const input = page.getByRole('textbox', { name: '姓名' })
  const save = page.getByRole('button', { name: '保存', exact: true })
  await input.fill('成功保存合成測資'); await save.click()
  await expect(input).toHaveValue('已保存合成姓名')
  const toast = page.getByRole('listitem').filter({ hasText: '個人資訊已更新' })
  await expect(toast).toBeVisible()
  const feedbackIcons = []
  const toastIcon = toast.getByRole('button', { name: '關閉', exact: true }).locator('[class*="i-lucide-"]')
  await expect(toastIcon).toBeVisible()
  feedbackIcons.push(await toastIcon.evaluate(element => ({ kind: 'toast', mask: getComputedStyle(element).maskImage, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })))
  await toast.getByRole('button', { name: '關閉', exact: true }).click()
  await expect(toast).toHaveCount(0)
  for (const closeMethod of ['footer', '×']) {
    await input.fill(`Dialog ${closeMethod}`); await save.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('帳號已停用')
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape'); await expect(dialog).toBeVisible()
    await page.mouse.click(1, 400); await expect(dialog).toBeVisible()
    const closeIcon = dialog.getByRole('button', { name: '關閉', exact: true }).first().locator('[class*="i-lucide-"]')
    feedbackIcons.push({ kind: `dialog-${closeMethod}`, ...await closeIcon.evaluate(element => ({ mask: getComputedStyle(element).maskImage, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })) })
    const closes = dialog.getByRole('button', { name: '關閉', exact: true })
    await (closeMethod === 'footer' ? closes.last() : closes.first()).click()
    await expect(dialog).toHaveCount(0); await expect(save).toBeFocused()
    await expect(input).toHaveValue(`Dialog ${closeMethod}`)
  }
  for (const icon of feedbackIcons) { expect(icon.mask).toContain('data:image/svg+xml'); expect(icon.width).toBeGreaterThan(0); expect(icon.height).toBeGreaterThan(0) }
  await info.attach('public-config-and-network', { body: JSON.stringify({ expectedUrl, actualUrl, me, patch, errors, expectedHttpErrors, unexpected, iconStyles, feedbackIcons, browser: page.context().browser()?.version(), api: 'isolated synthetic interception' }, null, 2), contentType: 'application/json' })
  expect(patch).toBe(3)
  expect(expectedHttpErrors).toHaveLength(2)
  expect(me).toBe(1); expect(errors).toEqual([]); expect(unexpected).toEqual([])
  page.once('dialog', dialog => dialog.accept())
})
