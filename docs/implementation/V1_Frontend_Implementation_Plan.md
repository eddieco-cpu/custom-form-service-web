# 自建表單設計服務 V1 — Frontend Implementation Plan

| 項目 | 內容 |
| --- | --- |
| 版本／日期 | 1.3／2026-10-10 |
| 狀態 | 總實作計畫已通過 Owner review；本版依 Owner 指示回補分輪測試選擇原則 |
| 已核准輸入 | 前端 00～07：02／06 為本次回補的 v1.1，其餘 v1.0；Owner 已確認規格並授權本次工程提醒／資料語意回補 |
| 目標 | 本機 Email／Password 前端可完成建立、管理、填答與查看統計 |
| Repo | 前後端分開；前端 repo 尚待建立／指定 |
| 執行單位 | 前端 F0～F10；與後端 R0～R11、G1 分開編號 |
| 本次交付 | 分輪測試方法／理由與不適用原則；同步 AGENTS／Skills，Round 分工不變 |

## 1. 計畫權責與規格基準

本計畫安排工作，不修改產品決議或 API 契約。八份前端規格為本計畫的已核准輸入；先前文件內的「初版待 review」是當時交付狀態，本計畫記錄本次 Owner review 通過，保留原交付與核對報告的歷史。

| 前端文件 | 本計畫引用 |
| --- | --- |
| [00 — Overview](../specs/00-v1-frontend-overview.md) | Scope、延期項目、後端契約與決議索引 |
| [01 — Pages、Routing、Access](../specs/01-pages-routing-and-access.md) | 頁面、入口、角色／狀態路由與跳轉 |
| [02 — Editor、Lifecycle](../specs/02-form-editor-and-lifecycle.md) | 新建、Draft、Config、Delta、排序、預覽與管理 |
| [03 — Response、Statistics](../specs/03-response-and-statistics.md) | 填答、Latest、評分、統計與存取矩陣 |
| [04 — Auth、State、Errors](../specs/04-auth-state-and-error-handling.md) | 完整 D-12、dirty、停用、錯誤與結果不明 |
| [05 — UI、Interaction](../specs/05-ui-and-interaction.md) | Layout、手機、Dialog、時間與驗證呈現 |
| [06 — Technical Architecture](../specs/06-technical-architecture.md) | CSR、Model、精度、Client 與工程驗證 |
| [07 — API Integration Map](../specs/07-api-integration-map.md) | 18 Endpoint、DTO、Request 與錯誤對應 |

後端正式文件仍負責業務與 API 規則：00、01、02、03a、03b、03c、04、05；Backend Implementation Plan 負責後端 Round 狀態。前端 07 是對接摘要，不能取代後端原件。

後端內容基準承接前端 00：01／03c／05 採已讀取的 2026-10-10 v1.1 修訂，Statistics Root 含 creatorDisplayName、responseMode、resultVisibility、submissionDeadlineAt；其餘按已讀正式來源。不沿用舊的三欄位追加草案。

本計畫沒有重新讀取後端 live repo 或 Swagger，也沒有重新執行後端驗收。R9 accepted 依 Owner 說明；R0～R9 修復的最終人工確認與 R10 的最新實作狀態，在 F0／實際串接時核對，不根據前端規格完成推定後端已完成。

## 2. 工作範圍與工程基準

| 項目 | 已核准基準／本計畫安排 |
| --- | --- |
| Framework | Nuxt 4、CSR、ssr=false；瀏覽器直接呼叫 API |
| 語言／狀態 | TypeScript strict、Composition API、useState 與 composables |
| UI／CSS | Nuxt UI 4、Tailwind CSS 4；亮色、上方 Header、手機導覽 |
| 表單／排序 | Zod 4＋UForm；vue-draggable-plus＋上下移動備用操作 |
| Runtime／安裝 | Owner 指定 Node 24.21.0；npm、package-lock.json、npm ci |
| 本機 Origins | Frontend http://localhost:3000；API http://localhost:5000 |
| API Base URL | http://localhost:5000/api/v1；公開 runtime config |
| Cookie／重試 | credentials=include；不讀 HttpOnly Token；自動 retry 停用 |
| 驗證工具 | ESLint、typecheck、Nuxt build、Vitest、Playwright；小版本於 F0 核對 |
| 資料生命期 | User 共用；Definition／Answers 只在當頁；沒有本地保存／恢復 |

確切套件版本、Node 指定版本的可取得性與相容性、精確數值 adapter、datetime helper、API timeout 是 F0 工程交付，尚未在本次安裝驗證。不得直接把本表當成已可重現的 lockfile，也不得遇到版本問題就自行改掉 Owner 指定的 Node 值。

本機 Email／Password 為本次交付。Google 按鈕隱藏、Google 整合延後；遠端正式服務、BFF、SSR、忘記／重設密碼、Refresh Token、答案歷史清單、圖表與其他 00 §4 排除項不排入 F0～F10。

## 3. Repo 準備與協作文件

總計畫 review 後，先整理前端專用協作規範，再進入 Round；後端 AGENTS／Skills 只參考流程，不能直接套用其 .NET 指令或成對 .http 要求到前端。

| 文件／位置 | 責任 | 本次狀態 |
| --- | --- | --- |
| docs/specs/00～07 | 已核准頁面／互動／前端工程規格 | 已交付並通過本次 Owner review |
| docs/implementation/V1_Frontend_Implementation_Plan.md | Round Scope、依賴與進度 | v1.1 已通過 Owner review；v1.3 依 Owner 指示補測試選擇原則 |
| AGENTS.md | Source of truth、授權、停止點、資料／Git 保護、驗證與回報 | v1.1 已交付，待 Owner review |
| .agents/skills/v1-frontend-round-development/SKILL.md | Round 計畫、開發自測、review 修正與開發報告 | 初版已交付，待 Owner review |
| .agents/skills/v1-frontend-acceptance-testing/SKILL.md | 前端驗收計畫、Browser／人工步驟、實際結果與證據 | 初版已交付，待 Owner review |
| docs/implementation/Fn_Implementation_Plan.md | 當輪具體檔案、方案、驗證、風險 | 指定當輪時產出 |
| docs/implementation/Fn_Development_Report.md | 開發變更、命令／結果、Git 版本與缺口 | 當輪開發交付 |
| docs/test-plan/Fn_Acceptance_Test.md | 自動／人工驗收案例、前置與預期 | Owner 要求準備時產出 |
| docs/test-results/Fn_Acceptance_Execution_Report.md | 本次執行版本、案例結果與證據 | 核准且授權執行後產出 |

前端測試伴檔依案例需要使用 Playwright／fixture／必要 HTTP 範例，不強制每輪附 .http，也不只用 .http 代替真實瀏覽器 Cookie／CORS 或 UI 操作。

將文件放入新 repo 時保留上述相對路徑；後端來源另記版本／commit 與可讀位置，不假定另一 repo 必定在 ../backend。Repo 名稱、遠端位置與實際工作目錄在建立／接手時確認；不需要為了本計畫先建立遠端服務。

## 4. 開發輪次總覽

| Round | 主題 | 主要輸出 | 前置 |
| --- | --- | --- | --- |
| F0 | Implementation Alignment | 規格／API 版本對照、版本與 adapter 選擇、驗證方案 | 本計畫與前端協作規範 review；可讀的後端來源 |
| F1 | Nuxt CSR 基礎 | 可重現專案、組態、UI／工具／測試基礎 | F0 核准工程決議 |
| F2 | API／Model 共用基礎 | Client、DTO、精度／Unicode／時間、dirty／錯誤機制 | F1 |
| F3 | Auth、Header、首頁、Profile | 完整 D-12、登入註冊、登出、使用者資料與導覽 | F2；後端 R4 可用 |
| F4 | 我的表單與 Form 讀取／路由 | 清單、FormDetail Loader、角色／狀態路由 | F3；後端 R5 可用 |
| F5 | Editor／Answer Domain | Create／Delta、驗證、基準／ID／錯誤 path 與答案模型 | F2、F4；後端 R6 契約 |
| F6 | Editor UI、保存與 Preview | 新建／編輯、五題型、排序、保存、共用題型 Renderer、預覽 | F3～F5；後端 R5／R6 可用 |
| F7 | Lifecycle 與 Owner 管理 | Publish／Close／Delete／Visibility、Count、分享 | F6；後端 R7／R9 可用 |
| F8 | 填答與本人 Latest | 空白進頁、提交、single／multiple、Latest 與填答錯誤 | F5～F7；後端 R8／R9 可用 |
| F9 | Statistics | 獨立統計頁、九個根欄位、分布與合法具名名單 | F2／F3；UI 驗證可先做，真實串接需 R10 |
| F10 | 本機完整整合與交接 | 全流程、權限／路由、手機、重現指引、驗收證據 | F1～F9；R10 真實 API 可用 |

表中為預設開發順序與技術依賴，不是自動執行授權。下一輪開始前，前輪應有足以支撐其依賴的核准結果；未處理的缺口明列。Owner 可明確允許非相依工作先進行，但不得把被阻擋的整合驗收標成完成。

F5 與 F6 分開，先 review 純資料轉換與驗證，再接互動；F6 建立題型 Renderer 供 Preview 與 F8 正式填答共用。統計採自己的 View Model，不能為了 Renderer 共用而補不存在的 FormDetail 欄位。

## 5. 各 Round 的範圍與交付

### F0 — Implementation Alignment

**目的**：讓接手 Codex 能根據可核對的來源提出具體工程選擇，保留既定產品行為。

**計畫提醒（§7.1 項目 1／7／9）**：具體提出精確數值的 DTO／解析／比較／序列化策略、datetime 精度與 Unicode／Email 相容策略；列代表性往返案例、支援瀏覽器基準與確切版本／timeout 建議，區分已驗證與待驗證。

工作：

