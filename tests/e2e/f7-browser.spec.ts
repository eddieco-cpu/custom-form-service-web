import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'
import { form, uuid, Q } from '../fixtures/f5/payloads'
import type { FormDetailDto, DraftDeltaRequest } from '../../app/domain/api/form'
import { stringifyExactJson, parseExactJson } from '../../app/utils/exact-json'
import { expectedHttp, expectedNetwork, verifyNetworkDiagnostics } from '../helpers/f6-network-diagnostics'
import type { Diagnostic, ExpectedFailure, NetworkFailure } from '../helpers/f6-network-diagnostics'
const api = 'http://localhost:5000/api/v1', root = `${api}/forms/${uuid(50)}`, edit = `/forms/${uuid(50)}/edit`, view = `/forms/${uuid(50)}`
test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1440, height: 900 }) })
const owner = { id: uuid(51), email: 'f7-fixture@example.test', displayName: 'F7 合成建立者', avatarUrl: null }
const headers = { 'access-control-allow-origin': 'http://localhost:3000', 'access-control-allow-credentials': 'true' }
type Reply = (r: Route) => Promise<void>
const error = (code: string, details?: { path: string; code: string; message: string }[]) => ({ error: { code, message: '合成錯誤', ...(details ? { details } : {}) } })
const reply = (r: Route, body: unknown, status = 200) => r.fulfill({ status, headers, contentType: 'application/json', body: stringifyExactJson(body) })
function gate() { let release!: () => void; const promise = new Promise<void>(r => { release = r }); return { promise, release } }
async function mock(page: Page, dto = form(), nonOwner = false) {
  const s = { dto, user: nonOwner ? { ...owner, id: uuid(52) } : owner, count: 0, get: undefined as Reply | undefined, write: undefined as Reply | undefined, logout: undefined as Reply | undefined, loggedOut: false,
    requests: [] as { method: string; path: string; body: string | null }[], expected: [] as ExpectedFailure[], outcomes: [] as NetworkFailure[], diagnostics: [] as Diagnostic[], errors: [] as string[], unexpected: [] as string[] }
  page.on('pageerror', e => s.errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' || m.text().includes('[Vue warn]')) s.diagnostics.push({ text: m.text(), url: m.location().url }) })
  page.on('response', r => { if (r.status() >= 400) s.outcomes.push({ kind: 'response', url: r.url(), method: r.request().method(), status: r.status() }) })
  page.on('requestfailed', r => s.outcomes.push({ kind: 'requestfailed', method: r.method(), url: r.url(), reason: r.failure()!.errorText }))
  await page.route(`${api}/**`, async r => {
    const req = r.request(), path = new URL(req.url()).pathname, method = req.method()
    if (method === 'OPTIONS') { await r.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST,PATCH,DELETE', 'access-control-allow-headers': 'content-type' } }); return }
    s.requests.push({ method, path, body: req.postData() })
    if (path === '/api/v1/users/me') { await reply(r, s.loggedOut ? error('AUTH_REQUIRED') : s.user, s.loggedOut ? 401 : 200); return }
    if (path === '/api/v1/auth/logout') {
      if (s.logout) await s.logout(r)
      else { s.loggedOut = true; await r.fulfill({ status: 204, headers }) }
      return
    }
    if (path === '/api/v1/forms') { await reply(r, { items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }); return }
    if (req.url() === root && method === 'GET') { if (s.get) await s.get(r); else await reply(r, s.dto); return }
    if (path.endsWith('/respondent-count')) { await reply(r, { count: s.count }); return }
    if (['PATCH', 'POST', 'DELETE'].includes(method)) {
      if (s.write) { await s.write(r); return }
      if (method === 'DELETE') { await r.fulfill({ status: 204, headers }); return }
      if (path.endsWith('/publish')) s.dto = { ...s.dto, status: 'published' }
      else if (path.endsWith('/close')) s.dto = { ...s.dto, status: 'closed' }
      else if (path.endsWith('/result-visibility')) s.dto = { ...s.dto, ...(parseExactJson(req.postData()!) as { resultVisibility: FormDetailDto['resultVisibility'] }), updatedAt: '2026-10-14T01:00:00Z' }
      else if (method === 'PATCH' && req.url() === root) {
        const body = parseExactJson(req.postData()!) as DraftDeltaRequest
        s.dto = { ...s.dto, ...body, questions: s.dto.questions.map(q => ({ ...q, ...body.questions?.find(delta => 'id' in delta && delta.id === q.id) })) } as FormDetailDto
      }
      else { s.unexpected.push(`${method} ${path}`); await reply(r, error('INTERNAL_SERVER_ERROR'), 500); return }
      await reply(r, s.dto); return
    }
    s.unexpected.push(`${method} ${path}`); await reply(r, error('INTERNAL_SERVER_ERROR'), 500)
  })
  return s
}
const sets = new WeakMap<Page, Awaited<ReturnType<typeof mock>>>()
async function start(page: Page, dto = form(), nonOwner = false) { const s = await mock(page, dto, nonOwner); sets.set(page, s); await page.goto(dto.status === 'draft' ? edit : view); await expect(page.getByText('建立者：', { exact: false }).first()).toBeVisible(); return s }
function clean(s: Awaited<ReturnType<typeof mock>>) { expect(s.errors).toEqual([]); expect(s.unexpected).toEqual([]); expect(verifyNetworkDiagnostics(s.expected, s.outcomes, s.diagnostics)).toEqual([]) }
test.afterEach(async ({ page }, info) => { const s = sets.get(page); if (s) await info.attach('declared-network-diagnostics', { body: JSON.stringify({ expected: s.expected, actual: s.outcomes, diagnostics: s.diagnostics, issues: verifyNetworkDiagnostics(s.expected, s.outcomes, s.diagnostics) }), contentType: 'application/json' }) })
const field = (page: Page, name: string) => page.locator(`[data-editor-field="${name}"]`)
const save = (page: Page) => page.getByRole('button', { name: '保存', exact: true })
async function closeError(page: Page) { await page.getByRole('dialog', { name: '操作訊息' }).getByRole('button', { name: '關閉', exact: true }).filter({ hasText: '關閉' }).click() }
test('F7-B01 saved publish is separate, confirmed, pushes and freezes; dirty/cancel sends nothing', async ({ page }) => {
  const s = await start(page); await field(page, 'form.title').fill('新標題'); await expect(page.getByRole('button', { name: '發布', exact: true })).toBeDisabled()
  await save(page).click(); await expect(save(page)).toBeDisabled(); await page.getByRole('button', { name: '發布', exact: true }).click(); await page.getByRole('button', { name: '取消', exact: true }).click()
  expect(s.requests.filter(r => r.path.endsWith('/publish'))).toHaveLength(0)
  await page.getByRole('button', { name: '發布', exact: true }).click(); await expect(page.getByRole('dialog', { name: '發布表單' })).toContainText('凍結'); await page.getByRole('button', { name: '確認發布' }).click()
  await expect(page).toHaveURL(`http://localhost:3000${view}`); await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toBeVisible(); await expect(save(page)).toHaveCount(0)
  expect(s.requests.find(r => r.path.endsWith('/publish'))?.body).toBeNull(); expect(s.requests.filter(r => r.path.endsWith('/users/me'))).toHaveLength(1); clean(s)
})
test('F7-B02 deadline remains Published; Close stays, reveals Closed links and removes Count', async ({ page }) => {
  const s = await start(page, { ...form(), status: 'published', submissionDeadlineAt: '2020-01-01T00:00:00Z' }); await expect(page.getByText('已截止', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '關閉表單以查看統計', exact: true }).click(); await expect(page.getByRole('dialog', { name: '關閉表單' })).toContainText('不能重新開啟'); await page.getByRole('button', { name: '確認關閉' }).click()
  await expect(page.getByRole('link', { name: '查看統計' })).toHaveAttribute('href', `${view}/statistics`); await expect(page).toHaveURL(`http://localhost:3000${view}`); await expect(page.getByRole('button', { name: '查看填答人數' })).toHaveCount(0)
  expect(s.requests.find(r => r.path.endsWith('/close'))?.body).toBeNull(); clean(s)
})
for (const status of ['draft', 'published', 'closed'] as const) test(`F7-B03 ${status} Delete 204 replaces; dirty confirms once, cancel keeps data`, async ({ page }) => {
  const s = await start(page, { ...form(), status }); let native = 0; page.on('dialog', async d => { native++; await d.dismiss() })
  if (status === 'draft') await field(page, 'form.title').fill('未保存刪除資料')
  await page.getByRole('button', { name: '刪除表單', exact: true }).click(); if (status === 'draft') await expect(page.getByRole('dialog', { name: '刪除表單' })).toContainText('丟棄')
  await page.getByRole('button', { name: '取消', exact: true }).click(); expect(s.requests.filter(r => r.method === 'DELETE')).toHaveLength(0)
  await page.getByRole('button', { name: '刪除表單', exact: true }).click(); await page.getByRole('button', { name: '確認刪除' }).click(); await expect(page).toHaveURL('http://localhost:3000/forms')
  expect(native).toBe(0); expect(s.requests.filter(r => r.method === 'DELETE')).toHaveLength(1); expect(s.requests.find(r => r.method === 'DELETE')?.body).toBeNull(); clean(s)
})
test('F7-B04 Visibility retains pending edits and exact definition; all writes serialize', async ({ page }, info) => {
  const s = await start(page); await field(page, 'form.title').fill('B'); const pending = gate()
  s.write = async r => { await pending.promise; s.dto = { ...s.dto, resultVisibility: 'public' }; await reply(r, s.dto) }
  await page.getByRole('radio', { name: '所有人', exact: true }).click(); await expect(save(page)).toBeDisabled(); await expect(page.getByRole('button', { name: '刪除表單', exact: true })).toBeDisabled()
  await field(page, 'form.title').fill('C'); await page.getByRole('button', { name: '新增題目' }).click(); pending.release()
  await expect(page.getByRole('radio', { name: '所有人', exact: true })).toBeChecked(); await expect(field(page, 'form.title')).toHaveValue('C'); await expect(page.locator('[data-question-key]')).toHaveCount(6); await expect(save(page)).toBeEnabled()
  await expect(field(page, `${Q[1]}.config.max`)).toHaveValue('9007199254740993.1234567890123456789')
  expect(JSON.parse(s.requests.find(r => r.path.endsWith('/result-visibility'))!.body!)).toEqual({ resultVisibility: 'public' })
  await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: info.outputPath('visibility-mobile.png'), fullPage: true }); clean(s)
})
test('F7-B05 policy explicit failure restores; unknown reload cancel/failure/current adoption gates correctly', async ({ page }) => {
  const s = await start(page); await field(page, 'form.title').fill('保留'); s.expected.push(expectedHttp('PATCH', `${root}/result-visibility`, 400, 1)); s.write = r => reply(r, error('VALIDATION_ERROR'), 400)
  await page.getByRole('radio', { name: '所有人', exact: true }).click(); await closeError(page); await expect(page.getByRole('radio', { name: '填答者', exact: true })).toBeChecked(); await expect(field(page, 'form.title')).toHaveValue('保留')
  s.expected.push(expectedNetwork('PATCH', `${root}/result-visibility`, 'net::ERR_FAILED', 1, 1)); s.write = r => r.abort('failed')
  await page.getByRole('radio', { name: '所有人', exact: true }).click(); await closeError(page); await expect(page.getByText(/待重新確認；/)).toBeVisible(); await expect(page.getByRole('radio', { name: '所有人', exact: true })).toBeDisabled()
  page.once('dialog', d => d.dismiss()); await page.getByRole('button', { name: '重新載入並核對' }).click(); await expect(field(page, 'form.title')).toHaveValue('保留')
  s.expected.push(expectedHttp('GET', root, 500, 1)); s.get = r => reply(r, error('INTERNAL_SERVER_ERROR'), 500); page.once('dialog', d => d.accept()); await page.getByRole('button', { name: '重新載入並核對' }).click(); await closeError(page)
  await expect(page.getByRole('radio', { name: '所有人', exact: true })).toBeDisabled(); s.get = undefined; s.dto = { ...s.dto, resultVisibility: 'public' }; page.once('dialog', d => d.accept())
  await page.getByRole('button', { name: '重新載入並核對' }).click(); await expect(field(page, 'form.title')).toHaveValue(form().title); await expect(page.getByRole('radio', { name: '所有人', exact: true })).toBeEnabled(); clean(s)
})
test('F7-B06 Publish full saved index, unknown summary and first actual field focus', async ({ page }) => {
  const s = await start(page); await field(page, `${Q[2]}.title`).fill('僅第三題Delta'); await save(page).click(); await expect(save(page)).toBeDisabled()
  s.expected.push(expectedHttp('POST', `${root}/publish`, 400, 1)); s.write = r => reply(r, error('FORM_NOT_PUBLISHABLE', [{ path: 'questions[2].title', code: 'INVALID_VALUE', message: '第三題發布錯誤' }, { path: 'unknown.path', code: 'INVALID_VALUE', message: '未知位置保留' }]), 400)
  await page.getByRole('button', { name: '發布', exact: true }).click(); await page.getByRole('button', { name: '確認發布' }).click(); await expect(page.getByRole('dialog', { name: '操作訊息' })).toContainText('未知位置保留'); await closeError(page)
  await expect(field(page, `${Q[2]}.title`)).toBeFocused(); await expect(page.getByRole('list', { name: '欄位錯誤摘要' })).toContainText('第三題發布錯誤'); clean(s)
})
test('F7-B07 conflict candidate waits for dirty consent and failed reload never restores qualification', async ({ page }) => {
  const s = await start(page); await field(page, 'form.title').fill('保留本地'); s.expected.push(expectedHttp('PATCH', `${root}/result-visibility`, 403, 1)); s.write = r => reply(r, error('FORM_ACCESS_DENIED'), 403)
  await page.getByRole('radio', { name: '所有人', exact: true }).click(); await closeError(page); await expect(save(page)).toBeDisabled(); await expect(field(page, 'form.title')).toHaveValue('保留本地')
  page.once('dialog', d => d.accept()); await page.getByRole('button', { name: '重新載入表單', exact: true }).click(); await expect(save(page)).toBeDisabled(); await expect(page.getByRole('button', { name: '核對登入與管理資格' })).toBeVisible()
  await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/'); await page.goBack(); await expect(page).toHaveURL(`http://localhost:3000${edit}`)
  await expect(page.getByRole('button', { name: '核對登入與管理資格' })).toBeVisible(); await expect(page.getByRole('button', { name: '發布', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '核對登入與管理資格' }).click(); await expect(page.getByRole('button', { name: '發布', exact: true })).toBeEnabled(); clean(s)
})
for (const code of ['AUTH_REQUIRED', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED']) test(`F7-B07 ${code} dialog then dirty cancel retains but disables writes`, async ({ page }) => {
  const s = await start(page); await field(page, 'form.title').fill('登入失效保留'); s.expected.push(expectedHttp('PATCH', `${root}/result-visibility`, 401, 1)); s.write = r => reply(r, error(code), 401)
  await page.getByRole('radio', { name: '所有人', exact: true }).click(); await expect(page.getByRole('dialog', { name: '操作訊息' })).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog', { name: '操作訊息' })).toBeVisible()
  let dismissed!: () => void; const handled = new Promise<void>(r => { dismissed = r })
  page.once('dialog', async d => { await d.dismiss(); dismissed() }); if (code === 'AUTH_TOKEN_INVALID') await page.getByRole('dialog', { name: '操作訊息' }).getByLabel('關閉', { exact: true }).click(); else await closeError(page)
  await handled
  await expect(field(page, 'form.title')).toHaveValue('登入失效保留'); await expect(save(page)).toBeDisabled(); await expect(page).toHaveURL(`http://localhost:3000${edit}`); clean(s)
})
test('F7-B08 Count zero and explicit repeat, no automatic poll', async ({ page }) => {
  const s = await start(page, { ...form(), status: 'published' }); expect(s.requests.filter(r => r.path.endsWith('/respondent-count'))).toHaveLength(0)
  await page.getByRole('button', { name: '查看填答人數' }).click(); await expect(page.getByText('不同填答者人數：0')).toBeVisible(); s.count = 2
  await page.getByRole('button', { name: '查看填答人數' }).click(); await expect(page.getByText('不同填答者人數：2')).toBeVisible(); expect(s.requests.filter(r => r.path.endsWith('/respondent-count'))).toHaveLength(2); clean(s)
})
test('F7-B09 Clipboard fallback exposes complete URL; Closed policy description updates; nonOwner gates', async ({ page }, info) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('synthetic denied')) }, configurable: true }) })
  const s = await start(page, { ...form(), status: 'closed' }); await page.getByRole('button', { name: '複製統計連結' }).click(); await expect(page.getByLabel('完整分享連結')).toHaveValue(`http://localhost:3000${view}/statistics`)
  await page.getByRole('radio', { name: '所有人', exact: true }).click(); await expect(page.getByText('查看資格：所有人', { exact: true })).toBeVisible(); await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: info.outputPath('closed-mobile.png'), fullPage: true }); clean(s)
})
for (const visibility of ['owner_only', 'respondents', 'public'] as const) test(`F7-B09 nonOwner Closed ${visibility} has correct Statistics link only`, async ({ page }) => {
  const s = await start(page, { ...form(), status: 'closed', resultVisibility: visibility }, true); await expect(page.getByRole('button', { name: '刪除表單' })).toHaveCount(0); await expect(page.getByRole('radio')).toHaveCount(0)
  await expect(page.getByRole('link', { name: '查看統計' })).toHaveCount(visibility === 'owner_only' ? 0 : 1); clean(s)
})
test('F7-B10 old Form GET after Close success stays stale after pending ends', async ({ page }) => {
  const s = await start(page, { ...form(), status: 'published' }), pending = gate(); let reading = false
  s.get = async r => { reading = true; await pending.promise; await reply(r, { ...form(), status: 'published', resultVisibility: 'owner_only' }) }
  await page.getByRole('button', { name: '重新載入表單', exact: true }).click(); await expect.poll(() => reading).toBe(true)
  await page.getByRole('button', { name: '關閉表單以查看統計', exact: true }).click(); await page.getByRole('button', { name: '確認關閉' }).click(); await expect(page.getByRole('button', { name: '複製統計連結' })).toBeVisible()
  pending.release(); await expect(page.getByText('正在載入表單…')).toHaveCount(0); await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toHaveCount(0); await expect(page.getByText('查看資格：建立者及填答者')).toBeVisible(); clean(s)
})
test('F7-B11 old GET after Close unknown cannot unlock; a fresh GET reconciles', async ({ page }) => {
  const s = await start(page, { ...form(), status: 'published' }), pending = gate(); let reading = false
  s.get = async r => { reading = true; await pending.promise; await reply(r, s.dto) }
  await page.getByRole('button', { name: '重新載入表單', exact: true }).click(); await expect.poll(() => reading).toBe(true)
  s.expected.push(expectedNetwork('POST', `${root}/close`, 'net::ERR_FAILED', 1, 1)); s.write = r => r.abort('failed')
  await page.getByRole('button', { name: '關閉表單以查看統計', exact: true }).click(); await page.getByRole('button', { name: '確認關閉' }).click(); await closeError(page); pending.release(); await expect(page.getByText('正在載入表單…')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toBeDisabled(); await expect(page.getByRole('button', { name: '重新載入並核對' })).toBeVisible()
  s.get = undefined; page.once('dialog', d => d.accept()); await page.getByRole('button', { name: '重新載入並核對' }).click(); await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toBeEnabled(); clean(s)
})
test('F7-B12 Delete unknown retains dirty data; current 404 consumes reload consent once', async ({ page }) => {
  const s = await start(page); await field(page, 'form.title').fill('刪除不明保留')
  s.expected.push(expectedNetwork('DELETE', root, 'net::ERR_FAILED', 1, 1)); s.write = r => r.abort('failed')
  await page.getByRole('button', { name: '刪除表單', exact: true }).click(); await page.getByRole('button', { name: '確認刪除' }).click(); await closeError(page)
  await expect(field(page, 'form.title')).toHaveValue('刪除不明保留'); await expect(save(page)).toBeDisabled(); await expect(page.getByRole('radio', { name: '所有人', exact: true })).toBeDisabled()
  s.expected.push(expectedHttp('GET', root, 404, 1)); s.get = r => reply(r, error('FORM_NOT_FOUND'), 404); let prompts = 0
  page.on('dialog', async d => { prompts++; await d.accept() }); await page.getByRole('button', { name: '重新載入並核對' }).click()
  await expect(page.getByText('找不到表單', { exact: true })).toBeVisible(); expect(prompts).toBe(1); expect(s.requests.filter(r => r.method === 'DELETE')).toHaveLength(1)
  await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/'); expect(prompts).toBe(1); clean(s)
})
test('F7-B13 disabled error retains Header and definition; no global logout or unknown write lock', async ({ page }) => {
  const s = await start(page); await field(page, 'form.title').fill('停用保留')
  s.expected.push(expectedHttp('PATCH', `${root}/result-visibility`, 403, 1)); s.write = r => reply(r, error('AUTH_USER_DISABLED'), 403)
  await page.getByRole('radio', { name: '所有人', exact: true }).click(); await expect(page.getByRole('dialog', { name: '操作訊息' })).toContainText('停用'); await closeError(page)
  await expect(field(page, 'form.title')).toHaveValue('停用保留'); await expect(page.getByRole('button', { name: '使用者選單' })).toBeVisible(); await expect(page.getByRole('radio', { name: '所有人', exact: true })).toBeEnabled(); clean(s)
})
test('F7-B14 Clipboard success stores the complete Published URL and no fallback', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as unknown as { f7Copied: string }).f7Copied = text } } }) })
  const s = await start(page, { ...form(), status: 'published' }); await page.getByRole('button', { name: '複製填答連結' }).click()
  expect(await page.evaluate(() => (window as unknown as { f7Copied: string }).f7Copied)).toBe(`http://localhost:3000${view}`); await expect(page.getByText('填答連結已複製', { exact: true })).toBeVisible(); await expect(page.getByLabel('完整分享連結')).toHaveCount(0); clean(s)
})
test('F7-B15 nonOwner Draft remains formal 404 without management', async ({ page }) => {
  const s = await mock(page, form(), true); sets.set(page, s); s.expected.push(expectedHttp('GET', root, 404, 1)); s.get = r => reply(r, error('FORM_NOT_FOUND'), 404)
  await page.goto(edit); await expect(page.getByText('找不到表單', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: '發布', exact: true })).toHaveCount(0); clean(s)
})
test('F7-B16 readonly qualification must adopt a successful Form GET; failure cannot unlock the denial', async ({ page }) => {
  const s = await start(page, { ...form(), status: 'published' }); s.expected.push(expectedHttp('PATCH', `${root}/result-visibility`, 403, 1)); s.write = r => reply(r, error('FORM_ACCESS_DENIED'), 403)
  await page.getByRole('radio', { name: '所有人', exact: true }).click(); await closeError(page)
  s.expected.push(expectedHttp('GET', root, 500, 1)); s.get = r => reply(r, error('INTERNAL_SERVER_ERROR'), 500)
  await page.getByRole('button', { name: '核對登入與管理資格' }).click(); await expect(page.getByText('載入失敗，請手動重試。')).toBeVisible()
  await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toHaveCount(0)
  s.get = undefined; await page.getByRole('button', { name: '核對登入與管理資格' }).click(); await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toBeVisible(); clean(s)
})

