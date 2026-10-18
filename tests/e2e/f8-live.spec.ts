import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { decodeFormDetail, decodeReceipt } from '../../app/domain/api/decoders'
import { parseExactJson, stringifyExactJson } from '../../app/utils/exact-json'
import { ExactNumber } from '../../app/utils/exact-number'
import { expectedHttp, verifyNetworkDiagnostics } from '../helpers/f6-network-diagnostics'
import type { Diagnostic, ExpectedFailure, NetworkFailure } from '../helpers/f6-network-diagnostics'
const api = 'http://localhost:5000/api/v1'
test('F8-L01..L05 real Submit, independent Latest, Cookie/CORS, complete replacement and retained synthetic resources', async ({ page, context, browser }, info) => {
  test.setTimeout(240_000)
  const runId = `f8-${Date.now()}-${process.env.F8_RUN_LABEL ?? 'live'}`, dir = 'output/playwright/f8', password = `F8-${randomUUID()}`
  const accounts = ['owner', 'respondent'].map(alias => ({ alias, email: `${runId}-${alias}@example.test`, password }))
  const resources: { id: string; purpose: string; status: string }[] = [], receipts: { label: string; id: string; formId: string; submittedAt: string; body: string }[] = []
  const requests: { method: string; path: string; body?: string | null }[] = [], reads: { label: string; status: number; body: string }[] = [], cors: { path: string; status: number; origin: string; credentials: string }[] = []
  const expected: ExpectedFailure[] = [expectedHttp('GET', `${api}/users/me`, 401, 2)], actual: NetworkFailure[] = [], diagnostics: Diagnostic[] = [], errors: string[] = [], violations: string[] = [], inFlight: Promise<void>[] = []
  let stage = 'register', completed = false
  await mkdir(dir, { recursive: true }); await writeFile(`${dir}/${runId}-private-credentials.json`, JSON.stringify(accounts))
  async function persist() { await writeFile(`${dir}/${runId}-sanitized.json`, stringifyExactJson({ runId, stage, completed, browserVersion: browser.version(), nodeVersion: process.version, resources, receipts, reads, requests, cors, expected, actual, diagnostics, errors, violations, diagnosticIssues: verifyNetworkDiagnostics(expected, actual, diagnostics) })) }
  function observe(p: Page) {
    p.on('pageerror', e => errors.push(e.message))
    p.on('console', m => { if (m.type() === 'error' || m.text().includes('[Vue warn]')) diagnostics.push({ text: m.text(), url: m.location().url }) })
    p.on('requestfailed', r => actual.push({ kind: 'requestfailed', method: r.method(), url: r.url(), reason: r.failure()!.errorText }))
    p.on('request', r => {
      if (!r.url().startsWith(api)) return
      const path = new URL(r.url()).pathname, method = r.method()
      requests.push({ method, path, ...(path.startsWith('/api/v1/forms') ? { body: r.postData() } : {}) })
      if (method === 'DELETE' || method === 'PATCH') violations.push(`Unapproved live method ${method} ${path}`)
      const target = /^\/api\/v1\/forms\/([^/]+)/.exec(path)?.[1]
      if (target && method !== 'GET' && !resources.some(v => v.id === target)) violations.push(`Write outside declared F8 resources ${path}`)
    })
    p.on('response', r => {
      if (!r.url().startsWith(api)) return
      if (r.status() >= 400) actual.push({ kind: 'response', method: r.request().method(), url: r.url(), status: r.status() })
      inFlight.push((async () => { const h = await r.allHeaders(); cors.push({ path: new URL(r.url()).pathname, status: r.status(), origin: h['access-control-allow-origin'] ?? '', credentials: h['access-control-allow-credentials'] ?? '' }) })())
    })
  }
  observe(page); const otherContext = await browser.newContext(), other = await otherContext.newPage(); observe(other)
  async function call(p: Page, path: string, method = 'GET', body?: unknown) {
    return await p.evaluate(async ({ url, method, body }) => { const response = await fetch(url, { method, credentials: 'include', ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body }) }); return { status: response.status, body: await response.text() } }, { url: api + path, method, body: body === undefined ? undefined : stringifyExactJson(body) })
  }
  async function register(p: Page, account: typeof accounts[number]) {
    await p.goto('/forms'); await expect(p).toHaveURL(/\/login\?redirect=/)
    await p.getByRole('tab', { name: '註冊', exact: true }).click(); await p.getByRole('textbox', { name: '姓名' }).fill(`F8 合成 ${account.alias}`); await p.getByRole('textbox', { name: 'Email' }).fill(account.email); await p.getByLabel('密碼', { exact: true }).fill(account.password)
    const created = p.waitForResponse(r => r.url().endsWith('/auth/register')); await p.getByRole('button', { name: '註冊', exact: true }).click(); expect((await created).status()).toBe(201)
    await expect(p.getByRole('tab', { name: '登入', exact: true })).toHaveAttribute('aria-selected', 'true'); await p.getByLabel('密碼', { exact: true }).fill(account.password)
    const login = p.waitForResponse(r => r.url().endsWith('/auth/login')); await p.getByRole('button', { name: '登入', exact: true }).click(); expect((await login).status()).toBe(200); await expect(p).toHaveURL('http://localhost:3000/forms')
  }
  async function create(purpose: string, mode: 'single' | 'multiple', visibility: 'owner_only' | 'respondents' | 'public', deadline: string | null = null, select = false) {
    const r = await call(page, '/forms', 'POST', { title: `${runId} ${purpose}`, responseMode: mode, responseIdentity: purpose.startsWith('L01') ? 'identified' : 'anonymous', resultVisibility: visibility, submissionDeadlineAt: deadline,
      questions: [
        { type: 'text', title: '文字', sortOrder: 0, required: false, config: { variant: 'textarea' } },
        { type: 'number', title: '數字', sortOrder: 1, required: false, config: { min: ExactNumber.from('0') } },
        { type: 'single_choice', title: '單選', sortOrder: 2, required: false, config: { variant: select ? 'select' : 'radio' }, options: [{ label: '單選1', value: 'one', sortOrder: 0 }, { label: '單選2', value: 'two', sortOrder: 1 }] },
        { type: 'multiple_choice', title: '多選', sortOrder: 3, required: false, config: { variant: 'checkbox' }, options: [{ label: '多選1', value: 'one', sortOrder: 0 }, { label: '多選2', value: 'two', sortOrder: 1 }] },
        { type: 'rating', title: '評分', sortOrder: 4, required: false, config: { variant: 'stars', min: 0, max: 5 } },
      ] })
    expect(r.status).toBe(201); const dto = decodeFormDetail(parseExactJson(r.body)); resources.push({ id: dto.id, purpose, status: dto.status }); await persist()
    expect((await call(page, `/forms/${dto.id}/publish`, 'POST')).status).toBe(200); resources.at(-1)!.status = 'published'; await persist(); return dto
  }
  async function independent(p: Page, id: string, label: string, status = 200) { const r = await call(p, `/forms/${id}/responses/me/latest`); reads.push({ label, ...r }); await persist(); expect(r.status).toBe(status); return status === 200 ? decodeReceipt(parseExactJson(r.body)) : undefined }
  async function submit(p: Page, id: string, label: string) {
    const response = p.waitForResponse(r => r.url() === `${api}/forms/${id}/responses` && r.request().method() === 'POST'); await p.getByRole('button', { name: '提交表單', exact: true }).click(); const r = await response; expect(r.status()).toBe(201)
    const body = await r.text(), dto = decodeReceipt(parseExactJson(body)); receipts.push({ label, id: dto.id, formId: dto.formId, submittedAt: dto.submittedAt, body }); await persist()
    await expect(p.getByRole('dialog', { name: '提交成功' })).toBeVisible(); await p.getByRole('button', { name: '完成', exact: true }).click(); return dto
  }
  async function fill(p: Page, dto: ReturnType<typeof decodeFormDetail>, text: string, numeric: string, select = false) {
    await p.getByLabel('文字', { exact: true }).fill(text); await p.getByLabel('數字', { exact: true }).fill(numeric)
    if (select) await p.getByRole('combobox', { name: '單選', exact: true }).selectOption(dto.questions[2]!.options[0]!.id); else await p.getByLabel('單選1', { exact: true }).check()
    await p.getByLabel('多選2', { exact: true }).check(); await p.getByRole('radio', { name: '0 分', exact: true }).check()
  }
  async function native(p: Page, accept: boolean, action: () => Promise<unknown>) { const handled = p.waitForEvent('dialog').then(async d => { if (accept) await d.accept(); else await d.dismiss() }); await action(); await handled }
  async function closeError(p: Page) { await p.getByRole('dialog', { name: '操作訊息' }).getByRole('button', { name: '關閉', exact: true }).filter({ hasText: '關閉' }).click() }
  try {
    await register(page, accounts[0]!); await register(other, accounts[1]!); expect((await context.cookies()).some(c => c.name === 'access_token' && c.httpOnly)).toBe(true)
    stage = 'L01 single five types Owner and respondent'; const single = await create('L01 single', 'single', 'respondents'); await page.goto(`/forms/${single.id}`); await fill(page, single, '  Owner 合成 😀\n第二行  ', '9007199254740993.12345678901234567890123456789')
    const ownerReceipt = await submit(page, single.id, 'L01 Owner 201'); const readOwner = (await independent(page, single.id, 'L01 Owner independent Latest'))!; expect(readOwner.id).toBe(ownerReceipt.id); expect(readOwner.answers[1]!.value).toBeInstanceOf(ExactNumber); expect((readOwner.answers[1]!.value as ExactNumber).equals(ExactNumber.from('9007199254740993.12345678901234567890123456789'))).toBe(true)
    await expect(page.getByRole('button', { name: '提交表單', exact: true })).toHaveCount(0); await page.reload(); await expect(page.getByLabel('文字', { exact: true })).toHaveValue(''); expected.push(expectedHttp('POST', `${api}/forms/${single.id}/responses`, 409, 1))
    await page.getByRole('button', { name: '提交表單', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('submitted'); await closeError(page); await expect(page.getByRole('button', { name: '提交表單', exact: true })).toHaveCount(0)
    await other.goto(`/forms/${single.id}`); await expect(other.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toHaveCount(0); await fill(other, single, 'Respondent 合成', '0'); const otherReceipt = await submit(other, single.id, 'L01 respondent 201'); expect(otherReceipt.id).not.toBe(ownerReceipt.id)
    expect((await independent(other, single.id, 'L05 respondent reads only self'))!.id).toBe(otherReceipt.id); expect((await independent(page, single.id, 'L05 Owner still own latest'))!.id).toBe(ownerReceipt.id)
    stage = 'L02 multiple complete newest response'; const multi = await create('L02 multiple', 'multiple', 'public', null, true); await page.goto(`/forms/${multi.id}`); await fill(page, multi, '第一份完整回答', '0', true); await submit(page, multi.id, 'L02 complete first')
    await page.getByLabel('文字', { exact: true }).fill(''); await page.getByRole('combobox', { name: '單選', exact: true }).selectOption(''); await page.getByLabel('多選2', { exact: true }).uncheck()
    const second = await submit(page, multi.id, 'L02 latest omits optional'), newest = (await independent(page, multi.id, 'L02 independent complete latest'))!; expect(newest.id).toBe(second.id); expect(newest.answers.map(a => a.questionId)).toEqual([multi.questions[1]!.id, multi.questions[4]!.id])
    await page.getByLabel('文字', { exact: true }).fill('這個本地值應被清空'); await native(page, true, () => page.getByRole('button', { name: '查看我的填答', exact: true }).click()); await expect(page.getByLabel('文字', { exact: true })).toHaveValue('')
    const third = await submit(page, multi.id, 'L02 same answers new Response'); expect(third.id).not.toBe(second.id); expect((await independent(page, multi.id, 'L02 repeated content independent Latest'))!.id).toBe(third.id)
    await info.attach('live-multiple.png', { body: await page.screenshot(), contentType: 'image/png' })
    stage = 'L03 all optional blank private anonymous'; const blank = await create('L03 blank', 'multiple', 'owner_only'); await page.goto(`/forms/${blank.id}`); const blankReceipt = await submit(page, blank.id, 'L03 answers empty'); expect(blankReceipt.answers).toEqual([]); expect((await independent(page, blank.id, 'L03 private anonymous independent Latest'))!.answers).toEqual([])
    stage = 'L04 natural deadline Published then Closed'; const deadline = new Date(Date.now() + 12_000).toISOString(), timed = await create('L04 deadline', 'multiple', 'owner_only', deadline); await page.goto(`/forms/${timed.id}`); await submit(page, timed.id, 'L04 before deadline')
    await expect.poll(() => Date.now(), { timeout: 20_000 }).toBeGreaterThanOrEqual(Date.parse(deadline)); await expect(page.getByText('已截止', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: '提交表單', exact: true })).toHaveCount(0); await independent(page, timed.id, 'L04 expired Latest')
    const stillPublished = await call(page, `/forms/${timed.id}`); reads.push({ label: 'L04 expired Form still Published', ...stillPublished }); expect(decodeFormDetail(parseExactJson(stillPublished.body)).status).toBe('published')
    expect((await call(page, `/forms/${timed.id}/close`, 'POST')).status).toBe(200); resources.find(v => v.id === timed.id)!.status = 'closed'; await page.reload(); await expect(page.getByLabel('文字', { exact: true })).toHaveCount(0); await page.getByRole('button', { name: '查看我的填答', exact: true }).click(); await independent(page, timed.id, 'L04 Closed Latest')
    stage = 'L04 operation in stale Published after normal external Close'; const closing = await create('L04 close while filling', 'multiple', 'owner_only'); await page.goto(`/forms/${closing.id}`); await page.getByLabel('文字', { exact: true }).fill('Close 後保留的本地输入')
    const closer = await context.newPage(); observe(closer); await closer.goto('/'); expect((await call(closer, `/forms/${closing.id}/close`, 'POST')).status).toBe(200); resources.find(v => v.id === closing.id)!.status = 'closed'; await closer.close()
    expected.push(expectedHttp('POST', `${api}/forms/${closing.id}/responses`, 409, 1)); await page.getByRole('button', { name: '提交表單', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await native(page, true, () => closeError(page)); await expect(page).toHaveURL('http://localhost:3000/')
    expected.push(expectedHttp('GET', `${api}/forms/${closing.id}/responses/me/latest`, 404, 1)); await independent(page, closing.id, 'L04 rejected submission left no Response', 404)
    stage = 'L05 true AUTH_REQUIRED dirty cancellation, explicit account verification'; const authForm = await create('L05 auth', 'multiple', 'owner_only'); await page.goto(`/forms/${authForm.id}`); await page.getByLabel('文字', { exact: true }).fill('未提交輸入保留'); await context.clearCookies()
    expected.push(expectedHttp('POST', `${api}/forms/${authForm.id}/responses`, 401, 2)); await page.getByRole('button', { name: '提交表單', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await native(page, false, () => closeError(page)); await expect(page.locator('[data-renderer-key]').first()).toContainText('未提交輸入保留')
    expect((await call(page, '/auth/login', 'POST', { email: accounts[1]!.email, password })).status).toBe(200); await native(page, true, () => page.getByRole('button', { name: '核對登入與填答資格', exact: true }).click()); await expect(page.getByLabel('文字', { exact: true })).toHaveValue(''); await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toHaveCount(0)
    expected.push(expectedHttp('GET', `${api}/forms/${authForm.id}/responses/me/latest`, 404, 1)); await independent(page, authForm.id, 'L05 newly verified account no borrowed answers', 404)
    await context.clearCookies(); await page.getByLabel('文字', { exact: true }).fill('返回前未提交'); await page.getByRole('button', { name: '提交表單', exact: true }).click(); await native(page, true, () => closeError(page)); await expect(page).toHaveURL(/\/login\?redirect=/)
    await page.getByRole('textbox', { name: 'Email' }).fill(accounts[0]!.email); await page.getByLabel('密碼', { exact: true }).fill(password); await page.getByRole('button', { name: '登入', exact: true }).click(); await expect(page).toHaveURL(`http://localhost:3000/forms/${authForm.id}`); await expect(page.getByLabel('文字', { exact: true })).toHaveValue('')
    await Promise.all(inFlight); expect(cors.every(v => v.origin === 'http://localhost:3000' && v.credentials === 'true')).toBe(true); expect(verifyNetworkDiagnostics(expected, actual, diagnostics)).toEqual([]); expect(errors).toEqual([]); expect(violations).toEqual([]); completed = true; stage = 'PASS'
  } finally {
    await Promise.allSettled(inFlight); await persist(); const indexPath = `${dir}/retained-live-runs.json`; let index: unknown[] = []; try { index = JSON.parse(await readFile(indexPath, 'utf8')) as unknown[] } catch { /* first run */ }
    await writeFile(indexPath, JSON.stringify([...index, { runId, stage, completed, accounts: accounts.map(v => v.alias), resources }], null, 2)); await otherContext.close()
  }
})
