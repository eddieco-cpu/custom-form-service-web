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
  const s = { dto, user: nonOwner ? { ...owner, id: uuid(52) } : owner, count: 0, get: undefined as Reply | undefined, write: undefined as Reply | undefined,
    requests: [] as { method: string; path: string; body: string | null }[], expected: [] as ExpectedFailure[], outcomes: [] as NetworkFailure[], diagnostics: [] as Diagnostic[], errors: [] as string[], unexpected: [] as string[] }
  page.on('pageerror', e => s.errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' || m.text().includes('[Vue warn]')) s.diagnostics.push({ text: m.text(), url: m.location().url }) })
  page.on('response', r => { if (r.status() >= 400) s.outcomes.push({ kind: 'response', url: r.url(), method: r.request().method(), status: r.status() }) })
  page.on('requestfailed', r => s.outcomes.push({ kind: 'requestfailed', method: r.method(), url: r.url(), reason: r.failure()!.errorText }))
  await page.route(`${api}/**`, async r => {
    const req = r.request(), path = new URL(req.url()).pathname, method = req.method()
    if (method === 'OPTIONS') { await r.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST,PATCH,DELETE', 'access-control-allow-headers': 'content-type' } }); return }
    s.requests.push({ method, path, body: req.postData() })
    if (path === '/api/v1/users/me') { await reply(r, s.user); return }
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
  await expect(page).toHaveURL(`http://localhost:3000${view}`); await expect(page.getByRole('button', { name: '關閉表單', exact: true })).toBeVisible(); await expect(save(page)).toHaveCount(0)
  expect(s.requests.find(r => r.path.endsWith('/publish'))?.body).toBeNull(); expect(s.requests.filter(r => r.path.endsWith('/users/me'))).toHaveLength(1); clean(s)
})
test('F7-B02 deadline remains Published; Close stays, reveals Closed links and removes Count', async ({ page }) => {
  const s = await start(page, { ...form(), status: 'published', submissionDeadlineAt: '2020-01-01T00:00:00Z' }); await expect(page.getByText('已截止', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '關閉表單', exact: true }).click(); await expect(page.getByRole('dialog', { name: '關閉表單' })).toContainText('不能重新開啟'); await page.getByRole('button', { name: '確認關閉' }).click()
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
  await page.getByRole('button', { name: '關閉表單', exact: true }).click(); await page.getByRole('button', { name: '確認關閉' }).click(); await expect(page.getByRole('button', { name: '複製統計連結' })).toBeVisible()
  pending.release(); await expect(page.getByText('正在載入表單…')).toHaveCount(0); await expect(page.getByRole('button', { name: '關閉表單', exact: true })).toHaveCount(0); await expect(page.getByText('查看資格：建立者及填答者')).toBeVisible(); clean(s)
})
test('F7-B11 old GET after Close unknown cannot unlock; a fresh GET reconciles', async ({ page }) => {
  const s = await start(page, { ...form(), status: 'published' }), pending = gate(); let reading = false
  s.get = async r => { reading = true; await pending.promise; await reply(r, s.dto) }
  await page.getByRole('button', { name: '重新載入表單', exact: true }).click(); await expect.poll(() => reading).toBe(true)
  s.expected.push(expectedNetwork('POST', `${root}/close`, 'net::ERR_FAILED', 1, 1)); s.write = r => r.abort('failed')
  await page.getByRole('button', { name: '關閉表單', exact: true }).click(); await page.getByRole('button', { name: '確認關閉' }).click(); await closeError(page); pending.release(); await expect(page.getByText('正在載入表單…')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '關閉表單', exact: true })).toBeDisabled(); await expect(page.getByRole('button', { name: '重新載入並核對' })).toBeVisible()
  s.get = undefined; await page.getByRole('button', { name: '重新載入並核對' }).click(); await expect(page.getByRole('button', { name: '關閉表單', exact: true })).toBeEnabled(); clean(s)
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
  await expect(page.getByRole('button', { name: '關閉表單', exact: true })).toHaveCount(0)
  s.get = undefined; await page.getByRole('button', { name: '核對登入與管理資格' }).click(); await expect(page.getByRole('button', { name: '關閉表單', exact: true })).toBeVisible(); clean(s)
})
