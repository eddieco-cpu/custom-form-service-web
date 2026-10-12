# F4 集中獨立 Code Review

日期：2026-10-12（Asia/Taipei）。審查提交與實際 HEAD 均為 `85cfd19fc0c96231c9ae083ed407789a67b693a3`，父提交 `9552dfdb365bc1253760f1faa47c7396c514f68a`；接手工作樹乾淨。已核對完整 28 檔 diff，包括產品、測試、組態、報告與去敏證據，三張合成截圖均實際檢視。

**有一項 P2 阻擋問題，F4 code review 尚不能判定通過。** 既有測試通過，但漏掉手動刷新後「自動對齊的第二支 GET 回 Auth 401」組合。未修改產品或既有測試，未建立真實帳號／表單、未提交／推送、不展開 F5；本報告不是正式驗收或 accepted。

## Finding：F4-R1／P2 — 自動對齊丟失手動刷新流程的 Auth Dialog 語意

位置：[useFormsList.ts:19](../../app/composables/useFormsList.ts#L19)～20；相關判斷 [form-read.ts:59](../../app/domain/form-read.ts#L59)、72～77。

已成功載入第 3 頁時按「刷新」，第一支 GET 回 200、`totalPages=2`，會修改 query 並啟動第 2 頁 GET。query 的同步 watcher 正確清除前條件 snapshot，但第二次 `reader.read()` 又從當下 `state.data` 計算 `hadData=false`。因此即使仍傳入 `manual=true`，第二支 GET 的 `AUTH_TOKEN_EXPIRED` 不會建立 Dialog，而是直接 replace 登入頁。

fresh built 產品＋合成 API 已重現：初始 21 筆 → 第 3 頁手動刷新回 11 筆 → 第 2 頁回 `401 AUTH_TOKEN_EXPIRED`；只送兩支刷新 GET，沒有點 Dialog 關閉，即到 `/login?redirect=/forms?probe=alignment`，Dialog 數量為 0。User／私有資料確實清除、redirect 正確，問題是跳過已核准的操作中 Auth 提示與關閉時點。此分支也涵蓋另外兩種正式 session failure code。

依據：核准 F4 v1.0 §3「已有資料後手動刷新／重讀正式 Auth 401」與「自身 Auth 失效保留 Dialog」；前端 04 §5.2／05 §7 要求操作 Auth Dialog 的關閉／× 後才返回登入。一次 UI 刷新中的自動對齊應延續原操作語意，不能因清除舊 query 資料而變成首次載入。建議保留這次手動流程起點的 Auth 呈現政策，並繼續維持 query／session 的清資料與 stale guard；不要為了 Dialog 保留前條件 items。

修正後應補驗：對齊第二支 GET 的三種 Auth 401 顯示 Dialog、兩種關閉才 replace；外部 session／route 變更仍撤銷此流程。沿用正常縮頁、再次縮頁停止、空清單不重查與 stale filter 檢查。**本次只提出修正要求，未執行修正。**

重現原件為 ignored `output/playwright/f4-independent-review/alignment-auth-probe.mjs`／`.json`，hash 與去敏觀察見 [獨立驗證摘要](evidence/F4_Independent_Verification_20261012.json)。首次 probe 使用過窄的 URL glob，雖已觀察到登入導航但等待 timeout；改為 pathname matcher 後重現完成，產品未變。

## 五項審查結論

| 重點 | 結論與證明範圍 |
| --- | --- |
| query／snapshot、刷新與分頁 | query 改變以同步 scope watcher 清資料；同條件刷新失敗保留成功 snapshot／錯誤標示。session 變動清資料，沒有跨頁 cache。自動對齊最多一次、0 頁回 1 不重查、再次縮頁停止均通過。對齊後 Auth 流程有 R1。 |
| 最新 FormDetail／Owner／路由／錯誤 | Owner 用當前 User.id 與最新 userId；Draft Owner Form→edit、兩角色 Published／Closed edit→Form 使用 replace，目標頁再次 GET。formId 由 API 在 Auth 後驗證，僅對 formId details 顯示連結無效；404 原 URL、disabled 保留 User／登出、初次資源 401 返回完整 URL。截止提示不改 status、不導首頁。未發現其他阻擋問題。 |
| stale 副作用與 Dialog | success／error／Auth callback／導航前檢查 current；scope.finish 只結束其 ticket 的 loading。自己的 revision 失效保留既有 Auth Dialog，外部 key／session／dispose 撤銷；deferred unit 與 mounted 產品 loader Browser 通過。R1 為對齊後尚未建立 Dialog 的操作語意缺失。 |
| 實際產品與 harness | unit 直接 import 產品 controller／service／client；dev fixture 的 srcDir 指向產品 app，session harness 只由測試 config 的 pages hook 加入。根 Nuxt config 未引入該 hook；fresh built client／server／generated JS 搜尋 harness route、component 與控制文字均無匹配。built 10 案實際走產品。 |
| F4 範圍 | Form service 僅 GET list／detail；沒有 Form 寫入、Latest／Count／Statistics、定義／答案持久化或 F5 功能。既有 new／statistics 頁殼與 F2／F3 共用程式未改。Browser 對非預期 API／寫入設斷言，全部為零。 |

## 獨立驗證與分次證據適用性

本次環境：Node **24.21.0**、npm **11.19.0**；lockfile／installed 套件沿交付，Nuxt 4.6.1／UI 4.11.3／TypeScript 5.9.3／Vitest 5.0.3／Playwright 1.64.0／Chromium 156.0.8078.4。沒有安裝或升級依賴。Browser 使用 `http://localhost:3000` 的實際產品程式，API 全部合成攔截，**不代表真實整合 PASS**。

| 本次實際執行 | 結果 |
| --- | --- |
| `npm run lint` | **PASS**，exit 0 |
| `npm run typecheck` | **PASS**，Nuxt＋tools strict，exit 0 |
| `node node_modules/nuxt/bin/nuxt.mjs typecheck tests/fixtures/f4/browser` | **PASS**，產品 app＋session fixture strict，exit 0 |
| `npm run build` | **PASS**，fresh CSR build，exit 0 |
| `npm run test:unit -- tests/unit/f4-form-read.spec.ts tests/unit/api-client.spec.ts tests/unit/scoped-state.spec.ts tests/unit/f3-auth.spec.ts` | **124／124 PASS**，4 檔；初次 sandbox spawn EPERM、0 案執行，經自動核准重跑，非產品 FAIL |
| F4 dev fixture 全部既有 Browser | **14／14 PASS**，fresh 一次完整執行，0 skipped／flaky／retry |
| fresh built，`--grep 'F4-B01\|F4-B02\|F4-B03\|F4-B05\|F4-B06'` | **10／10 PASS**，清單、對齊、五組角色 replace、兩種 Auth Dialog close、stale filter；0 skipped／flaky／retry |
| built 對齊＋Auth 邊界 probe | **R1 缺陷已重現**；重現腳本斷言成功，不計入產品 PASS |
| `git diff --check 85cfd19^ 85cfd19` | **PASS** |
| 原交付／來源完整性 | **30／30 最終來源、28／28 raw、5／5 沿用證據、4／4 交付證據 hash 相符**；backend manifest **108／108** 相符 |

Browser 命令沿 `npm run test:e2e -- --config=playwright.f4.config.ts`，本次另外指定 `--reporter=list,json`／`--output=output/playwright/f4-independent-review/...` 與 `PLAYWRIGHT_JSON_OUTPUT_NAME`，built 指定 `F4_MODE=built`。完整命令、逐案結果／時間及原件 hash 在驗證摘要；原開發 raw 未覆寫。lint／typecheck／build／unit 的執行輸出在本次工具紀錄，沒有宣稱另存其完整 log。

原開發證據確為分次：dev 第二轮 11 PASS／2 locator FAIL、再兩案 PASS；built 主流程 8、視覺 2、最後 B02 1。開發報告未冒稱 fresh 全部 PASS，歷史失敗／重測均保留。最後分頁修正的最終程式影響 `useFormsList.load()` 的 notice 初始化與遞迴傳遞，涉及清單／對齊／刷新與 stale filter，未改 detail／共用 Auth／client。最後 B02 有 fresh build 後的三種對齊檢查；本次再以最終 HEAD 完整 dev 14 案及 built B01／B02／B06 重跑，故不以分次歷史結果代替最終驗證。原證據未提供每一次執行時的全套 source hashes，無法逐次還原當時所有 bytes；本次 fresh 驗證直接覆蓋目前程式。

F2 原生 30 秒 read timeout／精度時間 adapter 與 F3 Cookie／CORS／無效 Cookie／焦點 helper 沿用有效歷史證據；相關產品／配置／依賴對父提交無 diff，沿用報告／摘要 hash 已核對。本次額外重跑 F4 指定的共用 unit，不全面重跑 F2／F3 Browser。NO_COLOR／FORCE_COLOR、build DEP0155 及合成 `#target` 缺錨點 warning 沿既有工具診斷；既有 Browser 的非預期 console／page error 斷言均通過。

## 未驗證事項與停止點

- 真實非空本人清單、≥11 筆分頁、非空 filter／刷新、Owner Draft、Published／Closed 跨角色導向、非 Owner Draft／已刪除 404、真實截止提示：**BLOCKED**，沒有可用的指定表單／帳號測資，不建立新表單或以 fixture 解除。
- 真實 Form INVALID／EXPIRED 401、disabled／首次 me disabled、受控 network／timeout／500／異常 Body／晚回：**BLOCKED**，受控前置未具備。R1 本次只用合成回應重現。
- 原 F4-L01 真實空清單／新帳號／Cookie reload／CORS／不存在及無效 ID／AUTH_REQUIRED 結果保留且 hash 相符；**本次 NOT RUN**。該既有測試會新增帳號，本次不為重複未變共用證據另建帳號，也無原保留帳號的登入憑證可用。
- live 後端 Git SHA／process checkout／DB 版本仍 **UNCONFIRMED**。使用唯讀 `backend-ref/` 2026-10-11 快照、來源 `7591633137c5a6f57c1fce8e1ba19ab394015880` 作契約審查，不能代稱 live 版本；本次未操作後端／DB。
- 正式 AI／人工驗收、其他 Browser／人工實機、npm ci／audit／generate：**NOT RUN**；原安裝／audit 缺口保留，不代填 accepted。

引用：AGENTS v1.1、核准 F4 v1.0、總計畫 v1.3 F4／§7／§7.1、前端 00～07（02／06 v1.1、其餘 v1.0）；後端 Part A／B／Errors v1.0、Domain v1.1 的 Auth、List／Detail、Deadline／存取章節。未發現 F4 的前後端契約衝突。

只新增本報告與去敏驗證摘要，原產品／測試／規格／進度／歷史證據 bytes 保留。HEAD 未變，兩份交付文件未提交；執行產物留 ignored `output/playwright/f4-independent-review/`。**停止於 F4 review findings 交付，等待 Owner 指定修正；不展開正式驗收或下一輪。**
