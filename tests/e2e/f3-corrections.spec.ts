import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const api = 'http://localhost:5000/api/v1'
const headers = { 'access-control-allow-origin': 'http://localhost:3000', 'access-control-allow-credentials': 'true' }
const a = { id: '11111111-1111-4111-8111-111111111111', email: 'correction-a@example.test', displayName: '身分 A', avatarUrl: null }
const b = { ...a, id: '22222222-2222-4222-8222-222222222222', email: 'correction-b@example.test', displayName: '身分 B' }
const error = (code: string) => ({ error: { code, message: 'isolated correction fixture' } })
const save = (page: Page) => page.getByRole('button', { name: '保存', exact: true })
const name = (page: Page) => page.getByRole('textbox', { name: '姓名' })
const nav = (page: Page, label: string) => page.getByRole('navigation', { name: '主要導覽' }).getByRole('button', { name: label, exact: true })
async function close(page: Page, method: 'footer' | '×' = 'footer') {
  const dialog = page.getByRole('dialog', { name: '操作訊息', exact: true })
  const buttons = dialog.getByRole('button', { name: '關閉', exact: true })
  await (method === 'footer' ? buttons.last() : buttons.first()).click()
  await expect(dialog).toHaveCount(0)
}
function confirm(page: Page, accept = true) {
  return new Promise<void>(resolve => { page.once('dialog', async dialog => { if (accept) await dialog.accept(); else await dialog.dismiss(); resolve() }) })
}

for (const adoption of ['GET', 'PATCH'] as const) {
  test(`F3-R1 ${adoption} adopts B; next unknown B write remains locked after SPA remount`, async ({ page }, info) => {
    let me = 0; let patch = 0
    await page.route(`${api}/**`, async route => {
      if (route.request().url() !== `${api}/users/me`) throw new Error('Unexpected API')
      if (route.request().method() === 'PATCH') {
        patch++
        await route.fulfill({ status: adoption === 'PATCH' && patch === 1 ? 200 : 500, headers, json: adoption === 'PATCH' && patch === 1 ? b : error('INTERNAL_SERVER_ERROR') })
      }
      else { me++; await route.fulfill({ status: 200, headers, json: me === 1 ? a : b }) }
    })
    await page.goto('/profile')
    await expect(name(page)).toHaveValue(a.displayName, { timeout: 30_000 })
    await name(page).fill('A 寫入'); await save(page).click()
    if (adoption === 'GET') {
      await expect(page.getByRole('dialog')).toContainText('未能確認'); await close(page)
      const adopted = confirm(page)
      await page.getByRole('button', { name: '核對目前個人資訊' }).click(); await adopted
    }
    await expect(name(page)).toHaveValue(b.displayName)
    await expect(page.getByRole('button', { name: '使用者選單' })).toContainText(b.displayName)
    await name(page).fill('B 結果不明'); await save(page).click()
    await expect(page.getByRole('dialog')).toContainText('未能確認'); await close(page)
    const left = confirm(page); await nav(page, '首頁').click(); await left
    await expect(page.getByRole('heading', { name: `歡迎，${b.displayName}` })).toBeVisible()
    await nav(page, '個人資訊').click(); await expect(name(page)).toHaveValue(b.displayName)
    await name(page).fill('不能再次 PATCH')
    await info.attach('remount-gate', { body: JSON.stringify({ adoption, me, patch, saveDisabled: await save(page).isDisabled(), reconciliationVisible: await page.getByRole('button', { name: '核對目前個人資訊' }).isVisible() }), contentType: 'application/json' })
    await expect(save(page)).toBeDisabled()
    await expect(page.getByRole('button', { name: '核對目前個人資訊' })).toBeVisible()
    // Keyboard submission must also be blocked, not just the visible button.
    await name(page).press('Enter')
    expect(patch).toBe(2); expect(me).toBe(adoption === 'GET' ? 2 : 1)
    const checked = confirm(page); await page.getByRole('button', { name: '核對目前個人資訊' }).click(); await checked
    await expect(name(page)).toHaveValue(b.displayName)
    await name(page).fill('核對後可保存'); await expect(save(page)).toBeEnabled()
    expect(patch).toBe(2)
    page.once('dialog', dialog => dialog.accept())
  })
}

