# F3 精簡修正報告

版本：1.0／2026-10-12（Asia/Taipei）。**F3 修正完成、待局部複核**。本次為 Owner 已授權的 F3-R1、F3-R2、N1 範圍內修正及開發自測；不重新提出整輪計畫、不推送、不 accepted、不開始 F4，正式驗收仍延後。

## 修正與來源

接手 HEAD `b9f052a41165fb7a7552f0dc827f85f97bc887ec`；原工作樹只有兩份未追蹤的 [獨立 review／缺陷重現報告](../review/F3_Code_Review_Report_20261012.md) 與其證據。兩者 bytes 保留、未納入修正提交；歷史 F3 開發報告與證據不覆寫。

依核准 F3 計畫 v1.0、總計畫 v1.3 F3／§7／§7.1、前端 01／04／05 v1.0 與 06 v1.1。R1 對應 04 §7／§11；R2／N1 對應 05 §7／§10 與 F1 Feedback 必要覆蓋。後端唯讀來源仍是 `backend-ref/`、snapshot `7591633137c5a6f57c1fce8e1ba19ab394015880`（Part B v1.0 §3.1／§5）；沒有 API 契約差異、產品行為擴充或新增依賴。

- **R1**：Profile key 改為當頁可接續的 ref，只在可靠 PATCH 或確認採用 GET 的姓名基準／User 完成後更新。GET 先採基準與解除舊 gate，再採 session、接續新 key；不因單純 Auth revision 更新／取消候選資料採用換 key。B 下一次未知寫入記在 B 的 key，SPA 重掛仍需核對；Enter 也不送 PATCH。覆蓋 GET／PATCH 回不同 User、取消 B 採用、重新核對解鎖，以及初始化失敗後 AuthGate 重試首次取得可靠 User 的 key 接續。
- **R2**：三個 F3 操作 Dialog 接入（Profile、登入／註冊、Header Logout）在 loading 前記錄觸發控制，關閉／× 的流程與導航完成後恢復焦點，並停用無 trigger slot 的預設焦點處理。只聚焦仍連接、可見且可用的控制；保存停用時選核對按鈕，dirty 取消且當頁控制停用時選標題，導航後選新頁標題，Popover 控制卸載時選 Header 選單。鍵盤提交回原 input；仍可用的登出控制回原 Popover。F2 未啟用這項選用 hook，補查既有關閉案例。
- **N1**：預設 smoke 改驗實際 built 產品，正常 PATCH 產生 Toast 並關閉；合成停用錯誤開 Dialog，分別關閉／×，驗焦點進入／Tab 留在 Dialog／恢復、Esc／遮罩限制與保留輸入。Header、Toast／Dialog 關閉圖示驗本地 SVG mask 與寬高非零；從載入至 Feedback 關閉，外部／icon API 非預期請求為零。

## 實際自測

沿既有安裝：Node 24.21.0／npm 11.19.0、Nuxt 4.6.1／UI 4.11.3、Tailwind 4.3.3、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0／Chromium 156.0.8078.4。產品與測試檔案的實際工作樹 hash、逐案結果及原件 hash 見 [本次去敏證據](../test-results/evidence/F3_Corrections_20261012/verification-summary.json)。