- 核對前端 repo／工作目錄、Git 狀態、八份規格及前端協作文件；沒有 repo 時記錄待建立，不假造 HEAD。
- 取得當時後端文件／commit、API 啟動方式與 OpenAPI；區分正式契約、實際 Endpoint 可用狀態、歷史驗收狀態。Swagger 不可連線只阻擋依賴它的核對。
- 以官方來源核對 Node 24.21.0、Nuxt／UI／Tailwind／Zod／draggable／驗證工具的可取得版本與相容性，列出確切版本建議及來源。必要的相容 probe 限一次性工程環境，不能當成業務實作。
- 明確選定 lossless parse／serialize／比較策略、UTC／台北時間與精度策略、Unicode adapter、timeout，以及 tests／scripts 結構。精確數值候選不得先經 JS Number 失真。
- 核對本計畫功能／Endpoint 分配、主要風險與真正阻塞項；局部衝突只阻擋受影響工作。

**交付**：F0_Alignment_Report.md，含工程選擇、18 Endpoint 對照、當時版本、驗證方案與待 Owner 決議的實質差異。沒有 install／測試證據的選擇標為建議。

**完成判準**：可據此寫出 F1／F2 具體計畫；數值、版本或來源仍有阻塞時明列，不以「一般前端都這樣」代替規格。F0 是規劃成果，不宣稱功能開發或正式驗收通過。

### F1 — Nuxt CSR 與工程基礎

**計畫提醒（§7.1 項目 7／9）**：列出 runtime config、環境範例、npm scripts、安裝／build 條件及 Browser 測試基礎；lockfile 於實際初始化產生，不能在計畫中假稱已重現。

**工作**：依核准 F0 建立 Nuxt 4 專案、TypeScript strict、Nuxt UI／Tailwind、Zod、draggable 與驗證工具；ssr=false。配置 public API Base URL、不含秘密的環境範例、目錄與 npm scripts，提交 package-lock.json。

建立最小 Layout／共用 Feedback 容器及測試啟動基礎；具體 Header／Auth 行為留 F3。先定義可重現的 install、dev、lint、typecheck、build、unit、E2E 命令；後續輪次沿用。

**開發驗證**：npm ci、必要 lint／typecheck／build、Browser 載入 CSR 與 Nuxt UI／Tailwind Smoke；確認本機公開組態不含秘密。測試框架只做足以確認可執行的基礎驗證，不建立大量空測試。

**交付／界線**：可啟動的前端工程與版本證據；不以空頁面宣稱帳號或表單功能完成。Node 指定值／相容 probe 未通過，先回報 F0 工程決議問題。

### F2 — API Client、契約與共用狀態機制

**計畫提醒（§7.1 項目 1／4）**：交付 adapter／DTO 型別與代表性往返驗證方案；明列操作 pending／明確失敗／結果不明／核對完成的轉移、互斥作用域、停用操作及解除條件。數值可行性驗證須在 F5／F6／F8 的數字題工作前完成。

**工作**：

- 實作 API client、credentials、direct Resource、204、Error Envelope、network／timeout、停止自動 retry；傳輸層回有型別結果，不直接對所有 401／403／404 導航。
- 定義 User、FormDetail、Summary Page、Receipt、Statistics DTO 與分開的 Editor／Answer／Statistics View Model 邊界。
- 實作精確 JSON number 收送／比較、White_Space trim／Code Point 計長、Password 原樣、datetime 原精度／UTC／台北時間處理。
- 建立共用讀取／操作錯誤呈現、dirty scope、beforeunload／SPA leave／param update 確認與一次 transition 丟棄授權；頁面於各輪接入。
- 建立請求 scope／世代保護、loading finally、同 Form 寫入互斥及結果不明的可用機制；各操作的政策按 04，在其功能輪次接入。

**開發驗證**：可觀察的 204／錯誤情境分流；長小數、超出 JS safe integer 的合法數值、科學記號、等值及 min／max round-trip；Unicode trim／Code Point／Password；未改 datetime 的精度；dirty 取消與單次確認；舊請求不更新新頁。

這些測試依後端可接受範圍設計，不任意加入 Decimal、小數位數或 JS safe integer 上限。正式 Browser Cookie／CORS 證據在 F3 接真實登入取得。

### F3 — Auth、Header、首頁與 Profile

**計畫提醒（§7.1 項目 3／7）**：依 04 §2～4 提供具體狀態轉移表，列出 User／初始化／session revision 的更新責任與導航來源；核對 Email validator 相容案例、真實 Cookie／CORS 及停用 fixture 的取得方式。

**工作**：實作 client Auth plugin、單次 shared Promise、命名 auth／guest middleware、session revision；不設每導航重查 me 的 global middleware。完整啟動包含 login／statistics 都共用 me；SPA settled null 也不重查。

接同頁登入／註冊 Tabs、驗證 redirect、註冊後回登入、Google 隱藏、Header 四 nav／avatar／選單、手機導覽、首頁三入口、Profile 顯示／PATCH displayName。正常 Profile／Login／PATCH 成功不補 GET me。接 Profile dirty、登出先確認後送 API。

**開發驗證**：真實 Browser Login Cookie／CORS；同次 App 啟動去重、SPA 跳頁不多查、另開分頁／刷新有自己的初始化；初次與操作中 Auth 401、合法／非法 redirect、停用不主動登出、初始化 unknown 重試。保護晚回 me 不覆蓋 Login／Logout。

**階段界線**：尚未完成的表單 nav 可連至後續頁面殼，但不能顯示假的成功資料或啟用未實作 API 操作。統計公開資料的獨立讀取在 F9 驗證。

### F4 — 我的表單與 Form 讀取／路由

**計畫提醒（§7.1 項目 3）**：列 loader 的資料／錯誤／導航責任及請求 scope，包含切頁／篩選／換 Form ID／換 Session 時如何忽略舊回應；沿用 Auth 決議，不另建每頁 me 查詢。

**工作**：GET forms、每頁 10 筆、status 篩選、手動刷新、桌面表格／手機卡片、空狀態與刷新失敗保留資料。超界 page 按 01 對齊，避免無限重查。

實作 FormDetail Loader、Owner 判定與原 URL error；Draft Owner 的 Form URL 導 edit，非 Owner Draft 依 404；Owner／非 Owner Published／Closed 的 edit URL 都導 Form 頁。呈現完整根資訊、Creator 與唯讀狀態；管理／填答互動由 F7／F8 接入。

**開發驗證**：清單 filter／pagination／refresh；非 Owner Draft、Owner Draft、Published／Closed 的角色與 URL；無效 UUID／已刪除／Auth／network 分支；換 ID 後舊結果不能覆蓋。中間輪次的編輯／填答頁殼如仍未完成，明列其範圍。

### F5 — Editor／Answer Domain 與 Delta

**計畫提醒（§7.1 項目 2／4）**：提出 Editor／baseline 型別、Server ID／本地 key／原始 config／有效呈現值的區分，以及新增／更新／刪除／排序／type 變更的 Delta 範例；依 02 §6.1 保留既有省略 variant 的語意，初始化不產生 dirty。

**工作**：

- Editor 初始值、tmp key／Server ID、穩定 Option value、載入基準、dirty、Create／Delta builder；不直接雙向綁 DTO。
- 保存 Draft 與發布驗證分離；題型／config 切換、選項增刪、排序 0..n-1 與載入稀疏順序 no-op。
- 明確 id-only delete、未提及不變、空 Array no-op、config 全替換、Choice→非 Choice 的 Options 規則。
- Request path→UI key 映射，避免 Delta index 與畫面題目 index 混淆；保存成功才能建立新的 Server ID 基準。
- 為 Preview／正式填答定義未作答狀態、五題型答案與 required／optional 驗證；Rating 0 與空白分離，Number 使用 F2 精確策略。

**開發驗證**：新增後本地刪除不送 Delete；既有刪除 id-only；無改動不 PATCH；重排保留 ID／value；type 連動／config 清除；description=null、deadline 未變省略；Delta 錯誤定位；optional 空答案省略而 0 保留。

**交付**：可 review 的純 Domain／Builder 與有意義的單元證據。本輪不接保存／提交 API，不建立另一套持久化或自訂合併衝突系統。

### F6 — 編輯器、保存與 Preview

**計畫提醒（§7.1 項目 6／8）**：先附局部桌面／手機線框，確認根設定、題目操作、Visibility 即時保存提示、錯誤定位與 readonly 呈現；列 100 星、Range 初始 min、鍵盤／拖曳備援、Preview 螢幕鍵盤及長內容的可操作驗證。沿用元件的設計由 F7／F8 接入，不要求先做全站可點擊原型。

**工作**：接 /forms/new 與 Owner Draft edit。新建只保存草稿，首次 POST 成功 push edit；既有 PATCH 成功更新基準留原頁。Visibility new 未選且必選；既有即時 API 控制留 F7，先唯讀呈現真實值。

完成根設定、五題型／config、label-only Options、題目／選項手柄拖曳與上下移動、手機主要操作區、dirty／欄位錯誤。保存期間停用定義修改；不明 Delta 結果封鎖保存／發布至重讀。

建立共用題型 Renderer：text／number／choice／rating 的 input 與 readonly 呈現。Stars 每列 10 顆、min>1、0 radio；Range 未操作不算答案、點當前 min 也算作答。

Preview 取當下獨立快照，每次清空答案／捲回頂；桌面 90vw×90vh，手機 calc(100vw - 4px)×calc(100dvh - 4px)，vh fallback。依 02 顯示暫無內容／缺 config；關閉按鈕、×、遮罩可關，Esc 不關；不送 Response API。

**開發驗證**：first save／save 後 IDs、五題型 CRUD／排序／config、API error path、Profile 以外的 dirty 導航；Preview 尺寸／捲動／焦點／重新開啟清空；試填不污染 Editor、不發正式提交。發布 API 在 F7 接入。

### F7 — Lifecycle、Visibility 與 Owner 操作

