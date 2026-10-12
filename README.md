# 自建表單設計服務 — V1 前端規格與實作計畫

最新進度（2026-10-12）：**F5 開發完成、待集中 review。** Owner 核准 [F5 計畫 v1.0](docs/implementation/F5_Implementation_Plan.md) 並授權整輪開發、自測與範圍內修正；已交付 Editor／Answer 純 Domain、Create／Draft Delta、Draft／Publish 驗證與錯誤定位，見 [F5 開發報告](docs/implementation/F5_Development_Report.md)／[去敏證據](docs/implementation/evidence/F5_20261012/verification-summary.json)。指定 Choice→text→Choice 固定 Body／wire 核對 PASS；必要 unit 167／167、lint／strict typecheck／build／diff 檢查 PASS。F4-R1 結案、F4 code review 通過的 Owner 決議維持；F1～F5 均未 accepted，正式驗收延後、既有真實測資缺口保留。本輪沒有 UI／保存／提交 API 接入，不推送、不展開 F6。

前次進度（2026-10-12）：**F4-R1 結案，F4 code review 通過。** 見 [局部獨立複核](docs/review/F4_R1_Correction_ReReview_Report_20261012.md)／[去敏證據](docs/review/evidence/F4_R1_Independent_Verification_20261012.json)。本次 unit 136／136、fresh built Browser 12／12 及必要工程檢查 PASS，三種 Auth 401、兩種關閉、外部變動撤銷及受影響清單回歸均通過。原 [修正報告](docs/implementation/F4_R1_Correction_Report.md)、review／修正前 FAIL／歷史證據與真實測資 BLOCKED 保留。F3-R1、F3-R2、N1 已結案；F1／F2／F3／F4 均未 accepted，正式驗收仍延後，不推送、不展開 F5～F10。以下較早日期的紀錄保留歷史狀態。

文件包版本：1.3。日期：2026-10-10。狀態：前端規格與總實作計畫已通過 Owner review；本次依 Owner 指示補分輪測試選擇原則，AGENTS／Skills 仍待 Owner review。

本組文件整合前端已定案內容，並採用後端 2026-10-10 的 Statistics v1.1 修訂內容。02／06 維持 v1.1，其他規格維持 v1.0；總實作計畫 v1.3 補測試選擇原則，AGENTS 為 v1.1。Round 分工不變。可放入未來獨立前端 repo，作為各 Round 實作計畫的來源。

