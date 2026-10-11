# F0 Alignment Report

| 項目 | 本次紀錄 |
| --- | --- |
| 版本／日期 | 1.1／2026-10-11（Asia/Taipei）；有限文件收尾，保留 v1.0 初次檢查證據 |
| 階段／狀態 | **F0 accepted**；Owner 於 2026-10-11 明確確認 review 通過 |
| 授權 | 初次僅 F0 對齊與唯讀檢查；本次授權 F0 文件收尾／提交與 F1 規劃，未授權 F1 初始化／安裝／實作 |
| 前端工作目錄 | `C:\Users\user\Desktop\custom-form-service-web` |
| 前端基準 | `master`／`c655916f3bf322299b3dbefc9537decf3124834c`；接手時工作樹乾淨 |
| 後端參考 | 本 repo `backend-ref/` 唯讀快照；來源 `master`／`7591633137c5a6f57c1fce8e1ba19ab394015880` |
| 交付 | 本報告（已確認工程方向／候選版本）、總計畫 §9.1～9.2 與 README 進度 |
| Git 紀錄 | v1.0 初次交付未提交；v1.1 收尾按 Owner 指令提交，實際 SHA 見 Git log 與本次交付回報；未推送 |

## 1. 對齊結論與證據邊界

來源足以提出 F1／F2 的具體計畫。主要前端行為、18 支正式 Endpoint 分配及 Statistics v1.1 九欄位與目前後端正式契約一致；未發現需要 Owner 重定產品行為的契約衝突。既定 Nuxt 4 CSR、`ssr=false`、TypeScript strict、Nuxt UI 4／Tailwind 4、Browser 直連 API 保持；Google 按鈕隱藏、Google Auth 與部署延期。

Node 指定版本 `24.21.0` 已在本機可執行，官方已有該 LTS release。後端 `http://localhost:5000` 的 health、readiness、OpenAPI 均回 200；OpenAPI 列出本次要接的 17 個非 Google 業務操作，StatisticsResponse 具備完整九個根欄位。這是本次連線／描述核對，沒有逐支執行業務 API、Cookie 登入或 Statistics 資料查詢。

前端文件中「repo 尚待建立」「R10 尚未實作」及部分待 review 文字是較早的來源狀態。本次已辨識差異，詳 §5；只更新進度紀錄，未改正式規格。快照來源記錄 R10 accepted、R11 技術結果待 Owner 確認，不能從本次 health PASS 推論 R11、A-stage 或完整 Backend V1 accepted。

初次對齊與本次收尾均沒有初始化、安裝、lockfile、應用實作、後端 build／tests、DB 操作、服務啟停或設定修改。Owner 已確認下列工程方向；§7.1 版本表僅為 **候選安裝基準**，metadata 符合不等於整套 install／npm ci／lint／typecheck／build／Browser smoke 已通過，實際相容性由 F1 證明。

## 2. 已讀來源與實際版本

### 2.1 前端

| 來源 | 版本／用途 |
| --- | --- |
| [AGENTS.md](../../AGENTS.md) | v1.1／2026-10-10；來源、分輪授權、唯讀快照、Git／測資／驗證規則 |
| [Development Skill](../../.agents/skills/v1-frontend-round-development/SKILL.md) | repo-local 初版；本次使用其 F0 流程，已讀 YAML companion |
| [Acceptance Skill](../../.agents/skills/v1-frontend-acceptance-testing/SKILL.md) | repo-local 初版及 YAML 已讀；僅核對邊界，本次未啟動正式驗收 |
| [00 Overview](../specs/00-v1-frontend-overview.md) | v1.0／2026-10-10；Scope、排除及來源歷史 |
| [01 Routing](../specs/01-pages-routing-and-access.md) | v1.0；URL、角色／狀態路由、Header、列表 |
| [02 Editor](../specs/02-form-editor-and-lifecycle.md) | v1.1；Draft／Publish、Delta、原始 config 與有效 variant |
| [03 Response／Statistics](../specs/03-response-and-statistics.md) | v1.0；空白初始、Latest 整份、統計／存取矩陣 |
| [04 Auth／Errors](../specs/04-auth-state-and-error-handling.md) | v1.0；D-12、dirty、競態、結果不明 |
| [05 UI](../specs/05-ui-and-interaction.md) | v1.0；台北時間、手機、Dialog、完整長內容 |
| [06 Architecture](../specs/06-technical-architecture.md) | v1.1；CSR、精確數值、Unicode、Email 相容 |
| [07 Integration](../specs/07-api-integration-map.md) | v1.0；18 Endpoint、DTO 與錯誤摘要 |
| [總實作計畫](V1_Frontend_Implementation_Plan.md) | v1.3／2026-10-10；完整閱讀，特別核對 F0、§6、§7／§7.1、§8 |

以上均來自本次前端基準 SHA；README 的來源與階段說明亦已讀。規格初版的「待 review」按總計畫 §1 記錄的 Owner 確認解讀；本次明確 F0 指令足以執行本輪，不因協作文件保留待 review 字樣重複索取 F0 授權。

### 2.2 後端

先讀 [SNAPSHOT](../../backend-ref/SNAPSHOT.md) 與 [README](../../backend-ref/README.md)，再以快照內正式 specs 為權威；src／tests 僅查證。