**計畫提醒（§7.1 項目 4）**：明列 Publish 錯誤 path 對完整已保存 Definition 的定位，不能當成 Delta 索引；各管理寫入的互斥、結果不明限制／解除方式及可找到的重新讀取入口須具體列出。無法可靠定位的明細保留在摘要。

**工作**：接 Publish、Close、Delete、result-visibility、respondent-count、Clipboard 分享。Draft 有 dirty 定義需先保存；發布不暗中連續保存。發布 push Form 頁、關閉留 Form 頁、Delete 204 replace 清單。

既有 Visibility 切換即 PATCH，loading／成功 toast／明確失敗還原；完整回應只合併必要欄位，不蓋掉 dirty Definition。結果不明先核對，不能把畫面還原當成後端還原。

Owner 各生命週期管理按鈕依 01／02；截止仍 Published、可關閉。Count 主動取得、不輪詢；Published 分享填答 URL、Closed 分享統計 URL 並說明資格。管理請求同 Form 互斥。

**開發驗證**：保存後發布、未保存擋發布、三態 Visibility、刪除確認只丟棄一次、發布後 Definition 不可改、到期仍可關閉、權限／狀態衝突重讀、Count 去重語意與複製 fallback。初始 Form 頁暫時只有管理／唯讀內容，F8 才補正式填答。

### F8 — 填答、提交與本人 Latest

**計畫提醒（§7.1 項目 4／6／7）**：區分答案 Request index 與漏答 Question ID 的定位，依後端實際 details.path 格式核對，不假定每條錯誤都能用 answers[n]；列 Latest 覆蓋／唯讀呈現及未知提交的核對入口、重送條件與代表性驗證。

**工作**：正式 Form 頁接 F6 Renderer。single／multiple 初次與刷新一律空白、不預查 Latest；Owner 也遵守相同收件資格。

接提交驗證與 POST、201 後不自動關閉 Dialog／保留答案／clean 基準。single 已知完成唯讀並移除提交；multiple 保留可再次新增提交，不強制先改答案。

每次主動 Latest 都 GET；成功才確認覆蓋 dirty，先清全部題目再 mapping 最新完整 Response。缺 optional 不補歷史；single readonly、multiple 按 status／deadline 決定可編輯。404 本人無紀錄保留輸入。

接 RESPONSE_ALREADY_SUBMITTED、截止／Closed 的 popup→dirty→首頁，停用不登出、404 不存在、Auth 返回、結果不明手動核對／multiple 重複風險確認。不得用 Latest 證明某一次未知寫入已完成。

**開發驗證**：五題型與 optional／required／0；進頁 API 次數；single／multiple、成功／刷新、主動 Latest／取消覆蓋、最新完整答案缺題；操作中截止／關閉、Known single 本地值不冒充 Server 答案、登入過期與不明提交。不改成更新舊 Response 或顯示全部歷史。

### F9 — 獨立 Statistics

**計畫提醒（§7.1 項目 7／8）**：明列契約 fixture 與真實 R10 的驗證責任、可用測資／版本及 BLOCKED 條件；列長答案、長名單、同名與大量分布的完整可讀驗證，不能隱性截斷內容。

**工作**：statistics 無 auth middleware、直接 GET Statistics，不先 GET FormDetail；與 Header me 可並行，me 401／403／unknown 不妨礙 public 200。

九個 Root 欄位按契約接入：formId、title、description、creatorDisplayName、responseMode、resultVisibility、submissionDeadlineAt、count、questions。頂部按 03 顯示；不補 status／responseIdentity／timestamps／Creator ID，也不建立 Owner 管理面板。

題目列 type 中文標示、title／description、Question count；各答案 value／label、Item count、合法 respondents displayName。匿名不揭露身分；同名不去重。Choice／Rating 零票仍列、Text／Number 空分布、精確數字／長文字／完整姓名換行。所有聚合與排序採 API 回應。

**開發驗證**：closed 三種 Visibility 的身份矩陣、Draft／Published 的特殊錯誤、私有 401 返回／403 留原 URL、public bad Cookie；零資料 200、multiple 題的加總可超過 Question count、具名／匿名、Creator 目前名稱與表定截止時間。

**R10 依賴**：UI 與 mapper 可用契約 fixture 驗證。R10 尚未可用時，真實 Endpoint／Cookie／權限整合記 BLOCKED／未執行；F9 只能記「開發自測完成、待真實整合／驗收」，不能 accepted 或宣稱後端統計已通過。後端可用後，依本版驗收計畫完成真實核對。

### F10 — 本機整合、手機檢查與交接

**計畫提醒（§7.1 項目 7／8）**：正式驗收按已確認的瀏覽器基準與真實前後端版本執行；彙整各輪保留測資及自測／AI／人工責任，複查手機與大量內容，而非到本輪才首次設計底層精度或交互行為。

**工作**：以鎖定版本重現 npm ci／lint／typecheck／build／必要 unit，真實 Browser 重走登入註冊→新建→保存→發布→填答→Latest→關閉→統計，涵蓋 Owner、Respondent、其他 Active User 與 guest。

集中驗證 Route／Auth／Visibility、登入過期 dirty 返回、未知寫入不重送、同一 SPA me 次數、另開分頁／重新整理、手機導覽／排序／Preview／100 星與 Range 初始 min。

補完整 README、環境範例、啟動方式、測試前置／命令、合成資料方式、已知限制與後端版本。修正整合發現的前端回歸；後端缺陷回報，不在前端 repo 私自改契約或對應測試預期。

**完成判準**：本機範圍的正式驗收已執行且 Owner 確認；開發自測、AI 正式驗收、人工結果分開。Google 與部署仍延期，不稱為全部正式 V1／Production 完成。F10 不重新為已驗證的後端 DB／併行功能建立另一套後端驗收。

## 6. 頁面、Endpoint 與共用能力覆蓋

### 6.1 頁面

| URL／能力 | 主要輪次 | 依賴／最後核對 |
| --- | --- | --- |
| /login：登入／註冊 Tabs | F3 | F10 真實登入返回／停用 |
| /：首頁 | F3 | F10 |
| /profile | F3 | F2 dirty；F10 |
| /forms：列表／刷新 | F4 | F10 |
| /forms/new | F6 | F5；F10 |
| /forms/{id}/edit | F4 Loader、F6 Editor、F7 管理 | F10 路由與生命週期 |
| /forms/{id} | F4 Loader、F7 Owner、F8 填答 | F10 |
| /forms/{id}/statistics | F9 | R10；F10 |
| Header／手機導覽 | F3 | F9 公開／未登入；F10 |
| Preview／五題型 Renderer | F6 | F8 正式填答；F10 手機 |

### 6.2 全部 18 Endpoint

以下省略 /api/v1；正式 Method／Path 以 07 及後端 03a 索引為準。

| No. | Endpoint | 輪次／處理 |
| --- | --- | --- |
| 1 | POST /auth/register | F3 |
| 2 | POST /auth/login | F3 |
| 3 | POST /auth/logout | F3 |
| 4 | POST /auth/google | 延後；F3 隱藏按鈕，F10 核對沒有串接 |
| 5 | GET /users/me | F3；各頁共用 D-12，手動核對例外按 04 |
| 6 | PATCH /users/me | F3 |
| 7 | POST /forms | F6 |
| 8 | GET /forms | F4 |
| 9 | GET /forms/{formId} | F4／F6～F8；F9 不預查 |
| 10 | PATCH /forms/{formId} | F5 Builder、F6 接 API |
| 11 | DELETE /forms/{formId} | F7 |
| 12 | POST /forms/{formId}/publish | F7 |
| 13 | POST /forms/{formId}/close | F7 |
| 14 | PATCH /forms/{formId}/result-visibility | F7 |
| 15 | POST /forms/{formId}/responses | F8 |
| 16 | GET /forms/{formId}/responses/me/latest | F8 |
| 17 | GET /forms/{formId}/respondent-count | F7 |
| 18 | GET /forms/{formId}/statistics | F9；R10 依賴 |

本次串接 17 個非 Google Endpoint，另外一個以明確延期方式覆蓋。題目／選項 CRUD 透過 Create／Draft PATCH，不新增 Endpoint。

### 6.3 容易漏掉的共用行為

| 能力 | 建立／主要接入 | 重要證據 |
| --- | --- | --- |
| me 單次初始化／競態 | F3 | Login／Logout 舊回應、SPA 次數、settled null |
| 公開統計獨立 Auth | F9 | me 401／403＋Statistics 200 |
| 精確 number／Unicode／datetime | F2→F5／F6／F8／F9 | UI→Request→Receipt／Statistics round-trip，不先浮點失真 |
| Delta 與 API path | F5→F6 | id-only、no-op、排序、題型切換、實際畫面定位 |
| dirty／資料取代 | F2→F3／F6／F8 | unload／SPA／param update、Latest、重讀、Login／Logout |
| 寫入結果不明 | F2 機制，各寫入輪次政策 | 無自動 retry、保留輸入、Delta 重送限制／multiple 重複確認 |
| 舊請求／同 Form 寫入互斥 | F2，各頁接入 | 離頁／換 ID／換 Session、loading／輸入 freeze |
| Mobile／可操作性 | F3／F6／F9 | F10 人工導覽、手柄／上下移動、Dialog／長內容 |

## 7. 每輪的工作流程與停止點

總計畫通過表示 Round 分工可採用，不等於全部 F0～F10 同時獲得執行授權。規格 review 通過也不等於實作計畫已通過。依 Owner 當次明確指令執行；可合併授權多階段，但保留已約定的 review／驗收 gate。

