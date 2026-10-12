# F4 精簡開發報告

最新局部修正（2026-10-12）：**F4-R1 修正完成，待局部複核**，見 [修正報告](F4_R1_Correction_Report.md)／[去敏證據](../test-results/evidence/F4_R1_Correction_20261012/verification-summary.json)。以下 v1.0 為原整輪交付紀錄，歷史結果保留。

版本：1.0／2026-10-12（Asia/Taipei）。**F4 開發與自測完成，待集中 review**；未 accepted。

## 授權、範圍與實際變更

Owner 通過 [F4 精簡實作計畫 v1.0](F4_Implementation_Plan.md)，明確授權整輪開發、必要自測及範圍內修正。沿用「計畫確認 → 整輪交付後集中 review」兩人工關卡，未另設測試計畫核准。Owner 另授權自行註冊／登入新合成帳號；本次只新增並保留該帳號，沒有建立／修改表單、SQL、DB reset 或服務設定變更。

- `/forms` 接真實清單 GET：固定 pageSize=10、全部省略 status、切狀態回第 1 頁、手動刷新、桌面表格／手機卡片與空狀態。保留 API 順序及不同填答者人數；同條件刷新失敗保留成功 snapshot，換條件／session 立即清舊資料。超界只追加一次對齊 GET；再次縮頁顯示手動刷新提示，0 頁回 1 且不重查。
- `formService` 使用既有 lossless client／decoder、credentials=include、30 秒 timeout、傳入 AbortSignal；核對回應資源 ID 與查詢 pagination。沒有全域導航、retry、BFF、持久化或新增 API。
- 共用 `FormReadController`／`useFormRead` 分離讀取 ticket 與已採用 Auth 錯誤的頁面流程世代。route／query／Form ID／session／卸載隔離資料、錯誤、Auth、導航和 finally；手動重讀 Auth Dialog 放在 gate 外，自身 revision 清私有資料但保留 Dialog，外部 context 變動撤銷舊流程。
- 共用 FormDetail loader 以最新 GET 與共用 User.id 判 Owner／狀態。Owner Draft 的 Form URL replace 到 edit；兩角色 Published／Closed 的 edit replace 到 Form，目標頁重新 GET。404／formId 400／disabled／讀取故障留原 URL；初次正式 Auth 401 返回 login，已載入後手動 Auth 401 關閉／圖示關閉再返回完整 URL，沿用焦點 helper。
- Form／Draft edit 呈現根資訊、Creator、中文 enum、台北時間與 Owner 次要 metadata；Published 過期只加已截止提示，status 不變。編輯器、題型／填答、本人答案及管理功能明示尚未完成，`new`／`statistics` 未新增接法，無 Form 寫入／Latest／Count／Statistics 請求。

主要程式在 `app/services/form.ts`、`app/domain/form-read.ts`、三個 Form composables、`app/components/forms/` 及三個 forms 頁。必要測試在 `tests/unit/f4-form-read.spec.ts`、`tests/e2e/f4-browser.spec.ts`／`f4-live.spec.ts`、`tests/fixtures/f4/`、`playwright.f4.config.ts`。合成 session 頁只由測試 Nuxt hook 掛入，不在 built 產品提供。

## 引用來源與實際版本