| 正式來源 | 版本／重點 |
| --- | --- |
| [00 Overview](../../backend-ref/docs/specs/00-v1-overview.md) | v1.1／2026-10-10；範圍與 Statistics 摘要已核准 |
| [01 Domain](../../backend-ref/docs/specs/01-v1-domain-specification.md) | v1.1／2026-10-10；§3、FORM、QST、SUB、STA |
| [02 Database](../../backend-ref/docs/specs/02-v1-database-specification.md) | v1.0／2026-09-28；七表、JSONB、TIMESTAMPTZ；不作 DB 執行依據 |
| [03a Common](../../backend-ref/docs/specs/03a-v1-api-contract-common.md) | v1.0／2026-09-28；Cookie、18 Endpoint、順序、204、no-op |
| [03b Auth／User／Form](../../backend-ref/docs/specs/03b-v1-api-contract-auth-user-form.md) | v1.0／2026-09-28；§3～8 DTO／驗證／Delta／Lifecycle |
| [03c Submission／Statistics](../../backend-ref/docs/specs/03c-v1-api-contract-submission-statistics.md) | v1.1／2026-10-10；§3.4 九欄位、§4.4 path、§7～8 特殊 Auth／聚合 |
| [04 Errors](../../backend-ref/docs/specs/04-v1-error-catalog.md) | v1.0／2026-09-28；Envelope、23 top-level／11 detail codes、優先序 |
| [05 Constraints](../../backend-ref/docs/specs/05-v1-system-constraints.md) | v1.1／2026-10-10；§4、§5.3、§10～13、安全及完整性 |

另讀 [環境 guide](../../backend-ref/docs/configuration/environment-configuration.md)、[R11 execution](../../backend-ref/docs/implementation/R11_Acceptance_Execution_Report.md)、[coverage／known gaps](../../backend-ref/docs/implementation/R11_Coverage_Index.md)、[historical status](../../backend-ref/docs/implementation/R11_Historical_Status.md)。快照的 `MANIFEST.sha256` 共 108 筆，本次逐檔 SHA-256 全部相符；快照被 `.gitignore` 排除，不以 Git diff 當作其完整性證據。

快照技術基準：.NET SDK `10.0.400`（latestPatch）、EF／OpenAPI／JWT `10.0.11`、Npgsql EF `10.0.3`、PostgreSQL image `17.11-alpine`。本機 `dotnet --version` 是 `10.0.400`；未查運行服務的 DLL／PDB／commit 或 DB identity／server version。因此 **live API 的 Git SHA／實際 DB 版本未確認**，不能把快照 SHA 或 image 值當成 live process 的版本證明。

R11 的 420/420、49 HTTP＋6 非 HTTP PASS 只引用來源歷史，原 artifacts 未匯出、本次未重跑；人工未執行。其 coverage gaps（逐端點 Auth／UUID、QUESTION_TYPE_CONFLICT exact path、全端點 500、Publish barrier 新版 DTO 證據等）維持來源限制，不列作本次產品 FAIL 或前端 F0 阻塞。

## 3. Repo、Git 與工具環境

| 檢查 | 本次觀察 |
| --- | --- |
| Git | `master`；HEAD 如首頁；`git status --porcelain=v1 --untracked-files=all` 起始無輸出 |
| Remote | `git remote -v` 無輸出；沒有設定 remote，非本機 F0／F1 阻塞 |
| 專案 | tracked 檔案為 AGENTS、skills、README、specs／plan／review；無 `package.json`、`package-lock.json`、Nuxt config、app、node_modules |
| Node／npm | `node --version` → `v24.21.0`；`npm --version` → `11.19.0`，來源 `C:\nvm4w\nodejs` |
| Shell／OS | PowerShell `7.6.5`，host .NET `10.0.11`；Windows NT `10.0.26200.0` |
| 其他工具 | Git `2.51.2.windows.1`、rg `15.2.0`、.NET SDK `10.0.400` |
| 瀏覽器 binary | Chrome `156.0.8078.12`；Edge `155.0.4283.45`（檔案 ProductVersion；未啟動驗證） |
| 專案測試工具 | 尚無本 repo ESLint／Vitest／Playwright 套件及 browser bundle；F1 安裝／啟動待授權 |

本次已讀的後端 HTTP launch profile 為 `http://localhost:5000`／Development。啟動指令由後端 README 提供：`dotnet run --project src/CustomFormService.Api/CustomFormService.Api.csproj --launch-profile http --no-build`；本次 **未執行**，服務由 Owner 保持運行。不從唯讀快照啟動另一個 API，也未讀 Secrets 或實際 `.env`。

## 4. 全部 18 Endpoint 對照

以下省略 `/api/v1`。正式 Method／Path／成功形狀以後端 03a §7、03b、03c 為準；前端 07 §2 與總計畫 §6.2 分配吻合。**「有」只指快照 Controller 與本次 live OpenAPI 均列出操作；本次未呼叫其業務流程。**

