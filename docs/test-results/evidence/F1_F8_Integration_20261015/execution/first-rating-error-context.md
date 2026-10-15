# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: integration-supplement.spec.ts >> Supplement D02-D03 M07 R03-R05: persisted sort, Preview, Range zero, clear and Latest consent
- Location: tests\e2e\integration-supplement.spec.ts:247:1

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('[data-renderer-key]').filter({ has: getByText('星級題', { exact: true }) }).getByRole('button', { name: '清除答案', exact: true })

```

# Page snapshot

```yaml
- generic [ref=f2e1]:
  - generic [ref=f2e3]:
    - banner [ref=f2e4]:
      - generic [ref=f2e5]:
        - generic [ref=f2e6]: 自建表單
        - navigation "主要導覽" [ref=f2e7]:
          - button "建立表單" [ref=f2e8]
          - button "我的表單" [ref=f2e9]
          - button "個人資訊" [ref=f2e10]
          - button "首頁" [ref=f2e11]
        - button "使用者選單" [ref=f2e12]:
          - generic [ref=f2e15]: 補驗 interactive-owner
    - main [ref=f2e16]:
      - generic [ref=f2e17]:
        - generic [ref=f2e18]:
          - heading "表單" [level=1] [ref=f2e19]
          - button "重新載入表單" [ref=f2e20]
        - generic [ref=f2e23]:
          - heading "supp-1792063345458-e2ba36 互動專用" [level=2] [ref=f2e24]
          - paragraph [ref=f2e25]: 建立者：補驗 interactive-owner
          - generic [ref=f2e26]: 已發布
          - generic [ref=f2e28]:
            - generic [ref=f2e29]:
              - term [ref=f2e30]: 填答模式
              - definition [ref=f2e31]: 可多次填答
            - generic [ref=f2e32]:
              - term [ref=f2e33]: 填答身分
              - definition [ref=f2e34]: 匿名
            - generic [ref=f2e35]:
              - term [ref=f2e36]: 結果可見性
              - definition [ref=f2e37]: 所有人
            - generic [ref=f2e38]:
              - term [ref=f2e39]: 截止時間
              - definition [ref=f2e40]: 未設定
          - paragraph [ref=f2e41]: 時間以台北時區顯示。表單定義唯讀；結果可見範圍可由建立者調整。
          - generic "表單次要資訊" [ref=f2e42]:
            - generic [ref=f2e43]:
              - term [ref=f2e44]: 表單 ID
              - definition [ref=f2e45]: 371c30cd-ebca-469c-973e-f287be14cae7
            - generic [ref=f2e46]:
              - term [ref=f2e47]: 建立時間
              - definition [ref=f2e48]: 2026-10-15 19:22:26
            - generic [ref=f2e49]:
              - term [ref=f2e50]: 更新時間
              - definition [ref=f2e51]: 2026-10-15 19:22:28
        - paragraph [ref=f2e52]: 最近一次提交：2026-10-15 19:22:29
        - generic [ref=f2e53]:
          - generic [ref=f2e54]:
            - article [ref=f2e55]:
              - heading "1. 數字題" [level=3] [ref=f2e56]
              - generic [ref=f2e57]: 數字題
              - textbox "數字題" [ref=f2e58]
            - article [ref=f2e59]:
              - heading "2. 文字題" [level=3] [ref=f2e60]
              - generic [ref=f2e61]: 文字題
              - textbox "文字題" [ref=f2e62]
            - article [ref=f2e63]:
              - heading "3. 單選題" [level=3] [ref=f2e64]
              - combobox "單選題" [ref=f2e65]:
                - option "請選擇" [selected]
                - option "單一"
                - option "單二"
            - article [ref=f2e66]:
              - heading "4. 多選題" [level=3] [ref=f2e67]
              - generic [ref=f2e68]:
                - generic [ref=f2e69]:
                  - checkbox "多一" [active] [ref=f2e70]
                  - generic [ref=f2e71]: 多一
                - generic [ref=f2e72]:
                  - checkbox "多二" [ref=f2e73]
                  - generic [ref=f2e74]: 多二
            - article [ref=f2e75]:
              - heading "5. 星級題" [level=3] [ref=f2e76]
              - generic [ref=f2e77]:
                - paragraph [ref=f2e78]: 0 分
                - generic [ref=f2e79]:
                  - radio "0 分" [checked] [ref=f2e80]
                  - generic [ref=f2e81]: 0 分
                - radiogroup "星級題" [ref=f2e82]:
                  - radio "1 分" [ref=f2e83]: ★
                  - radio "2 分" [ref=f2e84]: ★
                  - radio "3 分" [ref=f2e85]: ★
                  - radio "4 分" [ref=f2e86]: ★
                  - radio "5 分" [ref=f2e87]: ★
                - button "清除答案" [ref=f2e88]
            - article [ref=f2e89]:
              - heading "6. 滑桿題" [level=3] [ref=f2e90]
              - generic [ref=f2e91]:
                - paragraph [ref=f2e92]: 0 分
                - slider "滑桿題" [ref=f2e93]: "0"
                - button "清除答案" [ref=f2e94]
          - generic [ref=f2e95]:
            - button "提交表單" [ref=f2e96]
            - button "查看我的填答" [ref=f2e97]
        - generic "表單管理" [ref=f2e98]:
          - group "結果可見範圍" [ref=f2e99]:
            - generic [ref=f2e101]:
              - radio "僅建立者" [ref=f2e102]
              - text: 僅建立者
            - generic [ref=f2e103]:
              - radio "填答者" [ref=f2e104]
              - text: 填答者
            - generic [ref=f2e105]:
              - radio "所有人" [checked] [ref=f2e106]
              - text: 所有人
            - paragraph [ref=f2e107]: 切換後立即保存，其他表單定義須另按保存。
          - generic [ref=f2e108]:
            - button "關閉表單" [ref=f2e109]
            - button "刪除表單" [ref=f2e110]
          - button "查看填答人數" [ref=f2e112]
          - generic [ref=f2e113]:
            - button "複製填答連結" [ref=f2e114]
            - paragraph [ref=f2e115]: 填答連結需要登入；已截止的表單不可提交。
  - region "Notifications (F8)":
    - list
