import { test, expect } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { decodeFormDetail, decodeReceipt } from '../../app/domain/api/decoders'
import type { FormDetailDto } from '../../app/domain/api/form'
import type { StatisticsDto, StatisticsQuestionDto } from '../../app/domain/api/statistics'
import { ExactNumber } from '../../app/utils/exact-number'
import { parseExactJson, stringifyExactJson } from '../../app/utils/exact-json'
import { parseInstant } from '../../app/utils/datetime'
import { expectedHttp, verifyNetworkDiagnostics } from '../helpers/f6-network-diagnostics'
import type { Diagnostic, ExpectedFailure, NetworkFailure } from '../helpers/f6-network-diagnostics'

const api = 'http://localhost:5000/api/v1', dir = 'output/playwright/f9'
type Alias = 'A' | 'B' | 'C' | 'guest'
interface Account { alias: Alias; id: string; email: string; displayName: string; originRunId?: string }
interface Resource { id: string; purpose: string; status: string; input: Record<string, unknown> }
const runId = `f9-${Date.now()}-${process.env.F9_RUN_LABEL ?? 'live'}`
let password = `F9-${randomUUID()}`
const accounts: Account[] = [], resources: Resource[] = [], receipts: { id: string; formId: string; alias: Alias; label: string; body: string }[] = []
let retained: { resources: Resource[]; receipts: typeof receipts } | undefined
const reads: { label: string; alias: Alias; url: string; status: number; body: string; expected?: unknown }[] = []
const cases: { id: string; source: string; result: string; detail?: string }[] = []
const contexts = {} as Record<Alias, BrowserContext>, pages = {} as Record<Alias, Page>
const expected: ExpectedFailure[] = [], actual: NetworkFailure[] = [], diagnostics: Diagnostic[] = [], errors: string[] = [], violations: string[] = []
const wire: { alias: Alias; method: string; url: string; status: number; body?: string | null; response?: string; origin: string; credentials: string }[] = [], pending: Promise<void>[] = []
const requests: { alias: Alias; method: string; url: string }[] = []
let browserVersion = '', stage = 'setup'
function allow(...items: ExpectedFailure[]) {
  for (const item of items) {
    const prior = expected.find(e => e.method === item.method && e.url === item.url && e.kind === item.kind && e.kind === 'response' && item.kind === 'response' && e.status === item.status)
    if (prior) { prior.count += item.count; prior.diagnosticCount += item.diagnosticCount }
    else expected.push(item)
  }
}
const account = (alias: Alias) => accounts.find(a => a.alias === alias)!
async function persist() { await mkdir(dir, { recursive: true }); await writeFile(`${dir}/${runId}-sanitized.json`, stringifyExactJson({ runId, reusedRun: process.env.F9_REUSE_RUN, stage, browserVersion, node: process.version, apiMode: 'real Browser fetch; no business API interception', accounts, resources, receipts, reads, cases, expected, actual, diagnostics, errors, violations, requests, wire, diagnosticIssues: verifyNetworkDiagnostics(expected, actual, diagnostics) })) }
function observe(page: Page, alias: Alias) {
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' || m.text().includes('[Vue warn]')) diagnostics.push({ text: m.text(), url: m.location().url }) })
  page.on('requestfailed', r => actual.push({ kind: 'requestfailed', method: r.method(), url: r.url(), reason: r.failure()!.errorText }))
  page.on('request', r => {
    if (!r.url().startsWith(api)) return
    const path = new URL(r.url()).pathname, method = r.method()
    if (method !== 'OPTIONS') requests.push({ alias, method, url: r.url() })
    if (method === 'DELETE') violations.push(`Unapproved DELETE ${path}`)
    const id = /^\/api\/v1\/forms\/([^/]+)/.exec(path)?.[1]
    if (method !== 'GET' && method !== 'OPTIONS' && id && !resources.some(v => v.id === id)) violations.push(`Write outside Run resources ${method} ${path}`)
  })
  page.on('response', r => {
    if (!r.url().startsWith(api) || r.request().method() === 'OPTIONS') return
    if (r.status() >= 400) actual.push({ kind: 'response', method: r.request().method(), url: r.url(), status: r.status() })
    pending.push((async () => {
      const h = await r.allHeaders(), path = new URL(r.url()).pathname
      wire.push({ alias, method: r.request().method(), url: r.url(), status: r.status(), origin: h['access-control-allow-origin'] ?? '', credentials: h['access-control-allow-credentials'] ?? '',
        ...(path.startsWith('/api/v1/forms') ? { body: r.request().postData(), response: await r.text() } : {}) })
    })())
  })
}
async function call(alias: Alias, path: string, method = 'GET', body?: unknown) {
  return pages[alias].evaluate(async ({ url, method, body }) => {
    const r = await fetch(url, { method, credentials: 'include', ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body }) })
    return { status: r.status, body: await r.text() }
  }, { url: api + path, method, body: body === undefined ? undefined : stringifyExactJson(body) })
}
async function step(id: string, action: () => Promise<void>) {
  stage = id
  await test.step(id, async () => {
    try { await action(); cases.push({ id, source: 'real API + Browser; independent fixed expectations', result: 'PASS' }) }
    catch (e) { cases.push({ id, source: 'real API + Browser', result: 'FAIL', detail: String(e) }); throw e }
    finally { await Promise.allSettled(pending); await persist() }
  })
}
const types = ['text', 'number', 'single_choice', 'multiple_choice', 'rating'] as const
const titles = ['固定文字', '固定數字', '固定單選', '固定多選', '固定評分']
function blueprint() {
  return types.map((type, index) => ({ type, title: titles[index]!, description: index === 0 ? '固定題目說明' : null, sortOrder: index, required: false,
    config: type === 'rating' ? { min: 0, max: 2, variant: 'range' } : type === 'text' ? { variant: 'textarea' } : {},
    ...(type.includes('choice') ? { options: ['甲', '乙', '零票'].map((v, i) => ({ label: `固定${type === 'single_choice' ? '單' : '多'}選${v}`, value: `business-${i}`, sortOrder: i })) } : {}),
  }))
}
async function create(purpose: string, identity: 'anonymous' | 'identified', visibility: 'owner_only' | 'respondents' | 'public', options: { deadline?: string; extra?: boolean; publish?: boolean } = {}) {
  const input = { title: `${runId} ${purpose}`, description: '固定根說明\n第二行', responseMode: 'multiple', responseIdentity: identity, resultVisibility: visibility, submissionDeadlineAt: options.deadline ?? null,
    questions: [...blueprint(), ...(options.extra ? [
      { type: 'number', title: '固定長小數', description: null, sortOrder: 5, required: false, config: {} },
      { type: 'number', title: '固定數值等值', description: null, sortOrder: 6, required: false, config: {} },
      { type: 'text', title: '只在歷史回答的 optional', description: null, sortOrder: 7, required: false, config: {} },
    ] : [])] }
  const r = await call('A', '/forms', 'POST', input); expect(r.status).toBe(201)
  const dto = decodeFormDetail(parseExactJson(r.body)); expect(dto.questions.map(q => q.title)).toEqual(input.questions.map(q => q.title))
  resources.push({ id: dto.id, purpose, status: 'draft', input }); await persist()
  if (options.publish !== false) { expect((await call('A', `/forms/${dto.id}/publish`, 'POST')).status).toBe(200); resources.at(-1)!.status = 'published' }
  await persist(); return dto
}
async function close(form: FormDetailDto) { expect((await call('A', `/forms/${form.id}/close`, 'POST')).status).toBe(200); resources.find(r => r.id === form.id)!.status = 'closed'; await persist() }
async function submit(alias: Alias, form: FormDetailDto, label: string, values: (string | string[] | ExactNumber | number | undefined)[]) {
  const answers = values.flatMap((value, i) => value === undefined ? [] : [{ questionId: form.questions[i]!.id, value }])
  const r = await call(alias, `/forms/${form.id}/responses`, 'POST', { answers }); expect(r.status).toBe(201)
  const receipt = decodeReceipt(parseExactJson(r.body)); receipts.push({ id: receipt.id, formId: form.id, alias, label, body: r.body }); await persist(); return receipt
}
const option = (form: FormDetailDto, q: number, i: number) => form.questions[q]!.options[i]!.id
function person(alias: Alias) { return { id: account(alias).id, displayName: account(alias).displayName } }
function people(aliases: Alias[]) { return aliases.map(person).sort((a, b) => a.displayName < b.displayName ? -1 : a.displayName > b.displayName ? 1 : a.id < b.id ? -1 : 1) }
function rootExpectation(form: FormDetailDto, count: number, questions: readonly StatisticsQuestionDto[], visibility?: StatisticsDto['resultVisibility']): StatisticsDto {
  const resource = resources.find(r => r.id === form.id)!
  return { formId: form.id, title: resource.input.title as string, description: '固定根說明\n第二行', creatorDisplayName: account('A').displayName, responseMode: 'multiple', resultVisibility: visibility ?? resource.input.resultVisibility as StatisticsDto['resultVisibility'], submissionDeadlineAt: resource.input.submissionDeadlineAt as string | null, count, questions }
}
function matrixExpectation(form: FormDetailDto, identified: boolean, zero = false): StatisticsDto {
  const count = zero ? 0 : 1, names = (yes: boolean) => identified ? { respondents: yes && !zero ? [person('B')] : [] } : {}
  const questions = types.map((type, i) => {
    const common = { questionId: form.questions[i]!.id, title: titles[i]!, description: i === 0 ? '固定題目說明' : null, type, count }
    if (type === 'text') return { ...common, type, statistics: zero ? [] : [{ value: '矩陣答案', count: 1, ...names(true) }] }
    if (type === 'number') return { ...common, type, statistics: zero ? [] : [{ value: ExactNumber.from('0'), count: 1, ...names(true) }] }
    if (type === 'rating') return { ...common, type, statistics: [0, 1, 2].map(value => ({ value, count: value === 0 ? count : 0, ...names(value === 0) })) }
    return { ...common, type, statistics: ['甲', '乙', '零票'].map((v, j) => { const hit = type === 'single_choice' ? j === 0 : j < 2; return { optionId: option(form, i, j), label: `固定${type === 'single_choice' ? '單' : '多'}選${v}`, value: `business-${j}`, count: hit ? count : 0, ...names(hit) } }) }
  }) as StatisticsQuestionDto[]
  return rootExpectation(form, count, questions)
}
function canonical(value: unknown): unknown {
  if (value instanceof ExactNumber) return `number:${value.sign}:${value.digits}:${value.exponent}`
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, key === 'submissionDeadlineAt' && typeof v === 'string' ? `instant-ticks:${parseInstant(v).ticks}` : canonical(v)]))
  return value
}
function assertBody(body: string, expectedBody: StatisticsDto) {
  expect(canonical(parseExactJson(body))).toEqual(canonical(parseExactJson(stringifyExactJson(expectedBody))))
}
async function assertUI(page: Page, expectedBody: StatisticsDto) {
  const region = page.getByRole('region', { name: '統計根資訊' }); await expect(region).toBeVisible()
  await expect(region.getByRole('heading', { level: 2 })).toHaveText(expectedBody.title)
  await expect(region).toContainText(`建立者：${expectedBody.creatorDisplayName}`)
  await expect(page.locator('[data-statistics-count]')).toHaveText(`${expectedBody.count} 人`)
  await expect(page.locator('[data-statistics-question]')).toHaveCount(expectedBody.questions.length)
  for (const [i, q] of expectedBody.questions.entries()) {
    const el = page.locator('[data-statistics-question]').nth(i)
    await expect(el.getByRole('heading', { level: 3 })).toHaveText(q.title)
    await expect(el.locator('[data-statistics-question-count]')).toHaveText(`本題填答人數：${q.count} 人`)
    await expect(el.locator('[data-statistics-item]')).toHaveCount(q.statistics.length)
    for (const [j, item] of q.statistics.entries()) {
      const row = el.locator('[data-statistics-item]').nth(j)
      const label = 'label' in item ? String(item.label) : item.value instanceof ExactNumber ? item.value.token : String(item.value)
      if (q.type === 'number') {
        const text = await row.locator('[data-statistics-value]').innerText()
        expect(ExactNumber.from(text).equals(item.value as ExactNumber)).toBe(true)
      } else await expect(row.locator('[data-statistics-value]')).toHaveText(label)
      await expect(row.locator('[data-statistics-item-count]')).toHaveText(`${item.count} 人`)
      if (item.respondents === undefined) await expect(row.locator('[data-statistics-respondents]')).toHaveCount(0)
      else await expect(row.locator('[data-statistics-respondent]')).toHaveText(item.respondents.map(r => r.displayName))
    }
  }
}
async function statisticsPage(alias: Alias, form: FormDetailDto, label: string, expectedBody?: StatisticsDto, status = 200, code?: string) {
  const page = pages[alias], path = `/forms/${form.id}/statistics`, url = api + path
  if (alias === 'guest') allow(expectedHttp('GET', `${api}/users/me`, 401, 1))
  if (status >= 400) allow(expectedHttp('GET', url, status, 1))
  const observed = page.waitForResponse(r => r.url() === url && r.request().method() === 'GET')
  const before = requests.length
  await page.goto(path)
  const r = await observed, body = await r.text(); expect(r.status()).toBe(status)
  reads.push({ label, alias, url, status, body, expected: expectedBody ?? { status, code } })
  if (expectedBody) { assertBody(body, expectedBody); await assertUI(page, expectedBody) }
  else {
    expect((JSON.parse(body) as { error: { code: string } }).error.code).toBe(code)
    if (status === 401) { await expect(page).toHaveURL(/\/login\?redirect=/); expect(new URL(page.url()).searchParams.get('redirect')).toBe(path) }
    else { await expect(page).toHaveURL(`http://localhost:3000${path}`); await expect(page.getByRole('alert')).toContainText(status === 409 ? '統計尚未開放' : status === 404 ? '找不到表單' : status === 400 ? '連結無效' : '您沒有查看此統計的權限') }
  }
  await Promise.allSettled(pending)
  const productRequests = requests.slice(before).filter(w => w.alias === alias && w.method === 'GET').map(w => new URL(w.url).pathname)
  expect(productRequests.filter(p => p.startsWith('/api/v1/forms/'))).toEqual([`/api/v1${path}`])
}
async function independent(alias: Alias, form: FormDetailDto, label: string, expectedBody: StatisticsDto) {
  const r = await call(alias, `/forms/${form.id}/statistics`); reads.push({ label, alias, url: `${api}/forms/${form.id}/statistics`, ...r, expected: expectedBody }); expect(r.status).toBe(200); assertBody(r.body, expectedBody)
}

