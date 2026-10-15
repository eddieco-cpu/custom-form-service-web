import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.test', displayName: '合成姓名', avatarUrl: null }
const headers = { 'access-control-allow-origin': 'http://localhost:3000', 'access-control-allow-credentials': 'true' }
const error = (code: string, details?: { path: string; code: string; message: string }[]) => ({ error: { code, message: '合成錯誤', ...(details ? { details } : {}) } })
function gate() { let release!: () => void; const promise = new Promise<void>(r => { release = r }); return { promise, release } }
type Reply = (route: Route) => Promise<void>
async function mock(page: Page, initial: unknown = user) {
  const state = { me: 0, patch: 0, login: 0, register: 0, logout: 0, completed: 0, meReply: undefined as Reply | undefined, patchReply: undefined as Reply | undefined, loginReply: undefined as Reply | undefined, registerReply: undefined as Reply | undefined, logoutReply: undefined as Reply | undefined }
  await page.route('http://localhost:5000/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()
    if (method === 'OPTIONS') { await route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST,PATCH', 'access-control-allow-headers': 'content-type' } }); return }
    try {
      if (path.endsWith('f3-public-fixture')) await route.fulfill({ status: 200, headers, body: '公開內容已完成（合成）' })
      else if (path.endsWith('/users/me') && method === 'GET') { state.me++; if (state.meReply) await state.meReply(route); else await route.fulfill({ status: initial === null ? 401 : 200, headers, json: initial === null ? error('AUTH_REQUIRED') : initial }) }
      else if (path.endsWith('/users/me') && method === 'PATCH') { state.patch++; if (state.patchReply) await state.patchReply(route); else await route.fulfill({ status: 200, headers, json: { ...user, displayName: (route.request().postDataJSON() as { displayName: string }).displayName } }) }
      else if (path.endsWith('/auth/login')) { state.login++; if (state.loginReply) await state.loginReply(route); else await route.fulfill({ status: 200, headers, json: user }) }
      else if (path.endsWith('/auth/register')) { state.register++; if (state.registerReply) await state.registerReply(route); else await route.fulfill({ status: 201, headers, json: user }) }
      else if (path.endsWith('/auth/logout')) { state.logout++; if (state.logoutReply) await state.logoutReply(route); else await route.fulfill({ status: 204, headers }) }
      // F9 regression runs against the completed F4 list after this F3 login-return case.
      else if (path === '/api/v1/forms' && method === 'GET') await route.fulfill({ status: 200, headers, json: { items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } } })
      else throw new Error(`Unexpected fixture request: ${method} ${path}`)
    }
    finally { state.completed++ }
  })
  return state
}
const nav = (page: Page, name: string) => page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name, exact: true })
async function openProfile(page: Page) { await page.goto('/profile'); await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(user.displayName, { timeout: 30_000 }) }
async function loginInput(page: Page) { await page.getByRole('textbox', { name: 'Email' }).fill(user.email); await page.getByLabel('密碼', { exact: true }).fill('x'.repeat(10)) }
async function openUserMenu(page: Page) { const trigger = page.getByRole('button', { name: '使用者選單' }); if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click(); await expect(page.getByRole('button', { name: '登出', exact: true })).toBeVisible() }
function answerDialog(page: Page, accept: boolean) { return new Promise<void>(resolve => { page.once('dialog', async dialog => { await (accept ? dialog.accept() : dialog.dismiss()); resolve() }) }) }