```

# Test source

```ts
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
  246 |
  247 | test('Supplement D02-D03 M07 R03-R05: persisted sort, Preview, Range zero, clear and Latest consent', async ({ page, context }, info) => {
  248 |   const r = recorder(info); r.observe(page, 'interactive-owner')
  249 |   let dto!: Form
  250 |   async function submit() {
  251 |     const wire = page.waitForResponse(v => v.url() === `${api}/forms/${dto.id}/responses` && v.request().method() === 'POST')
  252 |     await page.getByRole('button', { name: '提交表單', exact: true }).click()
  253 |     const response = await wire; expect(response.status()).toBe(201)
  254 |     const receipt = JSON.parse(await response.text()) as { id: string; answers: { questionId: string; value: unknown }[] }
  255 |     await expect(page.getByRole('dialog', { name: '提交成功' })).toBeVisible()
  256 |     await page.getByRole('button', { name: '完成', exact: true }).click()
  257 |     const latest = await call(page, `/forms/${dto.id}/responses/me/latest`); expect(latest.status).toBe(200); expect(JSON.parse(latest.body)).toEqual(receipt)
  258 |     return receipt
  259 |   }
  260 |   try {
  261 |     await account(page, r, 'interactive-owner')
  262 |     const created = await call(page, '/forms', 'POST', { title: `${r.runId} 互動專用`, responseMode: 'multiple', resultVisibility: 'public', questions: [
  263 |       { type: 'text', title: '文字題', sortOrder: 0, config: { variant: 'textarea' } },
  264 |       { type: 'number', title: '數字題', sortOrder: 1, config: {} },
  265 |       { type: 'single_choice', title: '單選題', sortOrder: 2, config: { variant: 'select' }, options: [{ label: '單一', value: 'one', sortOrder: 0 }, { label: '單二', value: 'two', sortOrder: 1 }] },
  266 |       { type: 'multiple_choice', title: '多選題', sortOrder: 3, config: {}, options: [{ label: '多一', value: 'one', sortOrder: 0 }, { label: '多二', value: 'two', sortOrder: 1 }] },
  267 |       { type: 'rating', title: '星級題', sortOrder: 4, config: { variant: 'stars', min: 0, max: 5 } },
  268 |       { type: 'rating', title: '滑桿題', sortOrder: 5, config: { variant: 'range', min: 0, max: 5 } },
  269 |     ] })
  270 |     expect(created.status).toBe(201); dto = JSON.parse(created.body) as Form
  271 |     r.resources.push({ id: dto.id, purpose: 'interactive sort/Preview/Range/Latest/share; retained', status: 'draft', deleteAllowed: false }); await r.persist()
  272 |     await page.goto(`/forms/${dto.id}/edit`)
  273 |     await r.step('D02 UI sort persists IDs, no-op remains disabled', async () => {
  274 |       await page.getByRole('button', { name: '題目 2 上移', exact: true }).click()
  275 |       const save = page.waitForResponse(v => v.url() === `${api}/forms/${dto.id}` && v.request().method() === 'PATCH')
  276 |       await page.getByRole('button', { name: '保存', exact: true }).click(); expect((await save).status()).toBe(200)
  277 |       const read = await call(page, `/forms/${dto.id}`); expect(read.status).toBe(200)
  278 |       const changed = JSON.parse(read.body) as Form
  279 |       expect(changed.questions.map(q => q.id)).toEqual([dto.questions[1]!.id, dto.questions[0]!.id, ...dto.questions.slice(2).map(q => q.id)])
  280 |       expect(changed.questions.slice(2).map(q => q.options)).toEqual(dto.questions.slice(2).map(q => q.options))
  281 |       dto = changed; await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
  282 |     })
  283 |     await r.step('D03 Preview independent answers; reopen empty; dirty SPA cancel/accept', async () => {
  284 |       const before = r.wires.filter(w => w.method === 'POST' && w.url.endsWith('/responses')).length
  285 |       await page.getByRole('button', { name: '預覽', exact: true }).click()
  286 |       const preview = page.getByRole('dialog', { name: '預覽', exact: true })
  287 |       await preview.getByLabel('文字題', { exact: true }).fill('只在預覽存在')
  288 |       await preview.getByRole('button', { name: '關閉預覽', exact: true }).click()
  289 |       await page.getByRole('button', { name: '預覽', exact: true }).click(); await expect(preview.getByLabel('文字題', { exact: true })).toHaveValue('')
  290 |       await preview.getByRole('button', { name: '關閉預覽', exact: true }).click(); await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
  291 |       expect(r.wires.filter(w => w.method === 'POST' && w.url.endsWith('/responses'))).toHaveLength(before)
  292 |       await page.getByLabel('表單標題', { exact: true }).fill(`${r.runId} 未保存`)
  293 |       const nav = page.getByRole('navigation', { name: '主要導覽', exact: true }).getByRole('button', { name: '我的表單', exact: true })
  294 |       await native(page, r, false, () => nav.click()); await expect(page.getByLabel('表單標題', { exact: true })).toHaveValue(`${r.runId} 未保存`)
  295 |       await native(page, r, true, () => nav.click()); await expect(page).toHaveURL('http://localhost:3000/forms')
  296 |       await page.goto(`/forms/${dto.id}/edit`); await expect(page.getByLabel('表單標題', { exact: true })).toHaveValue(dto.title)
  297 |     })
  298 |     await page.getByRole('button', { name: '發布', exact: true }).click(); await page.getByRole('button', { name: '確認發布', exact: true }).click()
  299 |     await expect(page).toHaveURL(`http://localhost:3000/forms/${dto.id}`); r.resources[0]!.status = 'published'
  300 |     await r.step('R03 Range untouched / focus is no answer; first receipt empty', async () => {
  301 |       await page.getByRole('slider', { name: '滑桿題', exact: true }).focus(); await page.keyboard.press('Tab')
  302 |       expect((await submit()).answers).toEqual([])
  303 |     })
  304 |     await r.step('R03 all six answers including number0 Stars0 Range0', async () => {
  305 |       await page.getByLabel('文字題', { exact: true }).fill('第一份完整')
  306 |       await page.getByLabel('數字題', { exact: true }).fill('0')
  307 |       await page.getByRole('combobox', { name: '單選題', exact: true }).selectOption(dto.questions[2]!.options[0]!.id)
  308 |       await page.getByLabel('多一', { exact: true }).check(); await page.getByRole('radio', { name: '0 分', exact: true }).check()
  309 |       await page.getByRole('slider', { name: '滑桿題', exact: true }).press('Home')
  310 |       const receipt = await submit(); expect(receipt.answers).toHaveLength(6)
  311 |       expect(receipt.answers.filter(v => v.value === 0)).toHaveLength(3)
  312 |     })
  313 |     await r.step('R03 optional clear all types produces [] / independent Latest', async () => {
  314 |       await page.getByLabel('文字題', { exact: true }).fill(''); await page.getByLabel('數字題', { exact: true }).fill('')
  315 |       await page.getByRole('combobox', { name: '單選題', exact: true }).selectOption(''); await page.getByLabel('多一', { exact: true }).uncheck()
> 316 |       for (const title of ['星級題', '滑桿題']) await page.locator('[data-renderer-key]').filter({ has: page.getByText(title, { exact: true }) }).getByRole('button', { name: '清除答案', exact: true }).click()
      |                                                                                                                                                                                                ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
  317 |       expect((await submit()).answers).toEqual([])
  318 |     })
  319 |     await r.step('R05 Latest dirty cancel retains; consent completely clears', async () => {
  320 |       await page.getByLabel('文字題', { exact: true }).fill('取消必須保留')
  321 |       await native(page, r, false, () => page.getByRole('button', { name: '查看我的填答', exact: true }).click())
  322 |       await expect(page.getByLabel('文字題', { exact: true })).toHaveValue('取消必須保留')
  323 |       await native(page, r, true, () => page.getByRole('button', { name: '查看我的填答', exact: true }).click())
  324 |       await expect(page.getByLabel('文字題', { exact: true })).toHaveValue('')
  325 |       await page.screenshot({ path: `${root}/${r.runId}-latest-cleared.png`, fullPage: true })
  326 |       const before = r.wires.filter(w => w.url.endsWith('/responses/me/latest')).length
  327 |       await page.reload(); await expect(page.getByLabel('文字題', { exact: true })).toHaveValue('')
  328 |       expect(r.wires.filter(w => w.url.endsWith('/responses/me/latest'))).toHaveLength(before)
  329 |     })
  330 |     await r.step('M07 real Clipboard URLs / Closed Statistics link route', async () => {
  331 |       await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:3000' })
  332 |       await page.getByRole('button', { name: '複製填答連結', exact: true }).click()
  333 |       expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://localhost:3000/forms/${dto.id}`)
  334 |       await page.getByRole('button', { name: '關閉表單', exact: true }).click(); await page.getByRole('button', { name: '確認關閉', exact: true }).click()
  335 |       await expect(page.getByRole('button', { name: '複製統計連結', exact: true })).toBeVisible()
  336 |       await page.getByRole('button', { name: '複製統計連結', exact: true }).click()
  337 |       expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://localhost:3000/forms/${dto.id}/statistics`)
  338 |       await page.getByRole('link', { name: '查看統計', exact: true }).click(); await expect(page).toHaveURL(`http://localhost:3000/forms/${dto.id}/statistics`)
  339 |       r.resources[0]!.status = 'closed'
  340 |     })
  341 |     await r.step('D/R diagnostics / real credentialed CORS', r.verify)
  342 |   } finally { await r.finish(page) }
  343 | })
  344 |
```
