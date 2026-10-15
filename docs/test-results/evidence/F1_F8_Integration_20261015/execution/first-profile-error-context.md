# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: integration-supplement.spec.ts >> Supplement A01-A04: real Profile readback, dirty logout and login return
- Location: tests\e2e\integration-supplement.spec.ts:108:1

# Error details

```
TimeoutError: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"
```

# Page snapshot

```yaml
- generic [ref=f1e1]:
  - generic [ref=f1e3]:
    - banner [ref=f1e4]:
      - generic [ref=f1e5]:
        - generic [ref=f1e6]: 自建表單
        - navigation "主要導覽" [ref=f1e7]:
          - button "建立表單" [ref=f1e8]
          - button "我的表單" [ref=f1e9]
          - button "個人資訊" [ref=f1e10]
          - button "首頁" [ref=f1e11]
        - button "使用者選單" [active] [ref=f1e12]:
          - generic [ref=f1e15]: 補驗更新 supp-1792063245889-8b717e 😀
    - main [ref=f1e16]:
      - generic [ref=f1e17]:
        - heading "個人資訊" [level=1] [ref=f1e18]
        - generic [ref=f1e20]:
          - generic [ref=f1e24]:
            - term [ref=f1e25]: User ID
            - definition [ref=f1e26]: 259ea4af-891d-456b-be19-a993e428ae44
            - term [ref=f1e27]: Email
            - definition [ref=f1e28]: supp-1792063245889-8b717e-auth-owner@example.test
          - generic [ref=f1e29]:
            - generic [ref=f1e30]:
              - generic [ref=f1e31]: 姓名*
              - textbox "姓名*" [ref=f1e36]: 尚未保存姓名
            - button "保存" [ref=f1e37]
  - region "Notifications (F8)":
    - list
```

# Test source