| 階段 | 交付 | 停止點 |
| --- | --- | --- |
| 當輪計畫 | 讀相關 source、核對 Git／環境；Fn_Implementation_Plan.md：檔案、方案、驗證、依賴／風險 | 待 reviewer／Owner 核准當輪方案與開發指令 |
| 開發 | 授權範圍實作、必要自測／build／diff、開發報告與單一目的提交 | 開發完成、待 code review／驗收；不自動設計正式測試計畫 |
| Code review／修正 | 靜態及必要驗證，列出發現與範圍；有授權才修改並重跑受影響自測 | review 結果／修正交付；不自動進正式驗收 |
| 正式驗收計畫 | Owner 要求時產出 Fn_Acceptance_Test.md 與需要的伴檔 | 待本版計畫 review／執行授權 |
| 正式驗收執行 | 依核准案例執行，AI 與人工分欄，記實際版本／證據 | 結果待 Owner 確認 |
| Round accepted | Owner 根據本版結果及同意的待處理事項明確確認 | 更新進度；下一輪仍由 Owner 指定 |

F0 的交付是 Alignment 報告及工程決議 review，不要求為純文件工作機械式增加正式 Browser 驗收。

開發自測不需先核准正式驗收計畫；自測 PASS 不代填正式 AI／人工 PASS。review 不等於 code 已執行驗證；有已知資料／環境依賴阻擋，記 BLOCKED 或未執行，不能改預期求 PASS。

各輪計畫先列這次相關的規格章節，再描述具體方案，不重寫整組規格，也不把總計畫的段落堆成冗長每次指令。F5／F6 如因實際 code 複雜度需分 A／B，先在當輪計畫列範圍與停止點，不自行越過下一段授權。

### 7.1 當輪實作計畫必須回答的工程提醒

2026-10-10，Owner 評估 reviewer 建議後確認：具體工程設計依下表分輪提出；資料行為仍按已核准規格。Codex 提出 Fn_Implementation_Plan.md 時，須回答本輪相關項目的方案、代表性案例與驗證時機，不能只抄「實作 adapter／處理錯誤」作為完成設計。

| 項目 | 完成時點 | 當輪計畫需明確的輸出 |
| --- | --- | --- |
| 1. 數值／時間／文字 | F0 選方案；F2 實作並驗證；Email 在 F3 接入 | adapter 與 DTO 型別、精確收送／比較、原時間精度、Unicode／Email 相容案例；數字題工作前先通過可行性驗證 |
| 2. Editor／baseline／Delta | F5，依 02 §6.1 | model／key／ID／原始值與有效呈現值、增刪／type／排序／config 範例、dirty 及保存後 IDs 重建 |
| 3. Auth／頁面狀態 | F3；F4 loader 接入 | 依 04 的結果與責任表，列初始化、未知、停用、登入／登出、舊回應的具體轉移／狀態更新／導航責任 |
| 4. 操作／錯誤／結果不明 | F2 共用；F5／F7／F8 對應接入 | loading／互斥範圍、限制與解除條件；Delta Request index、Publish Definition index、漏答 Question ID 分別映射；每種未知寫入有核對入口 |
| 5. Round／交付條件 | 本計畫 §4～5／§7；各輪計畫承接 | 範圍、前置、驗證、交付與停止點已列；細部缺口在當輪提出，不同時展開全部頁面 |
| 6. 核心畫面／原型 | F6 局部線框；F7／F8 接入；F9 統計 | 桌面／手機配置、根設定／題目操作、即時保存提示、錯誤定位、填答與 Latest readonly；不以全站原型作啟動前置 |
| 7. 測試環境／責任 | F0／F1 基準；各輪開發前確認；正式計畫依 §7 另行準備 | fixture／真實 API、合成測資建立／保留、停用安排、支援瀏覽器、自測／AI／人工分工與代表性 Cookie／CORS／dirty／競態／未知結果驗證 |
| 8. 手機／鍵盤／大量內容 | F6／F9 驗證；F10 複查 | 100 星、Range 初始 min、排序備援、Preview 螢幕鍵盤、長文字／長名單的完整可讀與操作條件 |
| 9. 版本／組態／啟動 | F0 核對；F1 初始化／重現 | 確切版本、timeout、runtime config、scripts／本機流程；實際 lockfile／install／build 證據在 F1 交付 |

本表是分輪交付要求，不是新增一輪或要求本次提前完成所有設計。若發現會改變產品／資料語意的差異，列出規格章節與建議再處理；單純型別／套件／元件組織依當輪核准方案決定。

## 8. 驗證、資料與回報規範

### 8.1 驗證強度

下表提供測試層級的選擇基準，不是要求每輪全部執行。依當輪交付、受影響行為與風險選用，實作／驗收計畫說明方法、目標及理由；不適用層級可省略並簡述原因。Browser 需求依需驗證的行為判斷，不只看是否新增頁面。各 Round 明列的必要驗證仍適用，前置缺失記 BLOCKED／NOT RUN，不改列不適用。

| 層級 | 何時使用 |
| --- | --- |
| lint／typecheck／build | 程式交付的必要基礎；命令以 F1 最終 scripts 為準 |
| Vitest | 有風險的轉換／驗證／分流與競態；不測實作內部排列或單純樣式 |
| Playwright＋真實 API | Cookie／CORS、頁面操作、路由與資料保存／讀回 |
| 契約 fixture／攔截 API | 尚未可用的 Endpoint、受控故障／結果不明、穩定重現；清楚標示模擬 |
| 人工 | 手機、拖曳、星星／Range、Preview、長文字／名單及焦點 |

每輪驗證受影響且必要的範圍，通過後不無理由反覆擴大測試。後續修改若影響共用機制，再追加其受影響回歸。

### 8.2 Backend／fixture 依賴

- 正式 Browser 串接記錄實際前後端版本、Origins、非秘密設定與 API 啟動狀態。Cookie／CORS 不能只靠 unit mock 宣稱通過。
- 已讀基準下 R10 尚未實作；F0／F9／F10 依當時 repo／Endpoint 核對最新狀態。R10 本身開發與驗收由後端流程負責。
- 使用本機既有資料庫及保留的合成資料；前端不重建 DB、不刪開發 volume、不直接 SQL 改業務資料。停用／時間／特殊狀態 fixture 如需後端支援，使用受控已同意的安排。
- 合成帳號、Form、Response 可保留；不得把密碼、Cookie、Token 或敏感個資提交 repo。Playwright storageState／trace／截圖等可能含敏感內容，使用合成資料，按實際內容保護並以不含秘密的證據交付。
- 網路／500／timeout 測試若用攔截模擬，只證明前端處理；不宣稱已覆蓋真實 Server commit 結果未知。
- 共用頁面可以用完整刷新與普通 GET 核對，不另增核對中心、冪等 API 或跨頁資料恢復。

### 8.3 開發／驗收報告

回報：範圍、實際變更、前後端版本、實際命令與 PASS／FAIL／BLOCKED／未執行、主要證據、已知風險／延期項、commit SHA／Git 剩餘狀態及目前停止點。

修正使舊結果不再適用時明確標示，保留首次失敗與歷史證據。不把先前 PASS 改寫成本次結果；不把未執行人工項目填 PASS。沒有實際 Git repo／提交時直接記不適用，不臆造 SHA。

## 9. 初始進度與下一步

| 項目 | 2026-10-10 本次狀態 |
| --- | --- |
| 前端規格 00～07 | Owner review 通過 |
| 本總實作計畫 | Owner 已明確確認 v1.1；v1.3 依本次指示補分輪測試選擇原則，工作分配不變 |
| 前端 AGENTS／兩個 Skills | 本次初版已交付，待 Owner review |
| 前端 repo | 尚待建立／指定；本次未初始化 |
| F0～F10 | 全部 not started |
| 套件安裝／前端 build／unit／Browser 驗收 | 本次未執行 |
| 本文件檢查 | 按交付時實際核對結果回報，不代替上述程式驗證 |

下一步：Owner review 本次前端 AGENTS、development／acceptance Skills；確認前端工作目錄與後端來源可讀後，指定 Codex 先產出 F0 Alignment 與工程決議。個別輪次的 code／正式驗收維持明確指令與 review 流程。

### 9.1 F0 接手進度（2026-10-11）

本節保留 F0 初次交付紀錄；目前狀態見 §9.2。不更動 Round 分工或正式規格。

| 項目 | 本次狀態 |
| --- | --- |
| 授權／交付 | Owner 明確指定只執行 F0；已產出 [F0 Alignment Report](F0_Alignment_Report.md)，工程決議待 review |
| 前端 repo | `C:\Users\user\Desktop\custom-form-service-web`；master／`c655916f3bf322299b3dbefc9537decf3124834c`；接手時乾淨，只有文件，未初始化應用 |
| 後端來源 | `backend-ref/` 唯讀快照，來源 SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`；108 筆 manifest 相符 |
| R10／R11 | 快照記錄 R10 已實作且 accepted；R11 歷史 AI 結果待 Owner 確認、人工未執行；本次不代填後端 accepted |
| 本機唯讀檢查 | Node 24.21.0／npm 11.19.0；API health／readiness／OpenAPI 200，17 非 Google 操作及 Statistics 九欄位已列；未證明 live Git SHA 或 Browser Cookie／完整串接 |
| 套件／測試 | 官方精確版本 metadata 已核對；install／build／unit／Browser／正式驗收 NOT RUN；沒有服務啟停、設定或 DB 修改 |
| Git 交付 | 僅 F0 報告與本進度追加，未建立新 commit／push |
| 停止點 | **F0 Alignment 待 Owner review**；未 accepted；F1～F10 未開始，下一輪仍由 Owner 指定 |

### 9.2 F0 Owner 確認與有限收尾（2026-10-11）

| 項目 | 目前狀態 |
| --- | --- |
| F0 | **accepted**；Owner 本次明確確認 F0 review 通過，有限收尾見 [F0 報告 §11](F0_Alignment_Report.md#11-owner-accepted-與有限收尾2026-10-11) |
| 工程決議 | 同意工程方向；版本表為候選安裝基準，實際相容性由 F1 install／npm ci／lint／typecheck／build／Browser smoke 與 lockfile 證明 |
| F2 gate | 保留精確數值可行性 gate；不依賴 LosslessNumber 隱式轉換或一般 JS number 運算保存精度 |
| 後端來源時間點 | 沿用 2026-10-11 匯出的 SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`；R10 accepted、R11 結果待 Owner 確認均為快照狀態，本次沒有新後端確認來源、未重跑驗收 |
| 授權／接續 | F0 文件收尾及單一目的提交；接續僅 F1 精簡計畫，尚未授權初始化／安裝／實作；F2～F10 未開始 |
| 驗證／Git | 本次僅文件檢查及 F0 收尾提交；應用與後端測試 NOT RUN，實際 SHA 見 Git log／交付回報；不推送 |
| 停止點 | F1 計畫交付後停於 **F1 計畫待 review**；未授權正式驗收 |

