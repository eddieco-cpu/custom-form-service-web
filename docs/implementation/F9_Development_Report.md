# F9 開發報告 — 獨立 Statistics

版本：1.0／2026-10-15（Asia/Taipei）。**F9 開發完成、待集中 review。** Owner 已通過 [F9 精簡實作計畫 v1.0](F9_Implementation_Plan.md)，授權整輪開發、必要自測、範圍內修正、受影響回歸、§6 正常 API 測資準備及單一目的本機提交；三份規劃文件一併核准。全輪未新增中途核准關卡。本報告記錄開發自測；集中 review／正式 AI 驗收／人工驗收未執行，accepted 不變。

## 1. 接手、來源與實際版本

- 前端 `C:\Users\user\Desktop\custom-form-service-web`／master，接手 HEAD **`e25fe36ce887ce9a74fcbc66ee14e9edb4b7adf0`**，與指定基準一致。開發前只有已核准的 README、總計畫與 F9 計畫三份變更，沒有其他使用者未提交變更。
- 依 [AGENTS v1.1](../../AGENTS.md)、[round-development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫 v1.3](V1_Frontend_Implementation_Plan.md) F9／§7／§7.1 與核准 v1.0 執行。前端 00／01／03／04／05／07 v1.0、02／06 v1.1；Statistics 重點為 03 §10～12、04 §2～6／§9～12、05 §2～3／§6／§8～10、06 §4～6／§8／§10～11、07 §8～10。後端正式八份契約版本與章節見計畫 §1；未發現需修改 API 或產品規則的來源衝突。
- 唯讀 backend-ref manifest **108／108** 相符；實際後端 `C:\Users\user\Desktop\custom-form-service`／master／**`7591633137c5a6f57c1fce8e1ba19ab394015880`**，八份正式 specs bytes 一致，既存 `?? SNAPSHOT.md` 未動。
- [後端 metadata](evidence/F9_20261015/backend-metadata.json)：既有 PID **34068** 的 dotnet command 指向該 checkout 的 Debug/net10.0 `CustomFormService.Api.dll`；ProductVersion `1.0.0+7591633137c5a6f57c1fce8e1ba19ab394015880`，SHA-256 `06e2a62db9c4376701e75b0ce3e7283d34b129d378c884e33fb1cb764a0af180`。開發前與收尾 health／ready／OpenAPI 均 200，OpenAPI 3.1.1／info.version 1.0.0 含 Statistics GET；[收尾觀察](evidence/F9_20261015/health-openapi.json)。本輪未查 DB identity／migration／DI provider；先前報告的觀察不當成本輪證據。
- Node **24.21.0**／npm **11.19.0**；15 項直接依賴與 lockfile 相符，沿 Nuxt 4.6.1／Nuxt UI 4.11.3／Tailwind 4.3.3／TypeScript 5.9.3／Vitest 5.0.3／Playwright 1.64.0／lossless-json 4.3.1。沒有安裝或升級依賴；見 [installed](evidence/F9_20261015/installed-packages.json)。
- 真實 Origins 為 `http://localhost:3000` 與 `http://localhost:5000`，API Base URL `http://localhost:5000/api/v1`；CSR／strict／credentials=include／30 秒 timeout／零自動 retry。preview listener 綁 IPv4 `127.0.0.1:3000`，Browser URL 與 Cookie／CORS 仍全用 localhost。[source／build digest](evidence/F9_20261015/build-source.json) 包含每份產品來源、build assets 與 server entry SHA-256；產品來源 digest **`3547457891d3165544b00165c7db58e15023f04f740f48697f7632c8d52d00f2`**。

## 2. 實作與範圍

