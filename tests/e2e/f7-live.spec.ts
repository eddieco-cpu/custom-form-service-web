import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { decodeFormDetail } from '../../app/domain/api/decoders'
import { parseExactJson, stringifyExactJson } from '../../app/utils/exact-json'
import { expectedHttp, verifyNetworkDiagnostics } from '../helpers/f6-network-diagnostics'
import type { Diagnostic, ExpectedFailure, NetworkFailure } from '../helpers/f6-network-diagnostics'
const api = 'http://localhost:5000/api/v1'
test('F7-L01..L06 real Cookie/CORS, saved lifecycle, policy, Count, role and dedicated Delete readback', async ({ page, context, browser }) => {
  test.setTimeout(240_000)
  const runId = `f7-${Date.now()}`, dir = 'output/playwright/f7', password = `F7-${randomUUID()}`
  const accounts = [{ alias: 'owner', email: `${runId}-owner@example.test`, password }, { alias: 'other', email: `${runId}-other@example.test`, password }]
  const resources: { id: string; purpose: string; deletionAuthorized: boolean; deleted: boolean }[] = []
  const requests: { method: string; path: string; body?: string | null }[] = [], outcomes: NetworkFailure[] = [], diagnostics: Diagnostic[] = [], errors: string[] = []
  const cors: { path: string; status: number; origin: string; credentials: string }[] = [], reads: { label: string; status: number; body: string }[] = []
  const expected: ExpectedFailure[] = [expectedHttp('GET', `${api}/users/me`, 401, 2)], violations: string[] = [], inFlight: Promise<void>[] = []
  let stage = 'register owner', completed = false
  await mkdir(dir, { recursive: true }); await writeFile(`${dir}/${runId}-private-credentials.json`, JSON.stringify(accounts))
  async function persist() { await writeFile(`${dir}/${runId}-sanitized.json`, stringifyExactJson({ runId, stage, completed, resources, requests, reads, cors, expected, outcomes, diagnostics, errors, violations, diagnosticIssues: verifyNetworkDiagnostics(expected, outcomes, diagnostics) })) }
  function observe(p: Page) {
    p.on('pageerror', e => errors.push(e.message))
    p.on('console', m => { if (m.type() === 'error' || m.text().includes('[Vue warn]')) diagnostics.push({ text: m.text(), url: m.location().url }) })
    p.on('requestfailed', r => outcomes.push({ kind: 'requestfailed', method: r.method(), url: r.url(), reason: r.failure()!.errorText }))
    p.on('request', r => {
      if (!r.url().startsWith(api)) return
      const path = new URL(r.url()).pathname, method = r.method()
      // Never collect auth bodies, cookies, token or credential headers.
      requests.push({ method, path, ...(path.startsWith('/api/v1/forms') ? { body: r.postData() } : {}) })
      if (method === 'DELETE' && !resources.some(v => v.id === path.split('/').at(-1) && v.deletionAuthorized)) violations.push(`Undeclared DELETE ${path}`)
    })
    p.on('response', r => {
      if (!r.url().startsWith(api)) return
      if (r.status() >= 400) outcomes.push({ kind: 'response', url: r.url(), method: r.request().method(), status: r.status() })
      inFlight.push((async () => { const h = await r.allHeaders(); cors.push({ path: new URL(r.url()).pathname, status: r.status(), origin: h['access-control-allow-origin'] ?? '', credentials: h['access-control-allow-credentials'] ?? '' }) })())
    })
  }
  observe(page)
  const secondContext = await browser.newContext(), other = await secondContext.newPage(); observe(other)
  async function register(p: Page, account: typeof accounts[number], target: string) {
    await p.goto(target); await expect(p).toHaveURL(/\/login\?redirect=/)
    await p.getByRole('tab', { name: '註冊', exact: true }).click(); await p.getByRole('textbox', { name: '姓名' }).fill(`F7 ${runId} ${account.alias}`)
    await p.getByRole('textbox', { name: 'Email' }).fill(account.email); await p.getByLabel('密碼', { exact: true }).fill(account.password)
    const created = p.waitForResponse(r => r.url().endsWith('/auth/register')); await p.getByRole('button', { name: '註冊', exact: true }).click(); expect((await created).status()).toBe(201)
    await expect(p.getByRole('tab', { name: '登入', exact: true })).toHaveAttribute('aria-selected', 'true'); await p.getByLabel('密碼', { exact: true }).fill(account.password)
    const logged = p.waitForResponse(r => r.url().endsWith('/auth/login')); await p.getByRole('button', { name: '登入', exact: true }).click(); expect((await logged).status()).toBe(200)
    await expect(p).toHaveURL(`http://localhost:3000${target}`)
  }
  async function call(p: Page, path: string, method = 'GET', body?: unknown) {
    const r = await p.evaluate(async ({ url, method, body }) => { const response = await fetch(url, { method, credentials: 'include', ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body }) }); return { status: response.status, body: await response.text() } }, { url: api + path, method, body: body === undefined ? undefined : stringifyExactJson(body) })
    return r
  }
  async function read(id: string, label: string) { const r = await call(page, `/forms/${id}`); reads.push({ label, ...r }); await persist(); expect(r.status).toBe(200); return decodeFormDetail(parseExactJson(r.body)) }
  async function create(purpose: string, deadline: string | null = null, deletionAuthorized = false) {
    const r = await call(page, '/forms', 'POST', { title: `${runId} ${purpose}`, responseMode: 'multiple', resultVisibility: 'owner_only', submissionDeadlineAt: deadline,
      questions: [{ type: 'text', title: 'F7 optional 合成題目', sortOrder: 0, required: false, config: {} }] })
    expect(r.status).toBe(201); const dto = decodeFormDetail(parseExactJson(r.body)); resources.push({ id: dto.id, purpose, deletionAuthorized, deleted: false }); await persist(); return dto
  }
  async function managed(command: 'publish' | 'close' | 'delete') {
    const url = page.url(), id = /\/forms\/([^/]+)/.exec(url)?.[1]; expect(id).toBeTruthy()
    if (command === 'delete') expect(resources.some(v => v.id === id && v.deletionAuthorized)).toBe(true)
    const button = command === 'publish' ? '發布' : command === 'close' ? '關閉表單以查看統計' : '刪除表單'
    await page.getByRole('button', { name: button, exact: true }).click()
    const method = command === 'delete' ? 'DELETE' : 'POST', path = command === 'delete' ? `${api}/forms/${id}` : `${api}/forms/${id}/${command}`
    const response = page.waitForResponse(r => r.url() === path && r.request().method() === method)
    await page.getByRole('button', { name: `確認${command === 'publish' ? '發布' : command === 'close' ? '關閉' : '刪除'}` }).click()
    expect((await response).status()).toBe(command === 'delete' ? 204 : 200)
    if (command === 'delete') await expect(page).toHaveURL('http://localhost:3000/forms')
    else await expect(page).toHaveURL(`http://localhost:3000/forms/${id}`)
  }
  async function count(n: number) { const r = page.waitForResponse(r => r.url().endsWith('/respondent-count')); await page.getByRole('button', { name: '查看填答人數' }).click(); expect((await r).status()).toBe(200); await expect(page.getByText(`不同填答者人數：${n}`, { exact: true })).toBeVisible() }
  async function policy(label: string) { const r = page.waitForResponse(r => r.url().endsWith('/result-visibility') && r.request().method() === 'PATCH'); await page.getByRole('radio', { name: label, exact: true }).click(); expect((await r).status()).toBe(200); await expect(page.getByText('正在更新結果可見性…')).toHaveCount(0) }
  try {
    await register(page, accounts[0]!, '/forms/new'); expect((await context.cookies()).some(c => c.name === 'access_token' && c.httpOnly)).toBe(true)
    stage = 'L01 create/save independently read'; await page.getByLabel('表單標題', { exact: true }).fill(`${runId} main`); await page.getByLabel('填答次數').selectOption('multiple'); await page.getByLabel('結果可見範圍（必選）').selectOption('owner_only')
    await page.getByRole('button', { name: '新增題目' }).click(); await page.getByLabel('題目 1 標題', { exact: true }).fill('F7 合成 optional 題目')
    const created = page.waitForResponse(r => r.url() === `${api}/forms` && r.request().method() === 'POST'); await page.getByRole('button', { name: '保存草稿', exact: true }).click()
    const first = await created; expect(first.status()).toBe(201); let dto = decodeFormDetail(parseExactJson(await first.text())); const main = dto.id
    resources.push({ id: main, purpose: 'main lifecycle/policy/Count', deletionAuthorized: false, deleted: false }); await persist(); await expect(page).toHaveURL(`http://localhost:3000/forms/${main}/edit`)
    dto = await read(main, 'created Draft independent GET'); expect(dto.status).toBe('draft')
    const savedTitle = dto.title; await page.getByLabel('表單標題', { exact: true }).fill(`${runId} dirty policy`); await expect(page.getByRole('button', { name: '發布', exact: true })).toBeDisabled()
    stage = 'L02 Draft policy and dirty definition retained'
    for (const [value, label] of [['respondents', '填答者'], ['public', '所有人'], ['owner_only', '僅建立者']] as const) {
      const wire = page.waitForResponse(r => r.url().endsWith('/result-visibility') && r.request().method() === 'PATCH'); await page.getByRole('radio', { name: label, exact: true }).click(); expect((await wire).status()).toBe(200)
      await expect(page.getByLabel('表單標題', { exact: true })).toHaveValue(`${runId} dirty policy`); dto = await read(main, `Draft ${value} independent GET`); expect(dto.resultVisibility).toBe(value); expect(dto.title).toBe(savedTitle)
    }
    stage = 'L01 saved Publish independent read'; const patched = page.waitForResponse(r => r.url() === `${api}/forms/${main}` && r.request().method() === 'PATCH'); await page.getByRole('button', { name: '保存', exact: true }).click(); expect((await patched).status()).toBe(200)
    await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled(); await read(main, 'saved definition before Publish'); await managed('publish'); dto = await read(main, 'Publish independent GET'); expect(dto.status).toBe('published')
    await expect(page.getByRole('button', { name: '保存', exact: true })).toHaveCount(0); await expect(page.getByRole('textbox', { name: '表單標題', exact: true })).toHaveCount(0)
    stage = 'L02 Published policy'; await policy('所有人'); dto = await read(main, 'Published public GET'); expect(dto.resultVisibility).toBe('public')
    stage = 'L05 Count 0 -> 1 -> 1 -> 2'; await count(0)
    expect((await call(page, `/forms/${main}/responses`, 'POST', { answers: [] })).status).toBe(201); await count(1)
    expect((await call(page, `/forms/${main}/responses`, 'POST', { answers: [] })).status).toBe(201); await count(1)
    stage = 'L06 other Active role'; await register(other, accounts[1]!, `/forms/${main}`); await expect(other.getByRole('button', { name: '刪除表單' })).toHaveCount(0); await expect(other.getByRole('radio')).toHaveCount(0)
    expect((await call(other, `/forms/${main}/responses`, 'POST', { answers: [] })).status).toBe(201); await count(2)
    expected.push(expectedHttp('PATCH', `${api}/forms/${main}/result-visibility`, 403, 1)); const denied = await call(other, `/forms/${main}/result-visibility`, 'PATCH', { resultVisibility: 'owner_only' }); expect(denied.status).toBe(403); expect((parseExactJson(denied.body) as { error: { code: string } }).error.code).toBe('FORM_ACCESS_DENIED')
    stage = 'L03 Close normal Published'; await managed('close'); dto = await read(main, 'normal Close independent GET'); expect(dto.status).toBe('closed'); await expect(page.getByRole('link', { name: '查看統計' })).toHaveAttribute('href', `/forms/${main}/statistics`)
    stage = 'L02 Closed policy'; await policy('填答者'); dto = await read(main, 'Closed respondents independent GET'); expect(dto.resultVisibility).toBe('respondents'); await expect(page.getByText('查看資格：建立者及填答者')).toBeVisible()
    await page.reload(); await expect(page.getByRole('radio', { name: '填答者', exact: true })).toBeChecked(); dto = await read(main, 'Closed reload independent GET'); expect(dto.resultVisibility).toBe('respondents')
    stage = 'L03 natural deadline then Close'; const deadline = new Date(Date.now() + 12_000).toISOString(); const timed = await create('natural deadline', deadline)
    expect((await call(page, `/forms/${timed.id}/publish`, 'POST')).status).toBe(200); await page.goto(`/forms/${timed.id}`); await expect.poll(() => Date.now(), { timeout: 20_000 }).toBeGreaterThanOrEqual(Date.parse(deadline))
    await expect(page.getByText('已截止', { exact: true })).toBeVisible(); dto = await read(timed.id, 'naturally expired still Published'); expect(dto.status).toBe('published'); await managed('close'); expect((await read(timed.id, 'expired Close GET')).status).toBe('closed')
    stage = 'L04 dedicated Delete resources'
    for (const status of ['draft', 'published', 'closed'] as const) {
      const resource = await create(`delete-${status}`, null, true)
      if (status !== 'draft') expect((await call(page, `/forms/${resource.id}/publish`, 'POST')).status).toBe(200)
      if (status === 'closed') expect((await call(page, `/forms/${resource.id}/close`, 'POST')).status).toBe(200)
      await page.goto(`/forms/${resource.id}${status === 'draft' ? '/edit' : ''}`)
      if (status === 'draft') await page.getByLabel('表單標題', { exact: true }).fill(`${runId} delete dirty`)
      let native = 0; const listener = async (d: import('@playwright/test').Dialog) => { native++; await d.dismiss() }; page.on('dialog', listener)
      await managed('delete'); page.off('dialog', listener); expect(native).toBe(0); resources.find(v => v.id === resource.id)!.deleted = true; await persist()
      expected.push(expectedHttp('GET', `${api}/forms/${resource.id}`, 404, 1)); const missing = await call(page, `/forms/${resource.id}`); reads.push({ label: `${status} Delete independent 404`, ...missing }); expect(missing.status).toBe(404); expect((parseExactJson(missing.body) as { error: { code: string } }).error.code).toBe('FORM_NOT_FOUND')
      const list = await call(page, '/forms?page=1&pageSize=10'); expect(list.status).toBe(200); expect((parseExactJson(list.body) as { items: { id: string }[] }).items.some(v => v.id === resource.id)).toBe(false)
    }
    stage = 'L06 dirty true AUTH_REQUIRED and return'; const authDraft = await create('Auth boundary retained'); await page.goto(`/forms/${authDraft.id}/edit`); await page.getByLabel('表單標題', { exact: true }).fill(`${runId} Auth retained`); await context.clearCookies()
    expected.push(expectedHttp('PATCH', `${api}/forms/${authDraft.id}/result-visibility`, 401, 1)); await page.getByRole('radio', { name: '所有人', exact: true }).click(); await expect(page.getByRole('dialog', { name: '操作訊息' })).toBeVisible()
    let dismissed!: () => void; const cancelled = new Promise<void>(r => { dismissed = r })
    page.once('dialog', async d => { await d.dismiss(); dismissed() }); await page.getByRole('dialog', { name: '操作訊息' }).getByRole('button', { name: '關閉', exact: true }).filter({ hasText: '關閉' }).click(); await cancelled
    await expect(page.getByLabel('表單標題', { exact: true })).toHaveValue(`${runId} Auth retained`); await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
    let accepted!: () => void; const confirmed = new Promise<void>(r => { accepted = r })
    page.once('dialog', async d => { await d.accept(); accepted() }); await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '我的表單', exact: true }).click(); await confirmed; await expect(page).toHaveURL(/\/login\?redirect=/)
    await page.getByRole('textbox', { name: 'Email' }).fill(accounts[0]!.email); await page.getByLabel('密碼', { exact: true }).fill(password); await page.getByRole('button', { name: '登入', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/forms')
    expect((await read(authDraft.id, 'Auth retained Draft independent GET')).title).toBe(`${runId} Auth boundary retained`)
    await Promise.all(inFlight); expect(cors.every(v => v.origin === 'http://localhost:3000' && v.credentials === 'true')).toBe(true)
    expect(errors).toEqual([]); expect(violations).toEqual([]); expect(verifyNetworkDiagnostics(expected, outcomes, diagnostics)).toEqual([]); completed = true; stage = 'PASS'
  } finally {
    await Promise.allSettled(inFlight); await persist()
    const indexPath = `${dir}/retained-live-runs.json`; let index: unknown[] = []; try { index = JSON.parse(await readFile(indexPath, 'utf8')) as unknown[] } catch { /* first run */ }
    await writeFile(indexPath, JSON.stringify([...index, { runId, stage, completed, accounts: accounts.map(v => v.alias), resources }], null, 2)); await secondContext.close()
  }
})