```ts
  45  |     await Promise.all(pending)
  46  |     if (steps.some(v => v.status === 'FAIL')) await p.screenshot({ path: `${root}/${runId}-first-failure.png`, fullPage: true }).catch(() => {})
  47  |     await persist()
  48  |   }
  49  |   async function verify() {
  50  |     await Promise.all(pending)
  51  |     expect(errors).toEqual([]); expect(failedRequests).toEqual([])
  52  |     expect(wires.filter(w => w.status >= 400).map(w => ({ method: w.method, url: w.url, status: w.status }))).toEqual(expect.arrayContaining(expectedErrors))
  53  |     expect(wires.filter(w => w.status >= 400 && !expectedErrors.some(e => e.method === w.method && e.url === w.url && e.status === w.status))).toEqual([])
  54  |     expect(consoleErrors.filter(m => !wires.some(w => w.url === m.url && w.status >= 400 && expectedErrors.some(e => e.url === w.url && e.status === w.status) && /^Failed to load resource: the server responded with a status of \d{3} \([\w ]+\)$/.test(m.text)))).toEqual([])
  55  |     expect(wires.every(w => w.origin === 'http://localhost:3000' && w.credentials === 'true')).toBe(true)
  56  |   }
  57  |   return { runId, wires, resources, accounts, observe, persist, step, expected, finish, verify, dialogs }
  58  | }
  59  | type Recording = ReturnType<typeof recorder>
  60  |
  61  | async function call(p: Page, path: string, method = 'GET', body?: unknown) {
  62  |   return p.evaluate(async ({ url, method, body }) => {
  63  |     const r = await fetch(url, { method, credentials: 'include', ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) })
  64  |     return { status: r.status, body: await r.text() }
  65  |   }, { url: api + path, method, body })
  66  | }
  67  | async function native(p: Page, r: Recording, accepted: boolean, action: () => Promise<unknown>) {
  68  |   const handled = p.waitForEvent('dialog').then(async d => { r.dialogs.push({ type: d.type(), message: d.message(), accepted }); if (accepted) await d.accept(); else await d.dismiss() })
  69  |   await action(); await handled
  70  | }
  71  | async function account(p: Page, r: Recording, alias: string, target = '/forms') {
  72  |   const email = `${r.runId}-${alias}@example.test`, password = ` ${randomUUID()} `
  73  |   r.accounts.push({ alias, email }); r.expected('GET', '/users/me', 401)
  74  |   await p.goto(target); await expect(p).toHaveURL(/\/login\?redirect=/)
  75  |   await p.getByRole('tab', { name: '註冊', exact: true }).click()
  76  |   await p.getByRole('textbox', { name: '姓名' }).fill(`補驗 ${alias}`)
  77  |   await p.getByRole('textbox', { name: 'Email' }).fill(` ${email.toUpperCase()} `)
  78  |   await p.getByLabel('密碼', { exact: true }).fill(password)
  79  |   const registered = p.waitForResponse(v => v.url().endsWith('/auth/register'))
  80  |   await p.getByRole('button', { name: '註冊', exact: true }).click()
  81  |   const response = await registered; expect(response.status()).toBe(201)
  82  |   r.accounts.at(-1)!.id = (await response.json() as { id: string }).id
  83  |   expect((await response.allHeaders())['set-cookie']).toBeUndefined()
  84  |   expect((await p.context().cookies()).some(c => c.name === 'access_token')).toBe(false)
  85  |   await expect(p.getByRole('tab', { name: '登入', exact: true })).toHaveAttribute('aria-selected', 'true')
  86  |   await expect(p.getByLabel('密碼', { exact: true })).toHaveValue('')
  87  |   await expect(p.getByRole('textbox', { name: 'Email' })).toHaveValue(email)
  88  |   await p.getByLabel('密碼', { exact: true }).fill(password)
  89  |   const login = p.waitForResponse(v => v.url().endsWith('/auth/login'))
  90  |   await p.getByRole('button', { name: '登入', exact: true }).click()
  91  |   const logged = await login; expect(logged.status()).toBe(200)
  92  |   const header = (await logged.allHeaders())['set-cookie'] ?? ''
  93  |   expect(/httponly/i.test(header) && /samesite=lax/i.test(header) && /path=\//i.test(header) && /expires=/i.test(header)).toBe(true)
  94  |   expect(/domain=|max-age=|;\s*secure/i.test(header)).toBe(false)
  95  |   expect(await p.evaluate(() => document.cookie.includes('access_token'))).toBe(false)
  96  |   await expect(p).toHaveURL(`http://localhost:3000${target}`)
  97  |   await r.persist(); return { email, password }
  98  | }
  99  | async function create(p: Page, r: Recording, purpose: string, state = 'draft', deleteAllowed = false) {
  100 |   const created = await call(p, '/forms', 'POST', { title: `${r.runId} ${purpose}`, responseMode: 'multiple', resultVisibility: 'owner_only', questions: [{ type: 'text', title: '專用 optional 題目', sortOrder: 0 }] })
  101 |   expect(created.status).toBe(201); let dto = JSON.parse(created.body) as Form
  102 |   r.resources.push({ id: dto.id, purpose, status: 'draft', deleteAllowed }); await r.persist()
  103 |   if (state !== 'draft') { const v = await call(p, `/forms/${dto.id}/publish`, 'POST'); expect(v.status).toBe(200); dto = JSON.parse(v.body) as Form }
  104 |   if (state === 'closed') { const v = await call(p, `/forms/${dto.id}/close`, 'POST'); expect(v.status).toBe(200); dto = JSON.parse(v.body) as Form }
  105 |   r.resources.at(-1)!.status = dto.status; await r.persist(); return dto
  106 | }
  107 |
  108 | test('Supplement A01-A04: real Profile readback, dirty logout and login return', async ({ page }, info) => {
  109 |   const r = recorder(info); r.observe(page, 'owner')
  110 |   try {
  111 |     let credentials!: { email: string; password: string }
  112 |     await r.step('A01 UI register/login return; Cookie flags', async () => { credentials = await account(page, r, 'auth-owner', '/profile?from=supplement#name') })
  113 |     await r.step('A02 Profile PATCH / independent GET; SPA me count', async () => {
  114 |       const name = `補驗更新 ${r.runId} 😀`
  115 |       await page.getByRole('textbox', { name: '姓名' }).fill(`\u0085 ${name} \u0085`)
  116 |       const saved = page.waitForResponse(v => v.request().method() === 'PATCH' && v.url().endsWith('/users/me'))
  117 |       await page.getByRole('button', { name: '保存', exact: true }).click(); expect((await saved).status()).toBe(200)
  118 |       await expect(page.getByRole('button', { name: '使用者選單' })).toContainText(name)
  119 |       const me = await call(page, '/users/me'); expect(me.status).toBe(200); expect((JSON.parse(me.body) as { displayName: string }).displayName).toBe(name)
  120 |       await writeFile(`${root}/${r.runId}-profile-readback.json`, JSON.stringify({ method: 'GET', url: `${api}/users/me`, ...me }, null, 2))
  121 |       const before = r.wires.filter(w => w.method === 'GET' && w.url.endsWith('/users/me')).length
  122 |       await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '首頁', exact: true }).click()
  123 |       await expect(page.getByRole('heading', { name: `歡迎，${name}` })).toBeVisible()
  124 |       await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '個人資訊', exact: true }).click()
  125 |       await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(name)
  126 |       expect(r.wires.filter(w => w.method === 'GET' && w.url.endsWith('/users/me'))).toHaveLength(before)
  127 |       await page.screenshot({ path: `${root}/${r.runId}-profile.png` })
  128 |     })
  129 |     await r.step('A04 full reload/new tab each one bootstrap', async () => {
  130 |       const before = r.wires.filter(w => w.method === 'GET' && w.url.endsWith('/users/me')).length
  131 |       await page.reload(); await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(`補驗更新 ${r.runId} 😀`)
  132 |       await expect.poll(() => r.wires.filter(w => w.method === 'GET' && w.url.endsWith('/users/me')).length).toBe(before + 1)
  133 |       const second = await page.context().newPage(); r.observe(second, 'second-tab')
  134 |       await second.goto('/profile'); await expect(second.getByRole('textbox', { name: '姓名' })).toHaveValue(`補驗更新 ${r.runId} 😀`)
  135 |       await expect.poll(() => r.wires.filter(w => w.method === 'GET' && w.url.endsWith('/users/me')).length).toBe(before + 2)
  136 |       await second.close()
  137 |     })
  138 |     await r.step('A03 dirty logout cancel zero POST / accept 204 / login return', async () => {
  139 |       await page.getByRole('textbox', { name: '姓名' }).fill('尚未保存姓名')
  140 |       await page.getByRole('button', { name: '使用者選單' }).click()
  141 |       await native(page, r, false, () => page.getByRole('button', { name: '登出', exact: true }).click())
  142 |       expect(r.wires.filter(w => w.url.endsWith('/auth/logout'))).toHaveLength(0)
  143 |       await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue('尚未保存姓名')
  144 |       await page.getByRole('button', { name: '使用者選單' }).click()
> 145 |       const logout = page.waitForResponse(v => v.url().endsWith('/auth/logout'))
      |                           ^ TimeoutError: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"
  146 |       await native(page, r, true, () => page.getByRole('button', { name: '登出', exact: true }).click())
  147 |       expect((await logout).status()).toBe(204); await expect(page).toHaveURL('http://localhost:3000/login')
  148 |       expect((await page.context().cookies()).some(c => c.name === 'access_token')).toBe(false)
  149 |       r.expected('GET', '/users/me', 401); await page.goto('/profile?return=supplement#name')
  150 |       await expect(page).toHaveURL(/\/login\?redirect=/)
  151 |       await page.getByRole('textbox', { name: 'Email' }).fill(credentials.email); await page.getByLabel('密碼', { exact: true }).fill(credentials.password)
  152 |       await page.getByRole('button', { name: '登入', exact: true }).click(); await expect(page).toHaveURL('http://localhost:3000/profile?return=supplement#name')
  153 |       await expect(page.getByRole('textbox', { name: '姓名' })).toHaveValue(`補驗更新 ${r.runId} 😀`)
  154 |     })
  155 |     await r.step('A diagnostics / real credentialed CORS', r.verify)
  156 |   } finally { await r.finish(page) }
  157 | })
  158 |
  159 | test('Supplement L01-L05: real 21 Forms, UI pagination/filter/shrink and full role-route matrix', async ({ page, browser }, info) => {
  160 |   const r = recorder(info); r.observe(page, 'list-owner')
  161 |   const otherContext = await browser.newContext(), other = await otherContext.newPage(); r.observe(other, 'non-owner')
  162 |   const forms: Form[] = []
  163 |   const table = page.getByRole('table', { name: '我的表單清單' })
  164 |   async function listReady(n: number) { await expect(table.locator('tbody tr')).toHaveCount(n); await expect(page.getByText('正在載入表單清單…')).toHaveCount(0) }
  165 |   try {
  166 |     await account(page, r, 'list-owner'); await account(other, r, 'non-owner')
  167 |     await r.step('L01 prepare 21 dedicated Forms through normal API', async () => {
  168 |       for (let i = 0; i < 21; i++) forms.push(await create(page, r, i === 0 ? 'list-shrink' : `list-${String(i + 1).padStart(2, '0')}`, i < 7 ? 'draft' : i < 14 ? 'published' : 'closed', i === 0))
  169 |       expect(forms.filter(f => f.status === 'draft')).toHaveLength(7); expect(forms.filter(f => f.status === 'published')).toHaveLength(7); expect(forms.filter(f => f.status === 'closed')).toHaveLength(7)
  170 |       await page.getByRole('button', { name: '刷新', exact: true }).click(); await listReady(10)
  171 |       await expect(page.getByRole('navigation', { name: '表單分頁' })).toContainText('第 1 頁 · 共 3 頁／21 筆')
  172 |       const lists = r.wires.filter(w => w.method === 'GET' && new URL(w.url).pathname === '/api/v1/forms')
  173 |       const first = JSON.parse(lists.at(-1)!.response!) as { items: { id: string }[] }
  174 |       expect(await table.locator('tbody tr a').evaluateAll(a => a.map(x => x.getAttribute('href')?.split('/')[2]))).toEqual(first.items.map(f => f.id))
  175 |       await page.getByRole('button', { name: '下一頁', exact: true }).click(); await listReady(10)
  176 |       await expect(page.getByRole('navigation', { name: '表單分頁' })).toContainText('第 2 頁')
  177 |       await page.getByRole('button', { name: '下一頁', exact: true }).click(); await listReady(1)
  178 |       await expect(page.getByRole('navigation', { name: '表單分頁' })).toContainText('第 3 頁')
  179 |       await page.screenshot({ path: `${root}/${r.runId}-page3.png` })
  180 |     })
  181 |     await r.step('L02 filter resets page1; actual row links / refresh keeps condition', async () => {
  182 |       for (const state of ['draft', 'published', 'closed']) {
  183 |         const query = page.waitForResponse(v => v.request().method() === 'GET' && new URL(v.url()).pathname === '/api/v1/forms' && new URL(v.url()).searchParams.get('status') === state)
  184 |         await page.getByLabel('狀態篩選', { exact: true }).selectOption(state); const response = await query; expect(response.status()).toBe(200)
  185 |         expect(new URL(response.url()).searchParams.get('page')).toBe('1'); expect(new URL(response.url()).searchParams.get('pageSize')).toBe('10')
  186 |         await listReady(7); await expect(page.getByRole('navigation', { name: '表單分頁' })).toContainText('第 1 頁 · 共 1 頁／7 筆')
  187 |         const row = forms.find(f => f.status === state && f.id !== forms[0]!.id)!
  188 |         await table.getByRole('link', { name: row.title, exact: true }).click()
  189 |         await expect(page).toHaveURL(`http://localhost:3000/forms/${row.id}${state === 'draft' ? '/edit' : ''}`)
  190 |         await page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '我的表單', exact: true }).click(); await listReady(10)
  191 |         await page.getByLabel('狀態篩選', { exact: true }).selectOption(state); await listReady(7)
  192 |         const refreshed = page.waitForResponse(v => v.request().method() === 'GET' && new URL(v.url()).pathname === '/api/v1/forms')
  193 |         await page.getByRole('button', { name: '刷新', exact: true }).click(); expect(new URL((await refreshed).url()).searchParams.get('status')).toBe(state); await listReady(7)
  194 |       }
  195 |       const all = page.waitForResponse(v => v.request().method() === 'GET' && new URL(v.url()).pathname === '/api/v1/forms')
  196 |       await page.getByLabel('狀態篩選', { exact: true }).selectOption(''); expect(new URL((await all).url()).searchParams.has('status')).toBe(false); await listReady(10)
  197 |       await page.screenshot({ path: `${root}/${r.runId}-desktop-list.png`, fullPage: true })
  198 |       await page.setViewportSize({ width: 390, height: 844 }); await expect(page.getByRole('list', { name: '我的表單卡片' }).locator(':scope > li')).toHaveCount(10)
  199 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  200 |       await page.screenshot({ path: `${root}/${r.runId}-mobile-list.png`, fullPage: true }); await page.setViewportSize({ width: 1440, height: 900 })
  201 |     })
  202 |     await r.step('L03 predeclared list-shrink Delete / page3 refresh aligns once to page2', async () => {
  203 |       await page.getByRole('button', { name: '下一頁', exact: true }).click(); await listReady(10)
  204 |       await page.getByRole('button', { name: '下一頁', exact: true }).click(); await listReady(1)
  205 |       const target = forms[0]!; expect(r.resources.find(v => v.id === target.id)?.deleteAllowed).toBe(true)
  206 |       await expect(table.getByRole('link', { name: target.title, exact: true })).toBeVisible(); await r.persist()
  207 |       expect((await call(page, `/forms/${target.id}`, 'DELETE')).status).toBe(204); r.resources.find(v => v.id === target.id)!.deleted = true; await r.persist()
  208 |       const before = r.wires.filter(w => w.method === 'GET' && new URL(w.url).pathname === '/api/v1/forms').length
  209 |       await page.getByRole('button', { name: '刷新', exact: true }).click(); await listReady(10)
  210 |       await expect(page.getByRole('navigation', { name: '表單分頁' })).toContainText('第 2 頁 · 共 2 頁／20 筆')
  211 |       await expect.poll(() => r.wires.filter(w => w.method === 'GET' && new URL(w.url).pathname === '/api/v1/forms').length).toBe(before + 2)
  212 |       const alignment = r.wires.filter(w => w.method === 'GET' && new URL(w.url).pathname === '/api/v1/forms').slice(before)
  213 |       expect(alignment.map(w => new URL(w.url).searchParams.get('page'))).toEqual(['3', '2']); expect(alignment.map(w => w.status)).toEqual([200, 200])
  214 |       expect((JSON.parse(alignment[0]!.response!) as { items: unknown[] }).items).toEqual([])
  215 |       await page.screenshot({ path: `${root}/${r.runId}-aligned-page2.png` })
  216 |     })
  217 |     await r.step('L04 six role/status pairs x Form and edit URL', async () => {
  218 |       for (const p of [page, other]) for (const state of ['draft', 'published', 'closed']) {
  219 |         const form = forms.find(f => f.status === state && f.id !== forms[0]!.id)!
  220 |         for (const edit of [false, true]) {
  221 |           const path = `/forms/${form.id}${edit ? '/edit' : ''}`
  222 |           if (p === other && state === 'draft') r.expected('GET', `/forms/${form.id}`, 404)
  223 |           await p.goto(path)
  224 |           if (p === other && state === 'draft') { await expect(p).toHaveURL(`http://localhost:3000${path}`); await expect(p.getByText('找不到表單', { exact: true })).toBeVisible() }
  225 |           else {
  226 |             await expect(p).toHaveURL(`http://localhost:3000/forms/${form.id}${state === 'draft' ? '/edit' : ''}`)
  227 |             if (state === 'draft') await expect(p.getByLabel('表單標題', { exact: true })).toHaveValue(form.title)
  228 |             else await expect(p.getByRole('heading', { name: form.title, exact: true })).toBeVisible()
  229 |           }
  230 |           if (p === other) { await expect(p.getByRole('button', { name: '刪除表單', exact: true })).toHaveCount(0); await expect(p.getByRole('button', { name: '關閉表單', exact: true })).toHaveCount(0) }
  231 |         }
  232 |       }
  233 |     })
  234 |     await r.step('L05 deleted / missing / invalid UUID retain URL', async () => {
  235 |       for (const [id, text] of [[forms[0]!.id, '找不到表單'], [randomUUID(), '找不到表單'], ['invalid-supplement-id', '連結無效']]) {
  236 |         r.expected('GET', `/forms/${id}`, text === '連結無效' ? 400 : 404)
  237 |         await page.goto(`/forms/${id}`); await expect(page).toHaveURL(`http://localhost:3000/forms/${id}`); await expect(page.getByText(text!, { exact: true })).toBeVisible()
  238 |       }
  239 |       const list = await call(page, '/forms?page=1&pageSize=100'); expect(list.status).toBe(200)
  240 |       expect((JSON.parse(list.body) as { pagination: { totalItems: number } }).pagination.totalItems).toBe(20)
  241 |       expect(r.wires.filter(w => w.method === 'PATCH')).toEqual([])
  242 |     })
  243 |     await r.step('L diagnostics / no intercepted business APIs', r.verify)
  244 |   } finally { await r.finish(page); await otherContext.close() }
  245 | })
```