### 9.3 F1 規劃交付（2026-10-11）

F0 有限收尾已提交：`54ac4482dba6442408864971a2ef11a871c441f3`；提交後工作樹乾淨，沒有推送。接續交付 [F1 精簡實作計畫](F1_Implementation_Plan.md) v1.0，含初始化檔案、候選必要依賴、scripts、驗證方式與停止點。本次只產出計畫與 README／本節進度；依 Owner 後續提交指示，一併納入單一目的文件提交，實際 SHA 見 Git log／交付回報。

**F0 accepted；F1 計畫待 review，開發未開始；F2～F10 未開始。** 初始化／install／npm ci／lint／typecheck／build／unit／Browser／正式驗收 NOT RUN；backend-ref 未改動、後端驗收未重跑。下一步等待 F1 本版核准與明確開發指令。

### 9.4 F1 授權開發與交付（2026-10-11）

Owner 明確通過 F1 計畫 review，指示局部補明 URL 覆寫的 dev／built preview／純靜態差異及 UI 內建本地圖示後直接開發。已完成 [F1 計畫 v1.1](F1_Implementation_Plan.md) 修訂、Nuxt CSR 工程骨架／lockfile／scripts，並交付 [F1 Development Report](F1_Development_Report.md) 與去敏開發自測證據。

install／npm ci／lint／涵蓋 app、tests、工具組態的 strict typecheck／build／Vitest／Chromium smoke 均實際完成，結果與已解決的初次失敗見報告；5 組不同啟動／建置條件最終 PASS。SSR=false、無 BFF；URL runtime／建置語意及 Toast／Dialog client bundle 已確認。backend-ref manifest 108 筆相符，沒有後端驗收、API 業務操作、DB 或服務設定修改。

**F0 accepted；F1 開發完成，待 code review；F1 未 accepted，F2～F10 未開始。** 本次變更與報告為單一目的本機提交，實際 SHA 見 Git log／交付回報；不推送，正式 AI／人工驗收 NOT RUN。

### 9.5 F1 review 與 P3 局部補正（2026-10-11）

F1 開發提交為 `317b25f55549b30673a02e15254358b86da4652d`，獨立 review 紀錄提交為 `613ced62008f459c5e74afc7489c6f843968cae2`。Owner 確認 [獨立 review](../review/F1_Code_Review_Report_20261011.md) 沒有阻擋缺陷，授權局部補正 P3 Dialog close icon 的本地 SVG mask／非零尺寸斷言，保留原 network／操作／焦點檢查與歷史證據。

已交付 [F1 P3 補正報告](F1_P3_Correction_Report.md) 與新證據；lint／typecheck／build／generate 及原五組 smoke 均 PASS。只修改既有 Browser case 與必要報告／進度，未改產品或套件、未重跑 npm ci；原目錄 EPERM 與原 review 結果如實保留。backend-ref 108 筆 manifest 相符，後端狀態仍是原快照時間點，未重跑後端驗收。

**F0 accepted；F1 P3 補正完成，待局部複核；F1 未 accepted，正式驗收／F2～F10 未開始。** 本次為單一目的本機提交，實際 SHA 見 Git log／交付回報；不推送。

### 9.6 F2 計畫核准、授權開發與交付（2026-10-11）

Owner 明確通過 [F2 計畫 v1.0](F2_Implementation_Plan.md) review，授權依本版開發及單一目的提交；計畫提交為 `a2599215adbc4cf916d53b7d2fcfeb1c67e212d6`。完成共用 native fetch Client、typed DTO／decoder、精確數值／Unicode／時間 helper、請求隔離、寫入互斥／未知結果政策、dirty 導航保護與錯誤元件，交付 [F2 Development Report](F2_Development_Report.md) 及去敏證據。

精確數值 unit／Browser gate、必要 unit／Browser、lint／strict typecheck／build 實際通過。原目錄 npm ci EPERM 重現並保留，乾淨副本 npm ci 通過；詳見報告的首次失敗與修正紀錄。Browser 使用合成 raw JSON fixture／攔截，真實 API／Cookie／DB 整合及正式 AI／人工驗收 NOT RUN。backend-ref manifest 108 筆相符；未改規格、後端快照或 F1 P3 歷史證據。

**F0 accepted；F1 P3 補正已交付，待局部複核及正式驗收，F1 尚未 accepted；F2 開發完成、待 code review；F3～F10 未開始。** 本次為單一目的本機提交，實際 SHA 見 Git log／交付回報；未推送、未開始正式驗收。

### 9.7 F2 局部修正與 F1 P3 複核狀態（2026-10-12）

F2 原開發提交 `e0d06e589d5eb3b65f0057bdd7fb8b1694625d76` 的獨立 review 發現 R1～R3；Owner 授權局部修正及必要開發自測。修正同 Form 跨操作待核對限制、Latest 明確讀取語意與 Browser 核對同步，交付 [精簡修正報告](F2_Review_Correction_Report.md)。受影響 unit 46／46、完整 F2 Browser 10／10、lint／strict typecheck／fixture typecheck／build PASS；原開發與 review 的失敗／證據保留，不代稱真實 API 整合。

**F1 P3 局部複核通過；F1／F2 仍未 accepted，正式驗收延後；F2 修正完成、待局部複核；F3～F10 未開始。** 本次單一目的本機提交、不推送；原兩份未追蹤 review 文件保持原樣，未納入修正提交。

### 9.8 F2 結案、補充自測與 F3 規劃（2026-10-12）

Owner 確認 [F2 R1～R3 獨立局部複核](../review/F2_Correction_ReReview_Report_20261012.md) 通過並同意結案；修正報告 Part A 引用更正 v1.0，無須為文件更正重跑測試。[F2 精簡補充測試計畫](../test-plan/F2_Supplemental_Test_Plan.md) 依本次指示直接執行，76 筆既有證據 hash、lockfile 與 backend manifest 核對相符；沿用適用的 unit／完整 Browser／build 歷史結果，只補舊寫入隔離、dirty 自然上／下一頁與 Latest 原生 timeout。新增 Browser 8／8、lint／root strict／fixture strict PASS，沒有阻擋問題，見 [精簡結果](../test-results/F2_Supplemental_Test_Report.md)。合成 Browser 不代表真實 API／Cookie／DB 整合。

已提出 [F3 精簡實作計畫](F3_Implementation_Plan.md)。**F3 計畫待 Owner review，開發未開始；F1 P3 局部複核通過、F2 修正結案；F1／F2 仍未 accepted，正式驗收延後。** 既有報告與前節歷史停止點保留；本次單一目的本機提交、不推送，實際 SHA 見 Git log／交付訊息。

本次 Owner 決議自 F3 起覆寫 §7 預設的分階段人工關卡：**計畫確認、整輪交付後集中 review**。待本版計畫核准，再一次授權整輪開發、必要測試及範圍內修正；不為每個工程決策或開發自測新增人工 review。正式驗收與 accepted 仍由 Owner 另行指定，不由自測／review 通過推定。

### 9.9 F3 核准、整輪開發與交付（2026-10-12）

Owner 確認 F2 補充測試結果，核准 [F3 Implementation Plan v1.0](F3_Implementation_Plan.md)，明確授權整輪開發、必要測試與範圍內修正。完成 Auth／Header／首頁／Profile，見 [精簡開發報告](F3_Development_Report.md) 與 [開發自測結果](../test-results/F3_Development_Test_Report.md)。

真實 Browser＋API 正常流程與 Email／錯誤 6 案最終 PASS，Cookie／CORS 真實證據完成；合成 Browser 22 個案例逐案最終 PASS、unit＋共用回歸 94／94、lint／strict typecheck／build／built CSR smoke PASS。首次失敗與重測保留；特殊真實 disabled／無效／過期 Cookie 缺受控前置 BLOCKED，人工／正式 AI 驗收 NOT RUN。live 後端 SHA 未確認，不沿用快照冒充實際版本。

**F3 整輪交付、待 Owner 集中 review；F3 未 accepted；F1／F2 正式驗收仍延後；F4～F10 未開始。** 本輪單一目的本機提交，不推送、不自行開始後續輪次；完整 SHA 見 Git log／交付訊息。既有規格、Round 分工、歷史停止點及 backend-ref 保留。

### 9.10 F3 授權局部修正交付（2026-10-12）

Owner 確認獨立 review findings，授權一次修正 F3-R1、F3-R2、N1 並完成必要自測，不重提整輪計畫。已修正不同 User／初始重試採用後的 Profile operation key 接續／未知限制、三個 F3 操作 Dialog 的焦點恢復，並補回 built 產品 Feedback／本地圖示／請求覆蓋，見 [精簡修正報告](F3_Review_Correction_Report.md)。unit 94／94、完整合成 F3 Browser 38／38、built R1／R2＋Feedback 17／17、F2 Dialog 相容 1／1、lint／strict typecheck／build PASS；皆為開發自測，本次未重跑真實 API。原 reviewer 文件、缺陷重現及歷史結果保留。

**F3 修正完成、待局部複核；未 accepted、不推送、不開始 F4，正式驗收仍延後。** 修正提交與剩餘 Git 狀態見報告／交付訊息。

### 9.11 F3 複核結案與 F4 規劃交付（2026-10-12）