沿 AGENTS v1.1、[Round Development Skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、核准 F4 v1.0、總計畫 v1.3 F4／§7／§7.1；受影響前端 01／03／04／05／07 v1.0、02／06 v1.1（2026-10-10），章節見核准計畫 §1。後端權威 Part A／B／Errors v1.0、Domain v1.1，位置為本 repo 唯讀 `backend-ref/`，快照 2026-10-11／SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`。本次 manifest **108／108** 相符，未修改；沒有發現影響 F4 的契約衝突。

前端起點 `9552dfdb365bc1253760f1faa47c7396c514f68a`／master，編輯前工作樹乾淨。實際 Node **24.21.0**／npm **11.19.0**，既有安裝 Nuxt **4.6.1**、UI **4.11.3**、Tailwind **4.3.3**、TypeScript **5.9.3**、Vitest **5.0.3**、Playwright **1.64.0**／Chromium **156.0.8078.4**、lossless-json **4.3.1**。`npm ls --depth=0` 通過；package／lockfile 未變，lock SHA256 `514545e78546b99dacd0b3b8c49e89d0f7dab5b26acb3da725d58c8551dbb1a2`。未安裝／升級依賴。

真實 Origins：`http://localhost:3000` → `http://localhost:5000/api/v1`。開發前 2026-10-12 17:11:55 台北時間 health／ready／OpenAPI 均 200，OpenAPI 3.1.1、info.version 1.0.0 且列兩支 GET；真實業務 Browser 執行於 17:33:38 起。**live 後端 Git SHA／process checkout／DB 版本仍 UNCONFIRMED**，快照不能代稱 live。使用既有 API／DB，沒有啟動快照服務或改 DB 前置。

## 必要驗證與逐案結果

本節全部是開發自測，正式 AI／人工驗收 **NOT RUN**。命令 exit／時間、逐案最新結果與原件 hash 見 [去敏摘要](../test-results/evidence/F4_20261012/verification-summary.json)，真實流程另見 [去敏記錄](../test-results/evidence/F4_20261012/live-sanitized.json)。

| 實際檢查／命令 | 結果及證明範圍 |
| --- | --- |
| `npm run lint`、`npm run typecheck`、`npm run build`、F4 fixture Nuxt typecheck | **PASS**；Nuxt＋tools strict、CSR built、session harness strict。最終 lint／typecheck 涵蓋新增測試；初次 lint 命名問題已修，見下節 |
| `npm run test:unit -- tests/unit/f4-form-read.spec.ts tests/unit/api-client.spec.ts tests/unit/scoped-state.spec.ts tests/unit/f3-auth.spec.ts` | **124／124 PASS**，F4 30＋既有受影響 94。query／pagination／角色路由、原始精度時間、formId details、deferred 200／401／500 於 key／session／dispose 後不採資料／Auth／導航、不結束新 loading；Auth 自身失效／外部撤銷、disabled、snapshot retry |
| `npm run test:e2e -- --config=playwright.f4.config.ts`，再 `--grep F4-B05` | dev fixture **13 個案例逐案最新 PASS**：第二輪 11 PASS／2 locator FAIL，再兩案 PASS；不是同一 fresh 13／13。B01／B02 後續補強與 B09 只在下列 built 執行 |
| `$env:F4_MODE='built'`，同 config `--grep 'F4-B01\|F4-B03\|F4-B05'` | **8／8 PASS**：清單／三狀態兩角色 replace／Dialog 兩關閉方式及焦點；使用實際 built 產品、合成 API |
| built 同 config `--grep 'F4-B01\|F4-B09'` | **2／2 PASS**：等待成功資料後桌面／手機長標題截圖、鍵盤分頁／native filter，長 Creator／UUID／純文字 HTML 樣式字串可讀及鍵盤重讀 |
| built 同 config `--grep F4-B02` | **1／1 PASS**：最終 diff 發現正常對齊提示被接續 GET 清除，保留提示並重建，驗一次成功對齊／再次縮頁停止／空結果不重查。built 共 **10 個不同案例**，11 次執行；分次執行，無 skipped／flaky／retry |
| `$env:F4_MODE='live'`，同 config | **1／1 PASS**，真實 Browser＋API，無攔截：新帳號 register 201 → login 200 → empty list／draft、published、closed 空 filter／手動刷新／完整 reload → 隨機不存在 ID 404／無效 ID 400 → 清除本測試 Cookie、手動 GET 401 AUTH_REQUIRED → Dialog 清 User／私有資料，關閉返回 login。沒有 Form 寫入 |
| `git diff --check`、來源／manifest／歷史證據核對 | **PASS**；backend 108 hash、F3 原複核兩檔 hash 保持一致；共用 client／decoder／scope／Auth／焦點／datetime 與依賴來源未改。stage 後再核對範圍 |

合成 Browser B01～B09 共 14 個不同案例（B03 五組、B05 兩組）。覆蓋分頁／一次縮頁上限／空清單、同條件失敗與 retry、Owner Draft／隱藏 Draft、兩角色 Published／Closed edit、七位 deadline 已截止、400／403／404／500／network／異常 Body、own Auth Dialog、filter 慢 401、同 mounted session／Form ID 慢 200／401、unknown bootstrap 明確重試及卸載晚 404。檢查 me 次數、零額外 Form 操作、page error／Vue warning 與非預期 console error；故障診斷只按注入的精確 URL／狀態允許。unit 的非可取消 deferred 回應另驗證 Abort 之外的 current guard。

真實記錄共 **18 個業務 request／response**：me=4（初始、reload、兩次直接 URL 各一次）、register=1、login=1、forms GET=12。SPA filter／refresh／Header 返回沒有額外 me；有效 HttpOnly Cookie 存在且實際可重新初始化／讀回，全部回應 ACAO=前端 Origin、ACAC=true。Cookie 清除只影響此測試瀏覽器，不是 Token 過期案例。新帳號 RunId `f4-1791797624388` 保留；密碼只存在執行記憶體，未保存／提交登入憑證、storageState 或 trace。

三份 [桌面清單](../test-results/evidence/F4_20261012/list-desktop.png)、[手機清單](../test-results/evidence/F4_20261012/list-mobile.png)、[手機根資訊](../test-results/evidence/F4_20261012/root-mobile.png) 均已實際檢視；長內容完整換行、無水平溢位，台北時間／未設定／所有必要欄位可讀。只含明示合成資料。這是 AI 開發 UI 自測，不能代填 Owner 人工 PASS。

## 首次失敗、修正與沿用證據

- 初次 unit 在 Windows sandbox 啟動 Vite 子程序遭 `spawn EPERM`，案例尚未執行；原 log 保留。按已授權自測經自動審核允許重跑，30／30，後續回歸 124／124。沒有自動審核拒絕。
- 初次 lint FAIL：合成 `session.vue` 的多詞元件名，補 `defineOptions`；最終 PASS。初次 Browser 7 PASS／5 FAIL：`FormsFormsList` 自動命名引用未解析，改產品頁明確 import；第二輪 11 PASS／2 FAIL 為測試 locator 誤用英文 Close／中文兩按鈕同名，依實際 UI 區分頁尾／圖示，受影響兩案 PASS。原結果與 log hash 保留。
- 獨立 fixture strict 初次 FAIL（TS5083）：缺 fixture tsconfig。補繼承 generated app strict 並明列 `session.vue`／app／Nuxt declarations 的 config，重測 PASS；只補測試檢查配置，產品無變更，原失敗 log 保留。
- built 初次桌面截圖仍在刷新中、顯示舊 snapshot；檢視後補成功內容／loading 等待，重拍穩定長標題及完整手機頁，未改產品。B09 補足核准計畫的長 Creator／UUID 與鍵盤代表檢查。最後 diff 核對修正分頁正常對齊提示的清除時機，只重跑 B02 與必要工程檢查；其他未受影響行為沿用有效結果。
- NO_COLOR／FORCE_COLOR、build DEP0155 為工具／既有套件提示；測試任意 `#target`／`#list` 沒有對應錨點，Vue Router R0042 警告已辨識，不是 page error 或元件未解析。未改全站 scroll 行為。
- 沿用未變共用機制的有效 [F2 補充證據](../test-results/F2_Supplemental_Test_Report.md)：完整 native 30 秒 read timeout、精度／時間 adapter；[F3 修正／複核](../review/F3_Correction_ReReview_Report_20261012.md)：Cookie flags／新分頁一次初始化／無效 Cookie 的歷史證據與 Dialog helper。沒有重跑全部 F1 五組組態、F2 全矩陣、F3 全矩陣；沿用結果不計入本次 F4 真實 PASS。F3 複核報告 SHA256 `cd19cea27b81e1eb4b0517d99353aa10d439dc5706112a56dd75b509fab43e38`、證據 `ffa3a90cb34259f4ca39b77af266392e1d59e1db3a1bc14f04bb31157532693e` 未變。

## 逐案缺口與停止點

| 必要真實案例／事項 | 狀態／原因 |
| --- | --- |
| 非空本人清單、≥11 筆真實分頁與非空 filter／刷新 | **BLOCKED**：新帳號為 0 筆，沒有既有資料來源／IDs；fixture 有覆蓋，不替代真實整合 |
| Owner Draft detail／Form→edit | **BLOCKED**：沒有本人 Draft |
| Published、Closed detail 與兩角色 edit→Form | **BLOCKED**：沒有兩狀態表單及對應 Owner／其他帳號測資 |
| 非 Owner Draft 404、已刪除 404、真實過期 Published 提示 | **BLOCKED**：沒有指定 Draft／刪除／截止測資；隨機不存在 ID 的 404 已 PASS，不代稱這三案 |
| 真實 Form 首次／手動 INVALID、EXPIRED 401、disabled 403／初次 me disabled | **BLOCKED**：無受控帳號／Cookie；一般 REQUIRED 401 已 PASS，無效 Cookie 歷史證據保留，不代稱本次全部 Form 情境 |
| 真實 network／timeout／500／異常 Body／受控晚回 | **BLOCKED**：未有受控 API 故障安排；fixture／deferred及既有 timeout 證據只證明前端處理 |
| live Git SHA／DB 版本 | **UNCONFIRMED**：metadata 不提供可驗證 Git／DB 來源，未假定本地後端 repo 路徑 |
| 正式 AI／Owner 人工驗收、其他 Browser／人工實機 | **NOT RUN**：未授權此階段，沿原缺口 |
| install／npm ci／audit／generate、F5～F10 | **NOT RUN**：無新依賴／本輪需求；既有原目錄 npm ci native unlink EPERM／audit 風險未解除 |

單一目的本機提交標題 `feat: complete F4 form list and read routing`；本報告納入該提交，完整 commit SHA／提交後工作樹狀態見本次交付訊息與 Git log，避免自指 SHA。交付前核對只含 F4 程式、必要測試、報告／進度及去敏證據，原有使用者變更為零；提交後要求工作樹乾淨。原始命令／Playwright 結果留 ignored `output/playwright/f4/`，摘要以原件 hash 追溯，沒有提交原始秘密或生成 Nuxt `app-secret`。

**F4 開發與自測完成，待集中 review。不推送、不展開 F5～F10；F1／F2／F3 正式驗收仍延後，均不代填 accepted，所有既有未驗證事項保留。**

## F4-R1 Owner 授權局部修正（2026-10-12）

已補正式回歸並保存修正前 fresh built 三種 Auth 401 **3／3 FAIL**；局部傳遞手動刷新起點政策，未保留前 query snapshot，原首次讀取／無資料 retry／current guard 不變。修正後 unit **136／136 PASS**、fresh built 新增與受影響 Browser **11／11 PASS**，lint／strict／build／diff 核對 PASS。原兩份 review 文件已在接手 `ddccaccf` 提交並保持原 bytes，既有證據與失敗未覆寫，真實缺口維持；詳細範圍及去敏 hash 見上方修正報告。

**最新停止點：F4-R1 修正完成，待局部複核。未宣告 review 通過或 accepted，不推送、不展開 F5～F10；正式驗收仍延後。**