| # | Method／Path | 成功契約 | 前端 Round／觸發 | 快照＋live OpenAPI |
| --- | --- | --- | --- | --- |
| 1 | POST `/auth/register` | 201 User，不登入 | F3 註冊 | 有 |
| 2 | POST `/auth/login` | 200 User＋Cookie | F3 登入 | 有 |
| 3 | POST `/auth/logout` | 204 清 Cookie | F3 dirty 確認後 | 有 |
| 4 | POST `/auth/google` | 200 GoogleAuth＋Cookie | 延後 G1，F3 隱藏，F10 確認未接入 | 無；符合已定延期 |
| 5 | GET `/users/me` | 200 User | F3 共用一次 D-12；明確核對例外 | 有 |
| 6 | PATCH `/users/me` | 200 User | F3 Profile | 有 |
| 7 | POST `/forms` | 201 Draft FormDetail | F6 首次保存 | 有 |
| 8 | GET `/forms` | 200 items＋pagination | F4 pageSize=10、filter／刷新 | 有 |
| 9 | GET `/forms/{formId}` | 200 FormDetail | F4 Loader，F6～F8 接入；F9 不預查 | 有 |
| 10 | PATCH `/forms/{formId}` | 200 FormDetail | F5 Delta builder，F6 保存 | 有 |
| 11 | DELETE `/forms/{formId}` | 204 | F7 soft delete | 有 |
| 12 | POST `/forms/{formId}/publish` | 200 FormDetail | F7 已保存 Draft 發布 | 有 |
| 13 | POST `/forms/{formId}/close` | 200 FormDetail | F7 Published 關閉 | 有 |
| 14 | PATCH `/forms/{formId}/result-visibility` | 200 FormDetail | F7 獨立即時更新 | 有 |
| 15 | POST `/forms/{formId}/responses` | 201 ResponseReceipt | F8 提交 | 有 |
| 16 | GET `/forms/{formId}/responses/me/latest` | 200 ResponseReceipt | F8 每次主動 Latest | 有 |
| 17 | GET `/forms/{formId}/respondent-count` | 200 `{count}` | F7 Owner 主動查詢 | 有 |
| 18 | GET `/forms/{formId}/statistics` | 200 Statistics | F9 獨立 loader | 有 |

OpenAPI 另列 GET `/health`；`/health/ready` 是 health middleware endpoint，未列於 OpenAPI。兩者不計入業務 18 支。17 個本次串接操作＋1 個明確延期操作，沒有漏分配；不新增 Question／Option CRUD、BFF 或持久化 API。

### 4.1 資料與行為核對

| 核對面向 | 前端來源 ↔ 後端來源 | 結果／工程承接 |
| --- | --- | --- |
| User／FormDetail／Summary | 前端 07 §3～5 ↔ 後端 03b §3、§5～7 | 欄位與 nullable 一致；不序列化 readonly；UI pageSize=10 是合法明送值，未改 API default=20 |
| Draft／Delta／variant | 前端 02 §6.1、§7～10 ↔ 後端 01 FORM-04～06／QST、03b §7.2 | id-only delete、空 Array no-op、config 全替換一致；既有省略 variant 不製造 dirty，切 type 明送目標 config |
| Lifecycle／Visibility | 前端 02 §3～4、§12 ↔ 後端 03b §8 | Published 到期仍 Published；Visibility 專用 API，完整回應不覆蓋 dirty Definition |
| Answer／Receipt／Latest | 前端 03 §2～8、07 §7 ↔ 後端 03c §3、§4～5 | Option ID、optional 省略、0 保留、最新完整整份、single／multiple 一致；無歷史／更新舊 Response |
| Count／排序 | 前端 01 §5、03 §9～11 ↔ 後端 03b §6.2、03c §6、§8 | 不同 User 數；統計依 API 順序，前端不重算／截斷 |
| Auth／error path | 前端 04／07 §9～10 ↔ 後端 03a §4～6、03c §4.4、04 §2～4 | code 分流與特殊 Statistics 優先序一致；Delta index／Publish Definition index／`questions.<questionId>` 分開映射 |

### 4.2 R10 Statistics 修訂

前端 03 §10～12、07 §8、總計畫 F9 ↔ 後端 03c §3.4、§7～8、01 STA-02～05、05 §5.3／§13：完整一致。

固定 Root：`formId`、`title`、`description`、`creatorDisplayName`、`responseMode`、`resultVisibility`、`submissionDeadlineAt`、`count`、`questions`。全部必出，description／deadline 無值為 null。四個追加欄位全部存在於快照 `Contracts/Statistics/StatisticsResponse.cs` 與 live schema 的 required／properties；`Queries/StatisticsQuery.cs` 查 Creator 目前名稱、不過濾 disabled Creator，deadline 回保存 UTC 值。

不補 `id/userId/creatorId/status/responseIdentity/timestamps/closedAt`，不先 FormDetail；統計 VM 不重用需要 config／Owner ID 的 Editor Renderer。anonymous Item 完全省略 respondents，identified Item 為 `{id,displayName}` 名單且零票 `[]`；public 壞 Cookie 視匿名。`Controllers/StatisticsController.cs` 的 UUID→存在性→Draft／Published 保護→Closed Visibility 流程與契約吻合。

快照 `FormEndpointsTests.Statistics.cs` 可查五題型、空資料、同名、精確數值、完整最新 Response、Creator 改名／停用、截止微秒及存取矩陣測試；這些程式僅供本次靜態查證。F9 真實資料／身份矩陣、Header me 401／403 與 Statistics 200 並行證據仍 NOT RUN。

## 5. 差異、限制與影響