Owner 明確確認 [F3 局部獨立複核報告](../review/F3_Correction_ReReview_Report_20261012.md)／[去敏證據](../review/evidence/F3_Correction_Independent_Verification_20261012.json)，**F3-R1、F3-R2、N1 結案，F3 code review 通過**。兩份複核文件已保存於本機提交 `02bccb3b49c60ab2cbd84edfaa51ccfa43afcce7`，本次原檔 bytes 保留；複核的 unit 136／136、dev Browser 38／38、built 17／17、F2 代表案例 3／3 與工程檢查 PASS 為該次獨立執行結果，本次未重跑。Browser 為合成攔截，既有真實正常流程／Cookie／CORS 是歷史證據，不能將其代稱本次整合 PASS。

本次授權只提出 [F4 精簡實作計畫 v1.0](F4_Implementation_Plan.md)，依既定 F4 清單／FormDetail 讀取／路由範圍，列兩支 GET、scope／Auth／錯誤責任、必要測試及風險。只做文件與證據核對、runtime 版本、health／ready／OpenAPI 唯讀 probe（200；兩支 GET 已列），沒有 Form 業務讀取、Browser、install／lint／typecheck／build／unit 或開發。後端快照 manifest 108／108 相符；live SHA 未確認，未修改快照／DB／服務。

**F4 計畫待 Owner review，開發未開始；F1／F2／F3 均未 accepted，正式 AI／人工驗收仍延後／NOT RUN。** disabled／過期 Cookie 受控前置、live 後端版本、真實故障／其他 Browser／人工實機與 npm ci／audit 既有缺口保留；真實無效 Cookie 沿用 reviewer 歷史純 GET 證據、本次未重跑。維持 §9.8 的兩人工關卡：計畫確認後整輪開發、自測及範圍內修正，交付後集中 review；不新增逐項關卡、不推送、不自行開始下一階段。文件本機提交 SHA／剩餘 Git 狀態見 Git log／交付訊息；以上是目前狀態，前節歷史停止點保留。

### 9.12 F4 v1.0 核准、整輪開發與自測交付（2026-10-12）

Owner 核准 [F4 精簡計畫 v1.0](F4_Implementation_Plan.md)，明確授權整輪開發、必要自測及範圍內修正，不另設測試計畫關卡；另同意自行註冊／登入新合成帳號。已完成 `/forms` 清單／10 筆分頁／filter／刷新及 responsive 呈現、共用 FormDetail loader／root readonly、Owner／狀態 replace、原 URL 錯誤與 stale response 隔離，見 [F4 開發報告](F4_Development_Report.md)／[去敏證據](../test-results/evidence/F4_20261012/verification-summary.json)。未接 Form 寫入／Latest／Count／Statistics 或 F5～F10 功能。

lint／Nuxt＋tools strict／fixture strict／build PASS，F4 unit＋受影響共用回歸 124／124 PASS；dev 合成 Browser 13 案逐案最新 PASS、built 10 個不同案例 PASS（分次執行，首次失敗／受影響重測保留；最後分頁對齊提示局部修正已重建及重驗 B02）。真實 Browser＋API 新帳號流程 1／1 PASS，驗空清單／filter／刷新、Cookie reload／CORS、不存在／無效 ID 和手動 AUTH_REQUIRED Dialog；只新增並保留合成帳號，沒有 Form 寫入、SQL、reset DB 或服務設定變更。非空 ≥11 筆、三狀態 Form／跨角色／已刪除／過期 Published、特殊 Auth／故障前置逐案 BLOCKED，不以合成結果解除缺口。backend manifest 108／108、F3 原複核兩檔 hash 相符；live SHA／DB 版本未確認，既有 npm ci／audit／人工／其他 Browser 等未驗證事項保留。

**F4 開發與自測完成，待集中 review；F1／F2／F3 均未 accepted，正式 AI／人工驗收仍延後／NOT RUN。** F3-R1／R2／N1 已結案與 code review 通過的 Owner 決議維持，歷史證據未覆寫。單一目的本機提交、不推送、不展開 F5～F10；完整 SHA／剩餘 Git 狀態見交付訊息／Git log。維持兩人工關卡，後續由 Owner 指定。

### 9.13 F4-R1 授權局部修正交付（2026-10-12）

Owner 確認 F4-R1／P2 並直接授權局部修正、必要回歸及交付，不另設修正計畫核准。已讓手動刷新起點的 Auth Dialog／redirect 政策只延續本次自動對齊，query／session 清資料、首次讀取與逐次 current guard 保留，見 [修正報告](F4_R1_Correction_Report.md)／[去敏證據](../test-results/evidence/F4_R1_Correction_20261012/verification-summary.json)。

修正前 fresh built 三種正式 Auth 401 **3／3 FAIL** 原件保留；修正後 unit **136／136 PASS**、同一 fresh built Browser **11／11 PASS**（三種 code、兩種關閉各一次、Dialog 前／後 URL／私有資料及外部變動撤銷，並重跑正常對齊／再次縮頁停止／空清單不重查／stale filter／既有 Auth），lint／strict／build／diff 核對 PASS。全部新增 Browser 為合成 API；真實測資缺口維持 BLOCKED，原 F4-L01 與未變共用證據沿用、本次未重跑。接手 HEAD `ddccaccf` 已保存兩份 review 文件，本次原 bytes／歷史失敗與證據不變；backend manifest 108／108 相符。

**F4-R1 修正完成，待局部複核；不代填 review 通過或 accepted，不推送、不展開 F5～F10。** F1／F2／F3 正式驗收仍延後，F3-R1／R2／N1 結案與 review 通過的 Owner 決議維持，其他既有未驗證事項保留。此次單一目的本機提交的完整 SHA／Git 狀態見交付訊息／Git log；前節歷史停止點保留。

### 9.14 F4-R1 獨立複核結案（2026-10-12）

依 Owner 本次指示對修正提交 `5bcd6ec5c4d3551689f9064a368f592d5a258c7b` 做局部獨立複核；起點 Auth 政策只延續本次自動對齊，清 snapshot／逐次 current guard／首次及無資料 retry／外部撤銷均保留。**F4-R1 結案，F4 code review 通過，無新增阻擋問題。** 見 [複核報告](../review/F4_R1_Correction_ReReview_Report_20261012.md)／[去敏證據](../review/evidence/F4_R1_Independent_Verification_20261012.json)。

本次獨立 unit **136／136 PASS**、fresh built Browser **12／12 PASS**（三種 code、頁尾／× 各一次、Dialog 前後撤銷及受影響清單案例）、lint／strict／fresh build／diff 核對 PASS。修正前產品對父提交 Git blob 2／2、修正來源 11／11（進度更新前）、修正 raw 21／21、原 review／歷史證據與 backend manifest 108／108 均相符，未覆寫歷史失敗。Browser API 全為合成攔截，未變共用與角色／狀態證據沿用；真實測資與受控 Auth／故障前置仍 BLOCKED，live 後端版本 UNCONFIRMED。

**F1／F2／F3／F4 均未 accepted，正式 AI／人工驗收仍延後／NOT RUN；不推送、不展開 F5～F10。** 僅本次複核報告／去敏摘要與必要進度作單一目的本機文件提交，產品／測試不變；完整 SHA／最終 Git 狀態見 Git log／交付訊息。原修正與 review／歷史章節保留。

### 9.15 F4 結案確認與 F5 規劃交付（2026-10-12）

Owner 明確確認 **F4-R1 結案、F4 code review 通過**；正式驗收仍延後，不改 accepted，既有真實測資缺口保留。本次核對起點 master／`88c1e6b4007c04ba8831560d48880ba9f7311d52`、工作樹乾淨，依最新 AGENTS／development skill、F5 與 §7／§7.1 提出 [F5 精簡實作計畫 v1.0](F5_Implementation_Plan.md)。範圍是 Editor／Answer 純 Domain、Create／Delta、Draft／Publish 與答案驗證、基準／ID／錯誤 path；UI 與保存／提交 API 留原訂後續輪次。

本次只做文件／來源／Git／runtime、唯讀 metadata 與 manifest 核對：Node 24.21.0／npm 11.19.0、backend hash 108／108 相符；health／OpenAPI 200，readiness 在 5 秒 timeout 內未完成，live SHA／DB 版本仍 UNCONFIRMED。沒有執行產品測試、Browser、Form 業務操作／DB 寫入或安裝；適用的歷史證據沿用，未覆寫原 review／失敗／證據，真實 BLOCKED 缺口不解除。

**F5 計畫待 Owner review，尚未開發；F1／F2／F3／F4 均未 accepted，正式 AI／人工驗收仍延後／NOT RUN。** 沿用 §9.8 與本次 Owner 指示的「計畫確認 → 整輪開發、自測及修正交付後集中 review」，不新增測試計畫核准關卡。本次僅計畫與必要進度的單一目的本機文件提交，完整 SHA／剩餘 Git 狀態見 Git log／交付訊息；不推送、不開發 F5、不展開後續 Round。

### 9.16 F5 v1.0 核准、整輪開發與自測交付（2026-10-12）

Owner 明確通過 [F5 精簡實作計畫 v1.0](F5_Implementation_Plan.md) review，授權整輪開發、必要自測及範圍內修正，不新增測試計畫核准關卡。起點 master／`2fb15fb4461eb56a727715da463c084958d20a37`、工作樹乾淨。已完成 Editor 初值／key／Server ID／baseline／dirty／切換與排序、Create／Draft Delta、Draft／Publish 與五題型答案驗證／builder、三種錯誤 path map，見 [F5 開發報告](F5_Development_Report.md)／[去敏摘要](evidence/F5_20261012/verification-summary.json)。本輪維持純 Domain，UI／保存／提交 API 與頁面流程留原訂後續輪次。

