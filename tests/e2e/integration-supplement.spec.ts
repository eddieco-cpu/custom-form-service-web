import { test, expect } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const api = 'http://localhost:5000/api/v1'
const root = 'output/playwright/integration-supplement'
type Resource = { id: string; purpose: string; status: string; deleteAllowed: boolean; deleted?: boolean }
type Form = { id: string; title: string; status: string; userId: string; questions: { id: string; type: string; options: { id: string }[] }[] }
type Wire = { method: string; url: string; status: number; body?: string | null; response?: string; origin: string; credentials: string }

function recorder(info: TestInfo) {
  const runId = `supp-${Date.now()}-${randomUUID().slice(0, 6)}`
  const wires: Wire[] = [], routes: { url: string; page: string }[] = [], resources: Resource[] = []
  const steps: { id: string; status: string; detail?: string }[] = [], errors: string[] = [], failedRequests: string[] = []
  const pending: Promise<void>[] = [], dialogs: { type: string; message: string; accepted: boolean }[] = []
  const accounts: { alias: string; id?: string; email: string }[] = []
  const consoleErrors: { text: string; url: string }[] = []
  const expectedErrors: { method: string; url: string; status: number }[] = []
  const path = `${root}/${runId}.json`
  async function persist() { await mkdir(root, { recursive: true }); await writeFile(path, JSON.stringify({ runId, title: info.title, browser: info.project.name, api: 'real; no route interception', accounts, steps, resources, wires, routes, dialogs, errors, failedRequests, consoleErrors, expectedErrors }, null, 2)) }
  function observe(p: Page, alias: string) {
    p.on('framenavigated', f => { if (f === p.mainFrame()) routes.push({ url: f.url(), page: alias }) })
    p.on('pageerror', e => errors.push(e.message))
    p.on('requestfailed', r => failedRequests.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`))
    p.on('console', m => { if (m.type() === 'error' || m.text().includes('[Vue warn]')) consoleErrors.push({ text: m.text(), url: m.location().url }) })
    p.on('response', r => {
      if (!r.url().startsWith(api)) return
      pending.push((async () => {
        const h = await r.allHeaders(), isForm = new URL(r.url()).pathname.startsWith('/api/v1/forms')
        wires.push({ method: r.request().method(), url: r.url(), status: r.status(), origin: h['access-control-allow-origin'] ?? '', credentials: h['access-control-allow-credentials'] ?? '',
          ...(isForm ? { body: r.request().postData(), response: await r.text() } : {}) })
      })())
    })
  }
  async function step(id: string, action: () => Promise<void>) {
    await test.step(id, async () => {
      try { await action(); steps.push({ id, status: 'PASS' }) }
      catch (e) { steps.push({ id, status: 'FAIL', detail: String(e) }); throw e }
      finally { await Promise.allSettled(pending); await persist() }
    })
  }
  function expected(method: string, path: string, status: number) { expectedErrors.push({ method, url: api + path, status }) }
  async function finish(p: Page) {
    await Promise.all(pending)
    if (steps.some(v => v.status === 'FAIL')) await p.screenshot({ path: `${root}/${runId}-first-failure.png`, fullPage: true }).catch(() => {})
    await persist()
  }
  async function verify() {
    await Promise.all(pending)
    expect(errors).toEqual([]); expect(failedRequests).toEqual([])
    expect(wires.filter(w => w.status >= 400).map(w => ({ method: w.method, url: w.url, status: w.status }))).toEqual(expect.arrayContaining(expectedErrors))
    expect(wires.filter(w => w.status >= 400 && !expectedErrors.some(e => e.method === w.method && e.url === w.url && e.status === w.status))).toEqual([])
    expect(consoleErrors.filter(m => !wires.some(w => w.url === m.url && w.status >= 400 && expectedErrors.some(e => e.url === w.url && e.status === w.status) && /^Failed to load resource: the server responded with a status of \d{3} \([\w ]+\)$/.test(m.text)))).toEqual([])
    expect(wires.every(w => w.origin === 'http://localhost:3000' && w.credentials === 'true')).toBe(true)
  }
  return { runId, wires, resources, accounts, observe, persist, step, expected, finish, verify, dialogs }
}
type Recording = ReturnType<typeof recorder>

async function call(p: Page, path: string, method = 'GET', body?: unknown) {
  return p.evaluate(async ({ url, method, body }) => {
    const r = await fetch(url, { method, credentials: 'include', ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) })
    return { status: r.status, body: await r.text() }
  }, { url: api + path, method, body })
}
async function native(p: Page, r: Recording, accepted: boolean, action: () => Promise<unknown>) {
  const handled = p.waitForEvent('dialog').then(async d => { r.dialogs.push({ type: d.type(), message: d.message(), accepted }); if (accepted) await d.accept(); else await d.dismiss() })
  await action(); await handled
}
async function account(p: Page, r: Recording, alias: string, target = '/forms') {
  const email = `${r.runId}-${alias}@example.test`, password = ` ${randomUUID()} `
  r.accounts.push({ alias, email }); r.expected('GET', '/users/me', 401)
  await p.goto(target); await expect(p).toHaveURL(/\/login\?redirect=/)
  await p.getByRole('tab', { name: '註冊', exact: true }).click()
  await p.getByRole('textbox', { name: '姓名' }).fill(`補驗 ${alias}`)
  await p.getByRole('textbox', { name: 'Email' }).fill(` ${email.toUpperCase()} `)
  await p.getByLabel('密碼', { exact: true }).fill(password)
  const registered = p.waitForResponse(v => v.url().endsWith('/auth/register'))
  await p.getByRole('button', { name: '註冊', exact: true }).click()
  const response = await registered; expect(response.status()).toBe(201)
  r.accounts.at(-1)!.id = (await response.json() as { id: string }).id
  expect((await response.allHeaders())['set-cookie']).toBeUndefined()
  expect((await p.context().cookies()).some(c => c.name === 'access_token')).toBe(false)
  await expect(p.getByRole('tab', { name: '登入', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(p.getByLabel('密碼', { exact: true })).toHaveValue('')
  await expect(p.getByRole('textbox', { name: 'Email' })).toHaveValue(email)
  await p.getByLabel('密碼', { exact: true }).fill(password)
  const login = p.waitForResponse(v => v.url().endsWith('/auth/login'))
  await p.getByRole('button', { name: '登入', exact: true }).click()
  const logged = await login; expect(logged.status()).toBe(200)
  const header = (await logged.allHeaders())['set-cookie'] ?? ''
  expect(/httponly/i.test(header) && /samesite=lax/i.test(header) && /path=\//i.test(header) && /expires=/i.test(header)).toBe(true)
  expect(/domain=|max-age=|;\s*secure/i.test(header)).toBe(false)
  expect(await p.evaluate(() => document.cookie.includes('access_token'))).toBe(false)
  await expect(p).toHaveURL(`http://localhost:3000${target}`)
  await r.persist(); return { email, password }
}
async function create(p: Page, r: Recording, purpose: string, state = 'draft', deleteAllowed = false) {
  const created = await call(p, '/forms', 'POST', { title: `${r.runId} ${purpose}`, responseMode: 'multiple', resultVisibility: 'owner_only', questions: [{ type: 'text', title: '專用 optional 題目', sortOrder: 0 }] })
  expect(created.status).toBe(201); let dto = JSON.parse(created.body) as Form
  r.resources.push({ id: dto.id, purpose, status: 'draft', deleteAllowed }); await r.persist()
  if (state !== 'draft') { const v = await call(p, `/forms/${dto.id}/publish`, 'POST'); expect(v.status).toBe(200); dto = JSON.parse(v.body) as Form }
  if (state === 'closed') { const v = await call(p, `/forms/${dto.id}/close`, 'POST'); expect(v.status).toBe(200); dto = JSON.parse(v.body) as Form }
  r.resources.at(-1)!.status = dto.status; await r.persist(); return dto
}

test('Supplement A01-A04: real Profile readback, dirty logout and login return', async ({ page }, info) => {
  const r = recorder(info); r.observe(page, 'owner')
  try {
    let credentials!: { email: string; password: string }
    await r.step('A01 UI register/login return; Cookie flags', async () => { credentials = await account(page, r, 'auth-owner', '/profile?from=supplement#name') })
    await r.step('A02 Profile PATCH / independent GET; SPA me count', async () => {
      const name = `補驗更新 ${r.runId} 😀`
      await page.getByRole('textbox', { name: '姓名' }).fill(`\u0085 ${name} \u0085`)
      const saved = page.waitForResponse(v => v.request().method() === 'PATCH' && v.url().endsWith('/users/me'))
      await page.getByRole('button', { name: '保存', exact: true }).click(); expect((await saved).status()).toBe(200)
      await expect(page.getByRole('button', { name: '使用者選單' })).toContainText(name)
      const me = await call(page, '/users/me'); expect(me.status).toBe(200); expect((JSON.parse(me.body) as { displayName: string }).displayName).toBe(name)
      await writeFile(`${root}/${r.runId}-profile-readback.json`, JSON.stringify({ method: 'GET', url: `${api}/users/me`, ...me }, null, 2))
      const before = r.wires.filter(w => w.method === 'GET' && w.url.endsWith('/users/me')).length
      await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click()
      await expect(page.getByRole('heading', { name: `歡迎，${name}` })).toBeVisible()
      await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '個人資訊', exact: true }).click()
      await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(name)
      expect(r.wires.filter(w => w.method === 'GET' && w.url.endsWith('/users/me'))).toHaveLength(before)
      await page.screenshot({ path: `${root}/${r.runId}-profile.png` })
    })
    await r.step('A04 full reload/new tab each one bootstrap', async () => {
      const before = r.wires.filter(w => w.method === 'GET' && w.url.endsWith('/users/me')).length
      await page.reload(); await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(`補驗更新 ${r.runId} 😀`)
      await expect.poll(() => r.wires.filter(w => w.method === 'GET' && w.url.endsWith('/users/me')).length).toBe(before + 1)
      const second = await page.context().newPage(); r.observe(second, 'second-tab')
      await second.goto('/profile'); await expect(second.getByRole('textbox', { name: '姓名' })).toHaveValue(`補驗更新 ${r.runId} 😀`)
      await expect.poll(() => r.wires.filter(w => w.method === 'GET' && w.url.endsWith('/users/me')).length).toBe(before + 2)
      await second.close()
    })
    await r.step('A03 dirty logout cancel zero POST / accept 204 / login return', async () => {
      await page.getByRole('textbox', { name: '姓名' }).fill('尚未保存姓名')
      await page.getByRole('button', { name: '使用者選單' }).click()
      await native(page, r, false, () => page.getByRole('button', { name: '登出', exact: true }).click())
      expect(r.wires.filter(w => w.url.endsWith('/auth/logout'))).toHaveLength(0)
      await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue('尚未保存姓名')
      if (await page.getByRole('button', { name: '使用者選單' }).getAttribute('aria-expanded') !== 'true') await page.getByRole('button', { name: '使用者選單' }).click()
      const logout = page.waitForResponse(v => v.url().endsWith('/auth/logout'))
      await native(page, r, true, () => page.getByRole('button', { name: '登出', exact: true }).click())
      expect((await logout).status()).toBe(204); await expect(page).toHaveURL('http://localhost:3000/login')
      expect((await page.context().cookies()).some(c => c.name === 'access_token')).toBe(false)
      r.expected('GET', '/users/me', 401); await page.goto('/profile?return=supplement#name')
      await expect(page).toHaveURL(/\/login\?redirect=/)
      await page.getByRole('textbox', { name: 'Email' }).fill(credentials.email); await page.getByLabel('密碼', { exact: true }).fill(credentials.password)
      await page.getByRole('button', { name: '登入', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/profile?return=supplement#name')
      await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(`補驗更新 ${r.runId} 😀`)
    })
    await r.step('A diagnostics / real credentialed CORS', r.verify)
  } finally { await r.finish(page) }
})

test('Supplement L01-L05: real 21 Forms, UI pagination/filter/shrink and full role-route matrix', async ({ page, browser }, info) => {
  const r = recorder(info); r.observe(page, 'list-owner')
  const otherContext = await browser.newContext(), other = await otherContext.newPage(); r.observe(other, 'non-owner')
  const forms: Form[] = []
  const table = page.getByRole('table', { name: '我的表單清單' })
  async function listReady(n: number) { await expect(table.locator('tbody tr')).toHaveCount(n); await expect(page.getByText('正在載入表單清單…')).toHaveCount(0) }
  try {
    await account(page, r, 'list-owner'); await account(other, r, 'non-owner')
    await r.step('L01 prepare 21 dedicated Forms through normal API', async () => {
      for (let i = 0; i < 21; i++) forms.push(await create(page, r, i === 0 ? 'list-shrink' : `list-${String(i + 1).padStart(2, '0')}`, i < 7 ? 'draft' : i < 14 ? 'published' : 'closed', i === 0))
      expect(forms.filter(f => f.status === 'draft')).toHaveLength(7); expect(forms.filter(f => f.status === 'published')).toHaveLength(7); expect(forms.filter(f => f.status === 'closed')).toHaveLength(7)
      await page.getByRole('button', { name: '刷新', exact: true }).click(); await listReady(10)
      await expect(page.getByRole('navigation', { name: '表單分頁' })).toContainText('第 1 頁 · 共 3 頁／21 筆')
      const lists = r.wires.filter(w => w.method === 'GET' && new URL(w.url).pathname === '/api/v1/forms')
      const first = JSON.parse(lists.at(-1)!.response!) as { items: { id: string }[] }
      expect(await table.locator('tbody tr a').evaluateAll(a => a.map(x => x.getAttribute('href')?.split('/')[2]))).toEqual(first.items.map(f => f.id))
      await page.getByRole('button', { name: '下一頁', exact: true }).click(); await listReady(10)
      await expect(page.getByRole('navigation', { name: '表單分頁' })).toContainText('第 2 頁')
      await page.getByRole('button', { name: '下一頁', exact: true }).click(); await listReady(1)
      await expect(page.getByRole('navigation', { name: '表單分頁' })).toContainText('第 3 頁')
      await page.screenshot({ path: `${root}/${r.runId}-page3.png` })
    })
    await r.step('L02 filter resets page1; actual row links / refresh keeps condition', async () => {
      for (const state of ['draft', 'published', 'closed']) {
        const query = page.waitForResponse(v => v.request().method() === 'GET' && new URL(v.url()).pathname === '/api/v1/forms' && new URL(v.url()).searchParams.get('status') === state)
        await page.getByLabel('狀態篩選', { exact: true }).selectOption(state); const response = await query; expect(response.status()).toBe(200)
        expect(new URL(response.url()).searchParams.get('page')).toBe('1'); expect(new URL(response.url()).searchParams.get('pageSize')).toBe('10')
        await listReady(7); await expect(page.getByRole('navigation', { name: '表單分頁' })).toContainText('第 1 頁 · 共 1 頁／7 筆')
        const row = forms.find(f => f.status === state && f.id !== forms[0]!.id)!
        await table.getByRole('link', { name: row.title, exact: true }).click()
        await expect(page).toHaveURL(`http://localhost:3000/forms/${row.id}${state === 'draft' ? '/edit' : ''}`)
        await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '我的表單', exact: true }).click(); await listReady(10)
        await page.getByLabel('狀態篩選', { exact: true }).selectOption(state); await listReady(7)
        const refreshed = page.waitForResponse(v => v.request().method() === 'GET' && new URL(v.url()).pathname === '/api/v1/forms')
        await page.getByRole('button', { name: '刷新', exact: true }).click(); expect(new URL((await refreshed).url()).searchParams.get('status')).toBe(state); await listReady(7)
      }
      const all = page.waitForResponse(v => v.request().method() === 'GET' && new URL(v.url()).pathname === '/api/v1/forms')
      await page.getByLabel('狀態篩選', { exact: true }).selectOption(''); expect(new URL((await all).url()).searchParams.has('status')).toBe(false); await listReady(10)
      await page.screenshot({ path: `${root}/${r.runId}-desktop-list.png`, fullPage: true })
      await page.setViewportSize({ width: 390, height: 844 }); await expect(page.getByRole('list', { name: '我的表單卡片' }).locator(':scope > li')).toHaveCount(10)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.screenshot({ path: `${root}/${r.runId}-mobile-list.png`, fullPage: true }); await page.setViewportSize({ width: 1440, height: 900 })
    })
    await r.step('L03 predeclared list-shrink Delete / page3 refresh aligns once to page2', async () => {
      await page.getByRole('button', { name: '下一頁', exact: true }).click(); await listReady(10)
      await page.getByRole('button', { name: '下一頁', exact: true }).click(); await listReady(1)
      const target = forms[0]!; expect(r.resources.find(v => v.id === target.id)?.deleteAllowed).toBe(true)
      await expect(table.getByRole('link', { name: target.title, exact: true })).toBeVisible(); await r.persist()
      expect((await call(page, `/forms/${target.id}`, 'DELETE')).status).toBe(204); r.resources.find(v => v.id === target.id)!.deleted = true; await r.persist()
      const before = r.wires.filter(w => w.method === 'GET' && new URL(w.url).pathname === '/api/v1/forms').length
      await page.getByRole('button', { name: '刷新', exact: true }).click(); await listReady(10)
      await expect(page.getByRole('navigation', { name: '表單分頁' })).toContainText('第 2 頁 · 共 2 頁／20 筆')
      await expect.poll(() => r.wires.filter(w => w.method === 'GET' && new URL(w.url).pathname === '/api/v1/forms').length).toBe(before + 2)
      const alignment = r.wires.filter(w => w.method === 'GET' && new URL(w.url).pathname === '/api/v1/forms').slice(before)
      expect(alignment.map(w => new URL(w.url).searchParams.get('page'))).toEqual(['3', '2']); expect(alignment.map(w => w.status)).toEqual([200, 200])
      expect((JSON.parse(alignment[0]!.response!) as { items: unknown[] }).items).toEqual([])
      await page.screenshot({ path: `${root}/${r.runId}-aligned-page2.png` })
    })
    await r.step('L04 six role/status pairs x Form and edit URL', async () => {
      for (const p of [page, other]) for (const state of ['draft', 'published', 'closed']) {
        const form = forms.find(f => f.status === state && f.id !== forms[0]!.id)!
        for (const edit of [false, true]) {
          const path = `/forms/${form.id}${edit ? '/edit' : ''}`
          if (p === other && state === 'draft') r.expected('GET', `/forms/${form.id}`, 404)
          await p.goto(path)
          if (p === other && state === 'draft') { await expect(p).toHaveURL(`http://localhost:3000${path}`); await expect(p.getByText('找不到表單', { exact: true })).toBeVisible() }
          else {
            await expect(p).toHaveURL(`http://localhost:3000/forms/${form.id}${state === 'draft' ? '/edit' : ''}`)
            if (state === 'draft') await expect(p.getByLabel('表單標題', { exact: true })).toHaveValue(form.title)
            else await expect(p.getByRole('heading', { name: form.title, exact: true })).toBeVisible()
          }
          if (p === other) { await expect(p.getByRole('button', { name: '刪除表單', exact: true })).toHaveCount(0); await expect(p.getByRole('button', { name: '關閉表單以查看統計', exact: true })).toHaveCount(0) }
        }
      }
    })
    await r.step('L05 deleted / missing / invalid UUID retain URL', async () => {
      for (const [id, text] of [[forms[0]!.id, '找不到表單'], [randomUUID(), '找不到表單'], ['invalid-supplement-id', '連結無效']]) {
        r.expected('GET', `/forms/${id}`, text === '連結無效' ? 400 : 404)
        await page.goto(`/forms/${id}`); await expect(page).toHaveURL(`http://localhost:3000/forms/${id}`); await expect(page.getByText(text!, { exact: true })).toBeVisible()
      }
      const list = await call(page, '/forms?page=1&pageSize=100'); expect(list.status).toBe(200)
      expect((JSON.parse(list.body) as { pagination: { totalItems: number } }).pagination.totalItems).toBe(20)
      expect(r.wires.filter(w => w.method === 'PATCH')).toEqual([])
    })
    await r.step('L diagnostics / no intercepted business APIs', r.verify)
  } finally { await r.finish(page); await otherContext.close() }
})