test('F3-B01 shared bootstrap/SPA, normalized no-op, whitelist PATCH and desktop/mobile avatar fallback', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const state = await mock(page, { ...user, avatarUrl: 'http://localhost:3000/missing-avatar.png' })
  await openProfile(page)
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '使用者選單' }).getByLabel('預設頭像')).toBeVisible()
  await page.getByRole('textbox', { name: '姓名' }).fill(` ${user.displayName}\u0085`)
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
  expect(state.patch).toBe(0)
  let body: unknown
  state.patchReply = async route => { body = route.request().postDataJSON(); await route.fulfill({ status: 200, headers, json: { ...user, displayName: '🧪'.repeat(100) } }) }
  await page.getByRole('textbox', { name: '姓名' }).fill('🧪'.repeat(100))
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
  expect(body).toEqual({ displayName: '🧪'.repeat(100) }); expect(state.me).toBe(1)
  await page.screenshot({ path: info.outputPath('desktop.png') })
  await nav(page, '首頁').click(); await expect(page.getByRole('heading', { name: /^歡迎/ })).toBeVisible()
  expect(state.me).toBe(1)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '展開導覽' }).click()
  const mobile = page.getByRole('navigation', { name: '手機導覽' })
  await expect(mobile.getByRole('button')).toHaveText(['建立表單', '我的表單', '個人資訊', '首頁'])
  await mobile.getByRole('button', { name: '個人資訊' }).click()
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue('🧪'.repeat(100))
  await page.getByRole('button', { name: '使用者選單' }).click()
  await expect(page.getByText('🧪'.repeat(100), { exact: true }).last()).toBeVisible()
  await page.getByRole('button', { name: '登出', exact: true }).evaluate(async element => { await Promise.all(element.closest('[data-slot="content"]')?.getAnimations({ subtree: true }).map(animation => animation.finished) ?? []) })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('mobile.png') })
})

test('F3-B02 bootstrap 401 returns full URL and anonymous Header nav chooses clicked target without more me', async ({ page }) => {
  const state = await mock(page, null)
  await page.goto('/profile?q=a#name'); await expect(page).toHaveURL(/\/login\?redirect=/)
  expect(new URL(page.url()).searchParams.get('redirect')).toBe('/profile?q=a#name')
  await nav(page, '我的表單').click()
  await expect(page).toHaveURL('http://localhost:3000/login?redirect=/forms')
  expect(new URL(page.url()).searchParams.get('redirect')).toBe('/forms')
  expect(state.me).toBe(1); await expect(page.getByRole('button', { name: '使用者選單' })).toHaveCount(0)
  await loginInput(page); await page.getByRole('button', { name: '登入', exact: true }).click()
  await expect(page).toHaveURL('http://localhost:3000/forms'); expect(state.me).toBe(1)
})

test('F3-B03 unknown bootstrap retries only explicitly and never builds a writable blank Profile', async ({ page }) => {
  const state = await mock(page)
  state.meReply = async route => { await route.fulfill({ status: 500, headers, json: error('INTERNAL_SERVER_ERROR') }) }
  await page.goto('/profile'); await expect(page.getByRole('alert')).toContainText('載入失敗')
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveCount(0)
  await nav(page, '首頁').click(); await expect(page.getByRole('alert')).toBeVisible(); expect(state.me).toBe(1)
  state.meReply = async route => { await route.fulfill({ status: 200, headers, json: user }) }
  await page.getByRole('button', { name: '重試', exact: true }).click()
  await expect(page.getByRole('heading', { name: `歡迎，${user.displayName}` })).toBeVisible(); expect(state.me).toBe(2)
})

for (const mode of ['pending', 'disabled', '401', '500'] as const) {
  test(`F3-B04 public fixture independent of me ${mode}`, async ({ page }) => {
    const state = await mock(page)
    const delayed = gate()
    state.meReply = async route => {
      if (mode === 'pending') await delayed.promise
      await route.fulfill({ status: mode === 'pending' ? 200 : mode === 'disabled' ? 403 : mode === '401' ? 401 : 500, headers, json: mode === 'pending' ? user : error(mode === 'disabled' ? 'AUTH_USER_DISABLED' : mode === '401' ? 'AUTH_REQUIRED' : 'INTERNAL_SERVER_ERROR') })
    }
    await page.goto('/f3-public')
    await expect(page.getByTestId('public-result')).toHaveText('公開內容已完成（合成）')
    expect(page.url()).toBe('http://localhost:3000/f3-public'); expect(state.me).toBe(1)
    delayed.release()
    await expect.poll(() => state.completed).toBe(2)
    await expect(page.getByTestId('public-result')).toBeVisible()
    if (mode === 'disabled') { await page.getByRole('button', { name: '使用者選單' }).click(); await expect(page.getByRole('button', { name: '登出', exact: true })).toBeVisible() }
  })
}