Owner 指定既有 single_choice → 確認 text → single_choice 的固定預期 unit **PASS**，最終 type 相同時明確送舊 Option IDs id-only delete＋新 Options，原 Options 不復原、不依賴 Server type-change cleanup；[實際 Body／wire](evidence/F5_20261012/choice-roundtrip-body.json) 與固定預期相符。必要 unit **167／167**（含直接受影響 F2 locator 回歸）、lint／Nuxt＋tools strict typecheck／build／diff 核對 PASS，初次 sandbox／lint／型別失敗與修正歷史保留。backend-ref manifest **108／108** 相符，依賴／adapters／API services／頁面未改；真實 API／DB／Browser／正式 AI／人工驗收未執行，既有真實測資、live readiness／版本與 npm ci／audit 缺口保留。

**F5 開發完成、待集中 review；F1～F5 均未 accepted，正式驗收仍延後／NOT RUN。** 沿用 §9.8 兩人工關卡，不推送、不展開 F6。僅本輪已驗證變更與交付文件作單一目的本機提交；完整 SHA／最終 Git 狀態見交付訊息／Git log。前節歷史停止點及 F4 code review 通過的 Owner 決議保留。

### 9.17 F5-R1 授權局部修正交付（2026-10-12）

Owner 確認 F5-R1／P2 並直接授權局部修正、必要回歸與交付，不另提修正計畫。起點 master／`e4da993470bf89388b899e046e22ccea3a652a93`，兩份未提交 review 報告／證據保留原 bytes 與未提交狀態。已局部修正合法可選 config 的 undefined／省略 dirty 投影，使 validator candidate／Delta 一致；null、未知 key／錯題型空值與非法非空值保持差異並拒絕，共用比較與契約未改。見 [修正報告](F5_R1_Correction_Report.md)／[去敏證據](evidence/F5_R1_Correction_20261012/verification-summary.json)。

先新增 58 案並在產品修正前重現，首次與中間失敗全部保留；最後 F5／F2 unit **225／225 PASS**、lint／strict typecheck／build／diff PASS。四組 review undefined 案皆 Draft valid／Delta noop／dirty=false；12 組原設定清除皆以完整 replacement 移除 key，null／未知／非法值仍 invalid 且 dirty。另擷取四組與三種 replacement 的實際 candidate／Body，原 Choice→text→Choice 固定 Body 回歸維持 PASS。原 review／probe／F5 報告與證據／lockfile hash 8／8、backend manifest 108／108 不變；全部為純 Domain 合成自測，真實 API／DB／Browser 未執行，既有測資與 live／npm ci／audit 缺口保留。

**F5-R1 補正完成、待局部複核；不自行宣告 F5 review 通過，F1～F5 未 accepted，正式驗收維持延後／NOT RUN。** 只提交局部修正及交付／必要進度，不推送、不展開 F6。完整 SHA／剩餘 Git 狀態見 Git log／交付訊息；前節與原審查歷史不覆寫。

### 9.18 F5-R1 局部獨立複核通過與文件提交（2026-10-13）

Owner 授權對 `75860ac18f731ffa566dfed09c3f3c60cb65cbb5`（修正基準 `e4da993470bf89388b899e046e22ccea3a652a93`）做局部獨立複核，並指示通過時同步「F5-R1 結案、F5 code review 通過」。已閱讀實際修正 diff、58 案新增回歸、補正候選／Body 與原始失敗證據；合法可選 undefined／省略皆 valid／noop／clean，既有設定清除以完整 replacement 保留其餘設定，null／未知 key／非法非空值仍 dirty／invalid，共用比較未放寬。中間移除 object key 順序斷言未降低契約預期，完整固定 DTO 與長小數 literal wire 仍保留。見 [局部複核報告](../review/F5_R1_Correction_ReReview_Report_20261013.md)／[獨立證據](../review/evidence/F5_R1_Independent_Verification_20261013.json)。

本次獨立 F5／F2 unit **225／225 PASS**、lint／Nuxt＋tools strict／build／diff PASS，純 Domain probe 核對四組原重現、三種 replacement 及非法拒絕。補正 source 5／5、保留檔 8／8、原始證據 24／24 與後端 manifest 108／108 hash 相符；沒有產品／測試／依賴變更。原 review 報告／獨立證據保留 bytes，與本次複核文件及必要進度一併作本機文件提交；完整 SHA／Git 狀態見交付訊息與 Git log。

**F5-R1 結案、F5 code review 通過；F1～F5 accepted 不變，正式驗收維持延後／NOT RUN。** 本次無新增阻擋或非阻擋 finding；真實測資、live 版本／readiness、npm ci／audit 與 Browser／人工等缺口保留，不推送、不展開 F6。後續由 Owner 指定，前節與原審查／失敗歷史不覆寫。

### 9.19 F6 規劃交付（2026-10-13）

Owner 明確確認 F5-R1 結案、F5 code review 通過，指定以 `0a8ceeb560b06a7ca2f847f019f8894cd346bce0` 為基準，只交付 [F6 實作計畫 v1.0](F6_Implementation_Plan.md)、必要進度及單一目的本機文件提交。接手 master／工作樹乾淨；計畫承接 F5 Domain 與本計畫 F6／§7／§7.1，列桌機／手機線框、Editor／共用 Renderer／Preview、Create／Draft 保存、Server 新 IDs／baseline 重建、dirty／離頁／Auth 與結果不明核對，以及必要 Browser／真實 API 保存讀回與前置缺口。既有 Visibility 即時更新與發布等管理維持 F7，正式提交／Latest 維持 F8。

本次實測 Node 24.21.0／npm 11.19.0、選用套件 installed／lockfile 一致，backend manifest 108／108 相符；2026-10-13 19:34:14 台北時間起的 health／readiness／OpenAPI 均 200，列 Create／Draft PATCH 等描述。live 後端 Git SHA／DB 版本仍 UNCONFIRMED；沒有業務 API／Browser／保存讀回執行，metadata 不是整合 PASS。必要文件核對／diff 與本機提交結果依交付訊息及 Git log，產品／測試／依賴／backend-ref 與歷史報告／失敗證據不改。

**F6 計畫待 Owner review；本次不開發。** 沿用「計畫確認 → 整輪開發、自測與修正 → 集中 review」，不新增開發測試計畫核准關卡。正式驗收維持延後、F1～F5 accepted 不變；既有真實測資及實機等缺口保留，不推送、不展開後續 Round。install／lint／typecheck／build／unit／Browser／業務 API／正式 AI／人工驗收均 NOT RUN，前節歷史結果不覆寫。

### 9.20 F6 開發交付（2026-10-13）

Owner 通過 F6 計畫 v1.0 review 並授權整輪開發、自測與修正，已先同步兩項決議至 [v1.1](F6_Implementation_Plan.md)：產品既有 Visibility 顯示真實值／目前僅供檢視；Auth／帳號改變後，本地輸入與寫入資格分開，取消離頁不能恢復舊 Session 保存，new／edit 需核對目前 Session／資源／權限。由 `510b6ee7d03935d553303e5ed745a81b23e59944`（接手乾淨）完成 Editor、五題型與排序、UForm／API 錯誤定位、完整 DTO 新 IDs／基準、dirty／unknown 核對、Renderer readonly 與獨立 Preview。見 [開發報告](F6_Development_Report.md)／[去敏證據](evidence/F6_20261013/checks.json)。

本輪 lint／Nuxt＋tools strict／harness Vue strict／fresh build PASS、unit **345／345**、fixture Browser **23／23**、built **20／20＋3 測試專用 route skipped**、Chrome／Edge 代表保存／Preview 各 **2／2**；真實 L01～L04 **1／1 全流程 PASS**，無 API 攔截，核對 Create／Draft PATCH／九次獨立 GET、完整 Number token／Choice 往返／新 IDs／微秒 deadline／Cookie CORS 與清 Cookie Auth。最初檢查與兩次真實測試整體 FAIL 原件／去敏 wire 保留，三次合成帳號與五份 Draft 不刪除，不修改契約或舊 F5 固定預期求 PASS。backend-ref manifest 108／108 不變；5000 埠 DLL ProductVersion 1.0.0+7591633137c5a6f57c1fce8e1ba19ab394015880 可核對，DB identity／migration 仍未獨立確認。

**F6 開發完成、待集中 review。** 沿用「計畫確認 → 整輪開發、自測與修正 → 集中 review」，沒有新增中途測試計畫核准 gate。實機軟鍵盤／觸控與受控真實 Token／特殊資源狀態 BLOCKED／NOT RUN，viewport／fixture 結果分開，不代填正式 AI／人工 PASS。正式驗收維持延後、accepted 不變；僅單一目的本機提交，不推送、不展開 F7。前節與原失敗歷史不覆寫。

### 9.21 F6 獨立集中 review（2026-10-13）

Owner 指定基準 `510b6ee7d03935d553303e5ed745a81b23e59944`、目標 `d86479d3c6f7b2690181b0beba6092ea5eb6e979`，授權獨立集中 code review、必要工程／unit／fresh built Browser 重跑與本機文件提交，尚不正式驗收。本次讀取實際 diff／產品／測試斷言／核准 F6 v1.1／正式契約／開發報告與去敏證據；發現兩項 P2：Stars 同標題 0 分控制干擾其他題目、Browser console helper 未限案例預期失敗請求。見 [獨立報告](../review/F6_Independent_Code_Review_Report_20261013.md)／[驗證證據](../review/evidence/F6_Independent_Verification_20261013.json)；尚不能宣告 code review 通過，未自行修正產品或 tests。

本次 lint／Nuxt＋tools strict／harness strict／fresh build PASS，完整 unit 345／345、fresh built Browser 20／20＋3 skipped、補跑 fixture readonly／同元件 scope 三案 3／3 PASS；追加 Browser 診斷重現兩項 FAIL，Domain 導航 reject／Session 晚回／共享 unknown 鎖三項核對 PASS。歷史 L01～L04 wire／九次獨立 GET 六組稽核支持保存結論，本次沒有追加真實 API 寫入或變更後端資料。sandbox 首次 unit spawn EPERM 與授權本機成功結果分開保留；原開發失敗歷史與 evidence 不覆寫。