test('Supplement D02-D03 M07 R03-R05: persisted sort, Preview, Range zero, clear and Latest consent', async ({ page, context }, info) => {
  const r = recorder(info); r.observe(page, 'interactive-owner')
  let dto!: Form
  async function submit() {
    const wire = page.waitForResponse(v => v.url() === `${api}/forms/${dto.id}/responses` && v.request().method() === 'POST')
    await page.getByRole('button', { name: '提交表單', exact: true }).click()
    const response = await wire; expect(response.status()).toBe(201)
    const receipt = JSON.parse(await response.text()) as { id: string; answers: { questionId: string; value: unknown }[] }
    await expect(page.getByRole('dialog', { name: '提交成功' })).toBeVisible()
    await page.getByRole('button', { name: '完成', exact: true }).click()
    const latest = await call(page, `/forms/${dto.id}/responses/me/latest`); expect(latest.status).toBe(200); expect(JSON.parse(latest.body)).toEqual(receipt)
    return receipt
  }
  try {
    await account(page, r, 'interactive-owner')
    const created = await call(page, '/forms', 'POST', { title: `${r.runId} 互動專用`, responseMode: 'multiple', resultVisibility: 'public', questions: [
      { type: 'text', title: '文字題', sortOrder: 0, config: { variant: 'textarea' } },
      { type: 'number', title: '數字題', sortOrder: 1, config: {} },
      { type: 'single_choice', title: '單選題', sortOrder: 2, config: { variant: 'select' }, options: [{ label: '單一', value: 'one', sortOrder: 0 }, { label: '單二', value: 'two', sortOrder: 1 }] },
      { type: 'multiple_choice', title: '多選題', sortOrder: 3, config: {}, options: [{ label: '多一', value: 'one', sortOrder: 0 }, { label: '多二', value: 'two', sortOrder: 1 }] },
      { type: 'rating', title: '星級題', sortOrder: 4, config: { variant: 'stars', min: 0, max: 5 } },
      { type: 'rating', title: '滑桿題', sortOrder: 5, config: { variant: 'range', min: 0, max: 5 } },
    ] })
    expect(created.status).toBe(201); dto = JSON.parse(created.body) as Form
    r.resources.push({ id: dto.id, purpose: 'interactive sort/Preview/Range/Latest/share; retained', status: 'draft', deleteAllowed: false }); await r.persist()
    await page.goto(`/forms/${dto.id}/edit`)
    await r.step('D02 UI sort persists IDs, no-op remains disabled', async () => {
      await page.getByRole('button', { name: '題目 2 上移', exact: true }).click()
      const save = page.waitForResponse(v => v.url() === `${api}/forms/${dto.id}` && v.request().method() === 'PATCH')
      await page.getByRole('button', { name: '保存', exact: true }).click(); expect((await save).status()).toBe(200)
      const read = await call(page, `/forms/${dto.id}`); expect(read.status).toBe(200)
      const changed = JSON.parse(read.body) as Form
      expect(changed.questions.map(q => q.id)).toEqual([dto.questions[1]!.id, dto.questions[0]!.id, ...dto.questions.slice(2).map(q => q.id)])
      expect(changed.questions.slice(2).map(q => q.options)).toEqual(dto.questions.slice(2).map(q => q.options))
      dto = changed; await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
    })
    await r.step('D03 Preview independent answers; reopen empty; dirty SPA cancel/accept', async () => {
      const before = r.wires.filter(w => w.method === 'POST' && w.url.endsWith('/responses')).length
      await page.getByRole('button', { name: '預覽', exact: true }).click()
      const preview = page.getByRole('dialog', { name: '預覽', exact: true })
      await preview.getByLabel('文字題', { exact: true }).fill('只在預覽存在')
      await preview.getByRole('button', { name: '關閉預覽', exact: true }).click()
      await page.getByRole('button', { name: '預覽', exact: true }).click(); await expect(preview.getByLabel('文字題', { exact: true })).toHaveValue('')
      await preview.getByRole('button', { name: '關閉預覽', exact: true }).click(); await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
      expect(r.wires.filter(w => w.method === 'POST' && w.url.endsWith('/responses'))).toHaveLength(before)
      await page.getByLabel('表單標題', { exact: true }).fill(`${r.runId} 未保存`)
      const nav = page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '我的表單', exact: true })
      await native(page, r, false, () => nav.click()); await expect(page.getByLabel('表單標題', { exact: true })).toHaveValue(`${r.runId} 未保存`)
      await native(page, r, true, () => nav.click()); await expect(page).toHaveURL('http://localhost:3000/forms')
      await page.goto(`/forms/${dto.id}/edit`); await expect(page.getByLabel('表單標題', { exact: true })).toHaveValue(dto.title)
    })
    await page.getByRole('button', { name: '發布', exact: true }).click(); await page.getByRole('button', { name: '確認發布', exact: true }).click()
    await expect(page).toHaveURL(`http://localhost:3000/forms/${dto.id}`); r.resources[0]!.status = 'published'
    await r.step('R03 Range untouched / focus is no answer; first receipt empty', async () => {
      await page.getByRole('slider', { name: '滑桿題', exact: true }).focus(); await page.keyboard.press('Tab')
      expect((await submit()).answers).toEqual([])
    })
    await r.step('R03 all six answers including number0 Stars0 Range0', async () => {
      await page.getByLabel('文字題', { exact: true }).fill('第一份完整')
      await page.getByLabel('數字題', { exact: true }).fill('0')
      await page.getByRole('combobox', { name: '單選題', exact: true }).selectOption(dto.questions[2]!.options[0]!.id)
      await page.getByLabel('多一', { exact: true }).check(); await page.getByRole('radio', { name: '0 分', exact: true }).check()
      await page.getByRole('slider', { name: '滑桿題', exact: true }).press('Home')
      const receipt = await submit(); expect(receipt.answers).toHaveLength(6)
      expect(receipt.answers.filter(v => v.value === 0)).toHaveLength(3)
    })
    await r.step('R03 optional clear all types produces [] / independent Latest', async () => {
      await page.getByLabel('文字題', { exact: true }).fill(''); await page.getByLabel('數字題', { exact: true }).fill('')
      await page.getByRole('combobox', { name: '單選題', exact: true }).selectOption(''); await page.getByLabel('多一', { exact: true }).uncheck()
      for (const q of dto.questions.slice(4)) await page.locator(`[data-renderer-key="${q.id}"]`).getByRole('button', { name: '清除答案', exact: true }).click()
      expect((await submit()).answers).toEqual([])
    })
    await r.step('R05 Latest dirty cancel retains; consent completely clears', async () => {
      await page.getByLabel('文字題', { exact: true }).fill('取消必須保留')
      await native(page, r, false, () => page.getByRole('button', { name: '查看我的填答', exact: true }).click())
      await expect(page.getByLabel('文字題', { exact: true })).toHaveValue('取消必須保留')
      await native(page, r, true, () => page.getByRole('button', { name: '查看我的填答', exact: true }).click())
      await expect(page.getByLabel('文字題', { exact: true })).toHaveValue('')
      await page.screenshot({ path: `${root}/${r.runId}-latest-cleared.png`, fullPage: true })
      const before = r.wires.filter(w => w.url.endsWith('/responses/me/latest')).length
      await page.reload(); await expect(page.getByLabel('文字題', { exact: true })).toHaveValue('')
      expect(r.wires.filter(w => w.url.endsWith('/responses/me/latest'))).toHaveLength(before)
    })
    await r.step('M07 real Clipboard URLs / Closed Statistics link route', async () => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:3000' })
      await page.getByRole('button', { name: '複製填答連結', exact: true }).click()
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://localhost:3000/forms/${dto.id}`)
      await page.getByRole('button', { name: '關閉表單以查看統計', exact: true }).click(); await page.getByRole('button', { name: '確認關閉', exact: true }).click()
      await expect(page.getByRole('button', { name: '複製統計連結', exact: true })).toBeVisible()
      await page.getByRole('button', { name: '複製統計連結', exact: true }).click()
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://localhost:3000/forms/${dto.id}/statistics`)
      await page.getByRole('link', { name: '查看統計', exact: true }).click(); await expect(page).toHaveURL(`http://localhost:3000/forms/${dto.id}/statistics`)
      r.resources[0]!.status = 'closed'
    })
    await r.step('D/R diagnostics / real credentialed CORS', r.verify)
  } finally { await r.finish(page) }
})