test('F3-B05 tabs/Code Point validation, first error focus, duplicate email/details and credentials remain on login', async ({ page }) => {
  const state = await mock(page, null)
  await page.goto('/login?redirect=%2Fprofile')
  await page.getByRole('tab', { name: '註冊', exact: true }).click()
  await page.getByRole('button', { name: '註冊', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '姓名' })).toBeFocused(); expect(state.register).toBe(0)
  await page.getByRole('textbox', { name: '姓名' }).fill('🧪'.repeat(101))
  await loginInput(page); await page.getByRole('button', { name: '註冊', exact: true }).click()
  expect(state.register).toBe(0)
  state.registerReply = async route => { await route.fulfill({ status: 409, headers, json: error('USER_EMAIL_ALREADY_EXISTS', [{ path: 'other.path', code: 'INVALID_VALUE', message: '摘要保留' }]) }) }
  await page.getByRole('textbox', { name: '姓名' }).fill('🧪'.repeat(100)); await page.getByRole('button', { name: '註冊', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('other.path：摘要保留')
  await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).last().click()
  await expect(page.getByText('此 Email 已註冊')).toBeVisible()
  await page.getByRole('tab', { name: '登入', exact: true }).click()
  state.loginReply = async route => { await route.fulfill({ status: 401, headers, json: error('AUTH_INVALID_CREDENTIALS') }) }
  await page.getByLabel('密碼', { exact: true }).fill('x')
  await page.getByRole('button', { name: '登入', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Email 或密碼不正確')
  expect(new URL(page.url()).searchParams.get('redirect')).toBe('/profile'); expect(state.login).toBe(1)
})

test('F3-B06 dirty SPA, history/back, refresh beforeunload and Header logout cancellation/single permit', async ({ page }) => {
  const state = await mock(page)
  await page.goto('/'); await expect(page.getByRole('heading', { name: /^歡迎/ })).toBeVisible()
  await nav(page, '個人資訊').click(); await expect(page.getByRole('textbox', { name: '姓名' })).toBeVisible()
  await page.getByRole('textbox', { name: '姓名' }).fill('未保存')
  let dialogs = 0
  const cancel = async (dialog: import('@playwright/test').Dialog) => { dialogs++; await dialog.dismiss() }
  page.on('dialog', cancel)
  await nav(page, '首頁').click(); await expect.poll(() => dialogs).toBe(1); await expect(page).toHaveURL('http://localhost:3000/profile')
  await page.goBack({ timeout: 1000 }).catch(() => {}); await expect.poll(() => dialogs).toBe(2); await expect(page).toHaveURL('http://localhost:3000/profile')
  const refreshing = page.reload({ timeout: 1000 }).catch(() => {})
  await expect.poll(() => dialogs).toBe(3); await refreshing
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue('未保存')
  await page.getByRole('button', { name: '使用者選單' }).click(); await page.getByRole('button', { name: '登出', exact: true }).click()
  expect(state.logout).toBe(0); expect(dialogs).toBe(4)
  page.off('dialog', cancel)
  page.on('dialog', async dialog => { dialogs++; await dialog.accept() })
  await page.getByRole('button', { name: '登出', exact: true }).click()
  await expect(page).toHaveURL('http://localhost:3000/login'); expect(dialogs).toBe(5); expect(state.logout).toBe(1)
})

test('F3-B07 operation Auth 401 Dialog ignores Esc/backdrop; × → dirty cancellation leaves input/invalid session', async ({ page }) => {
  const state = await mock(page)
  state.patchReply = async route => { await route.fulfill({ status: 401, headers, json: error('AUTH_TOKEN_EXPIRED') }) }
  await openProfile(page); await page.getByRole('textbox', { name: '姓名' }).fill('保留輸入')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeVisible()
  await page.mouse.click(5, 400); await expect(page.getByRole('dialog')).toBeVisible()
  const cancelled = answerDialog(page, false)
  await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).first().click()
  await cancelled
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue('保留輸入')
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
  await expect(page.getByText('未登入', { exact: true })).toBeVisible()
  const left = answerDialog(page, true)
  await nav(page, '首頁').click(); await left; await expect(page).toHaveURL(/\/login/)
})

test('F3-B08 disabled login/bootstrap/actions retain original URL/User/input and allow logout', async ({ page }) => {
  const state = await mock(page)
  state.patchReply = async route => { await route.fulfill({ status: 403, headers, json: error('AUTH_USER_DISABLED') }) }
  await openProfile(page); await page.getByRole('textbox', { name: '姓名' }).fill('保留姓名'); await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('帳號已停用')
  await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).last().click()
  await expect(page.getByRole('button', { name: '使用者選單' })).toContainText(user.displayName)
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue('保留姓名')
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: '使用者選單' }).click(); await page.getByRole('button', { name: '登出', exact: true }).click()
  await expect(page).toHaveURL('http://localhost:3000/login')
  state.loginReply = async route => { await route.fulfill({ status: 403, headers, json: error('AUTH_USER_DISABLED') }) }
  await loginInput(page); await page.getByRole('button', { name: '登入', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('帳號已停用，無法登入')
})

