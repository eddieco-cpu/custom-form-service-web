import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'
import { statistics, largeStatistics, longText, uuid } from '../fixtures/f9/payloads'
import { form } from '../fixtures/f5/payloads'
import { stringifyExactJson } from '../../app/utils/exact-json'
import { ExactNumber } from '../../app/utils/exact-number'
import { expectedHttp, expectedNetwork, verifyNetworkDiagnostics } from '../helpers/f6-network-diagnostics'
import type { Diagnostic, ExpectedFailure, NetworkFailure } from '../helpers/f6-network-diagnostics'
const api = 'http://localhost:5000/api/v1', root = `${api}/forms/${uuid(50)}/statistics`, view = `/forms/${uuid(50)}/statistics`
const owner = { id: uuid(51), email: 'f9-fixture@example.test', displayName: '合成建立者', avatarUrl: null }
const headers = { 'access-control-allow-origin': 'http://localhost:3000', 'access-control-allow-credentials': 'true' }
const envelope = (code: string) => ({ error: { code, message: '合成錯誤', ...(code === 'VALIDATION_ERROR' ? { details: [{ path: 'formId', code: 'INVALID_VALUE', message: '原始 UUID 明細' }] } : {}) } })
const reply = (route: Route, body: unknown, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: stringifyExactJson(body) })
type Reply = (route: Route) => Promise<void>
function gate() { let release!: () => void; const promise = new Promise<void>(r => { release = r }); return { promise, release } }
const sets = new WeakMap<Page, Awaited<ReturnType<typeof mock>>>()
async function mock(page: Page) {
  const s = { dto: statistics(true), user: owner, loggedOut: false, me: undefined as Reply | undefined, stats: undefined as Reply | undefined,
    definition: { ...form(), status: 'closed' as 'closed' | 'published' | 'draft', submissionDeadlineAt: null },
    requests: [] as { method: string; url: string }[], expected: [] as ExpectedFailure[], actual: [] as NetworkFailure[], diagnostics: [] as Diagnostic[], errors: [] as string[], unexpected: [] as string[] }
  sets.set(page, s)
  page.on('pageerror', e => s.errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' || m.text().includes('[Vue warn]')) s.diagnostics.push({ text: m.text(), url: m.location().url }) })
  page.on('response', r => { if (r.status() >= 400) s.actual.push({ kind: 'response', method: r.request().method(), url: r.url(), status: r.status() }) })
  page.on('requestfailed', r => s.actual.push({ kind: 'requestfailed', method: r.method(), url: r.url(), reason: r.failure()!.errorText }))
  await page.route(`${api}/**`, async route => {
    const r = route.request(), path = new URL(r.url()).pathname, method = r.method()
    if (method === 'OPTIONS') { await route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST,PATCH', 'access-control-allow-headers': 'content-type' } }); return }
    s.requests.push({ method, url: r.url() })
    if (path === '/api/v1/users/me') { if (s.me) await s.me(route); else await reply(route, s.loggedOut ? envelope('AUTH_REQUIRED') : s.user, s.loggedOut ? 401 : 200); return }
    if (path.endsWith('/statistics') && method === 'GET') { if (s.stats) await s.stats(route); else await reply(route, { ...s.dto, formId: decodeURIComponent(path.split('/').at(-2)!) }); return }
    if (path.endsWith('/auth/login') && method === 'POST') { s.loggedOut = false; await reply(route, s.user); return }
    if (path.endsWith('/auth/logout') && method === 'POST') { s.loggedOut = true; await route.fulfill({ status: 204, headers }); return }
    if (/\/forms\/[^/]+$/.test(path) && method === 'GET') { await reply(route, s.definition); return }
    s.unexpected.push(`${method} ${path}`); await reply(route, envelope('INTERNAL_SERVER_ERROR'), 500)
  })
  return s
}
const question = (page: Page, index: number) => page.locator('[data-statistics-question]').nth(index)
const values = (page: Page, index: number) => question(page, index).locator('[data-statistics-value]')
const loaded = (page: Page) => expect(page.getByRole('region', { name: '統計根資訊' })).toBeVisible()
async function native(page: Page, accept: boolean, action: () => Promise<unknown>) { const handled = page.waitForEvent('dialog').then(d => accept ? d.accept() : d.dismiss()); await action(); await handled }
test.afterEach(async ({ page, browser }, info) => {
  const s = sets.get(page); if (!s) return
  const issues = verifyNetworkDiagnostics(s.expected, s.actual, s.diagnostics)
  await info.attach('fixture-network.json', { body: stringifyExactJson({ source: 'fixture intercepted business API', browser: browser.version(), requests: s.requests, expected: s.expected, actual: s.actual, diagnostics: s.diagnostics, issues, errors: s.errors, unexpected: s.unexpected }), contentType: 'application/json' })
  expect(s.errors).toEqual([]); expect(s.unexpected).toEqual([]); expect(issues).toEqual([])
})

test.describe('product fresh build', () => {
  test.skip(process.env.F9_MODE === 'harness', 'separate fixture control build')
  for (const [status, code] of [[200, ''], [401, 'AUTH_REQUIRED'], [403, 'AUTH_USER_DISABLED'], [500, 'INTERNAL_SERVER_ERROR']] as const) {
    for (const statsFirst of [true, false]) test(`F9-B01 me ${status} statsFirst=${statsFirst} independent parallel public`, async ({ page }) => {
      const s = await mock(page), meGate = gate(), statsGate = gate()
      if (status !== 200) s.expected.push(expectedHttp('GET', `${api}/users/me`, status, 1))
      s.me = async r => { await meGate.promise; await reply(r, status === 200 ? owner : envelope(code), status) }
      s.stats = async r => { await statsGate.promise; await reply(r, s.dto) }
      await page.goto(view); await expect.poll(() => s.requests.length).toBe(2)
      expect(s.requests.map(r => r.url).sort()).toEqual([`${api}/users/me`, root].sort())
      if (statsFirst) { statsGate.release(); await loaded(page); meGate.release() }
      else { meGate.release(); await expect(page.locator('header')).toContainText(status === 401 ? '未登入' : status === 403 ? '登入中' : status === 500 ? '身分未知' : '合成建立者'); await expect(page.getByText('統計載入中…')).toBeVisible(); statsGate.release() }
      await loaded(page); await expect(page).toHaveURL(`http://localhost:3000${view}`)
      expect(s.requests).toHaveLength(2)
    })
  }
  test('F9-B01/B03 complete roots, five types, exact values, literal text, same names/labels, optional zero and privacy', async ({ page }) => {
    const s = await mock(page)
    const dto = s.dto
    s.dto = { ...dto, count: 4, questions: dto.questions.map(q => q.type === 'number' ? { ...q, count: 4, statistics: ['0', '0.12345678901234567890123456789', '9007199254740992', '9007199254740993'].map((v, i) => ({ value: ExactNumber.from(v), count: 1, respondents: [{ id: uuid(71 + i), displayName: '精確合成' }] })) } : q) }
    await page.goto(view); await loaded(page)
    await expect(page.locator('[data-statistics-question]')).toHaveCount(5)
    await expect(values(page, 1)).toHaveText(['0', '0.12345678901234567890123456789', '9007199254740992', '9007199254740993'])
    await expect(values(page, 2)).toHaveText(['同標籤', '同標籤'])
    await expect(question(page, 2).locator('[data-statistics-respondent]')).toHaveText(['同名合成', '同名合成'])
    await expect(values(page, 0).first()).toHaveText('<script>window.fake = 1</script>\nCase')
    expect(await page.evaluate(() => 'fake' in window)).toBe(false)
    await expect(page.getByRole('region', { name: '統計根資訊' })).toContainText('2026-12-31 18:30:00')
    s.dto = statistics(false, true); await page.getByRole('button', { name: '重新載入統計' }).click(); await loaded(page)
    await expect(page.getByText('尚無填答', { exact: true })).toBeVisible(); await expect(page.getByText('尚無作答', { exact: true })).toHaveCount(2)
    await expect(page.locator('[data-statistics-respondents]')).toHaveCount(0)
    s.dto = { ...statistics(false), questions: [...statistics(false).questions, { questionId: uuid(99), title: 'optional 題', description: null, type: 'text', count: 0, statistics: [] }] }
    await page.getByRole('button', { name: '重新載入統計' }).click(); await loaded(page); await expect(page.getByText('尚無作答', { exact: true })).toHaveCount(1)
    await expect(page.locator('[data-statistics-respondents]')).toHaveCount(0)
  })
  test('F9-B01 large content 30/200/120/2000/101 complete and readable at 390px; keyboard retry/link', async ({ page }, info) => {
    const s = await mock(page); s.dto = largeStatistics(); await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(view); await loaded(page); await expect(page.locator('[data-statistics-question]')).toHaveCount(30)
    await expect(values(page, 0)).toHaveCount(200); await expect(values(page, 0).nth(99)).toHaveText('完整答案 100'); await expect(values(page, 0).last()).toHaveText('完整答案 200')
    await expect(values(page, 1)).toHaveCount(101); await expect(values(page, 1).first()).toHaveText('0'); await expect(values(page, 1).last()).toHaveText('100')
    await expect(question(page, 2).locator('[data-statistics-respondent]')).toHaveCount(120); await expect(values(page, 2)).toHaveText(longText)
    await expect(question(page, 2).locator('[data-statistics-respondent]').nth(60)).toContainText('完整姓名 61'); await expect(question(page, 2).locator('[data-statistics-respondent]').last()).toContainText('完整姓名 120')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await question(page, 2).locator('[data-statistics-respondent]').last().scrollIntoViewIfNeeded(); await expect(question(page, 2).locator('[data-statistics-respondent]').last()).toBeInViewport()
    await info.attach('mobile-long-names.png', { body: await page.screenshot(), contentType: 'image/png' })
    s.stats = r => reply(r, envelope('INTERNAL_SERVER_ERROR'), 500); s.expected.push(expectedHttp('GET', root, 500, 1))
    await page.getByRole('button', { name: '重新載入統計' }).focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('alert')).toContainText('載入失敗')
    await expect(page.locator('[data-statistics-respondent]')).toHaveCount(0)
    s.stats = undefined; await page.getByRole('button', { name: '重試', exact: true }).focus(); await page.keyboard.press('Enter'); await loaded(page)
    await page.getByRole('link', { name: '查看表單', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(`http://localhost:3000/forms/${uuid(50)}`)
    expect(s.requests.filter(r => r.url.endsWith('/users/me'))).toHaveLength(1)
  })
  for (const [status, code, text] of [[400, 'VALIDATION_ERROR', '連結無效'], [404, 'FORM_NOT_FOUND', '找不到表單'], [409, 'FORM_STATISTICS_NOT_AVAILABLE', '統計尚未開放'], [403, 'STATISTICS_ACCESS_DENIED', '您沒有查看此統計的權限'], [403, 'AUTH_USER_DISABLED', '帳號已停用'], [500, 'INTERNAL_SERVER_ERROR', '載入失敗']] as const) {
    test(`F9-B01 ${status} ${code} retains URL/details and retry`, async ({ page }) => {
      const s = await mock(page); s.stats = r => reply(r, envelope(code), status); s.expected.push(expectedHttp('GET', root, status, 1))
      await page.goto(view); await expect(page.getByRole('alert')).toContainText(text); await expect(page).toHaveURL(`http://localhost:3000${view}`)
      if (status === 400) await expect(page.getByRole('alert')).toContainText('formId：原始 UUID 明細')
      if (code === 'AUTH_USER_DISABLED') await expect(page.getByRole('button', { name: '使用者選單' })).toBeVisible()
      s.stats = undefined; await page.getByRole('button', { name: '重試', exact: true }).click(); await loaded(page)
    })
  }
  test('F9-B01 network, timeout and malformed never retain private content; no automatic retries', async ({ page }) => {
    test.setTimeout(80_000)
    const s = await mock(page); await page.goto(view); await loaded(page)
    s.stats = r => r.abort('failed'); s.expected.push(expectedNetwork('GET', root, 'net::ERR_FAILED', 1, 1))
    await page.getByRole('button', { name: '重新載入統計' }).click(); await expect(page.getByRole('alert')).toContainText('載入失敗'); await expect(page.locator('[data-statistics-respondent]')).toHaveCount(0)
    const held = gate(); s.stats = async r => { await held.promise; await reply(r, s.dto) }
    s.expected.push(expectedNetwork('GET', root, 'net::ERR_ABORTED', 1, 0))
    await page.getByRole('button', { name: '重試', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('載入失敗', { timeout: 35_000 }); held.release()
    s.stats = r => r.fulfill({ headers, contentType: 'application/json', body: '{"count":2}' })
    await page.getByRole('button', { name: '重試', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('載入失敗')
    expect(s.requests.filter(r => r.url === root)).toHaveLength(4)
  })
  for (const code of ['AUTH_REQUIRED', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED']) test(`F9-B01 private ${code} initial full return then Login, manual Dialog and logout`, async ({ page }) => {
    const s = await mock(page); s.loggedOut = true; s.expected.push(expectedHttp('GET', `${api}/users/me`, 401, 1), expectedHttp('GET', root, 401, 2))
    s.stats = r => reply(r, envelope(code), 401)
    const full = `${view}?source=private#result`; await page.goto(full); await expect(page).toHaveURL(/\/login\?redirect=/)
    expect(new URL(page.url()).searchParams.get('redirect')).toBe(full)
    s.stats = undefined; await page.getByRole('textbox', { name: 'Email' }).fill(owner.email); await page.getByLabel('密碼', { exact: true }).fill('fixture-only-input'); await page.getByRole('button', { name: '登入', exact: true }).click(); await loaded(page)
    s.stats = r => reply(r, envelope(code), 401); await page.getByRole('button', { name: '重新載入統計' }).click(); await expect(page.getByRole('dialog')).toContainText('需要有效登入身分')
    await expect(page.locator('[data-statistics-respondent]')).toHaveCount(0); await page.keyboard.press('Escape'); await page.mouse.click(1, 100); await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).last().click(); await expect(page).toHaveURL(/\/login\?redirect=/)
    expect(new URL(page.url()).searchParams.get('redirect')).toBe(full)
    expect(s.requests.filter(r => r.url === root)).toHaveLength(3)
  })
  test('F9-B02 guest Header clicked target, public logout has no statistics refetch; history uses push', async ({ page }) => {
    const s = await mock(page); s.loggedOut = true; s.expected.push(expectedHttp('GET', `${api}/users/me`, 401, 1))
    await page.goto(view); await loaded(page); await page.getByRole('button', { name: '我的表單', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/login?redirect=/forms')
    await page.goBack(); await loaded(page); expect(s.requests.filter(r => r.url.endsWith('/users/me'))).toHaveLength(1)
    await page.getByRole('link', { name: '查看表單', exact: true }).click(); await expect(page).toHaveURL(/\/login\?redirect=/)
    await page.getByRole('textbox', { name: 'Email' }).fill(owner.email); await page.getByLabel('密碼', { exact: true }).fill('fixture-only-input'); await page.getByRole('button', { name: '登入', exact: true }).click(); await expect(page.getByRole('link', { name: '查看統計', exact: true })).toBeVisible()
    await page.getByRole('link', { name: '查看統計', exact: true }).click(); await loaded(page); const reads = s.requests.filter(r => r.url === root).length
    await page.getByRole('button', { name: '使用者選單' }).click(); await page.getByRole('button', { name: '登出', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/login')
    expect(s.requests.filter(r => r.url === root)).toHaveLength(reads)
  })

  for (const code of ['AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED']) test(`F9-B01 public bad-Cookie ${code} remains readable (fixture)`, async ({ page }) => {
    const s = await mock(page); s.expected.push(expectedHttp('GET', `${api}/users/me`, 401, 1)); s.me = r => reply(r, envelope(code), 401)
    await page.goto(view); await loaded(page); await expect(page).toHaveURL(`http://localhost:3000${view}`)
    await expect(page.locator('header')).toContainText('未登入'); expect(s.requests).toHaveLength(2)
  })

})

test.describe('thin fixture control build', () => {
  test.skip(process.env.F9_MODE !== 'harness', 'requires explicit test-only Session/route controls')
  for (const mode of ['draft', 'closed'] as const) test(`F9-B02 F6/F8 ${mode} dirty cancels then confirms statistics navigation`, async ({ page }) => {
    const s = await mock(page); s.definition.status = mode; const target = mode === 'draft' ? `/forms/${uuid(50)}/edit` : `/forms/${uuid(50)}`
    if (mode === 'closed') s.definition.status = 'published'
    await page.goto(target)
    if (mode === 'draft') await page.getByLabel('表單標題', { exact: true }).fill('dirty 合成標題')
    else { await page.getByLabel('合成題目', { exact: true }).first().fill('dirty 合成答案') }
    await native(page, false, () => page.evaluate(path => window.f9Harness.push(path), view)); await expect(page).toHaveURL(`http://localhost:3000${target}`)
    await native(page, true, () => page.evaluate(path => window.f9Harness.push(path), view)); await loaded(page)
    expect(s.requests.filter(r => r.url.endsWith('/users/me'))).toHaveLength(1)
  })
  for (const outcome of ['200', '401', '403']) test(`F9-B02 same component A late ${outcome}, B loading/finally, Session switch and unmount`, async ({ page }) => {
    const s = await mock(page), a = gate(), b = gate(); let requests = 0
    const otherRoot = `${api}/forms/${uuid(60)}/statistics`
    s.expected.push(expectedNetwork('GET', root, 'net::ERR_ABORTED', 1, 0))
    s.stats = async r => {
      requests++
      if (r.request().url() === root) { await a.promise; await reply(r, outcome === '200' ? s.dto : envelope(outcome === '401' ? 'AUTH_REQUIRED' : 'STATISTICS_ACCESS_DENIED'), Number(outcome)) }
      else { await b.promise; await reply(r, { ...statistics(false), formId: uuid(60), title: 'B 公開' }) }
    }
    await page.goto(view); await expect.poll(() => requests).toBe(1)
    await page.evaluate(path => window.f9Harness.push(path), `/forms/${uuid(60)}/statistics`); await expect.poll(() => requests).toBe(2)
    a.release(); await expect(page.getByText('統計載入中…')).toBeVisible(); await expect(page.locator('[data-statistics-respondent]')).toHaveCount(0)
    b.release(); await loaded(page); await expect(page.getByRole('region', { name: '統計根資訊' })).toContainText('B 公開')
    s.stats = r => reply(r, { ...statistics(false), formId: uuid(60), title: '新身分統計' })
    await page.evaluate(user => window.f9Harness.login(user), { ...owner, id: uuid(72) }); await loaded(page); await expect(page.getByText('新身分統計', { exact: true })).toBeVisible()
    await page.evaluate(user => window.f9Harness.profile(user), { ...owner, id: uuid(72), displayName: '同ID新名稱' }); expect(s.requests.filter(r => r.url === otherRoot)).toHaveLength(2)
    await page.evaluate(() => window.f9Harness.push('/')); await expect(page).toHaveURL('http://localhost:3000/')
    expect(s.requests.filter(r => r.url.includes('/forms//'))).toHaveLength(0)
  })
  for (const event of ['login', 'verify', 'unmount'] as const) test(`F9-B02 pending private response after ${event} cannot restore names or change Header/route`, async ({ page }) => {
    const s = await mock(page), old = gate(); s.expected.push(expectedNetwork('GET', root, 'net::ERR_ABORTED', 1, 0))
    s.stats = async r => { await old.promise; await reply(r, statistics(true)) }
    await page.goto(view); await expect.poll(() => s.requests.filter(r => r.url === root).length).toBe(1)
    s.stats = r => reply(r, { ...statistics(false), title: '新帳號公開結果' })
    s.user = { ...owner, id: uuid(72), displayName: '新帳號合成' }
    if (event === 'login') await page.evaluate(user => window.f9Harness.login(user), s.user)
    else if (event === 'verify') await page.evaluate(() => window.f9Harness.verify())
    else await page.evaluate(() => window.f9Harness.push('/'))
    old.release()
    if (event === 'unmount') { await expect(page).toHaveURL('http://localhost:3000/'); await expect(page.getByRole('heading', { name: /^歡迎/ })).toBeVisible() }
    else { await loaded(page); await expect(page.getByText('新帳號公開結果', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: '使用者選單' })).toContainText('新帳號合成'); await expect(page).toHaveURL(`http://localhost:3000${view}`) }
    await expect(page.locator('[data-statistics-respondent]')).toHaveCount(0)
    expect(s.requests.filter(r => r.url.endsWith('/users/me'))).toHaveLength(event === 'verify' ? 2 : 1)
    expect(s.requests.filter(r => r.url === root)).toHaveLength(event === 'unmount' ? 1 : 2)
  })
})
