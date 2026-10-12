# F2 精簡補充測試結果

日期：2026-10-12（Asia/Taipei）。依 [本版計畫](../test-plan/F2_Supplemental_Test_Plan.md) 直接執行；**沒有阻擋 F2 問題，可以提出 F3 計畫。** 本次是開發自測，F1 P3 局部複核通過、F2 R1～R3 Owner 同意結案；F1／F2 正式驗收仍延後、均未 accepted。

## 實際變更與結果

Part A 引用由 v1.1 更正為 **v1.0**，不為文件更正重跑測試。只新增 F2 spec 8 個案例與合成 harness 的完成／callback／router outcome 觀察；沒有修改應用、契約、依賴或既有測試預期。新增觀察不改原行為；gitignore 只例外允許提交 `docs/test-results/` 文件，raw 仍忽略。

| 本次實際執行 | 結果／證明範圍 |
| --- | --- |
| `npm run test:e2e -- --config=playwright.f2.config.ts --grep supplement: --reporter=list,json --output=output/playwright/f2-supplement-20261012/browser-first-artifacts` | **PASS 8／8**，首次執行，0 skipped／flaky／retry；6 案驗晚寫入 success／Auth 401 在 session／Form ID／卸載後 stale 且零基準／錯誤 callback；1 案實際 native history back／forward 取消保留 URL／輸入、接受後下一次仍詢問；1 案 Latest 真實等待 client 30000ms timeout，read-failure／保留答案／手動 retry 成功 |
| `npm run lint` | **PASS**，exit 0 |
| `npm run typecheck` | **PASS**，exit 0；Nuxt＋tools strict |
| `node node_modules/nuxt/bin/nuxt.mjs typecheck tests/fixtures/f2/browser` | **PASS**，exit 0；新增 harness 觀察 strict |
| 證據／source diff／manifest 核對 | **PASS**，76 筆既有原件 hash 相符；reviewed 產品／測試基準差異為零（HEAD 對 73348ab），未受影響 adapter 來源未變（HEAD 對 e0d06e5）；lock hash 相符、backend 108／108 相符。測試後 3000 無殘留 listener |

Browser 為 **native fetch＋合成 raw JSON／攔截**；實際 Browser timer／history／dialog 及共用程式有執行，不代表真實 API／Cookie／CORS／DB 整合通過。完成訊號與 router cancelled outcome 用於同步，沒有固定 sleep 或原本成立的斷言替代等待。

## 沿用的已核對證據

- [獨立局部複核](../review/F2_Correction_ReReview_Report_20261012.md)／[其摘要](../review/evidence/F2_Correction_Independent_Verification_20261012.json)：受影響 unit **46／46**、原完整 F2 Browser **10／10**（數值 gate 11 合法／4 拒絕、R1～R3、write 30000ms timeout 等）、lint／strict／build／fixture strict 各 PASS。產品、配置、lockfile 未變，沿用 build；既有 cases 不因新增完成觀察重跑，以上是來源的歷史 PASS。
- [原 F2 摘要](../implementation/evidence/F2/verification-summary.json)：未受 R1～R3 影響的 `common-adapters.spec.ts` **5／5**、`exact-number-gate.spec.ts` **36／36**，來源未變，沿用文字／時間／精確數值 unit。原 78／78 含 F1 tooling 1 案與後來已被修正的 2 檔歷史結果，不能寫成此次完整 unit PASS。
- 原開發首次失敗及獨立 review 的 Browser **5 PASS／1 FAIL**、R3 retry **0 PASS／1 FAIL** 及診斷原件保留，相關 hash 核對相符；本次首次新增測試全部 PASS，沒有新失敗／修正循環。DEP0155 等既有記錄保留，這次 Browser 的 NO_COLOR／FORCE_COLOR 提示不影響結果。

本次去敏命令／exit、8 案結果、版本、原件 hash／沿用來源見 [證據摘要](evidence/F2_Supplemental_20261012/verification-summary.json)；新 raw 原件在 ignored `output/playwright/f2-supplement-20261012/`，沒有覆寫舊 evidence／log／trace。

## 未驗證事項、版本與停止點

真實 Auth／Cookie／CORS／DB、Form／Answer mapper／基準保存及業務頁 toast／導航 **NOT RUN**，留 F3／F5～F9 真實接入；本次只證明共用 helper／harness callback 隔離。正式 AI／人工驗收、其他 Browser／實機 **NOT RUN**。本次完整 F2 Browser、unit、build、F1 smoke／generate、npm ci／install／audit **未重跑**，適用證據沿用；原目錄 unlink EPERM 與原 audit 風險未解除，沒有擅自修依賴。

環境沿既有安裝：Node 24.21.0／npm 11.19.0、Nuxt 4.6.1／UI 4.11.3、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0／Chromium 156.0.8078.4、lossless-json 4.3.1。後端沿唯讀快照 2026-10-11／SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`，Part A v1.0；live SHA 未確認。本次 F3 規劃只讀 health／ready／OpenAPI 200 和 CORS header，是 metadata 觀察，沒有執行 Auth API／Browser 整合。

接手 HEAD `c68f5bd63b1f73cc5b780013bb2d6cc603b0235f`、工作樹乾淨；本次測試／文件／進度以單一目的本機提交交付，實際 SHA／提交後 Git 狀態見 Git log／交付訊息；不推送。同步 [F3 精簡計畫](../implementation/F3_Implementation_Plan.md)，停於 **F3 計畫待 Owner review**；不開發 F3、不標記 F1／F2 accepted。