for (const mode of ['500', 'network', 'malformed', 'timeout'] as const) {
  test(`F3-B09 Profile ${mode} unknown locks write; failed read/cancel preserve data; adoption unlocks`, async ({ page }) => {
    const state = await mock(page)
    const hold = gate()
    state.patchReply = async route => {
      if (mode === 'network') await route.abort('failed')
      else if (mode === 'malformed') await route.fulfill({ status: 200, headers, json: { invalid: true } })
      else if (mode === 'timeout') { await hold.promise; await route.fulfill({ status: 200, headers, json: user }).catch(() => {}) }
      else await route.fulfill({ status: 500, headers, json: error('INTERNAL_SERVER_ERROR') })
    }
    if (mode === 'timeout') await page.clock.install()
    await openProfile(page); await page.getByRole('textbox', { name: '姓名' }).fill('本地待核對')
    await page.getByRole('button', { name: '保存', exact: true }).click()
    await expect.poll(() => state.patch).toBe(1)
    if (mode === 'timeout') await page.clock.runFor(30_001)
    await expect(page.getByRole('dialog')).toContainText('未能確認操作結果')
    hold.release()
    await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).last().click()
    await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
    state.meReply = async route => { await route.fulfill({ status: 500, headers, json: error('INTERNAL_SERVER_ERROR') }) }
    await page.getByRole('button', { name: '核對目前個人資訊' }).click(); await expect(page.getByRole('alert')).toContainText('載入失敗')
    await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue('本地待核對')
    state.meReply = async route => { await route.fulfill({ status: 200, headers, json: { ...user, displayName: 'Server 姓名' } }) }
    const cancelled = answerDialog(page, false); await page.getByRole('button', { name: '核對目前個人資訊' }).click(); await cancelled
    await expect.poll(() => state.me).toBe(3); await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue('本地待核對')
    const adopted = answerDialog(page, true); await page.getByRole('button', { name: '核對目前個人資訊' }).click(); await adopted
    await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue('Server 姓名')
    await page.getByRole('textbox', { name: '姓名' }).fill('可再保存'); await expect(page.getByRole('button', { name: '保存', exact: true })).toBeEnabled()
    expect(state.patch).toBe(1)
    page.once('dialog', dialog => dialog.accept())
  })
}