for (const method of ['footer', '×'] as const) {
  test(`F3-R2 Profile ${method} restores the enabled save trigger`, async ({ page }, info) => {
    await page.route(`${api}/**`, route => route.fulfill({ status: route.request().method() === 'PATCH' ? 403 : 200, headers, json: route.request().method() === 'PATCH' ? error('AUTH_USER_DISABLED') : a }))
    await page.goto('/profile')
    await expect(name(page)).toHaveValue(a.displayName, { timeout: 30_000 })
    await name(page).fill('保留輸入'); await save(page).click()
    await expect(page.getByRole('dialog')).toContainText('帳號已停用')
    await close(page, method)
    await info.attach('close-focus', { body: JSON.stringify(await page.evaluate(() => ({ tag: document.activeElement?.tagName, text: document.activeElement?.textContent, connected: document.activeElement?.isConnected }))), contentType: 'application/json' })
    await expect(save(page)).toBeFocused()
    await expect(name(page)).toHaveValue('保留輸入')
    page.once('dialog', dialog => dialog.accept())
  })
}

for (const method of ['footer', '×'] as const) {
  for (const leaving of [false, true]) {
    test(`F3-R2 Auth ${method} dirty ${leaving ? 'accept focuses destination' : 'cancel focuses available heading'}`, async ({ page }) => {
      await page.route(`${api}/**`, route => route.fulfill({ status: route.request().method() === 'PATCH' ? 401 : 200, headers, json: route.request().method() === 'PATCH' ? error('AUTH_TOKEN_EXPIRED') : a }))
      await page.goto('/profile?q=focus#name'); await expect(name(page)).toHaveValue(a.displayName, { timeout: 30_000 })
      await name(page).fill('dirty 取消保留'); await save(page).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      const answered = confirm(page, leaving); await close(page, method); await answered
      if (leaving) {
        await expect(page).toHaveURL(/\/login\?redirect=/)
        await expect(page.getByRole('heading', { name: '帳號', exact: true })).toBeFocused()
        await expect(name(page)).toHaveCount(0)
      }
      else {
        await expect(page).toHaveURL('http://localhost:3000/profile?q=focus#name')
        await expect(name(page)).toHaveValue('dirty 取消保留'); await expect(save(page)).toBeDisabled()
        await expect(page.getByRole('heading', { name: '個人資訊', exact: true })).toBeFocused()
        page.once('dialog', dialog => dialog.accept())
      }
    })
  }
}

for (const action of ['登入', '註冊'] as const) {
  test(`F3-R2 ${action} Dialog restores submit trigger and preserves input`, async ({ page }) => {
    await page.route(`${api}/**`, route => route.fulfill({ status: route.request().url().endsWith('/users/me') ? 401 : action === '登入' ? 401 : 409, headers, json: error(route.request().url().endsWith('/users/me') ? 'AUTH_REQUIRED' : action === '登入' ? 'AUTH_INVALID_CREDENTIALS' : 'USER_EMAIL_ALREADY_EXISTS') }))
    await page.goto('/login')
    if (action === '註冊') { await page.getByRole('tab', { name: action, exact: true }).click(); await name(page).fill('合成姓名') }
    await page.getByRole('textbox', { name: 'Email' }).fill(a.email)
    await page.getByLabel('密碼', { exact: true }).fill('synthetic-password')
    const submit = page.getByRole('button', { name: action, exact: true })
    await submit.click(); await expect(page.getByRole('dialog')).toBeVisible()
    await close(page, action === '登入' ? 'footer' : '×')
    await expect(submit).toBeFocused()
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue(a.email)
    await expect(page.getByLabel('密碼', { exact: true })).toHaveValue('synthetic-password')
  })
}

for (const method of ['footer', '×'] as const) {
  test(`F3-R2 Logout ${method} restores ${method === 'footer' ? 'original popover trigger' : 'fallback after trigger unmount'}`, async ({ page }) => {
    await page.route(`${api}/**`, route => route.fulfill({ status: route.request().url().endsWith('/auth/logout') ? 500 : 200, headers, json: route.request().url().endsWith('/auth/logout') ? error('INTERNAL_SERVER_ERROR') : a }))
    await page.goto('/'); await expect(page.getByRole('heading', { name: `歡迎，${a.displayName}` })).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: '使用者選單' }).click()
    const logout = page.getByRole('button', { name: '登出', exact: true })
    await logout.click(); await expect(page.getByRole('dialog', { name: '操作訊息', exact: true })).toContainText('未能確認')
    if (method === '×') {
      // Controlled unavailable-trigger case: invoke the actual product menu
      // toggle while the error modal owns focus; no DOM or app-state rewrite.
      await page.getByRole('button', { name: '使用者選單', includeHidden: true }).evaluate(element => (element as HTMLElement).click())
      await expect(logout).toHaveCount(0)
    }
    await close(page, method)
    const userMenu = page.getByRole('button', { name: '使用者選單' })
    await expect(method === 'footer' ? logout : userMenu).toBeFocused()
    await expect(userMenu).toContainText(a.displayName)
  })
}