test('F7-L02 matrix continuation real three policies in Draft/Published/Closed with independent GET', async ({ page }) => {
  test.setTimeout(90_000)
  const dir = 'output/playwright/f7', index = JSON.parse(await readFile(`${dir}/retained-live-runs.json`, 'utf8')) as { runId: string; completed: boolean }[]
  const source = [...index].reverse().find(v => v.completed); if (!source) throw new Error('A retained successful F7 live account is required')
  const accounts = JSON.parse(await readFile(`${dir}/${source.runId}-private-credentials.json`, 'utf8')) as { alias: string; email: string; password: string }[]
  const owner = accounts.find(v => v.alias === 'owner')!; const runId = `f7-matrix-${Date.now()}`
  const expected = [expectedHttp('GET', `${api}/users/me`, 401, 1)], outcomes: NetworkFailure[] = [], diagnostics: Diagnostic[] = [], errors: string[] = []
  const pairs: { lifecycle: string; value: string; response: unknown; readback: unknown }[] = []
  let id: string | undefined, completed = false
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' || m.text().includes('[Vue warn]')) diagnostics.push({ text: m.text(), url: m.location().url }) })
  page.on('response', r => { if (r.status() >= 400) outcomes.push({ kind: 'response', url: r.url(), method: r.request().method(), status: r.status() }) })
  page.on('requestfailed', r => outcomes.push({ kind: 'requestfailed', method: r.method(), url: r.url(), reason: r.failure()!.errorText }))
  const exchange = (path: string, method = 'GET', body?: unknown) => page.evaluate(async ({ url, method, body }) => {
    const r = await fetch(url, { method, credentials: 'include', ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body }) }); return { status: r.status, body: await r.text() }
  }, { url: api + path, method, body: body === undefined ? undefined : stringifyExactJson(body) })
  try {
    await page.goto('/login'); await page.getByRole('textbox', { name: 'Email' }).fill(owner.email); await page.getByLabel('密碼', { exact: true }).fill(owner.password)
    await page.getByRole('button', { name: '登入', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/')
    const created = await exchange('/forms', 'POST', { title: runId, resultVisibility: 'public', questions: [{ type: 'text', title: '政策矩陣合成題', sortOrder: 0 }] })
    expect(created.status).toBe(201); id = decodeFormDetail(parseExactJson(created.body)).id
    for (const lifecycle of ['draft', 'published', 'closed'] as const) {
      if (lifecycle !== 'draft') expect((await exchange(`/forms/${id}/${lifecycle === 'published' ? 'publish' : 'close'}`, 'POST')).status).toBe(200)
      await page.goto(`/forms/${id}${lifecycle === 'draft' ? '/edit' : ''}`)
      for (const [value, label] of [['owner_only', '僅建立者'], ['respondents', '填答者'], ['public', '所有人']] as const) {
        const response = page.waitForResponse(r => r.url() === `${api}/forms/${id}/result-visibility` && r.request().method() === 'PATCH')
        await page.getByRole('radio', { name: label, exact: true }).click(); const res = await response; expect(res.status()).toBe(200)
        const dto = decodeFormDetail(parseExactJson(await res.text())), read = await exchange(`/forms/${id}`); expect(read.status).toBe(200)
        const readback = decodeFormDetail(parseExactJson(read.body)); pairs.push({ lifecycle, value, response: dto, readback })
        expect(dto.resultVisibility).toBe(value); expect(readback.resultVisibility).toBe(value); expect(readback.status).toBe(lifecycle)
        await expect(page.getByRole('radio', { name: label, exact: true })).toBeChecked()
      }
    }
    expect(pairs).toHaveLength(9); expect(errors).toEqual([]); expect(verifyNetworkDiagnostics(expected, outcomes, diagnostics)).toEqual([]); completed = true
  } finally {
    await writeFile(`${dir}/${runId}-sanitized.json`, stringifyExactJson({ runId, sourceRun: source.runId, completed, id, purpose: 'F7 policy matrix; retained; no Delete', pairs, expected, outcomes, diagnostics, errors, diagnosticIssues: verifyNetworkDiagnostics(expected, outcomes, diagnostics) }))
  }
})