目前進度（2026-10-11）：Owner 已確認 **F0 accepted**，見 [F0 Alignment Report](docs/implementation/F0_Alignment_Report.md) 與 [總計畫 §9.2](docs/implementation/V1_Frontend_Implementation_Plan.md#92-f0-owner-確認與有限收尾2026-10-11)。工程方向已確認；版本表為候選安裝基準，F1 實測相容性，F2 保留精確數值可行性 gate。本次只授權 F0 文件收尾／提交及 F1 規劃，未初始化或安裝。

F0 收尾 commit：`54ac4482dba6442408864971a2ef11a871c441f3`；F1 v1.0 計畫 commit：`b485d3e9c3c20457d1373a0fd6fd054a51891595`。Owner 已通過 F1 review 並授權開發；[修訂版計畫 v1.1](docs/implementation/F1_Implementation_Plan.md) 與 [F1 開發報告](docs/implementation/F1_Development_Report.md) 保留開發紀錄。[獨立 review](docs/review/F1_Code_Review_Report_20261011.md) 無阻擋缺陷，Owner 授權的 Dialog close icon 斷言補正與新五組 smoke 證據見 [P3 補正報告](docs/implementation/F1_P3_Correction_Report.md)。目前 **F1 P3 補正已交付，待局部複核及正式驗收，尚未 accepted**；未推送。原目錄 npm ci 的 EPERM 保留於 review；F2 本輪的重現與恢復紀錄見下方 F2 節，沒有升級既有套件。

後端狀態仍引用唯讀快照 2026-10-11／`7591633137c5a6f57c1fce8e1ba19ab394015880`：R10 accepted、R11 結果待 Owner 確認；本次沒有較新的後端 Owner 確認來源或重跑驗收。下文 §4 保留 2026-10-10 文件包的歷史接續說明，目前輪次依總計畫最新進度。

## 本機工程與開發自測

使用 Node **24.21.0**／npm **11.19.0**；`.nvmrc`、packageManager 與 lockfile 記錄基準。現有 repo 執行：

```powershell
npm ci
npm run dev
```

前端固定 `http://localhost:3000`；公開 API Base URL 預設 `http://localhost:5000/api/v1`，可由 `NUXT_PUBLIC_API_BASE_URL` 覆寫（安全範例見 `.env.example`）。F3 已提供登入／註冊、Header／手機導覽、首頁與 Profile 修改姓名；F4 提供本人表單清單與 Form 根資訊讀取／角色狀態路由，編輯／填答／管理及 new／statistics 仍待後續輪次。`ssr=false`，無 BFF。圖示含 UI 內建狀態／關閉圖示全部來自 client bundle，沒有圖示 API fallback；字體用 system font。

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run build
npx playwright install chromium
npm run test:e2e
```

typecheck 實際執行 Nuxt app／generated project 檢查與 `tsc -p tsconfig.tools.json`，涵蓋 tests、TS／MJS 工具組態與靜態 probe script。E2E 在 built preview 上啟動 Chromium；需先 build、關閉自己啟動的 dev 並確保 3000 沒有其他服務。Playwright 不重用不明服務，也不停止既有後端。這些是開發自測，正式 AI／人工驗收未執行。

覆寫 smoke 用以下方式在 **process 啟動前** 注入；User GET／PATCH 由測試攔截，使用合成結果驗證實際產品 Toast／Dialog、焦點與本地圖示，不連接真實後端：

```powershell
$env:NUXT_PUBLIC_API_BASE_URL = 'http://localhost:5000/api/f1-smoke'
$env:F1_EXPECT_API_BASE_URL = 'http://localhost:5000/api/f1-smoke'
$env:F1_INJECTION_STAGE = 'preview-process-start'
npm run test:e2e
```

預設 `F1_SMOKE_MODE=preview`，實測可在預設 build 上 runtime 覆寫；dev 則先設 `$env:F1_SMOKE_MODE='dev'` 再執行同一 test。每次命令結束後移除本輪設定的 `NUXT_PUBLIC_API_BASE_URL`、`F1_EXPECT_API_BASE_URL`、`F1_INJECTION_STAGE`、`F1_SMOKE_MODE` 環境變數，再執行預設命令。

純靜態 smoke 先在指定 URL 的環境執行 `npm run generate`，再設定 `F1_SMOKE_MODE=static` 執行 E2E；本地 `scripts/static-smoke-server.mjs` 只提供 `.output/public`。靜態 server 啟動時的環境不能改 generate 時的 config，變更 URL 必須重建。`nuxt build` 預設是 CSR＋前端 Nitro renderer，`.output/public` 沒有入口 HTML，不能把它單獨當完整靜態站；generate 後若要回到 built preview，清除覆寫再 `npm run build`。上述靜態 server 是本機產物 probe，不是部署／BFF。

[F1 自測證據](docs/implementation/F1_Development_Report.md#4-必要自測與實際結果) 包含 Browser public config／network 摘要、圖示渲染證據及手機截圖；原始 Playwright report／trace 在 ignored `output/playwright/`。依賴與生成產物不提交；`backend-ref/` 維持唯讀。

## F2 共用基礎與隔離自測

Owner 已核准 [F2 計畫](docs/implementation/F2_Implementation_Plan.md) v1.0 並授權開發。原交付見 [F2 開發報告](docs/implementation/F2_Development_Report.md)；2026-10-12 依獨立 review 授權局部修正 R1～R3，見 [修正報告](docs/implementation/F2_Review_Correction_Report.md)。目前 **F2 修正完成、待局部複核；F1 P3 局部複核通過，F1／F2 仍未 accepted，正式驗收延後**。上述 F0／F1 段落保留歷史授權與交付狀態；不開始 F3。

```powershell
npm run test:unit
npm run lint
npm run typecheck
npm run build
node node_modules/nuxt/bin/nuxt.mjs typecheck tests/fixtures/f2/browser
npm run test:e2e -- --config=playwright.f2.config.ts
```

F2 使用獨立 Nuxt CSR fixture（`tests/fixtures/f2/browser`），需空閒 localhost:3000；輸出在 ignored `output/playwright/f2/`。F1 預設 E2E config 明確只選原 foundation smoke，原案例與證據未改。F2 Browser 使用原生 fetch＋合成 raw JSON 攔截；PASS 只證明前端處理，真實 API／Cookie／DB 整合未執行。`lossless-json` 固定 4.3.1；一般 Number 使用 `ExactNumber` 與 `stringifyExactJson`，避免 Number()、JSON 深複製或原生 JSON.stringify 失真。

原工作目錄 npm ci 的 native binding EPERM 本輪重現；乾淨副本依同一 package-lock 安裝通過。首次失敗、修正與限制詳見報告／去敏摘要，沒有停止不明程序或刪除 locked remnants。

## 1. 文件清單

| 順序 | 文件 | 內容 |
| --- | --- | --- |
| 00 | [Frontend Overview](docs/specs/00-v1-frontend-overview.md) | 範圍、契約基準、暫緩／排除與決議索引 |
| 01 | [Pages、Routing、Access](docs/specs/01-pages-routing-and-access.md) | 各頁內容、URL、Header、身分／狀態路由矩陣 |
| 02 | [Editor、Lifecycle](docs/specs/02-form-editor-and-lifecycle.md) | 建立／保存／發布、設定、題型、Delta、拖曳、預覽、管理操作 |
| 03 | [Response、Statistics](docs/specs/03-response-and-statistics.md) | 空白初始、single／multiple、Latest、Stars／Range、統計頁 |
| 04 | [Auth、State、Errors](docs/specs/04-auth-state-and-error-handling.md) | 完整 D-12、登入返回、停用、dirty、錯誤及結果不明 |
| 05 | [UI、Interaction](docs/specs/05-ui-and-interaction.md) | Nuxt UI、版型／手機、時間、驗證、Dialog 與文案 |
| 06 | [Technical Architecture](docs/specs/06-technical-architecture.md) | Node／npm、資料層、API client、精度、結構與必要驗證 |
| 07 | [API Integration Map](docs/specs/07-api-integration-map.md) | 18 Endpoint 範疇、實際使用時機、DTO、payload／錯誤對照 |

另含 [前端總實作計畫](docs/implementation/V1_Frontend_Implementation_Plan.md)，定義 F0～F10、依賴、驗證與停止點；各 Round 的「計畫提醒」與 §7.1 是 Codex 提出當輪計畫時需明確的工程項目。

[初版文件核對與版本銜接報告](docs/review/Frontend_Specification_Review_Report_20261010.md) 保留當時交付與檢查結果；本次 v1.1 的局部回補核對範圍見總計畫 §10。

本次新增協作文件：

| 文件 | 責任 |
| --- | --- |
| [AGENTS.md](AGENTS.md) | 共用來源、授權、停止點、Git／測資、驗證與回報 |
| [Round Development Skill](.agents/skills/v1-frontend-round-development/SKILL.md) | F0 Alignment、當輪具體計畫、授權開發／修正與自測報告 |
| [Acceptance Testing Skill](.agents/skills/v1-frontend-acceptance-testing/SKILL.md) | 正式驗收計畫、Browser／fixture／人工、執行結果與證據 |
| [協作文件核對報告](docs/review/Frontend_Workflow_Document_Review_20261010.md) | 本次格式、來源、階段邊界與隔離情境檢查 |

兩個 Skill 各含 `agents/openai.yaml`，採明確呼叫，避免影響其他專案。完整包保留 `.agents/skills` 路徑，可原樣放入未來前端 repo；Skill 讀取該 repo 的 AGENTS／docs，不將自己的安裝目錄當成業務 repo。

## 2. 建議 review 順序

先看 00 的範圍與契約基準，再看 01～03 的頁面／核心操作；接著確認 04 的 D-12 與錯誤流程，最後核對 05～07 的 UI、工程與 API 對接。

重點：新建第一次只有保存；既有 Visibility 即時更新；single／multiple 重新進頁都空白；Latest 必須主動呼叫；public Statistics 不被 Header me 阻擋；寫入結果不明採簡化手動核對。

這組文件取代 2026-10-09 暫存文件中已被後續決議取代的提案；不要把舊「待確認」清單與本組當成兩套平行規格。

## 3. 工程提醒與本次回補位置

| 位置 | 內容 |
| --- | --- |
| 總計畫各 Round／§7.1 | 9 項工程提醒的完成時點與當輪計畫需交付的設計／驗證；逐輪明確 |
| 02 §6.1 | 既有省略 variant 的呈現、原始 config、dirty／Delta；與新建初值分開 |
| 06 §7 | Email validator 相容策略；F0 核對，F3 接入驗證 |
| AGENTS 驗證章節／兩個 Skills／總計畫 §8.1 | 依每輪交付與風險選用測試；計畫交代方法及理由，不適用層級可省略，必要但受阻的驗證另列 |

## 4. 接續工作

1. 前端產品規格已確認；本次局部回補依 Owner 指示完成。
2. 總實作計畫已核准；具體工程設計在指定 Round 的實作計畫提出。
3. Review 本次 AGENTS.md 及兩個 Skills 的責任與階段邊界。
4. 確認前端工作目錄及可讀的後端來源，指定 F0 Alignment；F1 才依核准工程決議初始化獨立 repo。
5. 逐 Round 採計畫、review、開發、自測／code review、正式測試計畫、review、測試、Owner 決議。

F0～F10 仍為 not started；本次沒有初始化 Nuxt、套件安裝、前端 build、live API 或正式 Browser 驗收。

本次文件核對不是程式測試或 Browser Cookie／CORS 執行證據。已讀基準的 R10 尚未實作；最新進度與真正串接統計以當時後端 repo／可用 Endpoint 版本為準。
