import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'
import { apiError, detail, ids, owner, other, summary } from '../fixtures/f4/payloads'
const headers = { 'access-control-allow-origin': 'http://localhost:3000', 'access-control-allow-credentials': 'true' }
type Reply = (route: Route) => Promise<void>
function gate() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve }); return { promise, release } }
function pageBody(page: number, total: number, status?: 'draft' | 'published' | 'closed') {
  return { items: Array.from({ length: Math.min(10, Math.max(0, total - (page - 1) * 10)) }, (_, i) => summary((page - 1) * 10 + i + 1, status)), pagination: { page, pageSize: 10, totalItems: total, totalPages: Math.ceil(total / 10) } }
}
async function mock(page: Page, user = owner) {
  const state = { me: 0, forms: [] as string[], unexpected: [] as string[], console: [] as { text: string; url: string }[], httpErrors: new Map<string, Set<number>>(), failed: new Set<string>(), pages: [] as string[], list: undefined as Reply | undefined, form: undefined as Reply | undefined, bootstrap: undefined as Reply | undefined }
  page.on('console', message => { if (message.type() === 'error' || message.text().includes('[Vue warn]')) state.console.push({ text: message.text(), url: message.location().url }) })
  page.on('response', response => {
    if (response.url().startsWith('http://localhost:5000/api/v1/') && response.status() >= 400) {
      const statuses = state.httpErrors.get(response.url()) ?? new Set<number>(); statuses.add(response.status()); state.httpErrors.set(response.url(), statuses)
    }
  })
  page.on('requestfailed', request => { if (request.url().startsWith('http://localhost:5000/api/v1/') && request.failure()?.errorText === 'net::ERR_FAILED') state.failed.add(request.url()) })
  page.on('pageerror', error => state.pages.push(error.message))
  await page.route('http://localhost:5000/api/v1/**', async route => {
    const request = route.request(); const url = new URL(request.url())
    if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST', 'access-control-allow-headers': 'content-type' } }); return }
    if (url.pathname.endsWith('/users/me') && request.method() === 'GET') {
      state.me++; if (state.bootstrap) await state.bootstrap(route); else await route.fulfill({ status: 200, headers, json: user }); return
    }
    if (request.method() !== 'GET' || !/^\/api\/v1\/forms(?:\/[^/]+)?$/.test(url.pathname)) {
      state.unexpected.push(`${request.method()} ${url.pathname}`); await route.fulfill({ status: 500, headers, json: apiError('INTERNAL_SERVER_ERROR') }); return
    }
    state.forms.push(url.pathname + url.search)
    try {
      if (url.pathname === '/api/v1/forms') {
        if (state.list) await state.list(route)
        else await route.fulfill({ status: 200, headers, json: pageBody(Number(url.searchParams.get('page')), 11) })
      }
      else if (state.form) await state.form(route)
      else {
        const id = url.pathname.split('/').at(-1)
        const status = id === ids.draft ? 'draft' : id === ids.closed ? 'closed' : 'published'
        await route.fulfill({ status: status === 'draft' && user.id !== owner.id ? 404 : 200, headers, json: status === 'draft' && user.id !== owner.id ? apiError('FORM_NOT_FOUND') : detail(status, id) })
      }
    }
    catch (error) { if (!request.failure()) throw error }
  })
  return state
}
const nav = (page: Page, name: string) => page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name, exact: true })
function noUnexpected(state: Awaited<ReturnType<typeof mock>>, me = 1) {
  expect(state.unexpected).toEqual([]); expect(state.pages).toEqual([]); expect(state.me).toBe(me)
  // Allow only Chromium diagnostics matched to the exact injected HTTP/failure URL.
  expect(state.console.filter(message => {
    const status = /^Failed to load resource: the server responded with a status of (\d+) \(.*\)$/.exec(message.text)
    return !(status && state.httpErrors.get(message.url)?.has(Number(status[1]))) && !(message.text === 'Failed to load resource: net::ERR_FAILED' && state.failed.has(message.url))
  })).toEqual([])
}