test('F3-R2 unknown Profile focuses reconciliation when save is disabled', async ({ page }) => {
  await page.route(`${api}/**`, route => route.fulfill({ status: route.request().method() === 'PATCH' ? 500 : 200, headers, json: route.request().method() === 'PATCH' ? error('INTERNAL_SERVER_ERROR') : a }))
  await page.goto('/profile'); await expect(name(page)).toHaveValue(a.displayName, { timeout: 30_000 })
  await name(page).fill('結果不明'); await save(page).click(); await expect(page.getByRole('dialog')).toBeVisible()
  await close(page)
  await expect(save(page)).toBeDisabled()
  await expect(page.getByRole('button', { name: '核對目前個人資訊' })).toBeFocused()
  page.once('dialog', dialog => dialog.accept())
})

test('F3-R2 keyboard submit returns focus to the original input', async ({ page }) => {
  await page.route(`${api}/**`, route => route.fulfill({ status: route.request().method() === 'PATCH' ? 403 : 200, headers, json: route.request().method() === 'PATCH' ? error('AUTH_USER_DISABLED') : a }))
  await page.goto('/profile'); await expect(name(page)).toHaveValue(a.displayName, { timeout: 30_000 })
  await name(page).fill('鍵盤原控制'); await name(page).press('Enter'); await expect(page.getByRole('dialog')).toBeVisible()
  await close(page); await expect(name(page)).toBeFocused()
  page.once('dialog', dialog => dialog.accept())
})

test('F3-R1 cancelled candidate B cannot switch key or clear unknown on SPA remount', async ({ page }) => {
  let me = 0; let patch = 0
  await page.route(`${api}/**`, async route => {
    if (route.request().method() === 'PATCH') { patch++; await route.fulfill({ status: 500, headers, json: error('INTERNAL_SERVER_ERROR') }) }
    else { me++; await route.fulfill({ status: 200, headers, json: me === 1 ? a : b }) }
  })
  await page.goto('/profile'); await expect(name(page)).toHaveValue(a.displayName, { timeout: 30_000 })
  await name(page).fill('A 未核對'); await save(page).click(); await expect(page.getByRole('dialog')).toBeVisible(); await close(page)
  const cancelled = confirm(page, false); await page.getByRole('button', { name: '核對目前個人資訊' }).click(); await cancelled
  await expect(name(page)).toHaveValue('A 未核對')
  await expect(page.getByRole('button', { name: '使用者選單' })).toContainText(a.displayName)
  const left = confirm(page); await nav(page, '首頁').click(); await left
  await expect(page).toHaveURL('http://localhost:3000/')
  await nav(page, '個人資訊').click(); await expect(name(page)).toHaveValue(a.displayName)
  await name(page).fill('仍不可寫'); await expect(save(page)).toBeDisabled()
  await expect(page.getByRole('button', { name: '核對目前個人資訊' })).toBeVisible()
  expect(me).toBe(2); expect(patch).toBe(1)
  page.once('dialog', dialog => dialog.accept())
})

test('F3-R1 Profile bootstrap retry adopts a session before unknown write and SPA remount', async ({ page }) => {
  let me = 0; let patch = 0
  await page.route(`${api}/**`, async route => {
    if (route.request().method() === 'PATCH') { patch++; await route.fulfill({ status: 500, headers, json: error('INTERNAL_SERVER_ERROR') }) }
    else { me++; await route.fulfill({ status: me === 1 ? 500 : 200, headers, json: me === 1 ? error('INTERNAL_SERVER_ERROR') : a }) }
  })
  await page.goto('/profile'); await expect(page.getByRole('alert')).toContainText('載入失敗', { timeout: 30_000 })
  await expect(name(page)).toHaveCount(0)
  await page.getByRole('button', { name: '重試', exact: true }).click(); await expect(name(page)).toHaveValue(a.displayName)
  await name(page).fill('首次可靠採用後未確認'); await save(page).click(); await expect(page.getByRole('dialog')).toBeVisible(); await close(page)
  const left = confirm(page); await nav(page, '首頁').click(); await left; await expect(page).toHaveURL('http://localhost:3000/')
  await nav(page, '個人資訊').click(); await expect(name(page)).toHaveValue(a.displayName)
  await name(page).fill('不能盲目再保存'); await expect(save(page)).toBeDisabled()
  await expect(page.getByRole('button', { name: '核對目前個人資訊' })).toBeVisible()
  expect(me).toBe(2); expect(patch).toBe(1)
  page.once('dialog', dialog => dialog.accept())
})