| 命令／方法 | 結果與適用性 |
| --- | --- |
| `npm run test:unit -- tests/unit/f3-auth.spec.ts tests/unit/api-client.spec.ts tests/unit/scoped-state.spec.ts` | **94／94 PASS**；受影響 Auth／API／操作 scope 的既有產品 Domain 回歸。新增 key／DOM 行為由 Browser 驗證，不加鏡像 unit |
| `npx playwright test --config playwright.f3-corrections.config.ts` | **38／38 PASS，同一次 fresh run**；原 F3 22 案＋新增 R1／R2 16 案。fixture srcDir 使用實際產品 app，API 隔離攔截 |
| `npx playwright test --config playwright.feedback.config.ts` | **17／17 PASS，同一次 fresh run**；最終 `npm run build` 產品的 R1／R2 16 案＋Feedback smoke。smoke me=1、PATCH=3；Toast／Dialog 及關閉圖示、本地 mask／非零尺寸、焦點、完整生命期無外部／icon API 請求 |
| `npx playwright test --config output/playwright/f3-corrections/f2.config.ts --grep 'pending mutual exclusion'` | **1／1 PASS**；共用 Dialog 選用 hook 的 F2 相容自測，含關閉／×／Esc／遮罩及核對限制；隔離 config／產物在 ignored output |
| `npm run lint`、`npm run typecheck`、`npm run build`、`git diff --check` | **PASS**；strict Nuxt＋tools，最終產品 build；無依賴／lockfile 變更 |

本次全部 Browser 為合成測資／攔截，不代表 Cookie／CORS 或後端整合。最終 dev／built 驗證相同產品版本。Popover 卸載備援案透過實際產品選單按鈕的 DOM click 受控觸發，不改 DOM、Vue 狀態或後端資料；一般鍵盤／滑鼠案例另列。

## 失敗與保留證據

原 HEAD 先執行四個新增回歸，**4／4 FAIL，產品缺陷重現**：GET／PATCH 採用 B 後的未知寫入重掛變 enabled、Profile 關閉／× 後 activeElement=BODY；去敏摘要與 raw 路徑保留。修正後這四案通過。

首次完整自測 32／37 PASS、5 FAIL：B07 未等待原生 dirty 取消結束，兩個 Email selector 漏 required 星號；兩個 Header 案混淆 Popover 的 `role=dialog`，並發現焦點 helper 也錯把可用 Popover 當 modal，已限定真正 `aria-modal=true` 的 Dialog。修正同步／定位與焦點判斷後，完整 37 案通過，原失敗未刪除。

交付前沿 R1 採用路徑稽核，補上 AuthGate 重試初次取得 User 的相同 key 接續問題及一個回歸；這項由程式核對發現，未宣稱已做修正前 Browser FAIL。最終產品重新 build，完整 dev 38／38、built 17／17 PASS；之前 37 案、built 15 案與局部 smoke PASS 另存，沒有覆寫歷史。

built smoke 首次使用套件 data-slot 找不到實際 Toast，第二次 evaluate 引用未傳入的外部變數；改依可讀 listitem／關閉控制定位與明確傳值。第三次完成所有 Feedback 斷言，但把兩個刻意 PATCH 403 的瀏覽器 HTTP 診斷當非預期 console error；最終只將精確 message＋API URL 相符的兩個診斷分開並核對數量，所有其他 console／page error 與外部／icon API 請求仍必須為零。另修 tools strict 的 DOM click 型別。F2 首次隔離 config 的 cwd 啟動錯誤為 NOT RUN，調整至 repo cwd 後 PASS。這些歷史失敗／工具啟動限制均保留，不改產品預期求 PASS。

## 未驗證、Git 與停止點

依本次指示，真實註冊／Login／PATCH／Cookie／CORS **NOT RUN（未重跑）**，沿原交付與 reviewer 的歷史證據，不能寫成本次 live PASS。reviewer 已補驗真實無效 Cookie；真實 disabled 帳號／既有 Cookie 後停用、過期 Cookie 仍 **BLOCKED**，缺受控前置。本次沒有 live API 操作，live 後端 SHA 仍未確認。其他瀏覽器、人工實機、正式 AI／人工驗收 **NOT RUN**；既有 npm ci／audit 限制仍保留。

單一目的本機提交：`fix: preserve F3 profile reconciliation and dialog focus`；完整 SHA 見本次交付訊息／Git log（本報告在該提交中）。剩餘 Git 狀態僅為原有兩份未追蹤 reviewer 文件；沒有混入或覆寫它們。**F3 修正完成、待局部複核**；不推送、不自行 accepted、不開始 F4，F1／F2／F3 正式驗收仍延後。
