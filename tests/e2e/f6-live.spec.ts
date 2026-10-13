import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { decodeFormDetail } from '../../app/domain/api/decoders'
import { parseExactJson, stringifyExactJson } from '../../app/utils/exact-json'
import { ExactNumber } from '../../app/utils/exact-number'
import { parseInstant } from '../../app/utils/datetime'
import type { FormDetailDto } from '../../app/domain/api/form'
const api = 'http://localhost:5000/api/v1'
const precise = '9007199254740993.1234567890123456789'
const field = (page: Page, name: string) => page.locator(`[data-editor-field="${name}"]`)
test('F6-L01..L04 real Create, delta, independent readback, exact config and deadline; retained synthetic data', async ({ page, context, browserName }) => {
  test.setTimeout(180_000)
  const runId = `f6-${Date.now()}`, email = `${runId}@example.test`, password = randomBytes(24).toString('hex')
  const requests: { method: string; path: string; body?: string }[] = [], responses: { method: string; path: string; status: number; origin?: string; credentials?: string }[] = []
  const reads: { label: string; status: number; dto: FormDetailDto }[] = [], ids: string[] = [], pageErrors: string[] = [], diagnostics: { text: string; url: string }[] = []
  let completed = false, stage = 'registration'
  const backendRuntime = await readFile('output/f6/backend-runtime.json', 'utf8').then(text => JSON.parse(text) as Record<string, string>).catch(() => ({ productVersion: 'UNCONFIRMED' }))
  await mkdir('output/playwright/f6', { recursive: true })
  const persist = () => writeFile(`output/playwright/f6/live-${runId}-sanitized.json`, stringifyExactJson({ runId, browserName, binary: context.browser()?.version(), completed, stage, api: 'real, no interception', requests, responses, reads, retainedFormIds: ids, syntheticAccountRetained: true, pageErrors, diagnostics, backendRuntime }))
  page.on('request', req => {
    if (!req.url().startsWith(api)) return
    const url = new URL(req.url()), path = url.pathname
    // Only Form payloads. Never record auth bodies, Cookie, headers, password or token.
    requests.push({ method: req.method(), path, ...(/^\/api\/v1\/forms(?:\/[^/]+)?$/.test(path) && req.postData() ? { body: req.postData()! } : {}) })
  })
  page.on('response', res => { if (res.url().startsWith(api)) { const h = res.headers(); responses.push({ method: res.request().method(), path: new URL(res.url()).pathname, status: res.status(), origin: h['access-control-allow-origin'], credentials: h['access-control-allow-credentials'] }) } })
  page.on('pageerror', e => pageErrors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' || m.text().includes('[Vue warn]')) diagnostics.push({ text: m.text(), url: m.location().url }) })
  async function get(id: string, label: string) {
    // Independent credentialed GET, not the save response or intercepted fixture.
    const result = await page.evaluate(async url => { const r = await fetch(url, { credentials: 'include' }); return { status: r.status, body: await r.text() } }, `${api}/forms/${id}`)
    expect(result.status).toBe(200); const dto = decodeFormDetail(parseExactJson(result.body)); reads.push({ label, status: result.status, dto }); await persist(); return dto
  }
  async function submit(saved: boolean) {
    const wire = page.waitForResponse(r => r.url().startsWith(`${api}/forms`) && r.request().method() === (saved ? 'PATCH' : 'POST'))
    await page.getByRole('button', { name: saved ? '保存' : '保存草稿', exact: true }).click()
    const res = await wire; const status = res.status(), raw = await res.text()
    // Keep unexpected response evidence before asserting. Form bodies contain only synthetic data.
    if (status !== (saved ? 200 : 201)) await writeFile(`output/playwright/f6/live-${runId}-${requests.length}-failure.json`, stringifyExactJson({ stage, status, body: raw }))
    expect(status).toBe(saved ? 200 : 201); const dto = decodeFormDetail(parseExactJson(raw)); if (!ids.includes(dto.id)) ids.push(dto.id)
    await expect(page).toHaveURL(`http://localhost:3000/forms/${dto.id}/edit`); await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled(); await persist(); return dto
  }
  try {
    await page.goto('/forms/new'); await expect(page).toHaveURL(/\/login\?redirect=/)
    await page.getByRole('tab', { name: '註冊', exact: true }).click(); await page.getByRole('textbox', { name: '姓名' }).fill(`F6 ${runId}`); await page.getByRole('textbox', { name: 'Email' }).fill(email); await page.getByLabel('密碼', { exact: true }).fill(password)
    const registration = page.waitForResponse(r => r.url().endsWith('/auth/register')); await page.getByRole('button', { name: '註冊', exact: true }).click(); expect((await registration).status()).toBe(201)
    await expect(page.getByRole('tab', { name: '登入', exact: true })).toHaveAttribute('aria-selected', 'true'); await page.getByLabel('密碼', { exact: true }).fill(password)
    const login = page.waitForResponse(r => r.url().endsWith('/auth/login')); await page.getByRole('button', { name: '登入', exact: true }).click(); expect((await login).status()).toBe(200)
    await expect(page).toHaveURL(/\/forms\/new$/); expect((await context.cookies()).some(c => c.name === 'access_token' && c.httpOnly)).toBe(true)
    expect(requests.filter(r => r.path.startsWith('/api/v1/forms'))).toHaveLength(0)
    stage = 'L01 minimal Create'; await field(page, 'form.title').fill(`${runId} 最小草稿`); await page.getByLabel('結果可見範圍（必選）').selectOption('owner_only')
    const minimal = await submit(false); expect(minimal.questions).toEqual([]); expect((await get(minimal.id, 'minimal independent GET')).title).toBe(`${runId} 最小草稿`)
    const meBefore = requests.filter(r => r.path.endsWith('/users/me')).length
    await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '我的表單', exact: true }).click(); await page.getByRole('link', { name: `${runId} 最小草稿`, exact: true }).click(); await expect(field(page, 'form.title')).toHaveValue(`${runId} 最小草稿`); expect(requests.filter(r => r.path.endsWith('/users/me'))).toHaveLength(meBefore)
    await page.reload(); await expect(field(page, 'form.title')).toHaveValue(`${runId} 最小草稿`); expect(requests.filter(r => r.path.endsWith('/users/me'))).toHaveLength(meBefore + 1)
    stage = 'L02 five-type Create'; await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '建立表單', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/forms/new'); await field(page, 'form.title').fill(`${runId} 五題型`); await field(page, 'form.description').fill('第一行\n第二行'); await page.getByLabel('結果可見範圍（必選）').selectOption('respondents')
    const types = ['text', 'number', 'single_choice', 'multiple_choice', 'rating']
    for (const [index, type] of types.entries()) { await page.getByRole('button', { name: '新增題目' }).click(); await page.getByLabel(`題型 ${index + 1}`, { exact: true }).selectOption(type); await page.getByLabel(`題目 ${index + 1} 標題`, { exact: true }).fill(`${type} 合成題目`) }
    const numberCard = page.locator('[data-question-key]').nth(1); await numberCard.getByLabel('最小值（未設定可留空）').fill('0'); await numberCard.getByLabel('最大值（未設定可留空）').fill(precise)
    let dto = await submit(false); const fullId = dto.id; dto = await get(fullId, 'five-type Create independent GET')
    expect(dto.questions.map(q => q.type)).toEqual(types); expect(dto.questions.map(q => q.sortOrder)).toEqual([0, 1, 2, 3, 4]); expect(dto.description).toBe('第一行\n第二行')
    const nq = dto.questions[1]!; expect(nq.type).toBe('number'); if (nq.type === 'number') expect(nq.config.max!.equals(ExactNumber.from(precise))).toBe(true)
    const oldChoice = dto.questions[2]!, oldOptionValues = oldChoice.options.map(o => o.value)
    await page.locator(`[data-question-key="${oldChoice.id}"]`).getByRole('button', { name: '增加選項' }).click(); await page.locator(`[data-question-key="${oldChoice.id}"]`).getByLabel('選項 3', { exact: true }).fill('新選項')
    await page.getByRole('button', { name: '新增題目' }).click(); await page.getByLabel('題目 6 標題', { exact: true }).fill('新增第六題'); dto = await submit(true); dto = await get(fullId, 'new Question/Option PATCH independent GET')
    expect(dto.questions).toHaveLength(6); expect(dto.questions[2]!.options).toHaveLength(3); expect(dto.questions[2]!.options.slice(0, 2).map(o => o.value)).toEqual(oldOptionValues)
    const added = dto.questions[5]!, addedOption = dto.questions[2]!.options[2]!
    await field(page, `${addedOption.id}.label`).fill('正式 ID 更新選項'); await page.getByRole('button', { name: '刪除題目 6', exact: true }).click(); await field(page, 'form.description').fill(''); dto = await submit(true); dto = await get(fullId, 'update/delete second delta independent GET')
    expect(dto.questions).toHaveLength(5); expect(dto.questions.some(q => q.id === added.id)).toBe(false); expect(dto.description).toBeNull(); expect(dto.questions[2]!.options[2]!.label).toBe('正式 ID 更新選項')
    const latestDelta = JSON.parse(requests.filter(r => r.method === 'PATCH').at(-1)!.body!) as { questions: { id: string; options?: { id: string }[] }[] }
    expect(latestDelta.questions).toContainEqual({ id: added.id }); expect(latestDelta.questions.some(q => q.options?.some(o => o.id === addedOption.id))).toBe(true)
    stage = 'L03 Choice roundtrip and complete Number replacement'; await field(page, `${oldChoice.id}.type`).selectOption('text'); await page.getByRole('button', { name: '確認切換' }).click(); await field(page, `${oldChoice.id}.type`).selectOption('single_choice')
    await field(page, `${nq.id}.config.min`).fill(''); await field(page, `${nq.id}.config.max`).fill('9.0071992547409931234567890123456789e15'); dto = await submit(true); dto = await get(fullId, 'Choice roundtrip and Number replacement independent GET')
    expect(dto.questions[2]!.options.map(o => o.id).some(id => oldChoice.options.some(o => o.id === id))).toBe(false); expect(dto.questions[2]!.options.map(o => o.value).some(v => oldOptionValues.includes(v))).toBe(false)
    const numberAfter = dto.questions[1]!; if (numberAfter.type !== 'number') throw new Error('Expected number'); expect(numberAfter.config.min).toBeUndefined(); expect(numberAfter.config.max!.equals(ExactNumber.from(precise))).toBe(true)
    expect(requests.filter(r => r.method === 'PATCH').at(-1)!.body).toContain('9.0071992547409931234567890123456789e15')
    stage = 'L04 microsecond deadline preparation through ordinary API'
    const micro = '2026-12-31T10:30:00.123456Z'
    const prepared = await page.evaluate(async ({ url, body }) => { const r = await fetch(url, { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body }); return { status: r.status, body: await r.text() } }, { url: `${api}/forms/${fullId}`, body: stringifyExactJson({ submissionDeadlineAt: micro }) })
    expect(prepared.status).toBe(200); dto = await get(fullId, 'microsecond preparation GET'); expect(parseInstant(dto.submissionDeadlineAt!).ticks).toBe(parseInstant(micro).ticks)
    await page.getByRole('button', { name: '重新載入表單' }).click(); await expect(field(page, 'form.submissionDeadlineAt')).toHaveValue('2026-12-31 18:30:00')
    await field(page, 'form.title').fill(`${runId} 精度保存`); dto = await submit(true); const titleOnly = requests.filter(r => r.method === 'PATCH').at(-1)!.body!
    expect(JSON.parse(titleOnly)).toEqual({ title: `${runId} 精度保存` }); dto = await get(fullId, 'title only keeps microsecond deadline GET'); expect(parseInstant(dto.submissionDeadlineAt!).ticks).toBe(parseInstant(micro).ticks)
    await field(page, 'form.submissionDeadlineAt').fill('2027-01-01 08:09:10'); await submit(true); dto = await get(fullId, 'changed Taipei deadline GET'); expect(parseInstant(dto.submissionDeadlineAt!).ticks).toBe(parseInstant('2027-01-01T00:09:10Z').ticks)
    await field(page, 'form.submissionDeadlineAt').fill(''); await submit(true); dto = await get(fullId, 'cleared deadline GET'); expect(dto.submissionDeadlineAt).toBeNull()
    stage = 'real Auth lapse with dirty cancel'; await field(page, 'form.title').fill(`${runId} 保留本地`); await context.clearCookies()
    const lapsed = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().endsWith(`/forms/${fullId}`)); await page.getByRole('button', { name: '保存', exact: true }).click(); const res = await lapsed; expect(res.status()).toBe(401); expect((await res.json() as { error: { code: string } }).error.code).toBe('AUTH_REQUIRED')
    await expect(page.getByRole('dialog', { name: '操作訊息' })).toBeVisible(); page.on('dialog', d => d.dismiss()); await page.getByRole('dialog', { name: '操作訊息' }).getByRole('button', { name: '關閉', exact: true }).filter({ hasText: '關閉' }).click(); await expect(field(page, 'form.title')).toHaveValue(`${runId} 保留本地`); await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
    expect(pageErrors).toEqual([])
    expect(responses.find(r => r.path.endsWith('/users/me'))?.status).toBe(401) // Expected anonymous bootstrap before registration/login.
    expect(diagnostics.filter(m => !(/^Failed to load resource: the server responded with a status of 401 \(Unauthorized\)$/.test(m.text)
      && [`${api}/users/me`, `${api}/forms/${fullId}`].includes(m.url)
      && responses.some(r => r.status === 401 && api.replace('/api/v1', '') + r.path === m.url)))).toEqual([])
    expect(responses.every(r => r.origin === 'http://localhost:3000' && r.credentials === 'true')).toBe(true); completed = true; stage = 'PASS'; await persist()
  } finally { await persist() }
})