| ID／類型 | 文件與章節／差異 | 影響與處理 |
| --- | --- | --- |
| A-01 歷史進度 | 前端 00 §2、07 §2 #18、README §4、總計畫 §1／§8.2 記 R10 not started／尚未實作；後端 SNAPSHOT「目前狀態」、README、R11 historical 的 R10 row 記已實作且 accepted（結果 `3125924`、確認 `3e9168d`） | 更新本次進度判讀，F9 可在授權後準備真實整合；不沿用「R10 未實作」作 blanket BLOCKED，也不把現在 schema 當真實統計 PASS |
| A-02 來源版本／狀態 | 前端 00 §2 的後端 00 基準為 v1.0、01／03c／05 附件仍「修訂待 review」；快照 00／01／03c／05 都是 v1.1 且有 2026-10-10 Owner 核准標記 | 九欄位內容一致，補足正式來源證據；不改前端歷史規格文字 |
| A-03 repo／授權紀錄 | README §4、總計畫首頁／§9 尚待 repo、F0～F10 not started；本次工作目錄與 Git 已存在且 Owner 只授權 F0 | 追加總計畫 §9.1，保留 10/10 歷史；F1～F10 維持未開始 |
| A-04 歷史確認來源 | 前端 00 §2／總計畫 §1 依當時 Owner 說明 R9 accepted；後端 R11 historical 的 R7／R9 row 記缺可追溯確認來源；R11 待 Owner 確認 | 保留兩者 provenance，不自行撤銷或補填 accepted；如需後端結案，由 Owner 同步確認來源。非本機前端計畫的契約阻塞 |
| A-05 OpenAPI 描述落差 | live OpenAPI `components.schemas` 的 count／sortOrder／pagination 是 integer 或 string；enum 多為無值域 string，config／Answer value 是空 JsonElement schema，Statistics items 無完整型別；對照後端 03a §2.1、03b §3／§6.2、03c §3／§8 | OpenAPI 不足以生成可靠 DTO／驗證器，亦可能把正式 number 誤放寬為字串。F2 手寫 formal-contract DTO／decoder，不改正式契約；非應用回應已偏離的證據，描述修正另回後端流程 |
| A-06 live 版本／資料證據 | health／OpenAPI info 只有 `CustomFormService.Api \| v1`／`1.0.0`，無 Git SHA；未讀實際業務資料或服務 DLL | 不宣稱與快照同 commit。F3／F9 真實驗證前記實際服務版本；需要 200 統計的既有 fixture ID／資格未確認，只阻擋該整合證據 |

上述差異不要求改產品規則，沒有因此停止 F0。若後續真實 payload 與正式契約衝突，只停止受影響 mapper／串接，列明實際版本與案例交 Owner／後端處理。

## 6. API／Cookie／CORS 串接條件

| 項目 | 正式條件／本次證據 |
| --- | --- |
| Topology | Frontend `http://localhost:3000`；API `http://localhost:5000`；base `http://localhost:5000/api/v1`。不混 `127.0.0.1` 或 HTTP 前端＋HTTPS API |
| Credential | 所有 client 請求 `credentials: 'include'`；不讀 JWT、不加 Bearer、不持久化 Token |
| Cookie | `access_token`，HttpOnly、SameSite=Lax、Path=/、Host-only；Development Secure=false；Expires=JWT exp，無 Max-Age；login/logout 同 scope |
| Config／code | 快照 Development JSON 與 AccessTokenCookie／V1Cors 實作符合；OS／Secrets 可覆寫，未讀取 live secrets 或直接推定 effective Cookie flag |
| Live CORS GET | 帶 Origin `http://localhost:3000` 的 GET health 回 ACAO 同 origin、ACAC=true；帶 `http://127.0.0.1:3000` 無這兩個 header |
| 限制 | PowerShell 不能證明瀏覽器實際放行、preflight、Cookie 保存／跨 origin 發送、HttpOnly／expires；本次 Browser Cookie／CORS NOT RUN |
| Success／failure | 直接 Resource、204 無 body；HTTP／error.code／details 保留；未知寫入不自動重送，不新增冪等協議 |
| CSR／組態 | 建議 `runtimeConfig.public.apiBaseUrl`，以 `NUXT_PUBLIC_API_BASE_URL` 覆寫；只含公開 URL。SSR=false，無 Nitro API proxy／server routes；Nuxt 自身工具鏈不作 BFF |

F3 必須用真實 Browser＋既有合成帳號驗證登入 Cookie、GET me、刷新與跨 origin JSON preflight；F9 驗證 public/private 及壞／停用 Cookie。CORS 不是 CSRF token；沿後端 05 §4 的已定本機安全拓樸，未新增安全協議或遠端部署。

## 7. 已確認工程方向與候選基準（§7.1 項目 1／7／9）

### 7.1 精確版本與相容性

2026-10-11 唯讀查官方網站及 npm registry；第一輪 registry 被 sandbox proxy `127.0.0.1:9` 拒絕，經工具權限流程重試成功。未執行 npm install／ci／npx。下表是候選明確 pin 的直接依賴；所有列出的版本已查到 metadata，日期為 registry UTC 發布日。

