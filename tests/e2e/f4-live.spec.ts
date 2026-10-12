import { test, expect } from '@playwright/test'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'

// Real API only. The Owner authorized a retained synthetic account, not Form writes.
test('F4-L01 real new account, empty/filter/refresh, invalid/missing ID and manual Auth lapse', async ({ page, context, browserName }) => {
  const runId = `f4-${Date.now()}`
  const password = randomBytes(24).toString('hex')
  const email = `${runId}@example.test`
  const displayName = `F4 ${runId}`
  const missingId = randomUUID()
  const requests: { method: string; path: string }[] = []
  const responses: { method: string; path: string; status: number; origin?: string; credentials?: string }[] = []
  const consoleErrors: { text: string; url: string }[] = []; const pageErrors: string[] = []
  page.on('request', request => { if (request.url().startsWith('http://localhost:5000/api/v1/')) requests.push({ method: request.method(), path: new URL(request.url()).pathname + new URL(request.url()).search }) })
  page.on('response', response => {
    if (!response.url().startsWith('http://localhost:5000/api/v1/')) return
    const headers = response.headers(); const url = new URL(response.url())
    responses.push({ method: response.request().method(), path: url.pathname + url.search, status: response.status(), origin: headers['access-control-allow-origin'], credentials: headers['access-control-allow-credentials'] })
  })
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push({ text: message.text(), url: message.location().url }) })
  page.on('pageerror', error => pageErrors.push(error.message))
  const target = '/forms?from=f4-live#list'
  await page.goto(target); await expect(page).toHaveURL(/\/login\?redirect=/)
  await page.getByRole('tab', { name: '註冊', exact: true }).click()
  await page.getByRole('textbox', { name: '姓名' }).fill(displayName)
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByLabel('密碼', { exact: true }).fill(password)
  const registering = page.waitForResponse(r => r.url().endsWith('/auth/register'))
  await page.getByRole('button', { name: '註冊', exact: true }).click()
  expect((await registering).status()).toBe(201)
  await expect(page.getByRole('tab', { name: '登入', exact: true })).toHaveAttribute('aria-selected', 'true')
  await page.getByLabel('密碼', { exact: true }).fill(password)
  const loggingIn = page.waitForResponse(r => r.url().endsWith('/auth/login'))
  await page.getByRole('button', { name: '登入', exact: true }).click()
  expect((await loggingIn).status()).toBe(200)
  await expect(page).toHaveURL(`http://localhost:3000${target}`)
  await expect(page.getByRole('link', { name: '建立第一份表單' })).toBeVisible()
  await expect(page.getByText('第 1 頁 · 共 0 頁／0 筆')).toBeVisible()
  const cookiePresent = (await context.cookies()).some(cookie => cookie.name === 'access_token' && cookie.httpOnly)
  expect(cookiePresent).toBe(true)
  for (const status of ['draft', 'published', 'closed']) {
    const filtered = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/forms' && new URL(response.url()).searchParams.get('status') === status)
    await page.getByLabel('狀態篩選').selectOption(status)
    expect((await filtered).status()).toBe(200)
    await expect(page.getByText('目前條件沒有表單。', { exact: true })).toBeVisible()
    await expect.poll(() => requests.at(-1)?.path).toBe(`/api/v1/forms?page=1&pageSize=10&status=${status}`)
  }
  await page.getByLabel('狀態篩選').selectOption('')
  await expect(page.getByRole('link', { name: '建立第一份表單' })).toBeVisible()
  const beforeRefresh = requests.length
  await page.getByRole('button', { name: '刷新', exact: true }).click()
  await expect(page.getByRole('button', { name: '刷新', exact: true })).toBeEnabled()
  expect(requests.length - beforeRefresh).toBe(1)
  const meBeforeReload = requests.filter(request => request.path === '/api/v1/users/me').length
  expect(meBeforeReload).toBe(1)
  // A real reload proves the retained browser Cookie can bootstrap and read again.
  await page.reload(); await expect(page.getByRole('link', { name: '建立第一份表單' })).toBeVisible()
  expect(requests.filter(request => request.path === '/api/v1/users/me')).toHaveLength(2)
  for (const [id, status, code, message] of [[missingId, 404, 'FORM_NOT_FOUND', '找不到表單'], ['invalid-f4-id', 400, 'VALIDATION_ERROR', '連結無效']] as const) {
    const wire = page.waitForResponse(r => new URL(r.url()).pathname === `/api/v1/forms/${id}`)
    // Real URL navigation, no intercepted API or synthetic Form DTO.
    await page.goto(`/forms/${id}`)
    const response = await wire; expect(response.status()).toBe(status)
    const body = await response.json() as { error: { code: string } }; expect(body.error.code).toBe(code)
    await expect(page.getByRole('alert')).toContainText(message)
    expect(new URL(page.url()).pathname).toBe(`/forms/${id}`)
    await expect(page.getByRole('button', { name: '使用者選單' })).toBeVisible()
    await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '我的表單', exact: true }).click()
    await expect(page.getByRole('link', { name: '建立第一份表單' })).toBeVisible()
  }
  // Direct URL probes above each perform one bootstrap. SPA returns do not.
  expect(requests.filter(request => request.path === '/api/v1/users/me')).toHaveLength(4)
  await context.clearCookies()
  const lapsed = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/forms')
  await page.getByRole('button', { name: '刷新', exact: true }).click()
  const lapseResponse = await lapsed; expect(lapseResponse.status()).toBe(401)
  expect((await lapseResponse.json() as { error: { code: string } }).error.code).toBe('AUTH_REQUIRED')
  const dialog = page.getByRole('dialog', { name: '操作訊息' })
  await expect(dialog).toBeVisible(); await expect(page.getByRole('button', { name: '使用者選單' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '建立第一份表單' })).toHaveCount(0)
  expect(new URL(page.url()).pathname).toBe('/forms')
  await dialog.getByRole('button', { name: '關閉', exact: true }).filter({ hasText: '關閉' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
  expect(new URL(page.url()).searchParams.get('redirect')).toBe('/forms')
  expect(requests.filter(request => request.path === '/api/v1/users/me')).toHaveLength(4)
  expect(requests.filter(request => request.method !== 'GET').map(request => request.path)).toEqual(['/api/v1/auth/register', '/api/v1/auth/login'])
  expect(pageErrors).toEqual([])
  expect(consoleErrors.filter(message => {
    const status = /^Failed to load resource: the server responded with a status of (\d+) \(.*\)$/.exec(message.text)
    const url = new URL(message.url || 'http://invalid.test')
    return !(status && responses.some(response => response.status === Number(status[1]) && response.path === url.pathname + url.search && url.origin === 'http://localhost:5000'))
  })).toEqual([])
  expect(responses.every(response => response.origin === 'http://localhost:3000' && response.credentials === 'true')).toBe(true)
  await mkdir('output/playwright/f4', { recursive: true })
  await writeFile('output/playwright/f4/live-sanitized.json', JSON.stringify({ runId, browserName, result: 'PASS', api: 'real, no interception', syntheticAccountRetained: true, formWrites: 0, cookiePresent, requests, responses, console: { unexpected: 0, pageErrors: 0 }, blocked: ['nonempty >=11 list/pagination', 'three real Form states and owner/other access', 'deleted Form distinction', 'real disabled/expired token prerequisites'], liveBackendGit: 'UNCONFIRMED' }, null, 2))
})