| 檔案 | 實際行為與目的 |
| --- | --- |
| `app/services/statistics.ts` | 唯一 Statistics GET；encode formId、沿既有 lossless decoder、核對成功資源 ID；不預查 Form／Latest／Count，也不先以 UUID 或 Header 判存取權。 |
| `app/domain/statistics-read.ts`、`app/composables/useStatistics.ts` | 當頁 DTO／loading／錯誤／Auth flow 與 RequestScope。Stats 與初始化 me 並行；bootstrap 不撤下 public 200。真正 credential change 清私人名單並依新身分讀取；Logout 沿 Header replace，不增加 Stats GET。重試先撤舊內容，所有採用／Auth 副作用／導航／finally 均受當次 scope／path／credential 世代限制。 |
| `app/domain/statistics-view.ts`、`app/components/statistics/*`、Statistics page | 九欄位 Root 的顯示投影、五題型完整分布、三層 count、API 排序、同標籤／同名不同 ID、零票與零資料；Number 顯示 ExactNumber token，Deadline 以台北時間到秒，原始 DTO 精度保留。文字純文字／換行，長答案、名單與全部題目可捲讀；無自行聚合、補 config／Owner／身分欄位或管理面板。 |
| `app/domain/auth-state.ts` | App 私有 `subscribe` 通知，明確區分 bootstrap／credential-change 與 verify／login／logout／invalidate／profile 原因。來源沿 initialize→verify→candidate→applyRead／invalidate 傳遞。既有 User DTO、sessionRevision、舊 me generation 語意保留；同 ID Profile 改名不發換身分通知。 |
| F9 unit／Browser／live、`playwright.f9.config.ts`、薄 fixture plugin | 產品 fresh build、測試用獨立 build、真實後端分開；薄 plugin 只注入 Session／router 事件，實際 Statistics 頁不複製、產品不含測試入口。plugin 由獨立 strict app tsconfig 檢查，tools tsconfig 排除該 client plugin 的 Node scope。 |
| `tests/e2e/f3-browser.spec.ts` | F3 登入返回的舊 mock 補上目前 F4 清單會發出的精確 GET `/forms` 空清單回應，既有斷言維持；其他未宣告請求仍失敗。 |

首次 private Auth 401 直接 replace 到合法完整 path＋query＋hash；已有成功資料的手動讀取遇 Auth 401，先清資料再顯示不可 Esc／遮罩關閉的 Dialog，關閉／×走同一返回。自身失效通知不造成循環；外部換身分／換頁撤銷舊 flow。403 停用與無權、404、409 未開放、400 formId 明細、network／timeout／500／異常 Body 依 Statistics 分流留原 URL；me 錯誤不代替此 Endpoint 決定。

匿名 Items 不建立 respondents 或替代 ID；具名僅列該 Item 的完整名單，0 票 []、同名不合併，不產生跨題原始答卷。新頁、換 ID／Session、卸載、失敗重讀皆不恢復舊統計。前端既有 decoder／日期／精確值機制直接沿用，未擴增 Endpoint、BFF、資料持久化或統計快取。

## 3. 工程與 fixture 自測

所有逐案 PASS／FAIL／NOT RUN 與完整歷史見 [case-results](evidence/F9_20261015/case-results.json)，摘要見 [verification-summary](evidence/F9_20261015/verification-summary.json)。下表採最終有效案例，沒有把重跑加成新的覆蓋數。

| 方法／實際命令 | 結果及證據 |
| --- | --- |
| `npm run lint` | **PASS**；[log](evidence/F9_20261015/commands/lint-final.log)。 |
| `npm run typecheck` | **PASS**，Nuxt strict＋tools strict；[log](evidence/F9_20261015/commands/typecheck-final.log)。 |
| `npm run build` | **PASS**，全產品 fresh build 後才執行 Browser／live；[log](evidence/F9_20261015/commands/f9-build-first.log)。之後沒有改產品來源。 |
| `node node_modules/nuxt/bin/nuxt.mjs build tests/fixtures/f9/browser`；`node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tests/fixtures/f9/browser/tsconfig.json` | **PASS**，隔離 harness build／strict；[build](evidence/F9_20261015/commands/harness-build-final.log)、[strict](evidence/F9_20261015/commands/harness-typecheck-final.log)。 |
| `npm run test:unit -- tests/unit/f9-statistics-read.spec.ts tests/unit/f9-statistics-view.spec.ts tests/unit/f3-auth.spec.ts tests/unit/scoped-state.spec.ts tests/unit/api-client.spec.ts tests/unit/exact-number-gate.spec.ts tests/unit/common-adapters.spec.ts --reporter=json --outputFile=output/playwright/f9/unit-final-results.json` | **185／185 PASS**，其中 F9 read 31／view 12；[逐案 reporter](evidence/F9_20261015/commands/unit-final-results.json)。測試 TEMP／TMP 指向 ignored `output/playwright/f9/tmp`。 |
| `npm run test:e2e -- --config=playwright.f9.config.ts`，built 首輪與 `--grep 'private\|guest Header\|bad-Cookie'` 修正重測 | **23 個產品案例最終 PASS**；[首輪](evidence/F9_20261015/browser/built-network-retry-results.json)、[重測](evidence/F9_20261015/browser/built-locator-retest-results.json)。首輪 17 PASS／4 FAIL，新增公開壞 Cookie 2 案；重測 7 PASS 包含已通過的 timeout 案 1 次。 |
| `F9_MODE=harness`、`--grep 'F9-B02'` | **8／8 harness 案例 PASS**；[reporter](evidence/F9_20261015/browser/harness-initial-results.json)。同一 component 換 ID／慢 200／401／403／B loading、pending 換 Login／verify／卸載、F6／F8 dirty 取消與確認。另 1 個產品 build 案依模式 skipped，已於產品 build 通過。 |
| `F9_MODE=regression`，grep F3 B01／02／06／07／08／10／15／16、F7 logout／ActiveDirtyScope、F8 換身分／dirty | **24 個受影響案例最終 PASS**；[23 PASS／1 FAIL 原件](evidence/F9_20261015/browser/regression-auth-results.json)、[F3 B02 補 mock 後 1 PASS](evidence/F9_20261015/browser/regression-f3-return-retest-results.json)。涵蓋初始化共用、登入返回、同 ID 姓名更新、失效 Dialog、登出與 F7 pending／unknown／stale、F8 新身分清資格。 |
| `F9_CHANNEL=chrome`／`msedge`，grep `public bad-Cookie AUTH_TOKEN_INVALID\|private AUTH_REQUIRED` | **Chrome 2／2、Edge 2／2 PASS**；[Chrome](evidence/F9_20261015/browser/built-chrome-smoke-results.json)、[Edge](evidence/F9_20261015/browser/built-msedge-smoke-results.json)。fixture smoke，沒有冒稱真實壞 Cookie。 |

