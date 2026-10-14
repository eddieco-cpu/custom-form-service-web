import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'
import { form, uuid, Q, O } from '../fixtures/f5/payloads'
import type { FormDetailDto } from '../../app/domain/api/form'
import type { SubmitRequest } from '../../app/domain/api/response'
import { stringifyExactJson, parseExactJson } from '../../app/utils/exact-json'
import { expectedHttp, expectedNetwork, verifyNetworkDiagnostics } from '../helpers/f6-network-diagnostics'
import type { Diagnostic, ExpectedFailure, NetworkFailure } from '../helpers/f6-network-diagnostics'
const api = 'http://localhost:5000/api/v1', root = `${api}/forms/${uuid(50)}`, view = `/forms/${uuid(50)}`
const owner = { id: uuid(51), email: 'f8-fixture@example.test', displayName: 'F8 合成建立者', avatarUrl: null }
const headers = { 'access-control-allow-origin': 'http://localhost:3000', 'access-control-allow-credentials': 'true' }
const error = (code: string, details?: { path: string; code: string; message: string }[]) => ({ error: { code, message: '合成錯誤', ...(details ? { details } : {}) } })
const reply = (route: Route, body: unknown, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: stringifyExactJson(body) })
type Reply = (route: Route) => Promise<void>
function gate() { let release!: () => void; const promise = new Promise<void>(r => { release = r }); return { promise, release } }
function definition(mode: 'single' | 'multiple' = 'multiple'): FormDetailDto {
  const titles = ['文字', '數字', '單選', '多選', '評分']
  return { ...form(), title: 'F8 合成填答', status: 'published', responseMode: mode, submissionDeadlineAt: null,
    questions: form().questions.map((q, i) => { const common = { title: titles[i]!, options: q.options.map((o, j) => ({ ...o, label: `${i === 2 ? '單' : '多'}選${j + 1}` })) }; return q.type === 'text' ? { ...q, ...common, config: { ...q.config, variant: 'textarea' as const } } : { ...q, ...common } }) }
}
const sets = new WeakMap<Page, Awaited<ReturnType<typeof mock>>>()
async function mock(page: Page, dto = definition(), nonOwner = false) {
  const s = { dto, user: nonOwner ? { ...owner, id: uuid(52) } : owner, loggedOut: false, receipt: null as unknown, sequence: 80,
    post: undefined as Reply | undefined, latest: undefined as Reply | undefined, get: undefined as Reply | undefined, management: undefined as Reply | undefined,
    requests: [] as { method: string; path: string; body: string | null }[], expected: [] as ExpectedFailure[], outcomes: [] as NetworkFailure[], diagnostics: [] as Diagnostic[], errors: [] as string[], unexpected: [] as string[] }
  page.on('pageerror', e => s.errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' || m.text().includes('[Vue warn]')) s.diagnostics.push({ text: m.text(), url: m.location().url }) })
  page.on('response', r => { if (r.status() >= 400) s.outcomes.push({ kind: 'response', method: r.request().method(), url: r.url(), status: r.status() }) })
  page.on('requestfailed', r => s.outcomes.push({ kind: 'requestfailed', method: r.method(), url: r.url(), reason: r.failure()!.errorText }))
  await page.route(`${api}/**`, async route => {
    const r = route.request(), path = new URL(r.url()).pathname, method = r.method()
    if (method === 'OPTIONS') { await route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST,PATCH,DELETE', 'access-control-allow-headers': 'content-type' } }); return }
    s.requests.push({ method, path, body: r.postData() })
    if (path.endsWith('/users/me')) { await reply(route, s.loggedOut ? error('AUTH_REQUIRED') : s.user, s.loggedOut ? 401 : 200); return }
    if (path.endsWith('/auth/logout')) { s.loggedOut = true; await route.fulfill({ status: 204, headers }); return }
    if (path === '/api/v1/forms') { await reply(route, { items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }); return }
    if (/\/forms\/[^/]+$/.test(path) && method === 'GET') { if (s.get) await s.get(route); else await reply(route, { ...s.dto, id: path.split('/').at(-1) }); return }
    if (path.endsWith('/responses') && method === 'POST') {
      if (s.post) { await s.post(route); return }
      const body = parseExactJson(r.postData()!) as SubmitRequest
      s.receipt = { id: uuid(s.sequence++), formId: s.dto.id, submittedAt: '2026-10-14T10:00:00.1234567Z', answers: body.answers }
      await reply(route, s.receipt, 201); return
    }
    if (path.endsWith('/responses/me/latest')) { if (s.latest) await s.latest(route); else if (s.receipt) await reply(route, s.receipt); else await reply(route, error('RESPONSE_NOT_FOUND'), 404); return }
    if (path.endsWith('/respondent-count')) { await reply(route, { count: 1 }); return }
    if (['PATCH', 'POST', 'DELETE'].includes(method)) {
      if (s.management) { await s.management(route); return }
      if (method === 'DELETE') { await route.fulfill({ status: 204, headers }); return }
      if (path.endsWith('/close')) s.dto = { ...s.dto, status: 'closed' }
      else if (path.endsWith('/result-visibility')) s.dto = { ...s.dto, resultVisibility: (parseExactJson(r.postData()!) as { resultVisibility: FormDetailDto['resultVisibility'] }).resultVisibility }
      else { s.unexpected.push(`${method} ${path}`); await reply(route, error('INTERNAL_SERVER_ERROR'), 500); return }
      await reply(route, s.dto); return
    }
    s.unexpected.push(`${method} ${path}`); await reply(route, error('INTERNAL_SERVER_ERROR'), 500)
  })
  sets.set(page, s); return s
}
async function start(page: Page, dto = definition(), nonOwner = false) { const s = await mock(page, dto, nonOwner); await page.goto(view); await expect(page.getByText('建立者：', { exact: false }).first()).toBeVisible(); return s }
const article = (page: Page, index: number) => page.locator(`[data-renderer-key="${Q[index]}"]`)
const submit = (page: Page) => page.getByRole('button', { name: '提交表單', exact: true })
const latest = (page: Page) => page.getByRole('button', { name: '查看我的填答', exact: true })
const posts = (s: Awaited<ReturnType<typeof mock>>) => s.requests.filter(r => r.method === 'POST' && r.path.endsWith('/responses'))
async function closeError(page: Page) { await page.getByRole('dialog', { name: '操作訊息' }).getByRole('button', { name: '關閉', exact: true }).filter({ hasText: '關閉' }).click() }
async function complete(page: Page, cross = false) { await expect(page.getByRole('dialog', { name: '提交成功' })).toBeVisible(); await page.getByRole('dialog', { name: '提交成功' }).getByRole('button', { name: cross ? '關閉' : '完成', exact: true }).click() }
async function confirmNext(page: Page, accept: boolean, action: () => Promise<unknown>) { const handled = page.waitForEvent('dialog').then(async d => { if (accept) await d.accept(); else await d.dismiss() }); await action(); await handled }
test.afterEach(async ({ page, browser }, info) => { const s = sets.get(page); if (!s) return; const issues = verifyNetworkDiagnostics(s.expected, s.outcomes, s.diagnostics); await info.attach('declared-network-and-wire', { body: stringifyExactJson({ browserVersion: browser.version(), nodeVersion: process.version, requests: s.requests, expected: s.expected, actual: s.outcomes, diagnostics: s.diagnostics, issues, errors: s.errors, unexpected: s.unexpected }), contentType: 'application/json' }); expect(s.errors).toEqual([]); expect(s.unexpected).toEqual([]); expect(issues).toEqual([]) })

for (const mode of ['single', 'multiple'] as const) test(`F8-B01/B03 ${mode} blank entry, successful Dialog/clean, refresh empty with no prequery`, async ({ page }) => {
  const s = await start(page, definition(mode)); expect(s.requests.filter(r => r.path.endsWith('/latest'))).toHaveLength(0)
  await page.getByLabel('文字', { exact: true }).fill('  合成 😀\n文字  '); await page.getByLabel('數字', { exact: true }).fill('9007199254740993.1234567890123456789')
  await article(page, 2).getByLabel('單選1').check(); await article(page, 3).getByLabel('多選2').check(); await article(page, 4).getByRole('slider').click({ position: { x: 0, y: 8 } })
  await submit(page).click(); await expect(page.getByRole('dialog', { name: '提交成功' })).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog', { name: '提交成功' })).toBeVisible()
  await complete(page); expect(posts(s)).toHaveLength(1); expect(posts(s)[0]!.body).toContain('9007199254740993.1234567890123456789')
  if (mode === 'single') { await expect(submit(page)).toHaveCount(0); await expect(article(page, 0)).toContainText('合成'); await expect(page.getByRole('button', { name: '關閉表單', exact: true })).toBeVisible() }
  else { await expect(page.getByLabel('文字', { exact: true })).toHaveValue('  合成 😀\n文字  '); await submit(page).click(); await complete(page, true); expect(posts(s)).toHaveLength(2) }
  await page.reload(); await expect(page.getByLabel('文字', { exact: true })).toHaveValue(''); expect(s.requests.filter(r => r.path.endsWith('/latest'))).toHaveLength(0); await expect(submit(page)).toBeEnabled()
})
test('F8-B02 required validation focuses first control, optional whitespace omitted and all optional [] submits', async ({ page }) => {
  const source = definition(), dto = { ...source, questions: source.questions.map(q => ({ ...q, required: q.type === 'text' })) }; const s = await start(page, dto)
  await submit(page).click(); await expect(page.getByLabel('文字', { exact: true })).toBeFocused(); expect(posts(s)).toHaveLength(0); await expect(article(page, 0)).toContainText('此題必填')
  await page.getByLabel('文字', { exact: true }).fill('😀'); await page.getByLabel('數字', { exact: true }).fill('0'); await submit(page).click(); await complete(page)
  const body = parseExactJson(posts(s)[0]!.body!) as SubmitRequest; expect(body.answers.map(a => a.questionId)).toEqual([Q[0], Q[1]])
  s.dto = definition(); await page.reload(); await submit(page).click(); await complete(page); expect(posts(s).at(-1)!.body).toBe('{"answers":[]}')
})
for (const mode of ['single', 'multiple'] as const) test(`F8-B04 ${mode} successful Latest before dirty replacement/cancel, full missing optional reset`, async ({ page }) => {
  const s = await start(page, definition(mode)); await page.getByLabel('文字', { exact: true }).fill('保留本地')
  s.receipt = { id: uuid(80), formId: uuid(50), submittedAt: '2026-10-14T10:00:00.1234567Z', answers: [{ questionId: Q[4], value: 0 }] }
  await confirmNext(page, false, () => latest(page).click())
  if (mode === 'single') { await expect(submit(page)).toHaveCount(0); await expect(article(page, 0)).toContainText('保留本地'); await expect(page.getByText('以下保留本地輸入', { exact: false })).toBeVisible() }
  else await expect(page.getByLabel('文字', { exact: true })).toHaveValue('保留本地')
  await confirmNext(page, true, () => latest(page).click()); await expect(article(page, 4)).toContainText('0 分'); await expect(page.getByText('最近一次提交：2026-10-14 18:00:00')).toBeVisible()
  if (mode === 'single') await expect(article(page, 0)).toContainText('尚未作答'); else await expect(page.getByLabel('文字', { exact: true })).toHaveValue('')
  expect(s.requests.filter(r => r.path.endsWith('/latest'))).toHaveLength(2)
})
test('F8-B04 Latest missing/500/malformed retain model; read failure is not unknown write', async ({ page }) => {
  const s = await start(page); await page.getByLabel('文字', { exact: true }).fill('本地')
  s.expected.push(expectedHttp('GET', `${root}/responses/me/latest`, 404, 1)); await latest(page).click(); await expect(page.getByRole('dialog')).toContainText('您從未填答過'); await closeError(page)
  s.expected.push(expectedHttp('GET', `${root}/responses/me/latest`, 500, 1)); s.latest = r => reply(r, error('INTERNAL_SERVER_ERROR'), 500); await latest(page).click(); await expect(page.getByRole('dialog')).toContainText('載入失敗'); await closeError(page)
  s.latest = r => reply(r, { id: uuid(80), formId: uuid(50), submittedAt: '2026-10-14T10:00:00Z', answers: [{ questionId: Q[2], value: O[2] }] }); await latest(page).click(); await expect(page.getByRole('dialog')).toContainText('載入失敗'); await closeError(page); await expect(page.getByLabel('文字', { exact: true })).toHaveValue('本地')
})
for (const code of ['AUTH_REQUIRED', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED', 'AUTH_USER_DISABLED', 'FORM_NOT_FOUND', 'SUBMISSION_DEADLINE_EXCEEDED', 'FORM_NOT_SUBMITTABLE', 'RESPONSE_ALREADY_SUBMITTED'] as const) test(`F8-B05 ${code} local preservation, qualification and Dialog flow`, async ({ page }) => {
  const s = await start(page, definition('single')), status = code === 'FORM_NOT_FOUND' ? 404 : code === 'AUTH_USER_DISABLED' ? 403 : code.startsWith('AUTH_') ? 401 : 409
  s.expected.push(expectedHttp('POST', `${root}/responses`, status, 1)); s.post = r => reply(r, error(code), status)
  if (code === 'FORM_NOT_SUBMITTABLE') s.dto = { ...s.dto, status: 'closed' }
  await page.getByLabel('文字', { exact: true }).fill('錯誤後保留'); await submit(page).click(); await expect(page.getByRole('dialog', { name: '操作訊息' })).toBeVisible()
  if (code !== 'AUTH_USER_DISABLED' && code !== 'RESPONSE_ALREADY_SUBMITTED') await confirmNext(page, false, () => closeError(page)); else await closeError(page)
  expect(page.url()).toBe(`http://localhost:3000${view}`); await expect(article(page, 0)).toContainText(code === 'AUTH_USER_DISABLED' ? '1. 文字' : '錯誤後保留')
  if (code === 'AUTH_USER_DISABLED') { await expect(page.getByLabel('文字', { exact: true })).toHaveValue('錯誤後保留'); await expect(submit(page)).toBeEnabled() }
  else if (code === 'RESPONSE_ALREADY_SUBMITTED') { await expect(submit(page)).toHaveCount(0); await expect(page.getByText('以下保留本地輸入', { exact: false })).toBeVisible() }
  else if (code === 'SUBMISSION_DEADLINE_EXCEEDED') await expect(submit(page)).toHaveCount(0)
  else await expect(submit(page)).toBeDisabled()
})
test('F8-B06 multiple 500, successful Latest and Form reload keep duplicateRisk until confirmed reliable 201', async ({ page }) => {
  const s = await start(page); s.expected.push(expectedHttp('POST', `${root}/responses`, 500, 1)); s.post = r => reply(r, error('INTERNAL_SERVER_ERROR'), 500)
  await submit(page).click(); await closeError(page); s.receipt = { id: uuid(80), formId: uuid(50), submittedAt: '2026-10-14T10:00:00Z', answers: [] }
  await latest(page).click(); await confirmNext(page, true, () => page.getByRole('button', { name: '重新載入表單', exact: true }).click())
  s.post = undefined; await confirmNext(page, false, () => submit(page).click()); expect(posts(s)).toHaveLength(1)
  await confirmNext(page, true, () => submit(page).click()); await complete(page); expect(posts(s)).toHaveLength(2)
  await submit(page).click(); await complete(page); expect(posts(s)).toHaveLength(3)
})
test('F8-B06 network interruption and malformed 201 preserve answers and do not show success', async ({ page }) => {
  const s = await start(page); await page.getByLabel('文字', { exact: true }).fill('保留')
  s.expected.push(expectedNetwork('POST', `${root}/responses`, 'net::ERR_FAILED', 1, 1)); s.post = r => r.abort('failed'); await submit(page).click(); await expect(page.getByRole('dialog')).toContainText('未能確認'); await closeError(page)
  s.post = r => reply(r, { invalid: true }, 201); await confirmNext(page, true, () => submit(page).click()); await expect(page.getByRole('dialog')).toContainText('未能確認'); await closeError(page); await expect(page.getByLabel('文字', { exact: true })).toHaveValue('保留'); await expect(page.getByRole('dialog', { name: '提交成功' })).toHaveCount(0)
})
test('F8-B07 Latest started before Visibility stays stale; metadata/Close preserve dirty answers and management pending mutually excludes Submit', async ({ page }) => {
  const s = await start(page), wait = gate(); s.latest = async r => { await wait.promise; await reply(r, { id: uuid(80), formId: uuid(50), submittedAt: '2026-10-14T10:00:00Z', answers: [] }) }
  await page.getByLabel('文字', { exact: true }).fill('dirty'); await latest(page).click(); await expect(page.getByLabel('文字', { exact: true })).toBeDisabled()
  await page.getByRole('radio', { name: '所有人', exact: true }).click(); await expect(page.getByRole('radio', { name: '所有人', exact: true })).toBeChecked(); wait.release()
  await expect(latest(page)).toBeEnabled(); await expect(page.getByLabel('文字', { exact: true })).toHaveValue('dirty')
  await page.getByRole('button', { name: '關閉表單', exact: true }).click(); await page.getByRole('button', { name: '確認關閉' }).click(); await expect(article(page, 0)).toContainText('dirty'); await expect(submit(page)).toHaveCount(0)
})
test('F8-B07 Submit pending freezes controls/management; late reply after navigation does not update new page', async ({ page }) => {
  const s = await start(page), wait = gate(), replied = gate(); s.post = async r => { const body = parseExactJson(r.request().postData()!) as SubmitRequest; await wait.promise; await reply(r, { id: uuid(80), formId: uuid(50), submittedAt: '2026-10-14T10:00:00Z', answers: body.answers }, 201); replied.release() }
  await page.getByLabel('文字', { exact: true }).fill('dirty'); await submit(page).click(); await expect(page.getByLabel('文字', { exact: true })).toBeDisabled(); await expect(page.getByRole('button', { name: '關閉表單', exact: true })).toBeDisabled(); await expect(latest(page)).toBeDisabled()
  await confirmNext(page, true, () => page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click()); wait.release(); await replied.promise; await expect(page).toHaveURL('http://localhost:3000/'); await expect(page.getByRole('dialog', { name: '提交成功' })).toHaveCount(0)
})
test('F8-B08 dirty navigation/beforeunload cancel, clean submit no reminder, Header logout and Delete single permit', async ({ page }) => {
  const s = await start(page); await page.getByLabel('文字', { exact: true }).fill('dirty')
  await confirmNext(page, false, () => page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click()); await expect(page).toHaveURL(`http://localhost:3000${view}`)
  const reloadDialog = page.waitForEvent('dialog').then(async d => { expect(d.type()).toBe('beforeunload'); await d.dismiss() }); await page.reload({ timeout: 2000 }).catch(() => {}); await reloadDialog
  await page.getByRole('button', { name: '使用者選單' }).click(); await confirmNext(page, false, () => page.getByRole('button', { name: '登出', exact: true }).click()); expect(s.requests.filter(r => r.path.endsWith('/auth/logout'))).toHaveLength(0)
  await expect(page.getByRole('button', { name: '使用者選單' })).toHaveAttribute('aria-expanded', 'true'); await confirmNext(page, true, () => page.getByRole('button', { name: '登出', exact: true }).click()); await expect(page).toHaveURL('http://localhost:3000/login'); expect(s.requests.filter(r => r.path.endsWith('/auth/logout'))).toHaveLength(1)
})
test('F8-B02/B08 mobile stars 100, duplicate rating labels and Range initial min, long answers readable', async ({ page }, info) => {
  const source = definition(), dto = { ...source, questions: [...source.questions.filter(q => q.type === 'text'), ...[100, 101].map((id, i) => ({ ...source.questions[4]!, type: 'rating' as const, id: uuid(id), title: '同名評分', config: { variant: i ? 'range' as const : 'stars' as const, min: 0, max: 100 } }))] }
  await page.setViewportSize({ width: 320, height: 640 }); const s = await start(page, dto)
  const stars = page.locator(`[data-renderer-key="${uuid(100)}"]`), range = page.locator(`[data-renderer-key="${uuid(101)}"]`)
  await range.getByRole('slider').focus(); await expect(range).toContainText('尚未作答'); await stars.getByRole('radio', { name: '0 分', exact: true }).check(); await expect(stars).toContainText('0 分'); await expect(range).toContainText('尚未作答')
  await range.getByRole('slider').click({ position: { x: 0, y: 8 } }); await expect(range).toContainText('0 分'); await page.getByLabel('文字', { exact: true }).fill('完整合成文字'.repeat(100))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await info.attach('mobile-answer.png', { body: await page.screenshot(), contentType: 'image/png' })
  await submit(page).click(); await complete(page); expect(posts(s)).toHaveLength(1)
})

test('F8-B02 injected Answer paths use omitted request index, Question ID and complete unknown summary', async ({ page }) => {
  const s = await start(page); await page.getByLabel('多選2', { exact: true }).check()
  s.expected.push(expectedHttp('POST', `${root}/responses`, 400, 1))
  s.post = r => reply(r, error('VALIDATION_ERROR', [
    { path: 'answers[0].value[0]', code: 'OPTION_NOT_FOUND', message: '本次 Request 第一個答案的選項明細' },
    { path: `questions.${Q[0]}`, code: 'REQUIRED_FIELD', message: 'Question ID 定位明細' },
    { path: 'unknown.path', code: 'INVALID_VALUE', message: '完整未知明細' },
  ]), 400)
  await submit(page).click(); await expect(page.getByRole('dialog')).toContainText('unknown.path：完整未知明細')
  expect((parseExactJson(posts(s)[0]!.body!) as SubmitRequest).answers[0]!.questionId).toBe(Q[3])
  await expect(article(page, 3)).toContainText('第一個答案'); await expect(article(page, 0)).toContainText('Question ID 定位'); await expect(article(page, 1)).not.toContainText('第一個答案')
  await closeError(page); await expect(page.getByLabel('多選1', { exact: true })).toBeFocused()
})
for (const status of ['closed', 'expired'] as const) test(`F8-B05 normal ${status} blank readonly, explicit Latest and unchanged URL`, async ({ page }) => {
  const dto = definition('multiple'), s = await start(page, { ...dto, status: status === 'closed' ? 'closed' : 'published', submissionDeadlineAt: status === 'expired' ? '2000-01-01T00:00:00Z' : null }, true)
  await expect(submit(page)).toHaveCount(0); await expect(page.getByLabel('文字', { exact: true })).toHaveCount(0); expect(s.requests.filter(r => r.path.endsWith('/latest'))).toHaveLength(0)
  s.receipt = { id: uuid(80), formId: uuid(50), submittedAt: '2026-10-14T10:00:00Z', answers: [{ questionId: Q[1], value: 0 }, { questionId: Q[4], value: 0 }] }
  await latest(page).click(); await expect(article(page, 1)).toContainText('0'); await expect(article(page, 4)).toContainText('0 分'); await expect(page).toHaveURL(`http://localhost:3000${view}`)
})
test('F8-B03 deadline passes during pending but valid 201 still succeeds and becomes clean readonly', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-14T10:00:00Z') })
  const s = await start(page, { ...definition(), submissionDeadlineAt: '2026-10-14T10:00:02Z' }), wait = gate()
  s.post = async r => { await wait.promise; await reply(r, { id: uuid(80), formId: uuid(50), submittedAt: '2026-10-14T10:00:01.1234567Z', answers: [] }, 201) }
  await submit(page).click(); await page.clock.runFor(3000); await expect(page.getByText('已截止', { exact: true })).toBeVisible(); wait.release(); await complete(page)
  await expect(submit(page)).toHaveCount(0); await expect(page.getByText('最近一次提交：2026-10-14 18:00:01')).toBeVisible()
})
test('F8-B08 dirty answer Delete confirmation includes discard; 204 replaces list exactly once without native re-prompt', async ({ page }) => {
  const s = await start(page); await page.getByLabel('文字', { exact: true }).fill('保留至確認')
  let native = 0; page.on('dialog', async d => { native++; await d.dismiss() })
  await page.getByRole('button', { name: '刪除表單', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('本地內容將一併丟棄'); await page.getByRole('button', { name: '確認刪除' }).click()
  await expect(page).toHaveURL('http://localhost:3000/forms'); expect(native).toBe(0); expect(s.requests.filter(r => r.method === 'DELETE')).toHaveLength(1)
})

test('F8-B07 verified new respondent context clears previous duplicate risk and owner ability', async ({ page }) => {
  const s = await start(page); s.expected.push(expectedHttp('POST', `${root}/responses`, 500, 1)); s.post = r => reply(r, error('INTERNAL_SERVER_ERROR'), 500)
  await submit(page).click(); await closeError(page); s.expected.push(expectedHttp('POST', `${root}/responses`, 401, 1)); s.post = r => reply(r, error('AUTH_REQUIRED'), 401)
  await confirmNext(page, true, () => submit(page).click()); await confirmNext(page, false, () => closeError(page))
  s.user = { ...owner, id: uuid(52) }; s.post = undefined
  await confirmNext(page, true, () => page.getByRole('button', { name: '核對登入與填答資格', exact: true }).click()); await expect(submit(page)).toBeEnabled(); await expect(page.getByRole('button', { name: '關閉表單', exact: true })).toHaveCount(0)
  let native = 0; page.on('dialog', async d => { native++; await d.dismiss() }); await submit(page).click(); await complete(page); expect(native).toBe(0); expect(posts(s)).toHaveLength(3)
})

test('F8-B08 same-component hash history obeys dirty cancel/confirm and reloads blank without extra me or Latest', async ({ page }) => {
  const s = await start(page); await page.getByLabel('文字', { exact: true }).fill('留在舊 context')
  await confirmNext(page, false, () => page.evaluate(() => { location.hash = 'cancelled' })); await expect(page).toHaveURL(`http://localhost:3000${view}`); await expect(page.getByLabel('文字', { exact: true })).toHaveValue('留在舊 context')
  await confirmNext(page, true, () => page.evaluate(() => { location.hash = 'accepted' })); await expect(page).toHaveURL(`http://localhost:3000${view}#accepted`); await expect(page.getByLabel('文字', { exact: true })).toHaveValue('')
  expect(s.requests.filter(r => r.path.endsWith('/users/me'))).toHaveLength(1); expect(s.requests.filter(r => r.path.endsWith('/latest'))).toHaveLength(0); expect(posts(s)).toHaveLength(0)
})

test('F8-B02 optional White_Space-only text remains unanswered in single readonly after omitted POST', async ({ page }) => {
  const s = await start(page, definition('single')); await page.getByLabel('文字', { exact: true }).fill('\u00a0\u3000'); await submit(page).click(); await complete(page)
  expect(posts(s)[0]!.body).toBe('{"answers":[]}'); await expect(article(page, 0)).toContainText('尚未作答'); await expect(article(page, 4)).toContainText('尚未作答')
})

test('F8-B05 early error close waits for current status GET; Closed then uses dirty cancellation flow', async ({ page }) => {
  const s = await start(page), wait = gate(); await page.getByLabel('文字', { exact: true }).fill('需要保留')
  s.expected.push(expectedHttp('POST', `${root}/responses`, 409, 1)); s.post = r => reply(r, error('FORM_NOT_SUBMITTABLE'), 409); s.get = async r => { await wait.promise; await reply(r, { ...s.dto, status: 'closed' }) }
  await submit(page).click(); await expect(page.getByRole('dialog')).toBeVisible(); const native = page.waitForEvent('dialog').then(d => d.dismiss())
  await closeError(page); await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.getByRole('button', { name: '關閉表單', exact: true })).toHaveCount(0); wait.release(); await native
  await expect(page).toHaveURL(`http://localhost:3000${view}`); await expect(article(page, 0)).toContainText('需要保留'); await expect(submit(page)).toBeDisabled()
})