| 套件／工具 | 建議版本 | 發布日／相容證據（未安裝驗證） |
| --- | --- | --- |
| Node | **24.21.0** | 本機符合；[官方 release](https://nodejs.org/fr/blog/release/v24.21.0)，2026-09-08 LTS |
| npm | 11.19.0 | 本機可執行，F1 記錄及鎖 packageManager／重現基準 |
| nuxt | 4.6.1 | 2026-10-09；[metadata](https://registry.npmjs.org/nuxt/4.6.1)，Node `^22.22.3` 或 `^24.15.0` 或 `>=26` |
| @nuxt/ui | 4.11.3 | 2026-10-01；[metadata](https://registry.npmjs.org/@nuxt%2Fui/4.11.3)，Node `^20.19.0` 或 `>=22.12.0`；Tailwind ^4、Zod ^3.24.0／^4、TS ^5.6.3／^6／^7 |
| tailwindcss | 4.3.3 | 2026-07-16；[metadata](https://registry.npmjs.org/tailwindcss/4.3.3)，UI 同版最低依賴 |
| zod | 4.6.5 | 2026-09-13；[metadata](https://registry.npmjs.org/zod/4.6.5)，符合 UI Zod peer |
| vue-draggable-plus | 0.6.1 | 2026-01-11；[metadata](https://registry.npmjs.org/vue-draggable-plus/0.6.1)，Sortable 型別 peer ^1.15.0 |
| lossless-json | 4.3.1 | 2026-07-31；[metadata](https://registry.npmjs.org/lossless-json/4.3.1)，數值傳輸候選 |
| vitest | 5.0.3 | 2026-09-30；[metadata](https://registry.npmjs.org/vitest/5.0.3)，Node ^22.12／^24／>=26、Vite ^6.4／^7／^8 |
| @playwright/test | 1.64.0 | 2026-10-07；[metadata](https://registry.npmjs.org/@playwright%2Ftest/1.64.0)，Node >=20；bundle 未裝 |
| eslint／@nuxt/eslint | 10.12.0／1.17.0 | 2026-10-02／08-06；[ESLint](https://registry.npmjs.org/eslint/10.12.0) Node >=24 可；[Nuxt ESLint](https://registry.npmjs.org/@nuxt%2Feslint/1.17.0) peer ^9／^10 |
| typescript／vue-tsc | 5.9.3／3.3.13 | 2025-09-30／2026-10-10；[TS](https://registry.npmjs.org/typescript/5.9.3)、[vue-tsc](https://registry.npmjs.org/vue-tsc/3.3.13) peer TS >=5 |
| @types/node／@types/sortablejs | 24.19.2／1.15.9 | [Node 24 types](https://registry.npmjs.org/@types%2Fnode/24.19.2)、[Sortable types](https://registry.npmjs.org/@types%2Fsortablejs/1.15.9)；避免 Node 26 型別誤放寬 Node 24 runtime |

Registry latest TypeScript 是 7.0.2；本案建議先採已存在且符合 UI peer 的 5.9.3，降低尚未實測的新 major 工具變項，不宣稱 TS 7 不相容。Vue／vue-router／Vite 等由 Nuxt resolve，F1 lockfile 記最終精確值；Nuxt 4.6.1 manifest 要 Vue ^3.5.43、router ^5.4.0，[vite-builder 4.6.1](https://registry.npmjs.org/@nuxt%2Fvite-builder/4.6.1) 要 Vite ^8.3.2，UI router peer ^4.5／^5 與 Vitest Vite ^8 可交集。直接 engine／peer metadata 未見矛盾；完整 transitive resolution、Windows native modules 與 build 尚 NOT RUN，F1 必須實測，不以忽略 engines／peer 錯誤或更換指定 Node 求通過。

整合按 [Nuxt 安裝文件](https://nuxt.com/docs/4.x/getting-started/installation) 與 [Nuxt UI Nuxt 安裝文件](https://ui.nuxt.com/docs/getting-started/installation/nuxt)：註冊 @nuxt/ui，CSS import Tailwind＋UI，UApp 容器承接 Toast／Dialog；不另疊一套舊 Tailwind Nuxt module。使用 system font、固定亮色與本地 icon，避免非必要外部字體／icon 請求。F1 再確認實際選項、tree shaking 與安裝結果。

### 7.2 Lossless number：傳輸、型別、比較與保存

選 **lossless-json 4.3.1 parse／stringify＋專案 exact-decimal 比較 helper**；不用固定精度 decimal 運算庫。套件作者 [README](https://github.com/josdejong/lossless-json) 提供保留 number token 的 parser／serializer；本次只讀文件，套件 round-trip 未執行。

1. Browser 原生 fetch 讀 `response.text()`，以 lossless parser 解析所有 JSON number。禁止先 `response.json()`、Nuxt 預設 `$fetch` decoder 或原生 JSON.parse；Request builder 用 lossless stringify 後傳字串 Body，數值仍是未加引號的 JSON number token。
2. DTO 的一般 Number value／number config min／max 使用 `ExactNumber`（保留合法 token 的不變值物件）；UI model 是原始文字＋可選已解析候選。Readonly／Statistics 顯示精確文字，不隱性小數截斷。只有驗證值域後的 Rating 0～100、後端 int32 count／sortOrder／pagination 可轉 JS number。
3. 比較 helper 使用 `sign + digits + exponent(BigInt)`：驗證 JSON number grammar，移除前導／尾隨零調整 exponent，zero 統一；比較 sign、`digits.length + exponent` 的量級，再按不足位補零的邏輯比較字元，不建立巨量 `10 ** exponent`。等值以正規數值形式判斷，`1/1.0/1e0` 等值，`-0/0` 等值；等值拼寫不製造 dirty。
4. Request 的 ExactNumber 轉成 LosslessNumber 再 stringify；不能對 class／BigInt 用 JSON.stringify／JSON 深複製。快照／clone helper 要保留 exact 值；所有 nullable、optional 與 readonly 欄位由 typed builder 控制。
5. UI 數值欄用 text＋inputmode，基礎 grammar 接受合法 JSON number（負號、小數、e/E exponent），不靠 HTML number step 或 Zod coercion；空是未作答，0 是答案。禁止逗號、NaN／Infinity 或不完整 token 當成功值。容量不足明確處理失敗，不能四捨五入後繼續。
6. 後端 `Validation/DefinitionNumber.cs` 與 SubmissionAnswerValidator 共用精確策略；其現有 JSONB 安全界限為 integral digits 131072、fractional digits 16383、raw exponent ±1073741823。本案 helper 的拒絕條件如需採用這些值，F2 以該來源版本核對，屬既有儲存能力檢查，不新增 15 位／safe integer／固定小數業務上限。

| 代表案例 | 預期／驗證時點 |
| --- | --- |
| `9007199254740993`、`0.123456789012345678901234567890123456789` | token→Request→Receipt／Latest／Statistics 數值等值；F2 unit＋後續 F8／F9 真實讀回 |
| `1`、`1.0`、`1e0`；`-0`／`0` | 比較等值、dirty no-op；Statistics 採 API 分組；F2／F5／F9 |
| `1e80` 與 10^80+1 的完整整數 token、`1e-101`、負值 | 不溢位／下溢／相鄰合併，沿快照 R10_ExactNumberGroupingAndSortingBeyondDecimalAndDouble 測資語意；F2／F9 |
| min=`0.1`、max=`0.1000000000000000000001`，答案等於兩端／越界 | 精確 inclusive 比較；F2 unit，F5／F8 接入 |
| optional 空、0、非法 `01`／NaN、超 JSONB 安全能力 | 空省略、0 保留、錯誤不送／不改值；F2／F8 |

F2 完成 parser／serializer／比較可行性證據後才接 F5／F6／F8 數字題；不依賴 LosslessNumber 的隱式轉換或一般 JS number 運算保存精度。本次不交付 helper code。

### 7.3 Datetime：UTC／台北與原精度

先採專案 helper＋Intl，不新增日期套件。DTO 保存原 ISO 字串；內部比較用經日期／時區驗證的 UTC whole seconds＋fraction，或等效 BigInt 100ns ticks，保留目前 .NET 可處理的 0～7 位 fraction，不先經 Date 毫秒。Intl.DateTimeFormat 指定 `Asia/Taipei`／24 小時顯示到秒，顯示結果不回寫資料。

Editor 分開 `originalIso`、原瞬間、可見本地欄位及真正修改狀態；只改 title 時 deadline 不送 PATCH，使用者清除送 null。輸入含完整年月日時分秒、明確以台北時間轉 UTC；嚴格檢查月份／閏日／時間，不靠 JS Date 自動溢位修正。改回可見基準時復用原 ISO／微秒，不把隱藏 fraction 清成 0。真正改到另一時間才產生秒精度 UTC 值，保存成功以 Server 回應重建基準。

例：`2026-10-10T10:30:00.123456Z` 顯示 `2026-10-10 18:30:00`，未改省略；同瞬間 `2026-10-10T18:30:00.123456+08:00` 比較等值；改到台北 18:31:00 送 `2026-10-10T10:31:00Z`。F2 unit 覆蓋微秒／7 位 fraction 保留、offset 等值、跨日／閏日／無效日期與清除；F5 Delta、F6 UI、F9 deadline 顯示接入。後端 tests/DeadlinePrecision 以 DB 實際精度驗 no-op，前端不自行宣稱 PostgreSQL 保留 100ns。Server deadline 判定仍最終權威，client 提示不自動 Close。

### 7.4 Unicode／Email／Password

一般 trim 用明確 White_Space=Yes 集合：U+0009～000D、0020、0085、00A0、1680、2000～200A、2028、2029、202F、205F、3000；只處理頭尾，不依 JS trim() 的不同集合。Code Point 用字串 iterator 計數；不做 NFC、大小寫合併或 grapheme 計長；Password 原樣。不可用 HTML maxlength／Zod string min/max 的 UTF-16 計長額外阻擋合法 emoji。

F2 案例：U+0085／NBSP／3000 頭尾移除；U+FEFF／200B 保留；😀=1 Code Point，`e`＋combining acute=2 且不合併；中間連續空白保留；description 空→null、optional config 空→省略、optional Text 空→省略 Answer；Password 頭尾空白保留並分別驗 9／10／128／129 Code Points。

Email 已核對快照 `TextRules.IsValidEmail`：MailAddress.TryCreate＋Address 與輸入 ordinal 相等＋包含 @；NormalizeEmail 為 White_Space trim／ToLowerInvariant。**建議採較寬的前端基礎驗證，Server 最終格式判定**，符合前端 06 §7 允許的責任分工：不直接用 z.email() 或 HTML type=email 的預設規則作提交 gate；控制用 text＋inputmode=email，保留 @、非空等必要提示。註冊檢查契約的長度／姓名／Password，登入只檢查必要非空欄位，不額外套註冊密碼長度。格式 details.email 映射回欄位。

ASCII Email 候選可 trim／lowercase；非 ASCII 原字串只 trim 後送 Server ToLowerInvariant，前端不使用可能不同的 Unicode 全字串 case mapping 作拒絕、唯一性或身份依據。這是把非 ASCII 正規化交給 Server，未改 lowercase 契約；User.email 採 Server 回值。F3 核對 case mapping（含 U+0130）、Code Point 邊界與真實註冊／登入結果。

本次用 PowerShell 的 **.NET 10.0.11 host** 在記憶體直接重現上述 MailAddress 判式；沒有呼叫 auth API 或寫 DB：

| Email 案例 | 本次 host 判式結果 |
| --- | --- |
| `a@example.test`、`a+b@example.test`、`a@localhost` | 接受 |
| `"a b"@example.test`、`使用者@example.test` | 接受 |
| `a..b@example.test`、`Name <a@example.test>`、`a@@example.test`、`a@`、`a b@example.test` | 拒絕 |

這是工具層相容 probe，並非 live backend 格式驗收。F3 使用合成資料＋本版正式授權重核；quoted／Unicode／single-label domain 不能因套件預設在 client 被擋。非完整對等之處明確由 Server 回格式錯誤，不自行新增 TLD／ASCII-only 規則。

### 7.5 Client、timeout 與 scripts 基準

選 native fetch＋AbortController，避免預設 JSON number decoder／retry。建議共用 **30000ms timeout**，GET／write 同值，集中設定方便實測調整；非 SLA 或容量契約。timeout／abort／網路／無可靠 body 在讀取呈現手動重試，在已送寫入為「結果不明」。Abort 不代表回滾；retry=0、不背景輪詢。204 先判斷再解析；明確業務失敗與無法判讀分開，頁面而非 transport 決定導航。

F2 實作讀取 scope／session revision、finally loading、同 Form 寫入互斥與四態結果（pending／明確失敗／結果不明／核對完成）。Delta 結果不明鎖保存／發布到重讀；Visibility 鎖該設定到核對；multiple 提交再送先提示重複風險，Latest 不證明某一次未知提交已完成。依前端 04 接入，沒有新核對中心。

F1 的建議 scripts（現在尚不存在）：`dev`＝`nuxt dev --host localhost --port 3000`、`prepare`＝`nuxt prepare`、`lint`＝`eslint .`、`typecheck`＝`nuxt typecheck`、`build`＝`nuxt build`、`generate`＝`nuxt generate`（需 CSR 靜態產物時）、`test:unit`＝`vitest run`、`test:e2e`＝`playwright test`。F1 決定本機 E2E webServer 及 build preview 啟動命令，提交實際 scripts／lockfile、以 npm ci 重現；不啟動／重啟 Owner API。tests/unit 放純轉換／狀態證據，tests/e2e 放 Browser 外部行為，fixture 依測試需要建立。

## 8. Round 範圍與驗證安排

F0 交付工程決議；F1 CSR／依賴／scripts，F2 client／adapter／dirty 共用機制，F3 Auth／Header／Profile，F4 list／loader，F5 純 Editor／Answer Domain，F6 Editor UI／保存／Preview，F7 Lifecycle／管理，F8 Submission／Latest，F9 Statistics，F10 本機完整整合／交接。這是總計畫分配核對，不是一次授權開發全部輪次；沒有重排依賴。F9 fixture 可獨立於尚未可用的真實 API，但 accepted 與真實整合證據不得以模擬替代。

瀏覽器建議基準：本機 Windows Chrome／Edge 的執行時 stable 版本為主要自測與正式 Browser 紀錄；Playwright 的 Chromium 為自動化基準，手機 Chromium viewport＋實機操作為 F6／F10 體驗確認。CSS 最低能力參照 [Tailwind 官方](https://tailwindcss.com/docs/compatibility)：Chrome 111、Safari 16.4、Firefox 128；這不代表本次測過這三組最低版本。Safari／Firefox 可用 Playwright bundle 作代表性 smoke；實機未具備記 NOT RUN，不冒稱已全面支援。測試時必須記版本，F1 可用工具核對後再定實際配置。

| 階段／方法 | 目標與選用理由／證據 |
| --- | --- |
| F0 靜態文件／manifest／metadata／唯讀 HTTP | 現在選用；證明來源／連線／版本候選。Browser、build、unit 非純文件必要層級，不新增正式 F0 驗收文件 |
| F1 npm ci／lint／typecheck／build＋CSR Browser smoke | 必要；證明 lockfile、strict、UI／CSS 真正可用；測試工具只需有意義的執行 smoke |
| F2／F5 Vitest | 必要；高風險精度、Unicode、時間、Delta、0／空、path、競態等純規則；Cookie／beforeunload／SPA guard 需要 Browser 時另接，不以 unit 代填 |
| F3／F6～F9 真實 Browser＋API | Cookie／CORS、導航、保存／讀回、Latest、Visibility 的可觀察流程；記前後端實際版本、非秘密設定、合成 RunId／IDs 與結果 |
| 控制 fixture／攔截 | 穩定重現 network／timeout／晚回／未知結果；只證明前端處理。統計 mapper fixture 不宣稱 R10 真實整合 PASS |
| F6／F9／F10 人工 | 手柄／上下移動、100 星、Range 點初始 min、Preview 螢幕鍵盤與焦點、完整長文字／同名名單；只保留操作體驗有意義的確認 |
| 正式 AI／人工驗收 | 各輪由 Owner 要求計畫並核准執行，分欄記錄，現在均 NOT RUN；不由自測推 accepted |

後續測資沿本機既有 DB／保留合成資料，不重建 volume，不直接 SQL 改業務。真實身份矩陣需 Owner／後端提供可用 fixture／版本；本次未取得憑證、不假造帳號或 IDs。特殊 disabled／時鐘案例只能採已同意的受控安排，否則該案 BLOCKED；普通 UI 工作可繼續。trace／storageState／截圖按實際內容去敏，Secrets 原件不入 repo。

## 9. 真正阻塞與待辦分類

| 類型 | 現況／阻擋範圍／解除條件 |
| --- | --- |
| F0 交付阻塞 | **無**；文件可讀、指定 Node 存在、官方 metadata 可讀、本機工程 URL 可連 |
| 階段 gate | F0 已獲 Owner accepted；F1 僅獲規劃授權，尚待當輪計畫 review 與明確開發指令 |
| F1 相容性前置 | 所列版本僅 metadata 核對，install／npm ci／strict／build 未執行；F1 授權後實測，失敗才具體回報相依套件與影響，現在不虛列套件不相容 |
| F2 數值可行性 gate | lossless round-trip／精確比較尚未實作驗證；在數字題工作前完成，不延到 F8 才發現精度問題 |
| F3／F9 真實整合前置 | live Git／DLL 版本、既有合成資料資格、真實 Cookie／preflight 尚未證明；未具備時阻擋對應整合案例，沒有阻擋文件／fixture／UI 設計 |
| 特殊狀態前置 | disabled／時間 fixture 需受控安排；缺安排只阻該案，不自行 SQL 更新 |
| 非阻塞歷史待辦 | R7／R9 確認 provenance、R11 Owner 決議／人工與 coverage gaps，由後端流程承接；前端不代填 accepted |
| 明確延期 | Google G1、部署／正式 HTTPS；不作本次啟動前置 |

Owner 已同意 §7 工程方向與 §8 驗證方向，並限定版本表為候選安裝基準、保留 F2 精確數值可行性 gate。既定 CSR、SSR=false／無 BFF、Google／部署延期或產品流程不變；本次只接續 F1 規劃。

## 10. v1.0 初次實際檢查與交付狀態（歷史紀錄）

唯讀檢查於 2026-10-11 台北時間執行。PASS 僅限下表標的，不代表功能或正式驗收通過。

| 命令／案例 | 本次結果 |
| --- | --- |
| `Get-Location`、`git status --short`／`--porcelain=v1 --untracked-files=all`、`git rev-parse HEAD`、`git branch --show-current`、`git remote -v`、`git ls-files` | PASS：指定 repo、乾淨起始、正確 SHA／branch、remote 無設定、僅文件 |
| `Get-Content` 讀 AGENTS／skills／specs／plan／SNAPSHOT／README／查證 src/tests | PASS：來源完整；靜態閱讀不記為程式測試 |
| `Get-FileHash -Algorithm SHA256` 逐 manifest entry | PASS：108 筆全相符；交付前重核 |
| `node --version`、`npm --version`、`git --version`、`dotnet --version`、`rg --version`、Browser binary ProductVersion | PASS：版本如 §3；Browser 未啟動 |
| `Invoke-WebRequest -Uri http://localhost:5000/health -TimeoutSec 10` | PASS：200，`{"status":"healthy"}` |
| 同命令 `/health/ready` | PASS：200，`Healthy`；只證明此刻 readiness，未查 schema／DB identity |
| 同命令 `/openapi/v1.json`，解析 paths／components.schemas | PASS：200，OpenAPI 3.1.1、info.version 1.0.0；17 非 Google＋health；Statistics 九欄位 |
| GET health，分別 Headers Origin=localhost:3000／127.0.0.1:3000 | PASS：前者 ACAO 明列＋credentials true，後者無允許 header；只驗 GET header |
| 官方 registry／Nuxt／UI／Node／Tailwind／lossless 文件 | 首次 registry 連線 FAIL（sandbox proxy）；權限流程重試 PASS，精確 metadata 如 §7.1，未安裝 |
| .NET MailAddress host probe | PASS：10 個合成格式判式結果如 §7.4；沒有 auth API／DB 寫入 |
| 文件連結／控制字元／表格／最終換行、`git diff --check`／diff scope | PASS：交付前檢查；僅本報告及總計畫進度變更 |
| npm install／ci／lint／typecheck／build／unit／E2E／compatibility install probe | NOT RUN；無應用，本次禁止安裝／初始化；不宣稱安裝可重現 |
| Cookie Login／業務 API 流程／真實統計讀回／backend build/tests | NOT RUN；本次授權僅健康與描述唯讀檢查 |
| 正式 AI／人工驗收、新 commit／push／PR／部署 | NOT RUN |

交付 Git：HEAD 仍為首頁基準 SHA；`docs/implementation/V1_Frontend_Implementation_Plan.md` 有本次進度追加、`docs/implementation/F0_Alignment_Report.md` 為新增未提交檔案。原本乾淨，無使用者未提交內容被覆蓋；backend-ref manifest 再核全相符。沒有新 commit SHA，未將 F0 文件工作當成「授權開發後必須提交」的階段。

**初次交付停止點：F0 Alignment 待 Owner review。當時 F1～F10 未開始，未準備或執行正式驗收。**

## 11. Owner accepted 與有限收尾（2026-10-11）

確認來源：本次 Owner 訊息「F0 Alignment review 通過，我確認 F0 accepted」，並授權有限文件收尾、同步狀態、提交及 F1 精簡規劃。F0 accepted 是規劃成果確認，不代表應用自測或正式 AI／人工驗收 PASS。

- 工程方向已確認；§7.1 精確版本僅作候選，F1 以 install／npm ci／lint／typecheck／build／Browser smoke 及 lockfile 證明實際相容性。
- F2 保留精確數值可行性 gate；不得以 LosslessNumber 隱式轉換或一般 JS number 運算保存精度。
- 後端狀態仍以 2026-10-11 匯出、來源 SHA `7591633137c5a6f57c1fce8e1ba19ab394015880` 的快照為準。此次沒有較新的後端 Owner accepted 確認來源；未改 backend-ref、未重跑後端驗收或 HTTP 檢查。
- 收尾只更新本報告、總計畫進度與 README。文件檢查及實際提交另由本次 Git／交付紀錄確認；§10 的初次 PASS／NOT RUN 不改寫為重跑結果。

**F0 accepted；後續本次授權僅 F1 規劃，交付後停止於「F1 計畫待 review」。**