上述 fixture Browser 最終共 **59 個 PASS**：F9 Chromium 31（產品 23＋harness 8）、跨輪 24、Chrome／Edge 各 2。Chromium **156.0.8078.4**、Chrome **156.0.8078.12**、Edge **155.0.4283.45**。明確宣告 method／URL／status／requestfailed／console diagnostic 次數；原失敗不刪除，沒有把觀察到的非預期請求自動加入 allowance。

Browser 競態案例包含真實 Abort 與產品頁 context 切換；被 Abort 的舊請求不冒稱已向 Browser 交付舊 Body。不可取消的 deferred 200／401／403 與晚 finally 採用／副作用隔離另由 unit 逐案證明。

大量內容 fixture 完整驗 30 題、文字題 200 分布、具名 Item 120 人、2000 Code Points 多行文字、Rating 0～100 的 101 列；首／中／末節點、人數／同名、390px 無水平溢位、捲至名單末端與鍵盤重試／查看表單均通過。已目視 [手機名單](evidence/F9_20261015/images/mobile-long-names.png) 及 [真實完整統計](evidence/F9_20261015/images/live-current-names.png)；這些不代替實機觸控／safe-area 的人工確認。

## 4. L01～L03 真實 Browser＋後端

使用同一 fresh 產品 build＋preview；沒有 route／業務 API 攔截。三 Active 專用帳號 A Owner／B Respondent／C 未填者，另 guest Context。正常 API 建立、發布、填答、關閉，以及專用姓名／Visibility 更新；真實 HttpOnly／Lax／localhost Cookie。固定輸入另建完整 Root／Question／Item／Respondent 預期，對原始完整 Body、UI、獨立 GET 核對；使用測試自己的 oracle，不以產品 view mapper 或同一 API 的數字自比。精確 Number 以數值等值比較，Deadline 以完整 tick 比較 UTC 瞬間，原文 Body 保留。

| 案例 | 最終結果／實際涵蓋 |
| --- | --- |
| L01 兩 Identity × 三 Visibility × 四 Context | **24／24 PASS**；匿名／具名各 12 格。owner_only：A200、B403、C403、guest401；respondents：A200、B200、C403、guest401；public：四者200。每個200完整 Body／UI符合固定一份 B 答案；匿名省略名單，identified public guest 可看合法姓名。每次產品頁只有自身 Statistics GET，沒有 Form／Latest／Count 預查。 |
| L01 真實 private Login 返回與載入後失效 | **PASS**；Owner 帳密登入實際返回原 query＋hash；清掉該 Context Cookie 後手動 GET 得 **AUTH_REQUIRED**，私人名單撤下、Dialog→login。此案不是 expired Token。 |
| L02 Effective／精度／當前姓名／政策讀回 | **2 個分案 PASS**；固定 4 份歷史 Response／3 人，Root3；A 最新整份省略 text／optional，歷史不補回；同名 B／C 不合併；MC count 2＋3＋0 大於 Question3；0、長小數、相鄰大整數各自精確，1／1.0／1e0 聚合一組3人；Deadline 保留六位精度、UI 台北到秒。Creator／Respondent PATCH 改名、respondents→public 政策更新後，新的獨立 GET／UI 反映當前值。 |
| L03 zero／狀態優先序 | **15 個分案 PASS**；anonymous／identified Closed 零 Response200、完整 Root／零票／[]；Draft A409／C404／guest404，Published 與自然到期仍 Published：A409／C409／guest404；獨立 Form GET 確認到期未 Close／Deadline 相同瞬間；唯讀既有已刪 UUID404、隨機 UUID404、無效 UUID400 原 URL。 |