test.describe.serial('F9 true backend read and UI', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000); browserVersion = browser.version(); await mkdir(dir, { recursive: true })
    const reuseRun = process.env.F9_REUSE_RUN
    const reuse = reuseRun ? JSON.parse(await readFile(`${dir}/${reuseRun}-private-credentials.json`, 'utf8')) as { password: string; accounts: Account[] } : undefined
    if (reuse) { password = reuse.password; retained = JSON.parse(await readFile(`${dir}/${reuseRun}-sanitized.json`, 'utf8')) as NonNullable<typeof retained> }
    for (const alias of ['A', 'B', 'C', 'guest'] as const) {
      contexts[alias] = await browser.newContext(); pages[alias] = await contexts[alias].newPage(); observe(pages[alias], alias)
      allow(expectedHttp('GET', `${api}/users/me`, 401, 1)); await pages[alias].goto('/login'); await expect(pages[alias].getByRole('tab', { name: '登入', exact: true })).toBeVisible()
      if (alias === 'guest') continue
      const prior = reuse?.accounts.find(a => a.alias === alias)
      const email = prior?.email ?? `${runId}-${alias.toLowerCase()}@example.test`, displayName = prior?.displayName ?? (alias === 'A' ? 'F9 合成建立者' : 'F9 合成同名')
      if (prior) accounts.push({ ...prior, originRunId: prior.originRunId ?? reuseRun })
      else {
        const r = await call(alias, '/auth/register', 'POST', { email, password, displayName }); expect(r.status).toBe(201)
        const user = JSON.parse(r.body) as { id: string }; accounts.push({ alias, id: user.id, email, displayName })
      }
      await writeFile(`${dir}/${runId}-private-credentials.json`, JSON.stringify({ accounts, password }))
      expect((await call(alias, '/auth/login', 'POST', { email, password })).status).toBe(200)
      expect((await contexts[alias].cookies()).some(c => c.name === 'access_token' && c.httpOnly && c.sameSite === 'Lax' && c.domain === 'localhost')).toBe(true)
      await persist()
    }
  })
  test.afterAll(async () => {
    await Promise.allSettled(pending); await persist()
    const indexPath = `${dir}/retained-live-runs.json`; let index: unknown[] = []; try { index = JSON.parse(await readFile(indexPath, 'utf8')) as unknown[] } catch { /* first run */ }
    await writeFile(indexPath, JSON.stringify([...index, { runId, stage, resources: resources.map(r => ({ id: r.id, purpose: r.purpose, status: r.status })), accounts, receipts: receipts.map(r => ({ id: r.id, formId: r.formId, alias: r.alias })) }], null, 2))
    for (const c of Object.values(contexts)) await c.close()
  })
  test('F9-L01 anonymous/identified × three policies × four real Cookie contexts (24 cells)', async () => {
    test.setTimeout(240_000)
    for (const identity of ['anonymous', 'identified'] as const) for (const visibility of ['owner_only', 'respondents', 'public'] as const) {
      const form = await create(`L01 ${identity} ${visibility}`, identity, visibility)
      await submit('B', form, 'fixed matrix input', ['矩陣答案', 0, option(form, 2, 0), [option(form, 3, 0), option(form, 3, 1)], 0]); await close(form)
      const expectedBody = matrixExpectation(form, identity === 'identified')
      for (const alias of ['A', 'B', 'C', 'guest'] as const) {
        const allowed = visibility === 'public' || alias === 'A' || (visibility === 'respondents' && alias === 'B')
        const status = allowed ? 200 : alias === 'guest' ? 401 : 403
        await step(`L01 ${identity}/${visibility}/${alias}`, () => statisticsPage(alias, form, 'matrix fixed input', allowed ? expectedBody : undefined, status, status === 401 ? 'AUTH_REQUIRED' : 'STATISTICS_ACCESS_DENIED'))
      }
    }
    await step('L01 private actual Login return + manual missing-Cookie AUTH_REQUIRED Dialog', async () => {
      const form = resources.find(r => r.purpose === 'L01 identified owner_only')!, dto = { id: form.id } as FormDetailDto
      const page = pages.guest, path = `/forms/${dto.id}/statistics?run=private#result`, url = `${api}/forms/${dto.id}/statistics`
      allow(expectedHttp('GET', `${api}/users/me`, 401, 1), expectedHttp('GET', url, 401, 2))
      await page.goto(path); await expect(page).toHaveURL(/\/login\?redirect=/); expect(new URL(page.url()).searchParams.get('redirect')).toBe(path)
      await page.getByRole('textbox', { name: 'Email' }).fill(account('A').email); await page.getByLabel('密碼', { exact: true }).fill(password); await page.getByRole('button', { name: '登入', exact: true }).click(); await expect(page.getByRole('region', { name: '統計根資訊' })).toBeVisible(); await expect(page).toHaveURL(`http://localhost:3000${path}`)
      await contexts.guest.clearCookies(); await page.getByRole('button', { name: '重新載入統計' }).click(); await expect(page.getByRole('dialog')).toContainText('需要有效登入身分'); await expect(page.locator('[data-statistics-respondent]')).toHaveCount(0)
      await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).last().click(); await expect(page).toHaveURL(/\/login\?redirect=/)
    })
  })
  test('F9-L02 fixed latest-whole semantics, number precision/grouping, current names/deadline and independent read', async () => {
    test.setTimeout(120_000)
    for (const alias of ['A', 'B', 'C'] as const) {
      const name = alias === 'A' ? 'F9 合成建立者' : 'F9 合成同名'
      expect((await call(alias, '/users/me', 'PATCH', { displayName: name })).status).toBe(200); account(alias).displayName = name
    }
    const deadline = '2030-12-31T10:30:00.123456Z', resumed = process.env.F9_REUSE_L02_FORM
    let form: FormDetailDto
    if (resumed) {
      const resource = retained?.resources.find(r => r.id === resumed && r.purpose === 'L02 effective complete response' && r.status === 'closed')
      if (!resource) throw new Error('Reused form must be a declared retained Closed L02 resource')
      const r = await call('A', `/forms/${resumed}`); expect(r.status).toBe(200); form = decodeFormDetail(parseExactJson(r.body))
      resources.push(resource); receipts.push(...retained!.receipts.filter(r => r.formId === resumed)); await persist()
    } else {
      form = await create('L02 effective complete response', 'identified', 'public', { deadline, extra: true })
      await submit('A', form, 'historical full, excluded by next complete response', ['過去不可補', 55, option(form, 2, 2), [option(form, 3, 2)], 1, 55, 55, '歷史 optional 不可補'])
      await submit('A', form, 'effective A omits text/optional', [undefined, ExactNumber.from('9007199254740992'), option(form, 2, 0), [option(form, 3, 0), option(form, 3, 1)], 0, ExactNumber.from('0.12345678901234567890123456789'), ExactNumber.from('1'), undefined])
      await submit('B', form, 'effective B same name', ['Case\n字', ExactNumber.from('9007199254740993'), option(form, 2, 0), [option(form, 3, 0), option(form, 3, 1)], 2, ExactNumber.from('0.12345678901234567890123456789'), ExactNumber.from('1.0')])
      await submit('C', form, 'effective C same name distinct ID', ['Case\n字', 0, option(form, 2, 1), [option(form, 3, 1)], 2, 0, ExactNumber.from('1e0')]); await close(form)
    }
    const names = (aliases: Alias[]) => ({ count: aliases.length, respondents: people(aliases) })
    const q = (i: number, count: number, statistics: unknown[]): StatisticsQuestionDto => ({ questionId: form.questions[i]!.id, title: i < 5 ? titles[i]! : i === 5 ? '固定長小數' : i === 6 ? '固定數值等值' : '只在歷史回答的 optional', description: i === 0 ? '固定題目說明' : null, type: i < 5 ? types[i]! : i === 7 ? 'text' : 'number', count, statistics }) as StatisticsQuestionDto
    const expectedBody = () => rootExpectation(form, 3, [
      q(0, 2, [{ value: 'Case\n字', ...names(['B', 'C']) }]),
      q(1, 3, [{ value: ExactNumber.from('0'), ...names(['C']) }, { value: ExactNumber.from('9007199254740992'), ...names(['A']) }, { value: ExactNumber.from('9007199254740993'), ...names(['B']) }]),
      q(2, 3, ['甲', '乙', '零票'].map((v, i) => ({ optionId: option(form, 2, i), label: `固定單選${v}`, value: `business-${i}`, ...names(i === 0 ? ['A', 'B'] : i === 1 ? ['C'] : []) }))),
      q(3, 3, ['甲', '乙', '零票'].map((v, i) => ({ optionId: option(form, 3, i), label: `固定多選${v}`, value: `business-${i}`, ...names(i === 0 ? ['A', 'B'] : i === 1 ? ['A', 'B', 'C'] : []) }))),
      q(4, 3, [0, 1, 2].map(value => ({ value, ...names(value === 0 ? ['A'] : value === 2 ? ['B', 'C'] : []) }))),
      q(5, 3, [{ value: ExactNumber.from('0'), ...names(['C']) }, { value: ExactNumber.from('0.12345678901234567890123456789'), ...names(['A', 'B']) }]),
      q(6, 3, [{ value: ExactNumber.from('1'), ...names(['A', 'B', 'C']) }]), q(7, 0, []),
    ])
    await step('L02 fixed 4 historical / 3 people, whole latest omission / MC sum / exact numeric groups', async () => {
      await statisticsPage('guest', form, 'fixed independent oracle before rename', expectedBody()); await independent('A', form, 'independent GET before rename', expectedBody())
      await expect(pages.guest.getByRole('region', { name: '統計根資訊' })).toContainText('2030-12-31 18:30:00')
      await expect(pages.guest.locator('[data-statistics-question]').first().locator('[data-statistics-respondent]')).toHaveText(['F9 合成同名', 'F9 合成同名'])
    })
    await step('L02 normal Profile/Visibility writes followed by fresh independent statistics and UI readback', async () => {
      for (const [alias, name] of [['A', 'F9 目前建立者'], ['B', 'F9 目前填答者']] as const) { expect((await call(alias, '/users/me', 'PATCH', { displayName: name })).status).toBe(200); account(alias).displayName = name }
      expect((await call('A', `/forms/${form.id}/result-visibility`, 'PATCH', { resultVisibility: 'respondents' })).status).toBe(200)
      const privateExpected = { ...expectedBody(), resultVisibility: 'respondents' as const }; await independent('B', form, 'new policy and current names', privateExpected)
      await statisticsPage('B', form, 'fresh private UI reflects current names', privateExpected)
      expect((await call('A', `/forms/${form.id}/result-visibility`, 'PATCH', { resultVisibility: 'public' })).status).toBe(200)
      await independent('guest', form, 'restored public current names', expectedBody()); await statisticsPage('guest', form, 'public current-name UI readback', expectedBody())
      await pages.guest.screenshot({ path: `${dir}/${runId}-live-current-names.png`, fullPage: true })
    })
  })
  test('F9-L03 zero success and true Draft/Published/deadline/not-found/UUID priority', async () => {
    test.setTimeout(180_000)
    for (const identity of ['anonymous', 'identified'] as const) {
      const form = await create(`L03 zero ${identity}`, identity, 'public'); await close(form)
      await step(`L03 zero ${identity} complete roots/choice/rating/empty lists`, () => statisticsPage('guest', form, 'zero fixed oracle', matrixExpectation(form, identity === 'identified', true)))
    }
    const draft = await create('L03 retained Draft', 'anonymous', 'public', { publish: false })
    const published = await create('L03 retained Published', 'anonymous', 'public')
    const deadline = new Date(Date.now() + 8_000).toISOString(), timed = await create('L03 natural expired Published', 'anonymous', 'owner_only', { deadline })
    await expect.poll(() => Date.now(), { timeout: 15_000 }).toBeGreaterThanOrEqual(Date.parse(deadline))
    for (const [label, form] of [['Draft', draft], ['Published', published], ['expired Published', timed]] as const) for (const alias of ['A', 'C', 'guest'] as const) {
      const status = label === 'Draft' ? alias === 'A' ? 409 : 404 : alias === 'guest' ? 404 : 409
      await step(`L03 ${label}/${alias} ${status}`, () => statisticsPage(alias, form, 'lifecycle priority', undefined, status, status === 409 ? 'FORM_STATISTICS_NOT_AVAILABLE' : 'FORM_NOT_FOUND'))
    }
    await step('L03 natural deadline retains Published and saved deadline', async () => { const r = await call('A', `/forms/${timed.id}`); expect(r.status).toBe(200); const dto = decodeFormDetail(parseExactJson(r.body)); expect(dto.status).toBe('published'); expect(parseInstant(dto.submissionDeadlineAt!).ticks).toBe(parseInstant(deadline).ticks) })
    for (const [label, id, status, code] of [['retained deleted UUID from F7', 'a167ebf3-025e-4c3f-9264-aef082818952', 404, 'FORM_NOT_FOUND'], ['random absent UUID', randomUUID(), 404, 'FORM_NOT_FOUND'], ['invalid UUID before Auth', 'not-a-uuid', 400, 'VALIDATION_ERROR']] as const) {
      await step(`L03 ${label}`, () => statisticsPage('guest', { id } as FormDetailDto, label, undefined, status, code))
    }
    for (const id of ['invalid Cookie', 'expired Cookie', 'disabled Cookie', 'disabled Creator', 'real Server fault', 'real timeout']) cases.push({ id: `L04 ${id}`, source: 'real API', result: 'BLOCKED', detail: '未提供已同意受控前置；不偽造 Token、不改 SQL／時鐘／Server。fixture 另列。' })
    await Promise.all(pending)
    expect(wire.every(w => w.origin === 'http://localhost:3000' && w.credentials === 'true')).toBe(true)
    expect(errors).toEqual([]); expect(violations).toEqual([]); expect(verifyNetworkDiagnostics(expected, actual, diagnostics)).toEqual([])
    stage = 'L01-L03 PASS; L04 BLOCKED'; await persist()
  })
})