**停於 F6 集中 review 完成、待 Owner 確認。** 實機、受控特殊 Auth／資源狀態、DB identity／migration 缺口維持；正式驗收延後、accepted 不變、不推送、不展開 F7。本次僅追加 review 文件／去敏證據與進度，單一目的本機提交 SHA 見 Git log。

### 9.22 F6-R1／F6-R2 授權局部修正（2026-10-13）

Owner 確認兩項 P2 成立，直接授權局部修正、必要自測與本機提交，不新增修正計畫核准 gate。接手 master／`0aff8bb754f077d5df90209a123e024e5b5a83a3`、工作樹乾淨；先保留同名 Stars 錯題與 console 放行無關 404／requestfailed 的回歸 FAIL，再分別改為 Question key＋Renderer instance 識別，以及案例事先明列 method／URL／status 或 reason／request 與 diagnostic 次數的精確配對。標題保持顯示用途，不新增唯一限制；雙 Renderer 改名／重排／答案隔離由 harness 補驗。見 [局部修正報告](F6_R1_R2_Correction_Report.md)／[去敏證據](evidence/F6_R1_R2_Correction_20261013/verification-summary.json)。

必要 lint／strict typecheck／fresh build／harness strict PASS；受影響 unit 27／27、fresh built F6 Browser 23／23＋4 harness-only skipped、fixture 補驗 6／6，新斷言後雙 Renderer 單案 1／1 PASS。首輪 Browser 重現、harness 掛載時序／immutable 定義修訂失敗與所有原 review／歷史證據保留；fixture 明列模擬。歷史 live Create／Draft PATCH／獨立 GET 沿用，本次未註冊或追加真實寫入，未改 live spec、原 wire／ID 索引或合成資料。

**停於 F6 兩項 P2 修正完成、待局部獨立複核。** 未自行宣告 code review 通過；正式驗收延後、accepted 不變。實機、受控特殊 Auth／資源、DB identity／migration 缺口維持；僅單一目的本機提交，不推送、不展開 F7。完整 SHA／最終 Git 狀態見交付訊息與 Git log；前節歷史不覆寫。

### 9.23 F6-R1／F6-R2 局部獨立複核（2026-10-14）

Owner 指定修正基準 `0aff8bb754f077d5df90209a123e024e5b5a83a3`、目標 `8e858455b6ce191b6a1607d3c03eda0dd2cea5f4`，授權局部獨立複核、必要工程／unit／fresh built F6 Browser／受影響 harness、進度與文件提交。本次核對實際 diff／斷言／前後 reporter 與 attachment：R1 的 Question key＋Renderer instance 隔離同名題／跨 instance，改名／重排與答案一致；R2 依事前宣告精確配對，負向案明確要求 helper 拒絕與 clean 拋錯。兩項 **CLOSED**，無新增 findings；其他 F6 review 結論與歷史 live 證據沿用，**F6 code review 通過**。見 [局部複核報告](../review/F6_R1_R2_Correction_ReReview_Report_20261014.md)／[獨立證據](../review/evidence/F6_R1_R2_Independent_Verification_20261014.json)。

本次 lint／strict typecheck／fresh build／harness strict PASS，受影響 unit 60／60、fresh built Browser 23／23＋4 skipped、受影響 harness 6／6 PASS；text／number／Choice 識別／model 抽查六項通過。一次性診斷的隱藏 label／Stars harness 原生 JSON 展示假設失敗與限制保留，產品與 tests 未改。snapshot manifest 108／108；原 review、correction 失敗與歷史 live 原件保留，無真實 API 寫入。

**停於局部獨立複核通過、F6 code review 通過，待 Owner 確認後續階段。** 正式驗收延後、accepted 不變；既有實機／受控特殊 Auth／資源／DB identity／migration 缺口不解除，不推送、不展開 F7。本次僅追加 review 文件／去敏證據與進度，本機文件 SHA 見 Git log。

### 9.24 F6 結案確認與 F7 規劃交付（2026-10-14）

Owner 本次明確確認 **F6-R1／F6-R2 結案、F6 code review 通過**；正式驗收延後、accepted 不變、既有缺口保留。接手 master／`47dbce558bc628d250911f56af621ba8da2e8093` 與指定基準一致、工作樹乾淨；依最新 AGENTS／development skill、正式規格、本計畫 F7／§7／§7.1，交付 [F7 精簡實作計畫 v1.0](F7_Implementation_Plan.md)。涵蓋 Lifecycle／Visibility／Delete／Count／分享的資格、確認與導航，保存／發布分離、寫入互斥／unknown 核對、Visibility 白名單合併保留 dirty 定義，以及必要 unit／Browser／真實 API 與專用測資安排、既有缺口的本輪影響。

本次僅文件與唯讀核對：Node 24.21.0／npm 11.19.0、選用套件 installed／lockfile 一致、backend manifest 108／108；08:51:44～47 台北時間 health／readiness／OpenAPI 均 200，F7 端點描述可見。後端 checkout SHA 與快照相同、既存 untracked SNAPSHOT.md 未動，磁碟 DLL 版本／hash 承接 F6；目前程序 assembly 綁定讀取受 PermissionDenied、DB identity／migration 仍 UNCONFIRMED，不以 metadata 冒稱 R7／R9 真實操作 PASS。無產品測試／Browser／業務 API 讀寫／DB 操作，歷史報告與失敗證據保留。

**停於「F7 計畫待 Owner review」**，尚不開發；沿用「計畫確認 → 整輪開發、自測與範圍內修正 → 集中 review」，不新增中途測試計畫核准 gate。正式驗收延後、accepted 不變，既有缺口未解除。本次僅本計畫／README 進度與 F7 計畫三份文件，未提交、未推送、不展開 F8，接手 HEAD 不變；文件核對與最終 Git 狀態見交付訊息。

### 9.25 F7 授權開發與自測交付（2026-10-14）

Owner 通過 F7 精簡實作計畫 v1.0，授權整輪開發、必要自測、範圍內修正與本機提交，不新增中途測試計畫核准 gate；另明確要求跨寫入舊 GET 隔離、允許正常 API 專用合成測資，Delete 僅作用於明列本輪資源。依基準 `47dbce558bc628d250911f56af621ba8da2e8093` 完成 Lifecycle／Visibility／Delete／Count／Clipboard 與唯讀定義；共用 Form lease／revision 隔離 Form、GET me＋Form 資格核對、Count／候選 GET，晚回不得覆蓋新基準或解除未知鎖。政策回應只合併 metadata／Visibility，未保存定義保留；API 否定資格留在 App 共用 coordinator，SPA 返回不復活。見 [F7 開發報告](F7_Development_Report.md)／[去敏證據](evidence/F7_20261014/verification-summary.json)，計畫 v1.1 只同步授權補充，§9.24 歷史保留。

lint／strict typecheck／fresh build／F6 harness strict PASS，受影響 unit **231／231**；F7 fixture Browser 完整 24 案 **23 PASS／1 FAIL**，測試導航同步修正後受影響 **2／2 PASS**，逐案最新 24 個不同案例 PASS；Chrome／Edge smoke 各 2／2 PASS。F6 受影響 fixture 先 16／16、共用資格鎖補強後 8／8，政策初值斷言單案 1／1 PASS。真實 API L01～L06、Draft／Published／Closed × 三政策九格矩陣與正常 Cookie 換帳號資格補驗分次 PASS，含保存／發布分離、自然到期 Close、Count 0→1→1→2、Delete 204／404／清單讀回及 AUTH_REQUIRED dirty 返回；fixture 與真實結果分列，首次 FAIL／修正重測及失敗測資全部保留。

本輪正常建立 4 個合成帳號／15 份 Form，僅 6 份明列 delete-* 專用資源 soft-delete，9 份未刪保留；歷史 F6 帳號／五份 Draft／證據未動。backend manifest 108／108，開發時唯讀程序 probe 補確認 runtime assembly 綁定同快照 SHA；DB identity／migration 仍 UNCONFIRMED。真實 invalid／expired／disabled、Server commit 故障、實機與其他未覆蓋歷史缺口保留；未造簽 Token、SQL 改資料或重建 DB。

**停於「F7 開發完成、待集中 review」**；正式驗收維持延後、accepted 不變，不代填 code review／AI／人工驗收 PASS。本輪作單一目的本機提交，完整 SHA 與最終 Git 狀態見交付訊息／Git log；不推送、不展開 F8。

## 10. 本文件產製檢查紀錄

本文件依已交付的八份規格編寫。v1.1 依 Owner 本次指示加入分輪工程提醒；02 §6.1 明確既有省略 variant 的呈現／dirty／Delta，06 §7 補 Email 相容要求。未新增功能或改 API 契約。交付前核對：

- 8 份規格引用與預計 repo 路徑。
- F0～F10 編號、輪次前置、全部 URL 與 18 Endpoint 分配；Google 明確延期。
- Delta、Rating 未作答／0、完整 Latest、Visibility、D-12、原 URL 錯誤與不明寫入的覆蓋。
- Statistics Root 九欄位、公開 Auth 獨立與 R10 整合阻擋條件。
- Markdown 相對連結、表格、控制字元與最終換行。
- 本次 9 項提醒與 F0～F10／§7.1 對應、variant 的新建／既有邊界、Email 相容要求，以及 README／完整包一致。

v1.2 記錄 Owner 對 v1.1 的核准，更新 AGENTS／Skills 的初版交付狀態；§4～§8 的開發分工、工程提醒與產品規則不變。

v1.3 依 Owner 指示於 §8.1 與 AGENTS／兩個 Skills 明列選用理由、不適用層級可省略、Browser 行為判斷與必要驗證受阻的區別。未更動 Round 分工、產品規格或授權停止點。

本計畫的產製只做文件核對，沒有 npm install／build／unit／E2E、live API 或前端業務 repo 初始化／提交；Skills 的格式與工作流程檢查另記於本次協作文件核對報告，不能代替正式程式證據。