test('F4-B01 list pagination/filter/refresh retention and desktop/mobile fields', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const state = await mock(page)
  await page.goto('/forms'); await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(11)
  expect(state.forms).toEqual(['/api/v1/forms?page=1&pageSize=10'])
  await page.getByRole('button', { name: '下一頁', exact: true }).focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('table').getByRole('link')).toHaveText(['合成表單 11'])
  state.list = async route => { await route.abort('failed') }
  await page.getByRole('button', { name: '刷新', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('載入失敗')
  await expect(page.getByText('刷新未成功', { exact: false })).toBeVisible()
  await expect(page.getByRole('table').getByRole('link')).toHaveText(['合成表單 11'])
  state.list = async route => {
    const url = new URL(route.request().url()); const status = url.searchParams.get('status')
    const value = pageBody(Number(url.searchParams.get('page')), status === 'draft' ? 0 : 11)
    if (value.items[0]) value.items[0] = { ...value.items[0], title: '完整長標題'.repeat(40) }
    await route.fulfill({ status: 200, headers, json: value })
  }
  await page.getByRole('button', { name: '重試', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('table').getByRole('link')).toHaveText(['完整長標題'.repeat(40)])
  await expect(page.getByRole('button', { name: '刷新', exact: true })).toBeEnabled()
  await page.screenshot({ path: info.outputPath('desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  const card = page.getByRole('list', { name: '我的表單卡片' })
  await expect(card).toBeVisible(); await expect(card).toContainText('不同填答者人數'); await expect(card).toContainText('11 人')
  await expect(card).toContainText('2026-10-10 09:02:03'); await expect(card).toContainText('2026-10-11 10:03:04')
  await expect(card).toContainText('可多次填答'); await expect(card).toContainText('具名'); await expect(card).toContainText('填答者'); await expect(card).toContainText('未設定')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('mobile.png'), fullPage: true })
  await page.getByLabel('狀態篩選').focus(); await page.keyboard.press('ArrowDown')
  await expect(page.getByText('目前條件沒有表單。', { exact: true })).toBeVisible()
  expect(state.forms.at(-1)).toBe('/api/v1/forms?page=1&pageSize=10&status=draft')
  state.list = async route => { await route.fulfill({ status: 200, headers, json: pageBody(1, 0) }) }
  await page.getByLabel('狀態篩選').selectOption('')
  await expect(page.getByRole('link', { name: '建立第一份表單' })).toBeVisible()
  noUnexpected(state)
})

test('F4-B02 shrinking pagination aligns once, repeated shrink stops, zero returns 1 without GET loop', async ({ page }) => {
  const state = await mock(page)
  state.list = async route => { const url = new URL(route.request().url()); await route.fulfill({ status: 200, headers, json: pageBody(Number(url.searchParams.get('page')), 21) }) }
  await page.goto('/forms'); await expect(page.getByText('第 1 頁 · 共 3 頁／21 筆')).toBeVisible()
  await page.getByRole('button', { name: '下一頁' }).click(); await expect(page.getByText('第 2 頁 · 共 3 頁／21 筆')).toBeVisible()
  await page.getByRole('button', { name: '下一頁' }).click(); await expect(page.getByText('第 3 頁 · 共 3 頁／21 筆')).toBeVisible()
  state.list = async route => { const p = Number(new URL(route.request().url()).searchParams.get('page')); await route.fulfill({ status: 200, headers, json: pageBody(p, 11) }) }
  const normal = state.forms.length
  await page.getByRole('button', { name: '刷新', exact: true }).click()
  await expect(page.getByText('第 2 頁 · 共 2 頁／11 筆')).toBeVisible()
  await expect(page.getByText('頁數已變更，已回到第 2 頁。')).toBeVisible()
  expect(state.forms.length - normal).toBe(2)
  await expect(page.getByRole('table').getByRole('link')).toHaveText(['合成表單 11'])
  state.list = async route => { const p = Number(new URL(route.request().url()).searchParams.get('page')); await route.fulfill({ status: 200, headers, json: pageBody(p, 21) }) }
  await page.getByRole('button', { name: '刷新', exact: true }).click(); await expect(page.getByText('第 2 頁 · 共 3 頁／21 筆')).toBeVisible()
  await page.getByRole('button', { name: '下一頁' }).click(); await expect(page.getByText('第 3 頁 · 共 3 頁／21 筆')).toBeVisible()
  state.list = async route => { const p = Number(new URL(route.request().url()).searchParams.get('page')); await route.fulfill({ status: 200, headers, json: pageBody(p, p === 3 ? 11 : 1) }) }
  const before = state.forms.length
  await page.getByRole('button', { name: '刷新', exact: true }).click()
  await expect(page.getByText('頁數再次變更，請按刷新取得最新資料。')).toBeVisible()
  await expect(page.getByRole('button', { name: '刷新', exact: true })).toBeEnabled()
  expect(state.forms.length - before).toBe(2)
  expect(state.forms.slice(-2)).toEqual(['/api/v1/forms?page=3&pageSize=10', '/api/v1/forms?page=2&pageSize=10'])
  state.list = async route => { await route.fulfill({ status: 200, headers, json: pageBody(2, 0) }) }
  await page.getByRole('button', { name: '刷新', exact: true }).click()
  await expect(page.getByText('第 1 頁 · 共 0 頁／0 筆')).toBeVisible()
  expect(state.forms.length - before).toBe(3)
  noUnexpected(state)
})

for (const [status, user, source] of [
  ['draft', owner, 'form'], ['published', owner, 'edit'], ['published', other, 'edit'], ['closed', owner, 'edit'], ['closed', other, 'edit'],
] as const) {
  test(`F4-B03 ${status} ${user.id === owner.id ? 'owner' : 'other'} ${source} route uses replace and readonly root`, async ({ page }) => {
    const state = await mock(page, user)
    await page.goto(`/forms/${ids[status]}${source === 'edit' ? '/edit' : ''}`)
    await expect(page).toHaveURL(`http://localhost:3000/forms/${ids[status]}${status === 'draft' ? '/edit' : ''}`)
    await expect(page.getByRole('heading', { name: `${status} 合成表單`, exact: true })).toBeVisible()
    expect(state.forms.length).toBe(2)
    await expect(page.getByText(`建立者：${owner.displayName}`, { exact: true })).toBeVisible()
    await expect(page.getByText('第一行\n第二行', { exact: true })).toBeVisible()
    await expect(page.getByText('表單設定目前以唯讀方式呈現。', { exact: false })).toBeVisible()
    await expect(page.getByRole('textbox')).toHaveCount(0)
    await expect(page.getByLabel('表單次要資訊')).toHaveCount(user.id === owner.id ? 1 : 0)
    // A replaced URL does not remain as an extra SPA history entry.
    const initialLength = await page.evaluate(() => history.length)
    await nav(page, '首頁').click(); await expect(page).toHaveURL('http://localhost:3000/')
    await page.goBack(); await expect(page).toHaveURL(`http://localhost:3000/forms/${ids[status]}${status === 'draft' ? '/edit' : ''}`)
    expect(await page.evaluate(() => history.length)).toBe(initialLength + 1)
    noUnexpected(state)
  })
}

test('F4-B04 draft hidden, invalid UUID, expired published, read faults/disabled stay at original URL', async ({ page }) => {
  const state = await mock(page, other)
  await page.goto(`/forms/${ids.draft}/edit`); await expect(page.getByRole('alert')).toContainText('找不到表單')
  expect(page.url()).toBe(`http://localhost:3000/forms/${ids.draft}/edit`)
  state.form = async route => { await route.fulfill({ status: 400, headers, json: apiError('VALIDATION_ERROR', 'formId') }) }
  await nav(page, '我的表單').click(); await expect(page.getByRole('table')).toBeVisible()
  await page.getByRole('table').getByRole('link').first().click()
  await expect(page.getByRole('alert')).toContainText('連結無效')
  for (const fault of ['disabled', 'network', '500', 'body'] as const) {
    state.form = async route => {
      if (fault === 'network') await route.abort('failed')
      else if (fault === 'body') await route.fulfill({ status: 200, headers, json: { invalid: true } })
      else await route.fulfill({ status: fault === 'disabled' ? 403 : 500, headers, json: apiError(fault === 'disabled' ? 'AUTH_USER_DISABLED' : 'INTERNAL_SERVER_ERROR') })
    }
    await page.getByRole('button', { name: '重試', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText(fault === 'disabled' ? '帳號已停用' : '載入失敗')
    await expect(page.getByRole('button', { name: '使用者選單' })).toBeVisible()
    expect(new URL(page.url()).pathname).toContain('/forms/')
  }
  state.form = async route => { await route.fulfill({ status: 200, headers, json: { ...detail('published', new URL(route.request().url()).pathname.split('/').at(-1)), submissionDeadlineAt: '2020-01-01T00:00:00.0000001Z' } }) }
  await page.getByRole('button', { name: '重試', exact: true }).click()
  await expect(page.getByText('已截止', { exact: true })).toBeVisible(); await expect(page.getByText('已發布', { exact: true })).toBeVisible()
  expect(new URL(page.url()).pathname).toContain('/forms/')
  noUnexpected(state)
})

for (const close of ['頁尾關閉', '關閉圖示'] as const) {
  test(`F4-B05 manual Auth invalidation preserves Dialog through own revision, ${close} returns full URL`, async ({ page }) => {
    const state = await mock(page)
    await page.goto('/forms?from=f4#target'); await expect(page.getByRole('table')).toBeVisible()
    state.list = async route => { await route.fulfill({ status: 401, headers, json: apiError('AUTH_TOKEN_INVALID') }) }
    await page.getByRole('button', { name: '刷新', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '操作訊息' })
    await expect(dialog).toBeVisible(); expect(new URL(page.url()).pathname).toBe('/forms')
    await expect(page.getByRole('table')).toHaveCount(0); await expect(page.getByRole('button', { name: '使用者選單' })).toHaveCount(0)
    await page.keyboard.press('Escape'); await expect(dialog).toBeVisible()
    await (close === '頁尾關閉' ? dialog.getByRole('button', { name: '關閉', exact: true }).filter({ hasText: '關閉' }) : dialog.getByLabel('關閉', { exact: true })).click()
    await expect(page).toHaveURL(/\/login\?redirect=/)
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/forms?from=f4#target')
    await expect(page.getByRole('heading', { name: '帳號', exact: true })).toBeFocused()
    noUnexpected(state)
  })
}

test('F4-B06 stale filter Auth cannot mutate data/User/URL or end next loading', async ({ page }) => {
  const state = await mock(page); const old = gate(); const next = gate()
  await page.goto('/forms'); await expect(page.getByRole('table')).toBeVisible()
  state.list = async route => {
    const draft = new URL(route.request().url()).searchParams.get('status') === 'draft'
    await (draft ? next.promise : old.promise)
    await route.fulfill({ status: draft ? 200 : 401, headers, json: draft ? pageBody(1, 1, 'draft') : apiError('AUTH_TOKEN_EXPIRED') })
  }
  await page.getByRole('button', { name: '刷新', exact: true }).click(); await expect(page.getByText('正在載入表單清單…')).toBeVisible()
  await page.getByLabel('狀態篩選').selectOption('draft')
  await expect.poll(() => state.forms.length).toBe(3)
  old.release()
  await expect(page.getByRole('table')).toHaveCount(0); await expect(page.getByText('正在載入表單清單…')).toBeVisible()
  await expect(page.getByRole('button', { name: '使用者選單' })).toBeVisible(); await expect(page.getByRole('alert')).toHaveCount(0)
  expect(new URL(page.url()).pathname).toBe('/forms')
  next.release(); await expect(page.getByRole('table').getByRole('link')).toHaveText(['合成表單 1'])
  await expect(page.getByRole('button', { name: '刷新', exact: true })).toBeEnabled()
  noUnexpected(state)
})

test('F4-B07 same mounted product loader clears prior session/ID data; late callbacks cannot navigate or end loading', async ({ page }) => {
  test.skip(process.env.F4_MODE === 'built', 'Controlled session harness is dev-only; product scope unit and dev Browser provide coverage')
  const state = await mock(page); const old = gate(); const next = gate(); const final = gate()
  await page.goto(`/f4-session/${ids.published}`); await expect(page.getByRole('heading', { name: 'published 合成表單', exact: true })).toBeVisible()
  state.form = async route => {
    const sequence = state.forms.length
    await (sequence === 2 ? old.promise : sequence === 3 ? next.promise : final.promise)
    const id = new URL(route.request().url()).pathname.split('/').at(-1)!
    await route.fulfill({ status: sequence === 3 ? 401 : 200, headers, json: sequence === 3 ? apiError('AUTH_TOKEN_EXPIRED') : { ...detail(id === ids.closed ? 'closed' : 'published', id), title: sequence === 2 ? '舊 A 資料' : '目前 C 資料' } })
  }
  await page.getByRole('button', { name: '重新載入表單' }).click()
  await page.getByRole('button', { name: '合成切換身分' }).click()
  await expect.poll(() => state.forms.length).toBe(3)
  await expect(page.getByRole('heading', { name: 'published 合成表單', exact: true })).toHaveCount(0)
  old.release(); await expect(page.getByText('正在載入表單…')).toBeVisible()
  await page.getByRole('link', { name: '合成切換 Form ID' }).click()
  await expect.poll(() => state.forms.length).toBe(4)
  next.release(); await expect(page.getByText('正在載入表單…')).toBeVisible()
  await expect(page.getByRole('button', { name: '使用者選單' })).toContainText(other.displayName)
  expect(new URL(page.url()).pathname).toBe(`/f4-session/${ids.closed}`)
  final.release(); await expect(page.getByRole('heading', { name: '目前 C 資料', exact: true })).toBeVisible()
  await expect(page.getByLabel('表單次要資訊')).toHaveCount(0); await expect(page.getByText('舊 A 資料', { exact: true })).toHaveCount(0)
  noUnexpected(state)
})

test('F4-B08 unknown bootstrap waits for explicit retry; stale unmount and initial resource Auth redirect', async ({ page }) => {
  const state = await mock(page); const delayed = gate()
  state.bootstrap = async route => { await route.fulfill({ status: 500, headers, json: apiError('INTERNAL_SERVER_ERROR') }) }
  await page.goto(`/forms/${ids.published}`); await expect(page.getByRole('alert')).toContainText('載入失敗'); expect(state.forms).toHaveLength(0)
  state.bootstrap = async route => { await route.fulfill({ status: 200, headers, json: owner }) }
  state.form = async route => { await delayed.promise; await route.fulfill({ status: 404, headers, json: apiError('FORM_NOT_FOUND') }) }
  await page.getByRole('button', { name: '重試', exact: true }).click()
  await expect.poll(() => state.forms.length).toBe(1)
  await nav(page, '首頁').click(); await expect(page).toHaveURL('http://localhost:3000/')
  delayed.release(); await expect(page.getByRole('heading', { name: `歡迎，${owner.displayName}` })).toBeVisible(); await expect(page.getByRole('alert')).toHaveCount(0)
  state.list = async route => { await route.fulfill({ status: 401, headers, json: apiError('AUTH_REQUIRED') }) }
  await nav(page, '我的表單').click(); await expect(page).toHaveURL(/\/login\?redirect=/)
  expect(new URL(page.url()).searchParams.get('redirect')).toBe('/forms')
  noUnexpected(state, 2)
})

test('F4-B09 long root text and owner UUID remain readable on mobile; reload is keyboard usable', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await mock(page)
  const creator = '合成建立者'.repeat(40)
  const title = '<b>純文字標題</b>'.repeat(20)
  state.form = async route => { await route.fulfill({ status: 200, headers, json: { ...detail('closed'), title, creatorDisplayName: creator } }) }
  await page.goto(`/forms/${ids.closed}`)
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await expect(page.getByText(`建立者：${creator}`, { exact: true })).toBeVisible()
  await expect(page.getByLabel('表單次要資訊')).toContainText(ids.closed)
  expect(await page.getByRole('heading', { name: title, exact: true }).locator('b').count()).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: '重新載入表單', exact: true }).focus(); await page.keyboard.press('Enter')
  await expect.poll(() => state.forms.length).toBe(2)
  await expect(page.getByRole('button', { name: '重新載入表單', exact: true })).toBeEnabled()
  await page.screenshot({ path: info.outputPath('root-mobile.png'), fullPage: true })
  noUnexpected(state)
})