真實逐案最終 **42 PASS**；每次執行的首次失敗、未執行與重測分列在 reporter／case-results。三個 Run：

1. `f9-1792077354728-live-initial`：L01 全通過；L02 首次在 Deadline 的 `Z`／`+00:00` 表示比較失敗；L03 NOT RUN。保留 [原件](evidence/F9_20261015/execution/f9-1792077354728-live-initial-sanitized.json)。
2. `f9-1792077429649-instant-retest`：沿用專用帳號，L02 固定數據通過；後續讀回的證據分段把前一個獨立 GET 的遲到 response event 納入本頁，嚴格單 GET 斷言失敗；L03 NOT RUN。[原件](evidence/F9_20261015/execution/f9-1792077429649-instant-retest-sanitized.json)。
3. `f9-1792077518649-boundary-retest`：沿用帳號與首輪 Closed L02 Form／原始四份 Response，依 request 發送事件劃分區段；L02／L03 全通過。[原件](evidence/F9_20261015/execution/f9-1792077518649-boundary-retest-sanitized.json)。測試前的姓名重設／測後更新只用正常 Profile API，既有 Response 不改寫。

三個 Run 合併獨立核對 **183 個 API response** 的 CORS Origin／credentials 全相符；精確 network diagnostic issues／pageerror／非授權寫入均 **0**。這是本輪真實執行證據，沒有以 OpenAPI／過往 R10 報告代替。

## 5. 測資、首敗與缺口

[測資索引](evidence/F9_20261015/resource-index.json) 逐項記 Run label／資源 ID／用途／建立輸入與保留狀態。去重後 **3 個專用合成帳號、13 份 Form、14 份 Response 全保留**；10 Closed／1 Draft／2 Published（含自然到期）。首敗 Run 的資料同樣保留；後續 Run 有引用既有 ID，沒有把重用項目重算為新資源。F1～F8 既有已刪 UUID 僅作唯讀參考，其餘歷史資料未寫入；沒有真實 DELETE、SQL 業務修改、DB／volume 重建、時鐘調整或製造 Token。

密碼只在 ignored `output/playwright/f9/*-private-credentials.json`；沒有將 Cookie／Token／storageState／秘密 trace 提交。去敏交付採明確白名單，對三個私有檔的實際秘密值掃描，連同 decoded JSON attachments 檢查；完整 Body 只含合成資料。原件及首次失敗保留在 ignored output，交付副本見 [failure-index](evidence/F9_20261015/failure-index.json)。

| 分類 | 狀態／理由 |
| --- | --- |
| L04 invalid Cookie／expired Cookie／disabled Cookie／disabled Creator／真實 Server fault／真實 timeout | **六案各 BLOCKED**；沒有已同意的受控前置，不偽造 Token、不 SQL 停用、不修改 Server／時鐘。前端模擬結果另列，不能解除這些真實缺口。 |
| 實機觸控／軟鍵盤／safe-area、人工體驗 | **NOT RUN**；viewport 自測與目視截圖不代填人工。 |
| 集中 code review、完整前端正式 AI／人工驗收 | **NOT RUN**；本輪自測不代填正式 PASS／accepted。既有特殊 Auth／交易故障缺口與舊報告不變。 |
| API／業務契約衝突、未修正產品缺陷 | 本輪未發現；首敗為環境／測試支援問題，詳下。 |

首敗與修正均保留：Vitest 沙箱 TEMP 的 ENOENT 改用 repo 內 ignored TEMP／TMP；Browser 沙箱 localhost EACCES 的兩次未啟動案例記錄為前置 BLOCKED，改用正常本機網路權限執行；typecheck 修正測試 fetch mock／unknown label／client plugin 的型別 scope，lint 修正 fixture import 順序；Browser 修正 Email required marker 的定位與合法 redirect 的編碼斷言；F3 舊 mock 補清單 GET；真實測試修正同義 UTC 瞬間比較與 request event 分段。統計預期、人數、精度、隱私與錯誤碼斷言維持，沒有因首敗修改契約或產品行為。

## 6. Git、交付與停止點

本輪將已核准三份規劃文件、產品／測試、報告與去敏證據作單一目的本機提交。提交包含本報告，完整 SHA 以交付訊息及本機 `git log -1 --format=%H` 為準，避免在提交內自填尚未存在的自身 SHA；提交後實際 SHA／Git 狀態另保存 ignored `output/playwright/f9/delivery.json`，交付訊息明列。規格、backend-ref、後端 repo、依賴／lockfile 與歷史報告未修改。

**停止於「F9 開發完成、待集中 review」。** 完整前端驗收計畫於 F9 收尾後另行交付、審查，再於 F10 執行；本次不準備／執行該正式驗收、不更新 accepted、不推送、不展開 F10。