// The seven independently failing reviewer scenarios retain their original expectations.
test('F7-R1 reviewer incomplete saved Rating focuses min repeatedly with full summary and zero writes', async ({ page }, info) => {
  const original = form(), dto = { ...original, questions: [{ ...original.questions[4]!, type: 'rating' as const, config: { max: 5 } }] }
  const s = await start(page, dto), publish = page.getByRole('button', { name: '發布', exact: true })
  for (let run = 0; run < 2; run++) {
    await publish.click(); await expect(field(page, `${Q[4]}.config.min`)).toBeFocused()
    await expect(page.getByRole('list', { name: '欄位錯誤摘要' })).toContainText('發布須提供完整評分範圍')
    await expect(field(page, `${Q[4]}.config.min`)).toHaveValue('')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  expect(s.requests.filter(r => ['POST', 'PATCH'].includes(r.method))).toHaveLength(0)
  await page.screenshot({ path: info.outputPath('publish-local-focus.png'), fullPage: true }); clean(s)
})
test('F7-R1 first non-control error stays in summary while first editable Publish control receives focus', async ({ page }) => {
  const original = form(), dto = { ...original, questions: [{ ...original.questions[2]!, type: 'single_choice' as const, config: {}, options: [] }, { ...original.questions[4]!, type: 'rating' as const, config: {} }] }
  const s = await start(page, dto); await page.getByRole('button', { name: '發布', exact: true }).click()
  await expect(page.getByRole('list', { name: '欄位錯誤摘要' }).locator('li')).toHaveCount(3)
  await expect(page.getByRole('list', { name: '欄位錯誤摘要' })).toContainText('發布至少需要一個選項')
  await expect(field(page, `${Q[4]}.config.min`)).toBeFocused()
  expect(s.requests.filter(r => ['POST', 'PATCH'].includes(r.method))).toHaveLength(0); clean(s)
})
type ClipboardHarness = { copied: string[]; commands: { resolve: () => void; reject: () => void }[] }
async function pendingClipboard(page: Page) {
  await page.addInitScript(() => {
    const harness: ClipboardHarness = { copied: [], commands: [] }
    Object.assign(window, { f7Clipboard: harness })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (url: string) => {
      harness.copied.push(url)
      return new Promise<void>((resolve, reject) => harness.commands.push({ resolve, reject: () => reject(new Error('synthetic clipboard denial')) }))
    } } })
  })
}
async function settleClipboard(page: Page, reject = false, index = 0) {
  await page.evaluate(async ({ reject, index }) => {
    const harness = (window as unknown as { f7Clipboard: ClipboardHarness }).f7Clipboard
    harness.commands[index]![reject ? 'reject' : 'resolve']()
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  }, { reject, index })
}
test('F7-R2 reviewer Clipboard resolve after SPA leave creates no stale toast or fallback', async ({ page }) => {
  await pendingClipboard(page); const s = await start(page, { ...form(), status: 'published' })
  await page.getByRole('button', { name: '複製填答連結' }).click()
  await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/')
  await settleClipboard(page); await expect(page.getByText('填答連結已複製', { exact: true })).toHaveCount(0); await expect(page.getByLabel('完整分享連結')).toHaveCount(0); clean(s)
})
test('F7-R2 reviewer Clipboard reject after management denial creates no late fallback', async ({ page }) => {
  await pendingClipboard(page); const s = await start(page, { ...form(), status: 'published' })
  await page.getByRole('button', { name: '複製填答連結' }).click()
  s.expected.push(expectedHttp('PATCH', `${root}/result-visibility`, 403, 1)); s.write = r => reply(r, error('FORM_ACCESS_DENIED'), 403)
  await page.getByRole('radio', { name: '所有人', exact: true }).click(); await closeError(page)
  await expect(page.getByRole('button', { name: '複製填答連結' })).toHaveCount(0)
  await settleClipboard(page, true); await expect(page.getByLabel('完整分享連結')).toHaveCount(0); await expect(page.getByText('填答連結已複製', { exact: true })).toHaveCount(0); clean(s)
})
async function unknownClose(page: Page) {
  const s = await start(page, { ...form(), status: 'published' })
  s.expected.push(expectedNetwork('POST', `${root}/close`, 'net::ERR_FAILED', 1, 1)); s.write = r => r.abort('failed')
  await page.getByRole('button', { name: '關閉表單以查看統計', exact: true }).click(); await page.getByRole('button', { name: '確認關閉' }).click(); await closeError(page)
  await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toBeDisabled(); return s
}
test('F7-R3 reviewer unknown Close cancels SPA leave and preserves the reconciliation lock', async ({ page }) => {
  const s = await unknownClose(page); let prompts = 0
  page.on('dialog', async d => { expect(d.type()).toBe('confirm'); prompts++; await d.dismiss() })
  await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click()
  await expect.poll(() => prompts).toBe(1); await expect(page).toHaveURL(`http://localhost:3000${view}`)
  await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toBeDisabled(); await expect(page.getByRole('button', { name: '重新載入並核對' })).toBeVisible(); clean(s)
})
test('F7-R3 reviewer unknown Close cancels beforeunload without reinitializing App or unlocking', async ({ page }) => {
  const s = await unknownClose(page); let prompts = 0
  page.on('dialog', async d => { expect(d.type()).toBe('beforeunload'); prompts++; await d.dismiss() })
  const unload = page.waitForEvent('dialog', d => d.type() === 'beforeunload')
  void page.reload().catch(() => {}); await unload
  await expect(page).toHaveURL(`http://localhost:3000${view}`); expect(prompts).toBe(1)
  expect(s.requests.filter(r => r.path.endsWith('/users/me'))).toHaveLength(1)
  await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toBeDisabled(); await expect(page.getByRole('button', { name: '重新載入並核對' })).toBeVisible(); clean(s)
})
test('F7-R4 reviewer management 404 cancel retains dirty content but revokes F6 PATCH', async ({ page }) => {
  const s = await start(page); await field(page, 'form.title').fill('404 本地保留')
  s.expected.push(expectedHttp('PATCH', `${root}/result-visibility`, 404, 1)); s.write = r => reply(r, error('FORM_NOT_FOUND'), 404)
  await page.getByRole('radio', { name: '所有人', exact: true }).click(); let prompts = 0
  page.once('dialog', async d => { prompts++; await d.dismiss() }); await closeError(page)
  await expect(field(page, 'form.title')).toHaveValue('404 本地保留'); await expect(save(page)).toBeDisabled(); await expect(field(page, 'form.title')).toHaveAttribute('readonly', '')
  expect(prompts).toBe(1); expect(s.requests.filter(r => r.method === 'PATCH' && r.path === new URL(root).pathname)).toHaveLength(0)
  const gets = s.requests.filter(r => r.method === 'GET').length
  page.once('dialog', d => d.dismiss()); await page.getByRole('button', { name: '重新載入並核對' }).click(); expect(s.requests.filter(r => r.method === 'GET')).toHaveLength(gets)
  s.expected.push(expectedHttp('GET', root, 500, 1)); s.get = r => reply(r, error('INTERNAL_SERVER_ERROR'), 500)
  page.once('dialog', d => d.accept()); await page.getByRole('button', { name: '重新載入並核對' }).click(); await closeError(page); await expect(save(page)).toBeDisabled(); await expect(field(page, 'form.title')).toHaveValue('404 本地保留')
  s.get = undefined; s.write = undefined; page.once('dialog', d => d.accept()); await page.getByRole('button', { name: '重新載入並核對' }).click()
  await expect(field(page, 'form.title')).not.toHaveAttribute('readonly', ''); await field(page, 'form.title').fill('可靠 GET 後修改'); await save(page).click(); await expect(save(page)).toBeDisabled()
  expect(s.requests.filter(r => r.method === 'PATCH' && r.path === new URL(root).pathname)).toHaveLength(1); clean(s)
})
test('F7-R4 reviewer Publish conflict and failed candidate/current GET prohibit Draft PATCH', async ({ page }) => {
  const s = await start(page); s.expected.push(expectedHttp('POST', `${root}/publish`, 409, 1), expectedHttp('GET', root, 500, 2))
  s.write = r => reply(r, error('FORM_ALREADY_PUBLISHED'), 409); s.get = r => reply(r, error('INTERNAL_SERVER_ERROR'), 500)
  await page.getByRole('button', { name: '發布', exact: true }).click(); await page.getByRole('button', { name: '確認發布' }).click(); await closeError(page); await closeError(page)
  await expect(save(page)).toBeDisabled(); await expect(field(page, 'form.title')).toHaveAttribute('readonly', ''); await expect(field(page, 'form.title')).toHaveValue(form().title)
  expect(s.requests.filter(r => r.method === 'PATCH' && r.path === new URL(root).pathname)).toHaveLength(0)
  s.get = undefined; s.dto = { ...s.dto, status: 'published' }; await page.getByRole('button', { name: '重新載入並核對' }).click()
  await expect(page).toHaveURL(`http://localhost:3000${view}`); await expect(save(page)).toHaveCount(0); await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toBeVisible(); clean(s)
})
for (const status of ['published', 'closed'] as const) test(`F7-R3 ${status} Visibility unknown: cancel/failure retain lock, current adoption clears dirty`, async ({ page }) => {
  const s = await start(page, { ...form(), status }); s.expected.push(expectedNetwork('PATCH', `${root}/result-visibility`, 'net::ERR_FAILED', 1, 1)); s.write = r => r.abort('failed')
  await page.getByRole('radio', { name: '所有人', exact: true }).click(); await closeError(page)
  let prompts = 0, accept = false; page.on('dialog', async d => { prompts++; if (accept) await d.accept(); else await d.dismiss() })
  const gets = s.requests.filter(r => r.method === 'GET').length
  await page.getByRole('button', { name: '重新載入並核對' }).click(); expect(prompts).toBe(1); expect(s.requests.filter(r => r.method === 'GET')).toHaveLength(gets)
  await expect(page.getByRole('radio', { name: '所有人', exact: true })).toBeDisabled()
  accept = true; s.expected.push(expectedHttp('GET', root, 500, 1)); s.get = r => reply(r, error('INTERNAL_SERVER_ERROR'), 500)
  await page.getByRole('button', { name: '重新載入並核對' }).click(); await expect(page.getByText('載入失敗，請手動重試。')).toBeVisible(); expect(prompts).toBe(2)
  await expect(page.getByRole('radio', { name: '所有人', exact: true })).toBeDisabled()
  s.get = undefined; s.dto = { ...s.dto, resultVisibility: 'public' }; await page.getByRole('button', { name: '重新載入並核對' }).click()
  await expect(page.getByRole('radio', { name: '所有人', exact: true })).toBeChecked(); await expect(page.getByRole('radio', { name: '所有人', exact: true })).toBeEnabled(); expect(prompts).toBe(3)
  await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/'); expect(prompts).toBe(3); clean(s)
})
test('F7-R3 unknown Close Delete uses one confirmation; failed Delete revokes discard permit, 204 clears', async ({ page }) => {
  const s = await unknownClose(page); let prompts = 0
  page.on('dialog', async d => { prompts++; await d.dismiss() })
  s.expected.push(expectedHttp('DELETE', root, 400, 1)); s.write = r => reply(r, error('VALIDATION_ERROR'), 400)
  await page.getByRole('button', { name: '刪除表單', exact: true }).click(); await expect(page.getByRole('dialog', { name: '刪除表單' })).toContainText('待核對')
  await page.getByRole('button', { name: '確認刪除' }).click(); await closeError(page); expect(prompts).toBe(0)
  await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click(); await expect.poll(() => prompts).toBe(1); await expect(page).toHaveURL(`http://localhost:3000${view}`)
  s.write = undefined; await page.getByRole('button', { name: '刪除表單', exact: true }).click(); await page.getByRole('button', { name: '確認刪除' }).click()
  await expect(page).toHaveURL('http://localhost:3000/forms'); expect(prompts).toBe(1); expect(s.requests.filter(r => r.method === 'DELETE')).toHaveLength(2); clean(s)
})
test('F7-R3 Closed Delete unknown retains lock until current 404 adoption, without success toast', async ({ page }) => {
  const s = await start(page, { ...form(), status: 'closed' }); s.expected.push(expectedNetwork('DELETE', root, 'net::ERR_FAILED', 1, 1)); s.write = r => r.abort('failed')
  await page.getByRole('button', { name: '刪除表單', exact: true }).click(); await page.getByRole('button', { name: '確認刪除' }).click(); await closeError(page)
  let prompts = 0; page.on('dialog', async d => { prompts++; await d.accept() })
  s.expected.push(expectedHttp('GET', root, 404, 1)); s.get = r => reply(r, error('FORM_NOT_FOUND'), 404)
  await page.getByRole('button', { name: '重新載入並核對' }).click(); await expect(page.getByText('找不到表單', { exact: true })).toBeVisible(); expect(prompts).toBe(1)
  await expect(page).toHaveURL(`http://localhost:3000${view}`); await expect(page.getByText('表單已刪除', { exact: true })).toHaveCount(0)
  await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/'); expect(prompts).toBe(1); clean(s)
})
test('F7-R3 ActiveDirtyScope prevents logout request when unknown discard is cancelled', async ({ page }) => {
  const s = await unknownClose(page); let prompts = 0; page.on('dialog', async d => { prompts++; await d.dismiss() })
  await page.getByRole('button', { name: '使用者選單' }).click(); await page.getByRole('button', { name: '登出', exact: true }).click()
  expect(prompts).toBe(1); expect(s.requests.filter(r => r.path.endsWith('/logout'))).toHaveLength(0); await expect(page).toHaveURL(`http://localhost:3000${view}`)
  await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toBeDisabled(); clean(s)
})
test('F7-R2 status change isolates old copy; current Closed copy and latest generation fallback work', async ({ page }) => {
  await pendingClipboard(page); const s = await start(page, { ...form(), status: 'published' }); await page.getByRole('button', { name: '複製填答連結' }).click()
  await page.getByRole('button', { name: '關閉表單以查看統計', exact: true }).click(); await page.getByRole('button', { name: '確認關閉' }).click(); await expect(page.getByRole('button', { name: '複製統計連結' })).toBeVisible()
  await settleClipboard(page); await expect(page.getByText('填答連結已複製', { exact: true })).toHaveCount(0); await expect(page.getByText('統計連結已複製', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '複製統計連結' }).click(); await page.getByRole('button', { name: '複製統計連結' }).click()
  await settleClipboard(page, true, 2); await expect(page.getByLabel('完整分享連結')).toHaveValue(`http://localhost:3000${view}/statistics`)
  await settleClipboard(page, false, 1); await expect(page.getByLabel('完整分享連結')).toHaveValue(`http://localhost:3000${view}/statistics`); await expect(page.getByText('統計連結已複製', { exact: true })).toHaveCount(0)
  await page.getByLabel('完整分享連結').focus(); expect(await page.getByLabel('完整分享連結').evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!)).toBe(`http://localhost:3000${view}/statistics`.length)
  await page.getByRole('button', { name: '取消手動複製' }).click(); await expect(page.getByLabel('完整分享連結')).toHaveCount(0); clean(s)
})
async function headerLogout(page: Page) {
  await page.getByRole('button', { name: '使用者選單' }).click(); await page.getByRole('button', { name: '登出', exact: true }).click()
}
for (const status of ['published', 'closed'] as const) for (const unknown of [false, true]) test(`F7-R3-N1 ${status} ${unknown ? 'unknown accepts once' : 'clean confirms zero'} logout 204 clears and replaces login`, async ({ page }, info) => {
  const s = await start(page, { ...form(), status }); let prompts = 0
  page.on('dialog', async d => { prompts++; await d.accept() })
  if (unknown) {
    s.expected.push(expectedNetwork('PATCH', `${root}/result-visibility`, 'net::ERR_FAILED', 1, 1)); s.write = r => r.abort('failed')
    await page.getByRole('radio', { name: '所有人', exact: true }).click(); await closeError(page)
  }
  const before = await page.evaluate(() => history.length)
  await headerLogout(page); await expect(page).toHaveURL('http://localhost:3000/login'); await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  await expect(page.getByText('未登入', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: '使用者選單' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '重新載入並核對' })).toHaveCount(0)
  expect(prompts).toBe(unknown ? 1 : 0); expect(s.requests.filter(r => r.path.endsWith('/auth/logout'))).toHaveLength(1)
  expect(s.requests.find(r => r.path.endsWith('/auth/logout'))!.body).toBeNull(); expect(s.requests.filter(r => r.path.endsWith('/users/me'))).toHaveLength(1)
  expect(await page.evaluate(() => history.length)).toBe(before)
  if (status === 'published' && unknown) await page.screenshot({ path: info.outputPath('logout-unknown-login.png') })
  clean(s)
})
for (const status of ['published', 'closed'] as const) test(`F7-R3-N1 ${status} unknown logout cancel preserves Session URL and unknown lock, zero request`, async ({ page }) => {
  const s = await start(page, { ...form(), status }); s.expected.push(expectedNetwork('PATCH', `${root}/result-visibility`, 'net::ERR_FAILED', 1, 1)); s.write = r => r.abort('failed')
  await page.getByRole('radio', { name: '所有人', exact: true }).click(); await closeError(page)
  let prompts = 0; page.on('dialog', async d => { prompts++; await d.dismiss() }); await headerLogout(page); await expect.poll(() => prompts).toBe(1)
  expect(s.requests.filter(r => r.path.endsWith('/auth/logout'))).toHaveLength(0); await expect(page).toHaveURL(`http://localhost:3000${view}`)
  await expect(page.getByRole('button', { name: '使用者選單' })).toBeVisible(); await expect(page.getByRole('radio', { name: '所有人', exact: true })).toBeDisabled(); await expect(page.getByRole('button', { name: '重新載入並核對' })).toBeVisible(); clean(s)
})
for (const failure of ['http', 'network'] as const) test(`F7-R3-N1 unknown logout ${failure} failure preserves context and revokes discard authorization`, async ({ page }) => {
  const s = await unknownClose(page); let prompts = 0
  page.on('dialog', async d => { prompts++; if (prompts === 1) await d.accept(); else await d.dismiss() })
  if (failure === 'http') { s.expected.push(expectedHttp('POST', `${api}/auth/logout`, 400, 1)); s.logout = r => reply(r, error('VALIDATION_ERROR'), 400) }
  else { s.expected.push(expectedNetwork('POST', `${api}/auth/logout`, 'net::ERR_FAILED', 1, 1)); s.logout = r => r.abort('failed') }
  await headerLogout(page); await expect(page.getByRole('dialog', { name: '操作訊息' })).toBeVisible(); await closeError(page)
  await expect(page.getByRole('button', { name: '使用者選單' })).toBeVisible(); await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toBeDisabled()
  await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click(); await expect.poll(() => prompts).toBe(2)
  await expect(page).toHaveURL(`http://localhost:3000${view}`); expect(s.requests.filter(r => r.path.endsWith('/auth/logout'))).toHaveLength(1); clean(s)
})
for (const change of ['content', 'write', 'session', 'leave'] as const) test(`F7-R3-N1 pending logout external ${change} makes late 204 stale`, async ({ page }) => {
  const s = await start(page, { ...form(), status: 'published' }), pending = gate()
  s.logout = async r => { await pending.promise; await r.fulfill({ status: 204, headers }) }
  await headerLogout(page); await expect.poll(() => s.requests.filter(r => r.path.endsWith('/auth/logout')).length).toBe(1)
  if (change === 'content') { s.dto = { ...s.dto, title: '外部重新讀取現況' }; await page.getByRole('button', { name: '重新載入表單', exact: true }).click(); await expect(page.getByRole('heading', { name: '外部重新讀取現況' })).toBeVisible() }
  if (change === 'write') { s.expected.push(expectedHttp('PATCH', `${root}/result-visibility`, 400, 1)); s.write = r => reply(r, error('VALIDATION_ERROR'), 400); await page.getByRole('radio', { name: '所有人', exact: true }).click(); await closeError(page) }
  if (change === 'session') { s.expected.push(expectedHttp('GET', `${root}/respondent-count`, 401, 1)); await page.route(`${root}/respondent-count`, r => reply(r, error('AUTH_TOKEN_EXPIRED'), 401)); await page.getByRole('button', { name: '查看填答人數' }).click(); await expect(page.getByRole('dialog', { name: '操作訊息' })).toBeVisible() }
  if (change === 'leave') { await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/') }
  const response = page.waitForResponse(r => r.url() === `${api}/auth/logout`); pending.release(); await response
  await page.evaluate(async () => { await new Promise<void>(r => requestAnimationFrame(() => r())); await new Promise<void>(r => requestAnimationFrame(() => r())) })
  await expect(page).toHaveURL(`http://localhost:3000${change === 'leave' ? '/' : view}`)
  if (change === 'session') { await expect(page.getByRole('dialog', { name: '操作訊息' })).toBeVisible(); await expect(page.getByText('未登入', { exact: true })).toBeVisible() }
  else await expect(page.getByRole('button', { name: '使用者選單' })).toBeVisible()
  expect(s.requests.filter(r => r.path.endsWith('/auth/logout'))).toHaveLength(1); clean(s)
})
test('F7-R3-N1 reviewer Close unknown logout 204 uses one confirmation and replaces login', async ({ page }) => {
  const s = await unknownClose(page); let prompts = 0; page.on('dialog', async d => { prompts++; await d.accept() })
  const before = await page.evaluate(() => history.length)
  await headerLogout(page); await expect(page).toHaveURL('http://localhost:3000/login'); await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  await expect(page.getByText('未登入', { exact: true })).toBeVisible(); expect(prompts).toBe(1)
  expect(s.requests.filter(r => r.path.endsWith('/auth/logout'))).toHaveLength(1); expect(s.requests.filter(r => r.path.endsWith('/users/me'))).toHaveLength(1)
  expect(await page.evaluate(() => history.length)).toBe(before); await expect(page.getByRole('button', { name: '重新載入並核對' })).toHaveCount(0); clean(s)
})