test('F3-B10 Login/Register/Logout unknown preserve state and offer explicit safe checks/retries', async ({ page }) => {
  const state = await mock(page, null)
  state.registerReply = async route => { await route.fulfill({ status: 500, headers, json: error('INTERNAL_SERVER_ERROR') }) }
  state.loginReply = async route => { await route.fulfill({ status: 200, headers, json: { invalid: true } }) }
  await page.goto('/login'); await page.getByRole('tab', { name: '註冊', exact: true }).click(); await page.getByRole('textbox', { name: '姓名' }).fill('測試'); await loginInput(page)
  await page.getByRole('button', { name: '註冊', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('未能確認')
  await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).last().click()
  expect(state.register).toBe(1); await page.getByRole('tab', { name: '登入', exact: true }).click()
  await page.getByRole('button', { name: '登入', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('未能確認')
  await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).last().click()
  state.meReply = async route => { await route.fulfill({ status: 200, headers, json: user }) }
  await page.getByRole('button', { name: '核對登入狀態' }).click(); await expect(page.getByRole('heading', { name: /^歡迎/ })).toBeVisible(); expect(state.login).toBe(1)
  state.logoutReply = async route => { await route.fulfill({ status: 500, headers, json: error('INTERNAL_SERVER_ERROR') }) }
  await page.getByRole('button', { name: '使用者選單' }).click(); await page.getByRole('button', { name: '登出', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('未能確認')
  await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).last().click()
  await expect(page.getByRole('button', { name: '使用者選單' })).toContainText(user.displayName); expect(state.logout).toBe(1)
  state.logoutReply = async route => { await route.fulfill({ status: 204, headers }) }
  await openUserMenu(page); await page.getByRole('button', { name: '登出', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/login'); expect(state.logout).toBe(2)
})

test('F3-B11 late explicit me / PATCH after leaving have no User, toast or route effects', async ({ page }) => {
  const state = await mock(page)
  const patchGate = gate()
  state.patchReply = async route => { await patchGate.promise; await route.fulfill({ status: 200, headers, json: { ...user, displayName: '晚回姓名' } }) }
  await openProfile(page); await page.getByRole('textbox', { name: '姓名' }).fill('待保存'); await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '姓名' })).toBeDisabled()
  page.once('dialog', dialog => dialog.accept()); await nav(page, '首頁').click(); await expect(page.getByRole('heading', { name: `歡迎，${user.displayName}` })).toBeVisible()
  patchGate.release(); await expect.poll(() => state.completed).toBe(2)
  await page.getByRole('button', { name: '使用者選單' }).click()
  await expect(page.getByRole('button', { name: '登出', exact: true })).toBeEnabled()
  await expect(page.getByText('個人資訊已更新', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '使用者選單' })).toContainText(user.displayName)
  expect(page.url()).toBe('http://localhost:3000/')
})

test('F3-B13 late reconciliation after leaving preserves the newer page and shared User', async ({ page }) => {
  const state = await mock(page)
  state.patchReply = async route => { await route.fulfill({ status: 500, headers, json: error('INTERNAL_SERVER_ERROR') }) }
  await openProfile(page); await page.getByRole('textbox', { name: '姓名' }).fill('待核對'); await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible(); await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).last().click()
  const delayed = gate()
  state.meReply = async route => { await delayed.promise; await route.fulfill({ status: 200, headers, json: { ...user, displayName: '過期核對' } }) }
  await page.getByRole('button', { name: '核對目前個人資訊' }).click(); await expect.poll(() => state.me).toBe(2)
  page.once('dialog', dialog => dialog.accept()); await nav(page, '首頁').click(); await expect(page.getByRole('heading', { name: /^歡迎/ })).toBeVisible()
  delayed.release(); await expect.poll(() => state.completed).toBe(3)
  // A subsequent SPA navigation awaits the same settled Auth state after the callback.
  await nav(page, '我的表單').click(); await expect(page.getByRole('heading', { name: '我的表單' })).toBeVisible()
  await expect(page.getByRole('button', { name: '使用者選單' })).toContainText(user.displayName)
})

test('F3-B14 disabled bootstrap creates no Profile model and offers logout; pending logout cannot change later route', async ({ page }) => {
  const state = await mock(page)
  state.meReply = async route => { await route.fulfill({ status: 403, headers, json: error('AUTH_USER_DISABLED') }) }
  await page.goto('/profile'); await expect(page.getByRole('alert')).toContainText('帳號已停用')
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveCount(0)
  const delayed = gate()
  state.logoutReply = async route => { await delayed.promise; await route.fulfill({ status: 204, headers }) }
  await page.getByRole('button', { name: '使用者選單' }).click(); await page.getByRole('button', { name: '登出', exact: true }).click()
  await expect.poll(() => state.logout).toBe(1)
  await nav(page, '首頁').click(); await expect(page).toHaveURL('http://localhost:3000/'); await expect(page.getByRole('alert')).toBeVisible()
  delayed.release(); await expect.poll(() => state.completed).toBe(2)
  await page.getByRole('button', { name: '使用者選單' }).click(); await expect(page.getByRole('button', { name: '登出', exact: true })).toBeEnabled()
  expect(page.url()).toBe('http://localhost:3000/'); await expect(page.getByRole('button', { name: '使用者選單' })).toContainText('登入中')
})

test('F3-B12 guest redirect rejects external/unknown/login loops and keeps a valid query/hash', async ({ page }) => {
  await mock(page)
  for (const redirect of ['//evil.test', '/login', '/unknown', '/%5cevil.test']) {
    await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`); await expect(page).toHaveURL('http://localhost:3000/')
  }
  await page.goto('/login?redirect=%2Fprofile%3Fx%3D1%23name'); await expect(page).toHaveURL('http://localhost:3000/profile?x=1#name')
})
