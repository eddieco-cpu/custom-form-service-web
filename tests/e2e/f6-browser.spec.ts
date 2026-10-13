import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'
import { form, uuid, Q, O } from '../fixtures/f5/payloads'
import { stringifyExactJson, parseExactJson } from '../../app/utils/exact-json'
import { decodeFormDetail } from '../../app/domain/api/decoders'
import type { FormDetailDto } from '../../app/domain/api/form'
const owner = { id: uuid(51), email: 'f6-fixture@example.test', displayName: '合成建立者', avatarUrl: null }
const other = { ...owner, id: uuid(52), displayName: '另一個合成帳號' }
const headers = { 'access-control-allow-origin': 'http://localhost:3000', 'access-control-allow-credentials': 'true' }
type Reply = (route: Route) => Promise<void>
const error = (code: string, path?: string) => ({ error: { code, message: '合成錯誤', ...(path ? { details: [{ path, code: 'INVALID_VALUE', message: '合成欄位錯誤' }, { path: 'unknown.path', code: 'UNKNOWN', message: '保留未知明細' }] } : {}) } })
const reply = (route: Route, value: unknown, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: stringifyExactJson(value) })
function gate() { let release!: () => void; const promise = new Promise<void>(r => { release = r }); return { promise, release } }
async function mock(page: Page, initial = form()) {
  const state = { user: owner, dto: initial, me: 0, requests: [] as { method: string; path: string; body: string | null }[], unexpected: [] as string[], errors: [] as string[], console: [] as { text: string; url: string }[], http: new Map<string, Set<number>>(), failed: new Set<string>(), get: undefined as Reply | undefined, write: undefined as Reply | undefined, bootstrap: undefined as Reply | undefined }
  page.on('pageerror', e => state.errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' || m.text().includes('[Vue warn]')) state.console.push({ text: m.text(), url: m.location().url }) })
  page.on('response', r => { if (r.status() >= 400) state.http.set(r.url(), new Set([...(state.http.get(r.url()) ?? []), r.status()])) })
  page.on('requestfailed', r => state.failed.add(r.url()))
  await page.route('http://localhost:5000/api/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method()
    if (method === 'OPTIONS') { await route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST,PATCH', 'access-control-allow-headers': 'content-type' } }); return }
    state.requests.push({ method, path: url.pathname, body: req.postData() })
    if (url.pathname.endsWith('/users/me') && method === 'GET') { state.me++; if (state.bootstrap) await state.bootstrap(route); else await reply(route, state.user); return }
    if (url.pathname === '/api/v1/forms' && method === 'GET') { await reply(route, { items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }); return }
    if (/\/forms\/[^/]+$/.test(url.pathname) && method === 'GET') { if (state.get) await state.get(route); else await reply(route, state.dto); return }
    if ((url.pathname === '/api/v1/forms' && method === 'POST') || (/\/forms\/[^/]+$/.test(url.pathname) && method === 'PATCH')) {
      if (state.write) { await state.write(route); return }
      const body = parseExactJson(req.postData()!) as Record<string, unknown>
      if (method === 'POST') {
        const qs = body.questions as Record<string, unknown>[]
        state.dto = decodeFormDetail({ ...state.dto, ...body, questions: qs.map((q, i) => ({ ...q, id: uuid(100 + i), options: (q.options as Record<string, unknown>[]).map((o, j) => ({ ...o, id: uuid(200 + i * 10 + j) })) })) })
      }
      else state.dto = { ...state.dto, ...body, questions: state.dto.questions } as FormDetailDto
      await reply(route, state.dto, method === 'POST' ? 201 : 200); return
    }
    state.unexpected.push(`${method} ${url.pathname}`); await reply(route, error('INTERNAL_SERVER_ERROR'), 500)
  })
  return state
}
function clean(state: Awaited<ReturnType<typeof mock>>) {
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([])
  expect(state.console.filter(m => {
    const match = /^Failed to load resource: the server responded with a status of (\d+) \(.*\)$/.exec(m.text)
    return !(match && state.http.get(m.url)?.has(Number(match[1]))) && !(m.text === 'Failed to load resource: net::ERR_FAILED' && state.failed.has(m.url))
  })).toEqual([])
}
const edit = `/forms/${uuid(50)}/edit`
const field = (page: Page, name: string) => page.locator('[data-editor-field]').filter({ has: undefined }).and(page.locator(`[data-editor-field="${name}"]`))
const save = (page: Page) => page.getByRole('button', { name: '保存', exact: true })
const preview = (page: Page) => page.getByRole('dialog', { name: '預覽', exact: true })
async function closeError(page: Page) { await page.getByRole('dialog', { name: '操作訊息' }).getByRole('button', { name: '關閉', exact: true }).filter({ hasText: '關閉' }).click() }
async function readyNew(page: Page) { await page.getByLabel('表單標題', { exact: true }).fill('🧪 合成表單'); await page.getByLabel('結果可見範圍（必選）', { exact: true }).selectOption('public') }
test('F6-B01/B04 local new, validation, pending freeze, server IDs, clean no-op and second delta', async ({ page }) => {
  const state = await mock(page, form([])); await page.goto('/forms/new')
  await expect(page.getByLabel('填答次數')).toHaveValue('single'); await expect(page.getByLabel('填答身分')).toHaveValue('anonymous')
  expect(state.requests.map(r => r.path)).toEqual(['/api/v1/users/me'])
  await page.getByRole('button', { name: '保存草稿' }).click(); await expect(field(page, 'form.title')).toBeFocused(); await expect(page.getByRole('list', { name: '欄位錯誤摘要' })).toBeVisible(); expect(state.requests).toHaveLength(1)
  await readyNew(page); await page.getByRole('button', { name: '新增題目' }).click(); await page.getByLabel('題目 1 標題', { exact: true }).fill('新題')
  const pending = gate(); state.write = async route => { await pending.promise; const request = JSON.parse(route.request().postData()!) as { questions: { type: 'text'; title: string }[] }; state.dto = { ...form([]), title: '🧪 合成表單', questions: [{ ...form().questions[0]!, ...request.questions[0]!, id: uuid(100), sortOrder: 0, type: 'text', config: {} }] }; await reply(route, state.dto, 201) }
  await page.getByRole('button', { name: '保存草稿' }).click(); await expect(page.getByLabel('表單標題', { exact: true })).toHaveAttribute('readonly', '')
  await expect(page.getByRole('button', { name: '新增題目' })).toBeDisabled(); pending.release()
  await expect(page).toHaveURL(`http://localhost:3000${edit}`); await expect(save(page)).toBeDisabled()
  expect(state.requests.filter(r => r.method === 'POST')).toHaveLength(1); expect(state.me).toBe(1)
  await page.getByLabel('題目 1 標題', { exact: true }).fill('正式 ID 更新'); state.write = undefined
  await save(page).click(); await expect(save(page)).toBeDisabled()
  const body = JSON.parse(state.requests.find(r => r.method === 'PATCH')!.body!) as { questions: { id: string }[] }
  expect(body.questions[0]!.id).toBe(uuid(100)); expect(Object.keys(body)).toEqual(['questions']); clean(state)
})
test('F6-B02/B03 five types, Choice confirmation/cancel, stable values, keyboard moves and drag', async ({ page }, info) => {
  const state = await mock(page); await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(edit)
  await expect(save(page)).toBeDisabled(); await expect(page.getByText('此設定目前僅供檢視')).toBeVisible(); await expect(page.getByText(/F7 接入/)).toHaveCount(0)
  await field(page, `${Q[2]}.type`).selectOption('text'); await page.getByRole('button', { name: '取消', exact: true }).click(); await expect(field(page, `${Q[2]}.type`)).toHaveValue('single_choice')
  await expect(field(page, `${O[0]}.label`)).toHaveValue('既有甲'); await field(page, `${Q[2]}.type`).selectOption('multiple_choice'); await expect(field(page, `${O[0]}.label`)).toHaveValue('既有甲')
  await field(page, `${Q[2]}.type`).selectOption('text'); await page.getByRole('button', { name: '確認切換' }).click(); await field(page, `${Q[2]}.type`).selectOption('single_choice')
  await expect(page.locator(`[data-question-key="${Q[2]}"]`).getByLabel('選項 1', { exact: true })).toHaveValue('選項 1')
  const values = page.locator('[data-editor-field$=".value"]'); await expect(values).toHaveCount(0)
  await page.getByRole('button', { name: '題目 2 上移', exact: true }).focus(); await page.keyboard.press('Enter')
  await expect(page.locator('[data-question-key]').first()).toHaveAttribute('data-question-key', Q[1]!)
  await expect(page.getByRole('button', { name: '題目 1 下移', exact: true })).toBeFocused(); await page.keyboard.press('Enter'); await expect(page.locator('[data-question-key]').first()).toHaveAttribute('data-question-key', Q[0]!)
  await page.setViewportSize({ width: 1440, height: 1800 }); await page.getByRole('button', { name: '拖曳題目 1', exact: true }).scrollIntoViewIfNeeded()
  const from = await page.getByRole('button', { name: '拖曳題目 1', exact: true }).boundingBox(), to = await page.getByRole('button', { name: '拖曳題目 2', exact: true }).boundingBox()
  expect(from && to).toBeTruthy(); await page.mouse.move(from!.x + 10, from!.y + 10); await page.mouse.down(); await page.mouse.move(to!.x + 10, to!.y + 30, { steps: 15 }); await page.mouse.up()
  await expect(page.locator('[data-question-key]').first()).toHaveAttribute('data-question-key', Q[1]!)
  await page.setViewportSize({ width: 1440, height: 900 }); await page.screenshot({ path: info.outputPath('editor-desktop.png') }); clean(state)
})
test('F6-B05 sparse Delta error map locates changed option after dialog, unknown detail retained', async ({ page }) => {
  const state = await mock(page); state.write = route => reply(route, error('VALIDATION_ERROR', 'questions[0].options[0].label'), 400)
  await page.goto(edit); await field(page, `${O[1]}.label`).fill('第三題第二選項'); await save(page).click()
  await expect(page.getByRole('dialog')).toContainText('保留未知明細'); await closeError(page)
  await expect(field(page, `${O[1]}.label`)).toBeFocused(); expect(JSON.parse(state.requests.at(-1)!.body!).questions[0].options[0]).toEqual({ id: O[1], label: '第三題第二選項' }); clean(state)
})
test('F6-B06 dirty cancel/confirm, history, reload beforeunload and same-component id guard', async ({ page, context }) => {
  const state = await mock(page, form([])); await page.goto('/'); await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '建立表單' }).click(); await readyNew(page)
  const dialogs: string[] = []; page.on('dialog', async d => { dialogs.push(d.type()); await d.dismiss() })
  await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '我的表單', exact: true }).click(); await expect(page).toHaveURL(/\/forms\/new$/)
  await page.goBack(); await expect(page).toHaveURL(/\/forms\/new$/)
  // Dismissing beforeunload cancels the navigation; wait for the dialog, not a load that cannot finish.
  const unload = page.waitForEvent('dialog', d => d.type() === 'beforeunload'); void page.reload().catch(() => {}); await unload
  await expect(page.getByLabel('表單標題', { exact: true })).toHaveValue('🧪 合成表單'); expect(dialogs).toContain('beforeunload')
  page.removeAllListeners('dialog'); page.on('dialog', d => d.accept()); await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '我的表單', exact: true }).click(); await expect(page).toHaveURL(/\/forms$/)
  await page.goBack(); await expect(page).toHaveURL(/\/forms\/new$/); await expect(page.getByLabel('表單標題', { exact: true })).toHaveValue('')
  await page.goto(edit); await field(page, 'form.title').fill('保留內容')
  page.removeAllListeners('dialog'); page.on('dialog', d => d.dismiss()); await page.getByRole('button', { name: '使用者選單' }).click(); await page.getByRole('button', { name: '登出', exact: true }).click(); expect(state.requests.filter(r => r.path.endsWith('/auth/logout'))).toHaveLength(0)
  expect((await context.cookies()).length).toBe(0); clean(state)
})
for (const code of ['AUTH_REQUIRED', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED']) for (const saved of [false, true]) test(`F6-B07 ${code} cancel keeps content but fresh session/Owner required (${saved ? 'edit' : 'new'})`, async ({ page }) => {
  const state = await mock(page); await page.goto(saved ? edit : '/forms/new'); if (saved) await field(page, 'form.title').fill('保留輸入'); else await readyNew(page)
  state.write = route => reply(route, error(code), 401)
  await page.getByRole('button', { name: saved ? '保存' : '保存草稿', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeVisible()
  await page.mouse.click(1, 1); await expect(page.getByRole('dialog')).toBeVisible()
  page.on('dialog', d => d.dismiss()); if (code === 'AUTH_TOKEN_INVALID') await page.getByRole('dialog').getByLabel('關閉', { exact: true }).click(); else await closeError(page); await expect(page).toHaveURL(`http://localhost:3000${saved ? edit : '/forms/new'}`)
  await expect(page.getByRole('button', { name: saved ? '保存' : '保存草稿', exact: true })).toBeDisabled(); await expect(field(page, 'form.title')).toHaveAttribute('readonly', '')
  state.user = other
  if (saved) state.get = route => reply(route, error('FORM_NOT_FOUND'), 404) // Contract hides another Owner's Draft.
  await page.getByRole('button', { name: '核對登入與保存資格' }).click()
  if (saved) { // Cancel discard: no GET/me; then authorize discard but denied resource still cannot write.
    expect(state.me).toBe(1); page.removeAllListeners('dialog'); page.on('dialog', d => d.accept()); await page.getByRole('button', { name: '核對登入與保存資格' }).click(); await expect(page.getByRole('dialog')).toBeVisible(); page.removeAllListeners('dialog'); page.on('dialog', d => d.dismiss()); await closeError(page); await expect(save(page)).toBeDisabled(); await expect(field(page, 'form.title')).toHaveValue('保留輸入')
    state.user = owner; state.get = undefined; page.removeAllListeners('dialog'); page.on('dialog', d => d.accept()); await page.getByRole('button', { name: '核對登入與保存資格' }).click(); await expect(field(page, 'form.title')).not.toHaveAttribute('readonly', '')
  }
  else { await expect(page.getByRole('button', { name: '核對登入與保存資格' })).toBeEnabled(); await expect(page.getByRole('button', { name: '保存草稿' })).toBeDisabled(); page.removeAllListeners('dialog'); page.on('dialog', d => d.accept()); await page.getByRole('button', { name: '核對登入與保存資格' }).click(); await expect(page.getByRole('button', { name: '保存草稿' })).toBeEnabled(); await expect(field(page, 'form.title')).toHaveValue('🧪 合成表單') }
  expect(state.requests.filter(r => ['POST', 'PATCH'].includes(r.method))).toHaveLength(1); clean(state)
})
test('F6-B08 PATCH unknown stays locked on revert/cancel/failed read; successful current adoption unlocks', async ({ page }) => {
  const state = await mock(page); state.write = route => route.abort('failed'); await page.goto(edit); await field(page, 'form.title').fill('未知保存'); await save(page).click()
  await closeError(page); await field(page, 'form.title').fill(form().title); await expect(save(page)).toBeDisabled()
  page.on('dialog', d => d.dismiss()); const before = state.requests.length; await page.getByRole('button', { name: '重新載入表單' }).click(); expect(state.requests).toHaveLength(before)
  page.removeAllListeners('dialog'); page.on('dialog', d => d.accept()); state.get = route => reply(route, error('INTERNAL_SERVER_ERROR'), 500)
  await page.getByRole('button', { name: '重新載入表單' }).click(); await closeError(page); await expect(save(page)).toBeDisabled()
  state.get = undefined; await page.getByRole('button', { name: '重新載入表單' }).click(); await expect(page.getByText('保存結果不明', { exact: false })).toHaveCount(0)
  await field(page, 'form.title').fill('核對後修改'); await expect(save(page)).toBeEnabled(); clean(state)
})
test('F6-B08 Create unknown retains input and every retry prompts duplicate risk', async ({ page }) => {
  const state = await mock(page); state.write = route => reply(route, {}, 201); await page.goto('/forms/new'); await readyNew(page); await page.getByRole('button', { name: '保存草稿' }).click(); await closeError(page)
  const prompts: string[] = []; page.on('dialog', d => { prompts.push(d.message()); return d.dismiss() })
  await page.getByRole('button', { name: '保存草稿' }).click(); await page.getByRole('button', { name: '保存草稿' }).click()
  expect(prompts).toHaveLength(2); expect(prompts.every(p => p.includes('重複表單'))).toBe(true); expect(state.requests.filter(r => r.method === 'POST')).toHaveLength(1); await expect(page.getByRole('link', { name: '前往我的表單核對' })).toBeVisible(); clean(state)
})
test('F6-B09 conflict candidate retained, explicit reload replaces URL; late response ignored', async ({ page }) => {
  const state = await mock(page); state.write = route => reply(route, error('FORM_NOT_EDITABLE'), 409); state.get = route => reply(route, state.dto)
  await page.goto(edit); await field(page, 'form.title').fill('本地變更'); state.dto = { ...form(), status: 'published' }; await save(page).click(); await expect(page.getByRole('dialog')).toBeVisible(); await closeError(page)
  await expect(field(page, 'form.title')).toHaveValue('本地變更'); await expect(save(page)).toBeDisabled(); page.on('dialog', d => d.accept()); await page.getByRole('button', { name: '重新載入表單' }).click(); await expect(page).toHaveURL(`http://localhost:3000/forms/${uuid(50)}`)
  state.dto = form(); await page.goto(edit); await field(page, 'form.title').fill('晚回'); const pending = gate(); state.write = async route => { await pending.promise; try { await reply(route, state.dto) } catch { /* Closed page request is expected. */ } }
  await save(page).click(); await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '我的表單', exact: true }).click(); await expect(page).toHaveURL(/\/forms$/); pending.release(); await expect(page.getByText('已保存', { exact: true })).toHaveCount(0); clean(state)
})
test('F6-B10/B12 Preview isolation/reset/keyboard focus, desktop and mobile layout, exact raw Number', async ({ page }, info) => {
  const state = await mock(page); await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(edit); await page.getByRole('button', { name: '預覽', exact: true }).click()
  let dialog = preview(page); await expect(dialog).toBeVisible(); await expect.poll(() => dialog.evaluate(el => el.getAnimations().length)).toBe(0); const rect = await dialog.boundingBox(); expect(Math.abs(rect!.width - 1296)).toBeLessThan(3); expect(Math.abs(rect!.height - 810)).toBeLessThan(3)
  await expect.poll(() => page.evaluate(() => [getComputedStyle(document.body).overflow, getComputedStyle(document.documentElement).overflow].includes('hidden'))).toBe(true); await page.keyboard.press('Escape'); await expect(dialog).toBeVisible()
  await dialog.locator('input[type="text"]').nth(1).fill('9007199254740993.1234567890123456789'); await expect(dialog.locator('input[type="text"]').nth(1)).toHaveValue('9007199254740993.1234567890123456789')
  await dialog.getByRole('button', { name: '關閉預覽' }).focus(); await page.keyboard.press('Tab'); expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
  await dialog.locator('[data-preview-body]').evaluate(el => { el.parentElement!.scrollTop = 300 }); expect(await dialog.locator('[data-preview-body]').evaluate(el => el.parentElement!.scrollTop)).toBeGreaterThan(0)
  await dialog.locator('input[type="text"]').first().fill('試填隔離'); await dialog.getByRole('button', { name: '關閉預覽' }).click(); await expect(page.getByRole('button', { name: '預覽', exact: true })).toBeFocused(); await expect(save(page)).toBeDisabled()
  await page.getByRole('button', { name: '預覽', exact: true }).click(); await expect(preview(page).locator('input[type="text"]').first()).toHaveValue(''); expect(await preview(page).locator('[data-preview-body]').evaluate(el => el.parentElement!.scrollTop)).toBe(0); await expect.poll(() => preview(page).evaluate(el => el.getAnimations().length)).toBe(0); await preview(page).getByLabel('關閉', { exact: true }).click(); await expect(preview(page)).toHaveCount(0)
  await page.getByRole('button', { name: '預覽', exact: true }).click(); await expect.poll(() => preview(page).evaluate(el => el.getAnimations().length)).toBe(0); await page.mouse.click(1, 1); await expect(preview(page)).toHaveCount(0)
  await field(page, 'form.title').fill('完整長標題'.repeat(80)); await field(page, `${O[0]}.label`).fill('長選項'.repeat(80))
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (viewport.width === 390) { await page.getByRole('button', { name: '新增題目' }).scrollIntoViewIfNeeded(); const last = await page.getByRole('button', { name: '新增題目' }).boundingBox(), bar = await page.locator('.editor-save-bar').boundingBox(); expect(last!.y + last!.height).toBeLessThanOrEqual(bar!.y); await page.screenshot({ path: info.outputPath('editor-mobile.png') }) }
    await page.getByRole('button', { name: '預覽', exact: true }).click(); dialog = preview(page); await expect.poll(() => dialog.evaluate(el => el.getAnimations().length)).toBe(0); const box = await dialog.boundingBox()
    expect(box!.width).toBeGreaterThan(0); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1)
    if (viewport.width < 768) { expect(Math.abs(box!.width - (viewport.width - 4))).toBeLessThan(3); expect(Math.abs(box!.height - (viewport.height - 4))).toBeLessThan(3) }
    await page.screenshot({ path: info.outputPath(`preview-${viewport.width}.png`) }); await dialog.getByRole('button', { name: '關閉預覽' }).click()
  }
  expect(state.requests.filter(r => r.method !== 'GET')).toHaveLength(0); clean(state)
})
test('F6-B11 Stars/Range unoperated vs zero, min>1, 100 stars/10 columns, clearing/required', async ({ page }) => {
  const state = await mock(page); await page.goto(edit); await field(page, `${Q[4]}.config.min`).fill('0'); await field(page, `${Q[4]}.config.max`).fill('100'); await field(page, `${Q[4]}.config.variant`).selectOption('stars'); await page.getByRole('button', { name: '預覽', exact: true }).click()
  const rating = preview(page).locator(`[data-renderer-key="${Q[4]}"]`); await expect(rating.getByRole('radio')).toHaveCount(101); await expect(rating.getByText('尚未作答')).toBeVisible()
  const grid = await rating.getByRole('radiogroup').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length); expect(grid).toBe(10)
  await rating.getByRole('radio', { name: '0 分', exact: true }).check(); await expect(rating.getByText('0 分', { exact: true }).first()).toBeVisible(); await rating.getByRole('button', { name: '清除答案' }).click(); await expect(rating.getByText('尚未作答')).toBeVisible()
  await preview(page).getByRole('button', { name: '關閉預覽' }).click(); await field(page, `${Q[4]}.config.min`).fill('3'); await page.getByRole('button', { name: '預覽', exact: true }).click(); await expect(preview(page).getByRole('radio', { name: '1 分', exact: true })).toBeDisabled(); await preview(page).getByRole('button', { name: '關閉預覽' }).click()
  await field(page, `${Q[4]}.config.min`).fill('0'); await field(page, `${Q[4]}.config.max`).fill('5'); await field(page, `${Q[4]}.config.variant`).selectOption('range'); await page.getByRole('button', { name: '預覽', exact: true }).click()
  const range = preview(page).getByRole('slider'); await range.focus(); await expect(preview(page).getByText('尚未作答').last()).toBeVisible(); const box = await range.boundingBox(); await range.click({ position: { x: 1, y: box!.height / 2 } }); await expect(preview(page).getByText('0 分', { exact: true })).toBeVisible(); await range.press('ArrowRight'); await expect(preview(page).getByText('1 分', { exact: true })).toBeVisible()
  await preview(page).getByRole('button', { name: '清除答案' }).click(); await expect(preview(page).getByText('尚未作答').last()).toBeVisible(); await preview(page).getByRole('button', { name: '關閉預覽' }).click()
  await page.locator(`[data-question-key="${Q[4]}"]`).getByLabel('必填').check(); await field(page, `${Q[4]}.config.min`).fill('3'); await page.getByRole('button', { name: '預覽', exact: true }).click(); await expect(preview(page).getByRole('button', { name: '清除答案' })).toHaveCount(0); const requiredRange = preview(page).getByRole('slider'); const requiredBox = await requiredRange.boundingBox(); await requiredRange.click({ position: { x: 1, y: requiredBox!.height / 2 } }); await expect(preview(page).getByText('3 分', { exact: true })).toBeVisible(); clean(state)
})
test('F6-B12 empty preview does not require Draft validation or write placeholders', async ({ page }) => {
  const state = await mock(page); await page.goto('/forms/new'); await page.getByRole('button', { name: '新增題目' }).click(); await page.getByLabel('題型 1').selectOption('rating'); await page.getByLabel('最小值（未設定可留空）').fill(''); await page.getByRole('button', { name: '預覽', exact: true }).click()
  await expect(preview(page)).toContainText('（暫無內容）'); await expect(preview(page)).toContainText('尚未設定完整評分範圍'); await expect(preview(page)).toContainText('尚未選擇'); await preview(page).getByRole('button', { name: '關閉預覽' }).click(); await expect(field(page, 'form.title')).toHaveValue(''); expect(state.requests).toHaveLength(1); clean(state)
})
test('F6 Renderer readonly keeps exact answers and offers no write/clear controls', async ({ page }) => {
  test.skip(process.env.F6_MODE === 'built', 'Fixture-only readonly projection; production scope has no Latest route yet.')
  const state = await mock(page); await page.goto('/f6-renderer'); await expect(page.getByText('完整\n合成文字', { exact: true })).toBeVisible(); await expect(page.getByText('9007199254740993.1234567890123456789', { exact: true })).toBeVisible(); await expect(page.getByText('0 分', { exact: true })).toBeVisible(); await expect(page.getByRole('textbox')).toHaveCount(0); await expect(page.getByRole('slider')).toHaveCount(0); await expect(page.getByRole('button', { name: '清除答案' })).toHaveCount(0); clean(state)
})
test('F6-B03 sparse order move and undo preserves clean baseline, Option label/value stays stable', async ({ page }) => {
  const state = await mock(page); await page.goto(edit); await page.getByRole('button', { name: '題目 2 上移', exact: true }).click(); await page.getByRole('button', { name: '題目 1 下移', exact: true }).click(); await expect(save(page)).toBeDisabled()
  const card = page.locator(`[data-question-key="${Q[2]}"]`); await card.getByRole('button', { name: '選項 2 上移', exact: true }).click(); await card.getByRole('button', { name: '選項 1 下移', exact: true }).click(); await expect(save(page)).toBeDisabled()
  await field(page, `${O[0]}.label`).fill('改 label'); await save(page).click(); const wire = state.requests.find(r => r.method === 'PATCH')!.body!; expect(JSON.parse(wire)).toEqual({ questions: [{ id: Q[2], options: [{ id: O[0], label: '改 label' }] }] }); clean(state)
})
test('F6-B05 Create error map points to newly added Option and retains unknown detail', async ({ page }) => {
  const state = await mock(page); state.write = route => reply(route, error('FORM_DEFINITION_INVALID', 'questions[0].options[1].label'), 400); await page.goto('/forms/new'); await readyNew(page); await page.getByRole('button', { name: '新增題目' }).click(); await page.getByLabel('題型 1').selectOption('single_choice'); await page.getByLabel('題目 1 標題', { exact: true }).fill('合成單選'); await page.getByRole('button', { name: '保存草稿' }).click(); await expect(page.getByRole('dialog')).toContainText('保留未知明細'); await closeError(page); await expect(page.getByLabel('選項 2', { exact: true })).toBeFocused(); clean(state)
})
test('F6-B06 same-component ID update is guarded and old response cannot replace current resource', async ({ page }) => {
  test.skip(process.env.F6_MODE === 'built', 'Mounted scope fixture only; built covers page leave/history separately.')
  const state = await mock(page); await page.goto(`/f6-scope/${uuid(50)}`); await field(page, 'form.title').fill('保留在原資源'); page.on('dialog', d => d.dismiss()); await page.getByRole('link', { name: '切換合成資源' }).click(); await expect(page).toHaveURL(`http://localhost:3000/f6-scope/${uuid(50)}`)
  const pending = gate(); state.get = async route => { const id = new URL(route.request().url()).pathname.split('/').at(-1)!; await pending.promise; await reply(route, { ...form(), id, title: '新的合成資源' }) }
  page.removeAllListeners('dialog'); page.on('dialog', d => d.accept()); await page.getByRole('link', { name: '切換合成資源' }).click(); await expect(page).toHaveURL(`http://localhost:3000/f6-scope/${uuid(55)}`); pending.release(); await expect(field(page, 'form.title')).toHaveValue('新的合成資源'); clean(state)
})
test('F6-B07/B09 disabled preserves Header and content; access denied/not-found never restores writes', async ({ page }) => {
  const state = await mock(page); await page.goto(edit); await field(page, 'form.title').fill('保留本地'); state.write = route => reply(route, error('AUTH_USER_DISABLED'), 403); await save(page).click(); await closeError(page); await expect(page.getByRole('button', { name: '使用者選單' })).toBeVisible(); await expect(field(page, 'form.title')).toHaveValue('保留本地'); expect(state.requests.filter(r => r.path.endsWith('/auth/logout'))).toHaveLength(0)
  state.write = route => reply(route, error('FORM_ACCESS_DENIED'), 403); await save(page).click(); await closeError(page); await expect(save(page)).toBeDisabled(); await expect(field(page, 'form.title')).toHaveValue('保留本地')
  // Explicit permission verification may recover a valid Owner resource; ordinary action cannot.
  page.on('dialog', d => d.accept()); await page.getByRole('button', { name: '核對登入與保存資格' }).click(); await field(page, 'form.title').fill('不存在本地'); state.write = route => reply(route, error('FORM_NOT_FOUND'), 404); await save(page).click(); page.removeAllListeners('dialog'); page.on('dialog', d => d.dismiss()); await closeError(page); await expect(field(page, 'form.title')).toHaveValue('不存在本地'); await expect(save(page)).toBeDisabled(); clean(state)
})
test('F6-B09 pending old GET cannot suppress or overwrite a new resource read', async ({ page }) => {
  test.skip(process.env.F6_MODE === 'built', 'Mounted parameter-update fixture only.')
  const state = await mock(page); await page.goto(`/f6-scope/${uuid(50)}`); await expect(field(page, 'form.title')).toHaveValue(form().title)
  const pending = gate(); let finished = false
  state.get = async route => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1)!
    if (id === uuid(50)) { await pending.promise; try { await reply(route, { ...form(), title: '舊資料晚回' }) } catch { /* Request aborted by resource change. */ } finally { finished = true } }
    else await reply(route, { ...form(), id, title: '目前資源' })
  }
  await page.getByRole('button', { name: '重新載入表單' }).click(); await page.getByRole('link', { name: '切換合成資源' }).click(); await expect(field(page, 'form.title')).toHaveValue('目前資源'); pending.release(); await expect.poll(() => finished).toBe(true); await expect(field(page, 'form.title')).toHaveValue('目前資源'); clean(state)
})
test('F6 new disabled bootstrap has a read error and explicit retry, never an empty page or automatic Create', async ({ page }) => {
  const state = await mock(page); state.bootstrap = route => reply(route, error('AUTH_USER_DISABLED'), 403)
  await page.goto('/forms/new'); await expect(page.getByRole('alert')).toContainText('帳號已停用'); await expect(field(page, 'form.title')).toHaveCount(0); expect(state.requests).toHaveLength(1)
  state.bootstrap = undefined; await page.getByRole('button', { name: '重試', exact: true }).click(); await expect(field(page, 'form.title')).toHaveValue(''); expect(state.me).toBe(2); expect(state.requests.some(r => r.path.includes('/forms'))).toBe(false); clean(state)
})
