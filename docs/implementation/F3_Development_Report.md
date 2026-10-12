# F3 精簡開發報告

版本：1.0／2026-10-12（Asia/Taipei）。**F3 整輪交付、待 Owner 集中 review**；未 accepted。

## 授權、範圍與變更

Owner 確認 F2 補充測試結果、核准 F3 Implementation Plan v1.0，授權整輪開發、必要自測與範圍內修正，不停於個別 code review／test-plan review。本次是開發自測，正式 AI／人工驗收 NOT RUN；F1／F2 正式驗收延後。

- Auth client plugin 背景共用一次 me，auth／guest middleware 共用 Promise；settled null 不重查，公開頁不等待。session revision／資料世代保護舊 me、換頁及卸載回應；同 User PATCH 不換 session，API 回不同 User 才推進 revision。
- 同頁登入／註冊 Tabs、寬鬆 Email 基礎 gate、Unicode White_Space／Code Point 驗證、Password 原樣、Request 白名單與首欄聚焦。註冊回登入並帶 Email／清密碼；合法完整返回採 replace，拒外部／未知／login 循環。
- 固定 Header、四 nav、手機選單、avatar fallback／完整姓名選單、首頁三入口；表單／統計只提供明示未完成的頁殼，沒有表單 API 或假的成功資料。
- Profile 使用共用 User，raw／normalized candidate／成功基準分開；no-op 不 PATCH，成功更新 Header／toast。dirty 與 Header 登出橋接，取消零 POST，成功只確認一次。
- 明確 Auth 401 更新失效身分，Dialog 關閉或 × 後經 dirty 返回；停用保留 User／輸入／登出。未知寫入保留資料、不自動重送；Profile 核對失敗不清基準，成功確認採用才解除重送限制。核對 GET 的 Auth 401 同樣走 Dialog／dirty 流程；核對回不同 User 時，完成基準採用與解除限制後才推進 session revision，避免自己使本次核對失效。

一般工程修正包含 UForm 首錯誤焦點／loading 控制、明確核對的 Auth 分流；沒有產品規格／API 契約衝突、擴大範圍或新增依賴。

## 來源與實際版本

核准 [F3 計畫 v1.0](F3_Implementation_Plan.md)、總計畫 v1.3 F3／§7／§7.1；前端 01／04／05／07 v1.0、06 v1.1；後端 Part A／B／Errors v1.0、Constraints v1.1。首次接手已讀前端 00～07。後端唯讀快照來源 `7591633137c5a6f57c1fce8e1ba19ab394015880`，manifest **108／108** 相符、未修改。

前端接手 `3987c388d1fc6690315c5244dfe10bf00554c724`，工作樹乾淨。沿既有安裝：Node 24.21.0／npm 11.19.0、Nuxt 4.6.1／UI 4.11.3、Tailwind 4.3.3、Zod 4.6.5、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0／Chromium 156.0.8078.4。lockfile／套件未改；未重裝、未升級。

真實 Origins：`http://localhost:3000` → `http://localhost:5000/api/v1`，既有本機 API／DB。health／ready 200，`/openapi/v1.json` 200／OpenAPI 3.1.1／info.version 1.0.0，五個 Auth／User operations 可用；**live Git SHA 與 process 的來源 checkout 未確認**，不將快照 SHA 當 live 版本。建立並保留 RunId 合成帳號，沒有 SQL／DB reset／服務組態修改。

## 驗證結果

| 實際檢查 | 結果 |
| --- | --- |
| lint、Nuxt＋tools strict typecheck、build | PASS |
| F3 unit＋共用 API／scope 回歸 | **94／94 PASS**（F3 48、F2 46） |
| 真實 Browser＋API 正常流程 | **1／1 PASS**：註冊 → 登入／返回 → PATCH → SPA → 刷新／新分頁讀回 → 登出 |
| 真實 Email／錯誤案例 | **5／5 PASS**：single-label、quoted、Unicode、U+0130；Server Email details／錯誤帳密 |
| 合成 Browser 故障／dirty／競態 | **22 個案例最終 PASS**；結果為逐案最新執行彙整，非同一輪 22／22 fresh run |
| 最終 built CSR shell smoke | **1／1 PASS**（合成 Auth） |

真實證據：註冊 201 無 Set-Cookie、不自動登入；登入／PATCH 不补 me；同 App 初次 me=1、刷新增加一次、新分頁自己 me=1。POST／PATCH JSON preflight 實際 **3 次**，credentialed CORS 同 Origin／ACAC=true。Cookie HttpOnly、SameSite=Lax、Path=/、Host-only、Development Secure=false、Expires 與 JWT exp 相同、無 Max-Age；JS 不可見，登出後移除。Expiry 比較由特權測試在記憶體核對，不輸出 Token／Cookie 值。

首次失敗、局部修正／重測、逐案與原件 hash 見 [開發測試結果](../test-results/F3_Development_Test_Report.md)／[去敏摘要](../test-results/evidence/F3_20261012/verification-summary.json)。必要 Browser 子程序在沙箱 EPERM 後經自動審核允許執行；無審核拒絕。mock／攔截只代表前端處理，未代稱後端故障或 Statistics 整合 PASS。

## 缺口、Git 與停止點

真實 disabled 正確帳密、既有 disabled Cookie、無效／過期 Cookie **BLOCKED**：缺後端受控帳號／Cookie 前置；沒有製造 Token 或 SQL 停用。人工實機／其他瀏覽器、正式 AI／人工驗收 **NOT RUN**。既有 npm ci EPERM／audit 風險仍保留，F3 不需要重裝；F1 原工程就緒頁的 smoke 預期因首頁更新不再適用，歷史結果保留，現有預設 smoke 改驗當前 CSR shell，Dialog／toast 由 F3 行為案例涵蓋。

本輪以單一目的本機提交 `feat: complete F3 auth header and profile round` 交付；完整 SHA 與提交後 Git 狀態見本次交付訊息／Git log（報告包含於該提交，避免自指 SHA）。僅 F3 app／必要測試／報告與進度，未混入其他變更。**不推送、不開始 F4、不自行 accepted；F3 整輪交付、待 Owner 集中 review。**

## Review 修正及 Owner 結案追加（2026-10-12）

上文為原開發交付紀錄，不改寫歷史測試／缺口。後續 F3-R1、F3-R2、N1 已在產品提交 `ed2817b25d99763fdcc6c2d826ee29db60dc1707` 完成授權修正，見 [修正報告](F3_Review_Correction_Report.md)；[局部獨立複核](../review/F3_Correction_ReReview_Report_20261012.md)／[去敏證據](../review/evidence/F3_Correction_Independent_Verification_20261012.json) 已保存於 `02bccb3b49c60ab2cbd84edfaa51ccfa43afcce7`。Owner 本次明確確認 **三項結案、F3 code review 通過**，不代表正式驗收或 Round accepted。

本次未重跑產品測試；真實無效 Cookie 採 reviewer 歷史純 GET 證據，disabled／過期 Cookie 與其他既有未驗證事項依修正／複核報告保留。同步 [F4 精簡計畫](F4_Implementation_Plan.md)，**F4 計畫待 Owner review，開發未開始；F1／F2／F3 均未 accepted，正式驗收仍延後、不推送。**
