import { test, expect } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'

test('F3-LIVE-01 real register → login/return → profile → refresh/new tab → logout', async ({ page, context, browserName }) => {
  const runId = `f3-${Date.now()}`
  const email = `${runId}@example.test`
  const password = ` ${randomBytes(18).toString('hex')} `
  const counts = { me: 0, register: 0, login: 0, patch: 0, logout: 0 }
  const cors: { method: string; origin: string | undefined; credentials: string | undefined }[] = []
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  let preflights = 0
  cdp.on('Network.requestWillBeSent', event => { if (event.request.method === 'OPTIONS' && event.request.url.startsWith('http://localhost:5000/')) preflights++ })
  page.on('request', request => {
    const url = request.url()
    if (!url.startsWith('http://localhost:5000/')) return
    if (url.endsWith('/users/me')) { if (request.method() === 'GET') counts.me++; else if (request.method() === 'PATCH') counts.patch++ }
    if (url.endsWith('/auth/register')) counts.register++
    if (url.endsWith('/auth/login')) counts.login++
    if (url.endsWith('/auth/logout')) counts.logout++
  })
  page.on('response', response => {
    if (!response.url().startsWith('http://localhost:5000/')) return
    const headers = response.headers()
    cors.push({ method: response.request().method(), origin: headers['access-control-allow-origin'], credentials: headers['access-control-allow-credentials'] })
  })
  await page.goto('/profile?from=live#name')
  await expect(page).toHaveURL(/\/login\?redirect=/)
  const loginUrl = page.url()
  await expect(page.getByRole('tab', { name: '登入', exact: true })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: '註冊', exact: true }).click()
  await page.getByRole('textbox', { name: '姓名' }).fill(`F3 ${runId}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(` ${email.toUpperCase()} `)
  await page.getByLabel('密碼', { exact: true }).fill(password)
  const registerResponse = page.waitForResponse(r => r.url().endsWith('/auth/register'))
  await page.getByRole('button', { name: '註冊', exact: true }).click()
  const registered = await registerResponse
  expect(registered.status()).toBe(201)
  expect((await registered.allHeaders())['set-cookie']).toBeUndefined()
  await expect(page.getByRole('tab', { name: '登入', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue(email)
  await expect(page.getByLabel('密碼', { exact: true })).toHaveValue('')
  expect(page.url()).toBe(loginUrl)
  expect((await context.cookies()).some(c => c.name === 'access_token')).toBe(false)
  expect(counts.login).toBe(0)
  await page.getByLabel('密碼', { exact: true }).fill(password)
  const loginResponse = page.waitForResponse(r => r.url().endsWith('/auth/login'))
  await page.getByRole('button', { name: '登入', exact: true }).click()
  const loggedIn = await loginResponse
  expect(loggedIn.status()).toBe(200)
  const setCookie = (await loggedIn.allHeaders())['set-cookie'] ?? ''
  const cookieFlags = { httpOnly: /httponly/i.test(setCookie), sameSiteLax: /samesite=lax/i.test(setCookie), pathRoot: /path=\//i.test(setCookie), hostOnly: !/domain=/i.test(setCookie), secure: /;\s*secure/i.test(setCookie), expires: /expires=/i.test(setCookie), maxAge: /max-age=/i.test(setCookie) }
  expect(cookieFlags).toEqual({ httpOnly: true, sameSiteLax: true, pathRoot: true, hostOnly: true, secure: false, expires: true, maxAge: false })
  await expect(page).toHaveURL('http://localhost:3000/profile?from=live#name')
  expect(counts.me).toBe(1)
  const cookies = await context.cookies()
  const cookie = cookies.find(c => c.name === 'access_token')!
  expect(cookie.httpOnly).toBe(true)
  expect(cookie.domain).toBe('localhost')
  expect(cookie.expires).toBeGreaterThan(Date.now() / 1000)
  // Privileged test-only inspection compares expiry without exporting credentials.
  const claims = JSON.parse(Buffer.from(cookie.value.split('.')[1]!, 'base64url').toString()) as { exp: number }
  const wireExpires = Date.parse(/expires=([^;]+)/i.exec(setCookie)![1]!) / 1000
  expect(wireExpires).toBe(claims.exp)
  expect(await page.evaluate(() => document.cookie.includes('access_token'))).toBe(false)
  const updated = `已更新 ${runId} 🧪`
  await page.getByRole('textbox', { name: '姓名' }).fill(`\u0085 ${updated} \u0085`)
  const patchResponse = page.waitForResponse(r => r.url().endsWith('/users/me') && r.request().method() === 'PATCH')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  expect((await patchResponse).status()).toBe(200)
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(updated)
  await expect(page.getByRole('button', { name: '使用者選單' })).toContainText(updated)
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
  expect(counts.me).toBe(1)
  await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click()
  await expect(page.getByRole('heading', { name: `歡迎，${updated}` })).toBeVisible()
  await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '個人資訊', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(updated)
  expect(counts.me).toBe(1)
  await page.reload()
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(updated)
  expect(counts.me).toBe(2)
  const second = await context.newPage()
  let secondMe = 0
  second.on('request', request => { if (request.url().endsWith('/users/me')) secondMe++ })
  await second.goto('http://localhost:3000/profile')
  await expect(second.getByRole('textbox', { name: '姓名' })).toHaveValue(updated)
  expect(secondMe).toBe(1)
  await second.close()
  await page.getByRole('button', { name: '使用者選單' }).click()
  const logoutResponse = page.waitForResponse(r => r.url().endsWith('/auth/logout'))
  await page.getByRole('button', { name: '登出', exact: true }).click()
  expect((await logoutResponse).status()).toBe(204)
  await expect(page).toHaveURL('http://localhost:3000/login')
  expect((await context.cookies()).some(c => c.name === 'access_token')).toBe(false)
  expect(counts).toEqual({ me: 2, register: 1, login: 1, patch: 1, logout: 1 })
  expect(preflights).toBeGreaterThanOrEqual(2)
  expect(cors.every(row => row.origin === 'http://localhost:3000' && row.credentials === 'true')).toBe(true)
  await mkdir('output/playwright/f3', { recursive: true })
  await writeFile('output/playwright/f3/live-normal-sanitized.json', JSON.stringify({ runId, browserName, counts, secondMe, preflights, cookieFlags, wireExpiresMatchesJwt: wireExpires === claims.exp, browserClockAdjustmentSeconds: cookie.expires - wireExpires, cors, result: 'PASS', dataRetained: true }, null, 2))
})
