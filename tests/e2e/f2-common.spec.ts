import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { bigInteger, errorText, formText, longDecimal, receiptText, statisticsText } from '../fixtures/f2/payloads'

async function reconcileAndWait(page: Page, accept: boolean, completed: number) {
  const handled = page.waitForEvent('dialog').then(async dialog => {
    expect(dialog.type()).toBe('confirm')
    await (accept ? dialog.accept() : dialog.dismiss())
  })
  await page.getByTestId('reconcile').click()
  await handled
  await expect(page.getByTestId('completed-reconciles')).toHaveText(`${completed}|${accept ? 'adopted' : 'not-adopted'}`)
}

test.beforeEach(async ({ page }) => {
  await page.route('http://localhost:5000/**', route => route.fulfill({ status: 500, contentType: 'application/json', body: errorText('INTERNAL_SERVER_ERROR') }))
})
test('numeric gate: native fetch raw DTOs and exact outgoing tokens', async ({ page, browser }) => {
  const tokens = [longDecimal, bigInteger, '1e-101', '1e400', '1e80', '1' + '0'.repeat(79) + '1', '-0', '0.1000000000000000000001', '1e131071', '1e-16383', '0e1073741823']
  const bodies: string[] = []
  let token = ''
  await page.route('**/fixture-receipt', route => { bodies.push(route.request().postData() ?? ''); return route.fulfill({ status: 201, contentType: 'application/json', body: receiptText(token) }) })
  await page.route('**/fixture-form', route => route.fulfill({ contentType: 'application/json', body: formText(token) }))
  await page.route('**/fixture-statistics', route => route.fulfill({ contentType: 'application/json', body: statisticsText(token) }))
  await page.goto('/scope/a')
  for (token of tokens) {
    await page.getByTestId('raw').fill(token)
    await page.getByTestId('gate').click()
    await expect(page.getByTestId('gate-result')).toHaveText(`${token}|${token}|${token}|-1`)
    expect(bodies.at(-1)).toBe(`{"value":${token}}`)
  }
  expect(bodies).toHaveLength(tokens.length)
  for (const invalid of ['1e131072', '1e-16384', '0e1073741824', '0e-1073741824']) {
    await page.getByTestId('raw').fill(invalid); await page.getByTestId('gate').click()
    await expect(page.getByTestId('gate-result')).toHaveText('local-invalid')
    expect(bodies).toHaveLength(tokens.length)
  }
  test.info().annotations.push({ type: 'browser-version', description: browser.version() })
  test.info().annotations.push({ type: 'exact-wire-bodies', description: JSON.stringify(bodies) })
  await page.getByTestId('clean').click()
})
test('pending mutual exclusion, unknown lock, cancelled adoption and modal close paths', async ({ page }) => {
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve })
  let writes = 0; let visibility = 0; let publishes = 0
  let reconciliationFails = false
  await page.route('**/fixture-write', async route => { writes++; await pending; await route.fulfill({ status: 500, contentType: 'application/json', body: errorText('INTERNAL_SERVER_ERROR') }) })
  await page.route('**/fixture-visibility', route => { visibility++; return route.fulfill({ contentType: 'application/json', body: '{"count":1}' }) })
  await page.route('**/fixture-publish', route => { publishes++; return route.fulfill({ contentType: 'application/json', body: '{"count":1}' }) })
  await page.route('**/fixture-reconcile', route => route.fulfill({ status: reconciliationFails ? 500 : 200, contentType: 'application/json', body: reconciliationFails ? errorText('INTERNAL_SERVER_ERROR') : '{"count":1}' }))
  await page.goto('/scope/a'); await page.getByTestId('raw').fill('unsaved')
  await page.getByTestId('save').click(); await expect(page.getByTestId('raw')).toBeDisabled()
  await page.getByTestId('visibility').click(); expect(visibility).toBe(0)
  release(); await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByTestId('raw')).toHaveValue('unsaved'); await expect(page.getByTestId('raw')).toBeEnabled()
  await expect(page.getByTestId('save')).toBeDisabled(); expect(writes).toBe(1)
  await expect(page.getByTestId('publish')).toBeDisabled(); expect(publishes).toBe(0)
  await expect(page.getByTestId('reconcile')).toBeEnabled(); await expect(page.getByTestId('away')).toBeVisible()
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeVisible()
  await page.mouse.click(5, 5); await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '關閉', exact: true }).click()
  await expect(page.getByTestId('close-count')).toHaveText('1')
  await reconcileAndWait(page, false, 1)
  await expect(page.getByTestId('save')).toBeDisabled(); await expect(page.getByTestId('publish')).toBeDisabled()
  await expect(page.getByTestId('raw')).toHaveValue('unsaved')
  reconciliationFails = true
  await page.getByTestId('reconcile').click()
  await expect(page.getByTestId('completed-reconciles')).toHaveText('2|read-failure')
  await expect(page.getByTestId('save')).toBeDisabled(); await expect(page.getByTestId('publish')).toBeDisabled()
  await expect(page.getByTestId('raw')).toHaveValue('unsaved')
  const leaveCancelled = page.waitForEvent('dialog').then(dialog => dialog.dismiss())
  await page.getByTestId('away').click(); await leaveCancelled; await expect(page).toHaveURL(/scope\/a$/)
  reconciliationFails = false
  await reconcileAndWait(page, true, 3)
  await expect(page.getByTestId('save')).toBeEnabled(); await expect(page.getByTestId('publish')).toBeEnabled()
  await expect(page.getByTestId('raw')).toHaveValue('adopted')
  const published = page.waitForResponse('**/fixture-publish')
  await page.getByTestId('publish').click(); await published
  await expect(page.getByTestId('publish-state')).toHaveText('false|false')
  expect(publishes).toBe(1)
  await page.getByTestId('save').click(); await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByTestId('close-count')).toHaveText('2')
  await reconcileAndWait(page, true, 4)
})
test('stale response/error/session and old finally do not update current page', async ({ page }) => {
  let releaseOld!: () => void; let releaseNew!: () => void
  const old = new Promise<void>(resolve => { releaseOld = resolve }); const next = new Promise<void>(resolve => { releaseNew = resolve })
  await page.route('**/fixture-slow', async route => { await old; await route.fulfill({ status: 401, contentType: 'application/json', body: errorText('AUTH_REQUIRED') }) })
  await page.route('**/fixture-next', async route => { await next; await route.fulfill({ contentType: 'application/json', body: '{"count":7}' }) })
  await page.goto('/scope/a'); await page.getByTestId('slow').click(); await page.getByTestId('next').click()
  releaseOld(); await expect(page.getByTestId('completed-reads')).toHaveText('1|stale')
  await expect(page.getByTestId('loading')).toHaveText('true'); await expect(page.getByRole('alert')).toHaveCount(0)
  releaseNew(); await expect(page.getByTestId('read')).toHaveText('7'); await expect(page.getByTestId('loading')).toHaveText('false')
  let releaseSession!: () => void; const sessionPending = new Promise<void>(resolve => { releaseSession = resolve })
  await page.route('**/fixture-slow', async route => { await sessionPending; await route.fulfill({ contentType: 'application/json', body: '{"count":99}' }) })
  await page.getByTestId('slow').click(); await page.getByTestId('session').click(); releaseSession()
  await expect(page.getByTestId('completed-reads')).toHaveText('3|stale')
  await expect(page.getByTestId('read')).toHaveText('7'); await expect(page.getByTestId('loading')).toHaveText('false')
  let releaseResource!: () => void; const resourcePending = new Promise<void>(resolve => { releaseResource = resolve })
  await page.route('**/fixture-slow', async route => { await resourcePending; await route.fulfill({ status: 401, contentType: 'application/json', body: errorText('AUTH_REQUIRED') }) })
  await page.getByTestId('slow').click(); await page.getByTestId('other-id').click(); await expect(page).toHaveURL(/scope\/b$/)
  releaseResource(); await expect(page.getByTestId('completed-reads')).toHaveText('4|stale')
  await expect(page.getByTestId('read')).toHaveText('7')
  await expect(page.getByRole('alert')).toHaveCount(0)
})
test('dirty route updates, replacement, one action redirect, history and reload prompts', async ({ page }) => {
  await page.goto('/scope/a'); await page.getByTestId('raw').fill('dirty')
  page.once('dialog', dialog => dialog.dismiss()); await page.getByTestId('other-id').click()
  await expect(page).toHaveURL(/scope\/a$/); await expect(page.getByTestId('raw')).toHaveValue('dirty')
  page.once('dialog', dialog => dialog.dismiss()); await page.getByTestId('replace').click()
  await expect(page.getByTestId('raw')).toHaveValue('dirty')
  let prompts = 0
  const accept = async (dialog: import('@playwright/test').Dialog) => { prompts++; await dialog.accept() }
  page.on('dialog', accept); await page.getByTestId('action-nav').click()
  await expect(page).toHaveURL(/scope\/b$/); expect(prompts).toBe(1)
  await page.getByTestId('away').click(); await expect(page).toHaveURL(/away$/); expect(prompts).toBe(2)
  page.off('dialog', accept); await page.goBack(); await expect(page).toHaveURL(/scope\/b$/)
  await page.getByTestId('raw').click() // Sticky activation is required for native beforeunload.
  await page.getByTestId('raw').fill('reload-dirty')
  let unloadDialog = false
  page.once('dialog', async dialog => { unloadDialog = dialog.type() === 'beforeunload'; await dialog.dismiss() })
  await page.reload({ timeout: 3000 }).catch(() => {})
  expect(unloadDialog).toBe(true)
  await expect(page.getByTestId('raw')).toHaveValue('reload-dirty')
  await page.getByTestId('clean').click(); await page.reload(); await expect(page.getByTestId('raw')).toHaveValue('baseline')
  await page.getByTestId('raw').click(); await page.getByTestId('raw').fill('leave-dirty')
  let acceptedUnload = false
  page.once('dialog', async dialog => { acceptedUnload = dialog.type() === 'beforeunload'; await dialog.accept() })
  await page.reload(); expect(acceptedUnload).toBe(true); await expect(page.getByTestId('raw')).toHaveValue('baseline')
})
test('native network failure and 30000ms timeout preserve input and never retry write', async ({ page }) => {
  let writes = 0
  await page.route('**/fixture-write', route => { writes++; return route.abort('failed') })
  await page.route('**/fixture-reconcile', route => route.fulfill({ contentType: 'application/json', body: '{"count":1}' }))
  await page.goto('/scope/a'); await page.getByTestId('raw').fill('network-input'); await page.getByTestId('save').click()
  await expect(page.getByRole('dialog')).toContainText('操作可能已完成')
  await expect(page.getByTestId('raw')).toHaveValue('network-input'); expect(writes).toBe(1)
  await page.getByRole('button', { name: '關閉', exact: true }).click()
  await reconcileAndWait(page, true, 1)
  await expect(page.getByTestId('save')).toBeEnabled()
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/fixture-write', async route => { writes++; await pending; await route.fulfill({ contentType: 'application/json', body: '{"count":1}' }).catch(() => {}) })
  await page.getByTestId('raw').fill('timeout-input'); const start = Date.now(); await page.getByTestId('save').click()
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 35000 })
  expect(Date.now() - start).toBeGreaterThanOrEqual(29000)
  await expect(page.getByTestId('raw')).toHaveValue('timeout-input'); await expect(page.getByTestId('raw')).toBeEnabled()
  await expect(page.getByTestId('save')).toBeDisabled(); expect(writes).toBe(2)
  release(); await page.getByRole('button', { name: '關閉', exact: true }).click()
  await reconcileAndWait(page, true, 2)
})
test('read failure keeps page and manual retry recovers', async ({ page }) => {
  await page.route('**/fixture-error', route => route.fulfill({ status: 404, contentType: 'application/json', body: errorText('FORM_NOT_FOUND') }))
  await page.route('**/fixture-next', route => route.fulfill({ contentType: 'application/json', body: '{"count":0}' }))
  await page.goto('/scope/a'); await page.getByTestId('error').click()
  await expect(page.getByRole('alert')).toContainText('找不到表單'); await expect(page).toHaveURL(/scope\/a$/)
  await page.getByRole('button', { name: '重試' }).click()
  await expect(page.getByTestId('read')).toHaveText('0'); await expect(page.getByRole('alert')).toHaveCount(0)
})
for (const failure of ['network', '500', 'malformed'] as const) {
  test(`Latest ${failure} preserves answers and allows manual read retry`, async ({ page }) => {
    let calls = 0
    await page.route('**/fixture-latest', route => {
      calls++
      if (calls > 1) return route.fulfill({ contentType: 'application/json', body: receiptText() })
      if (failure === 'network') return route.abort('failed')
      return route.fulfill({ status: failure === '500' ? 500 : 200, contentType: 'application/json', body: failure === '500' ? errorText('INTERNAL_SERVER_ERROR') : '{"broken":true}' })
    })
    await page.goto('/scope/a'); await page.getByTestId('raw').fill('unsaved-answer')
    await page.getByTestId('latest').click()
    await expect(page.getByTestId('completed-latest')).toHaveText('1|read-failure')
    await expect(page.getByRole('dialog')).toContainText('載入失敗，請手動重試')
    await expect(page.getByRole('dialog')).not.toContainText('操作可能已完成')
    await expect(page.getByTestId('raw')).toHaveValue('unsaved-answer')
    await expect(page.getByTestId('write-state')).toHaveText('idle|false'); expect(calls).toBe(1)
    await page.getByRole('button', { name: '關閉', exact: true }).click()
    await expect(page.getByTestId('latest')).toBeEnabled(); await page.getByTestId('latest').click()
    await expect(page.getByTestId('completed-latest')).toHaveText('2|success')
    await expect(page.getByTestId('raw')).toHaveValue('unsaved-answer'); expect(calls).toBe(2)
    await page.getByTestId('clean').click()
  })
}
test('Latest retains Auth and RESPONSE_NOT_FOUND classifications without replacing answers', async ({ page }) => {
  let calls = 0
  await page.route('**/fixture-latest', route => { calls++; return route.fulfill({ status: calls === 1 ? 401 : 404, contentType: 'application/json', body: errorText(calls === 1 ? 'AUTH_REQUIRED' : 'RESPONSE_NOT_FOUND') }) })
  await page.goto('/scope/a'); await page.getByTestId('raw').fill('keep-answer')
  await page.getByTestId('latest').click(); await expect(page.getByTestId('completed-latest')).toHaveText('1|auth')
  await expect(page.getByRole('dialog')).toContainText('需要有效登入身分')
  await page.getByRole('button', { name: '關閉', exact: true }).click()
  await page.getByTestId('latest').click(); await expect(page.getByTestId('completed-latest')).toHaveText('2|no-response')
  await expect(page.getByRole('dialog')).toContainText('您從未填答過')
  await expect(page.getByTestId('raw')).toHaveValue('keep-answer'); expect(calls).toBe(2)
  await page.getByRole('button', { name: '關閉', exact: true }).click(); await page.getByTestId('clean').click()
})