test('F7-L06 real cached Owner versus current Cookie role denial, SPA persistence and qualified recovery', async ({ page }) => {
  test.setTimeout(90_000)
  const dir = 'output/playwright/f7', index = JSON.parse(await readFile(`${dir}/retained-live-runs.json`, 'utf8')) as { runId: string; completed: boolean }[]
  const source = [...index].reverse().find(v => v.completed); if (!source) throw new Error('Retained F7 accounts required')
  const accounts = JSON.parse(await readFile(`${dir}/${source.runId}-private-credentials.json`, 'utf8')) as { alias: string; email: string; password: string }[]
  const owner = accounts.find(v => v.alias === 'owner')!, other = accounts.find(v => v.alias === 'other')!, runId = `f7-role-${Date.now()}`
  const expected: ExpectedFailure[] = [expectedHttp('GET', `${api}/users/me`, 401, 1)], outcomes: NetworkFailure[] = [], diagnostics: Diagnostic[] = [], errors: string[] = []
  const observations: { label: string; meRequests: number; ownerCommands: number }[] = []
  let meRequests = 0, id: string | undefined, completed = false
  page.on('request', r => { if (r.url() === `${api}/users/me`) meRequests++ })
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' || m.text().includes('[Vue warn]')) diagnostics.push({ text: m.text(), url: m.location().url }) })
  page.on('response', r => { if (r.status() >= 400) outcomes.push({ kind: 'response', method: r.request().method(), url: r.url(), status: r.status() }) }); page.on('requestfailed', r => outcomes.push({ kind: 'requestfailed', method: r.method(), url: r.url(), reason: r.failure()!.errorText }))
  const exchange = (path: string, method = 'GET', body?: unknown) => page.evaluate(async ({ url, method, body }) => { const r = await fetch(url, { method, credentials: 'include', ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body }) }); return { status: r.status, body: await r.text() } }, { url: api + path, method, body: body === undefined ? undefined : stringifyExactJson(body) })
  async function cookieLogin(account: typeof owner) {
    // Normal API login changes the HttpOnly cookie; deliberately leaves the SPA's
    // cached User untouched to reproduce the contract's cross-tab identity case.
    expect((await exchange('/auth/login', 'POST', { email: account.email, password: account.password })).status).toBe(200)
  }
  async function deny() {
    await cookieLogin(other); const r = page.waitForResponse(r => r.url() === `${api}/forms/${id}/result-visibility` && r.request().method() === 'PATCH')
    await page.getByRole('radio', { name: '所有人', exact: true }).click(); const res = await r; expect(res.status()).toBe(403)
    expect((parseExactJson(await res.text()) as { error: { code: string } }).error.code).toBe('FORM_ACCESS_DENIED')
    await page.getByRole('dialog', { name: '操作訊息' }).getByRole('button', { name: '關閉', exact: true }).filter({ hasText: '關閉' }).click()
    await expect(page.getByRole('button', { name: '核對登入與管理資格' })).toBeVisible(); await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toHaveCount(0)
  }
  try {
    await page.goto('/login'); await page.getByRole('textbox', { name: 'Email' }).fill(owner.email); await page.getByLabel('密碼', { exact: true }).fill(owner.password); await page.getByRole('button', { name: '登入', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/')
    const r = await exchange('/forms', 'POST', { title: runId, resultVisibility: 'owner_only', questions: [{ type: 'text', title: '身分核對合成題', sortOrder: 0 }] }); expect(r.status).toBe(201); id = decodeFormDetail(parseExactJson(r.body)).id
    expect((await exchange(`/forms/${id}/publish`, 'POST')).status).toBe(200); await page.goto(`/forms/${id}`); await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toBeVisible()
    expected.push(expectedHttp('PATCH', `${api}/forms/${id}/result-visibility`, 403, 2)); const meBefore = meRequests
    await deny(); await cookieLogin(owner); await page.getByRole('button', { name: '核對登入與管理資格' }).click(); await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toBeVisible()
    expect(meRequests).toBe(meBefore + 1); observations.push({ label: 'explicit Owner me plus successful Form GET recovered', meRequests, ownerCommands: 1 })
    await deny(); const beforeSpa = meRequests
    await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/'); await page.goBack(); await expect(page).toHaveURL(`http://localhost:3000/forms/${id}`)
    await expect(page.getByRole('button', { name: '核對登入與管理資格' })).toBeVisible(); await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toHaveCount(0); expect(meRequests).toBe(beforeSpa)
    observations.push({ label: 'SPA return did not restore cached Owner', meRequests, ownerCommands: 0 })
    await page.getByRole('button', { name: '核對登入與管理資格' }).click(); await expect(page.getByRole('button', { name: '使用者選單' })).toContainText('other'); await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toHaveCount(0); expect(meRequests).toBe(beforeSpa + 1)
    observations.push({ label: 'explicit current other identity has no Owner commands', meRequests, ownerCommands: 0 })
    await cookieLogin(owner); await page.reload(); await expect(page.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toBeVisible(); expect(meRequests).toBe(beforeSpa + 2)
    observations.push({ label: 'full App restart verified Owner again', meRequests, ownerCommands: 1 })
    expect(errors).toEqual([]); expect(verifyNetworkDiagnostics(expected, outcomes, diagnostics)).toEqual([]); completed = true
  } finally {
    await writeFile(`${dir}/${runId}-sanitized.json`, stringifyExactJson({ runId, sourceRun: source.runId, completed, id, purpose: 'F7 qualification; retained Published; no Delete', observations, expected, outcomes, diagnostics, errors, diagnosticIssues: verifyNetworkDiagnostics(expected, outcomes, diagnostics) }))
  }
})
