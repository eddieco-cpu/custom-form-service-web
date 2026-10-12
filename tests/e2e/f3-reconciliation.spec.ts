import { test, expect } from '@playwright/test'
test('F3-B15 explicit Profile verification Auth 401 invalidates session and uses Dialog → dirty → login', async ({ page }) => {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.test', displayName: '初始姓名', avatarUrl: null }
  let me = 0
  const headers = { 'access-control-allow-origin': 'http://localhost:3000', 'access-control-allow-credentials': 'true' }
  await page.route('http://localhost:5000/api/v1/users/me', async route => {
    if (route.request().method() === 'PATCH') await route.fulfill({ status: 500, headers, json: { error: { code: 'INTERNAL_SERVER_ERROR', message: 'fixture' } } })
    else { me++; await route.fulfill({ status: me === 1 ? 200 : 401, headers, json: me === 1 ? user : { error: { code: 'AUTH_REQUIRED', message: 'fixture' } } }) }
  })
  await page.goto('/profile?q=verify#name')
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(user.displayName, { timeout: 30_000 })
  await page.getByRole('textbox', { name: '姓名' }).fill('保留待核對輸入')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('未能確認')
  await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).last().click()
  await page.getByRole('button', { name: '核對目前個人資訊' }).click()
  await expect(page.getByRole('dialog')).toContainText('需要有效登入身分')
  await expect(page.getByRole('textbox', { name: '姓名', includeHidden: true })).toHaveValue('保留待核對輸入')
  await expect(page.getByText('未登入', { exact: true })).toBeVisible()
  const confirmed = new Promise<void>(resolve => { page.once('dialog', async dialog => { await dialog.accept(); resolve() }) })
  await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).last().click()
  await confirmed; await expect(page).toHaveURL(/\/login\?redirect=/)
  expect(new URL(page.url()).searchParams.get('redirect')).toBe('/profile?q=verify#name')
  expect(me).toBe(2)
})

test('F3-B16 verified different User is adopted once and releases the Profile unknown gate', async ({ page }) => {
  const original = { id: '11111111-1111-4111-8111-111111111111', email: 'fixture-a@example.test', displayName: '原身分', avatarUrl: null }
  const current = { ...original, id: '22222222-2222-4222-8222-222222222222', email: 'fixture-b@example.test', displayName: '新身分' }
  let me = 0
  const headers = { 'access-control-allow-origin': 'http://localhost:3000', 'access-control-allow-credentials': 'true' }
  await page.route('http://localhost:5000/api/v1/users/me', async route => {
    if (route.request().method() === 'PATCH') await route.fulfill({ status: 500, headers, json: { error: { code: 'INTERNAL_SERVER_ERROR', message: 'fixture' } } })
    else { me++; await route.fulfill({ status: 200, headers, json: me === 1 ? original : current }) }
  })
  await page.goto('/profile')
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(original.displayName, { timeout: 30_000 })
  await page.getByRole('textbox', { name: '姓名' }).fill('未確認的姓名'); await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('未能確認')
  await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).last().click()
  const confirmed = new Promise<void>(resolve => { page.once('dialog', async dialog => { await dialog.accept(); resolve() }) })
  await page.getByRole('button', { name: '核對目前個人資訊' }).click(); await confirmed
  await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(current.displayName)
  await expect(page.getByRole('button', { name: '使用者選單' })).toContainText(current.displayName)
  await page.getByRole('textbox', { name: '姓名' }).fill('可保存的新姓名')
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeEnabled()
  expect(me).toBe(2)
  page.once('dialog', dialog => dialog.accept())
})
