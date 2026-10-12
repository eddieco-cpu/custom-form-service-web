# F3 修正局部獨立複核

日期：2026-10-12（Asia/Taipei）。目標 `ed2817b25d99763fdcc6c2d826ee29db60dc1707`，基準 `b9f052a41165fb7a7552f0dc827f85f97bc887ec`，實際核對 14 檔 diff。執行 HEAD 為 `43c725e9c0664743b445b98abb5114c0f675945c`，僅多出原 review 文件提交；產品、測試及工程組態與目標相同，接手工作樹乾淨。

**F3-R1、F3-R2、N1 在本次局部複核均可結案；未發現新增阻擋問題。** 此結論等待 Owner 集中確認，不代表 Round accepted 或正式驗收。

## 三項結論

| 項目 | 結果與依據 |
| --- | --- |
| F3-R1 | **可結案。** Profile key 改為 ref，僅在可靠基準與 User 採用後接續 session revision；GET 核對仍先完成基準／解除舊 gate，再採用 User 及換 key。GET／PATCH 採用 B、取消 B、AuthGate 重試四案於 dev 與 built 均 PASS。B 的下一次未知 PATCH 後 SPA 離頁返回仍顯示核對、保存停用；Enter 不多送 PATCH，可靠核對後才解鎖。取消採用保留 A 與 unknown gate，沒有因 Auth revision 或取消而提前換 key。 |
| F3-R2 | **可結案。** caller 在 loading 前捕捉控制，關閉流程／導航完成後恢復可用控制；不可用時選核對按鈕、Header 選單或當頁標題。Profile 底部關閉／×、Auth dirty 取消與確認導航的兩種關閉、登入／註冊保留輸入及焦點、Header Popover 中原登出控制與卸載後 fallback、未知保存與鍵盤提交皆 PASS。只辨識 `aria-modal="true"`，Popover 不被當 modal。`managedFocus` 為 opt-in，F2 原接法保留 Reka 預設，三個代表案例 PASS。 |
| N1 | **可結案。** rebuilt smoke 直接走產品 Profile、Toast／Dialog，保留本地 SVG mask／非零尺寸、Toast 關閉、Dialog 焦點／Tab／Esc／遮罩／底部與 ×／返回控制及全流程請求斷言。刻意 403 僅以完整 API URL＋精確 console 文字排除，並斷言恰好 2 筆；其他 console／page errors 及非預期請求必須為零。獨立 built 執行符合全部斷言。 |

R2 的登入案例使用底部關閉、註冊案例使用 ×；兩者呼叫相同 `closeError`，共用 Dialog 的兩種關閉流程另由 Profile／Auth／Header 案例覆蓋。Header 控制卸載案例是受控呼叫實際產品選單 toggle，未改寫 DOM 或 app state。

## 獨立驗證與證據適用性

依核准 F3 計畫 v1.0、總計畫 v1.3 的 F3／§7／§7.1、受影響前端 04／05 v1.0、06 v1.1、原開發／測試交付與修正報告審查。後端讀本為唯讀 `backend-ref/`，來源 `7591633137c5a6f57c1fce8e1ba19ab394015880`；本修正沒有 API 契約變更，該 SHA 不是 live 後端版本。

| 本次實際執行 | 結果 |
| --- | --- |
| lint、strict typecheck（Nuxt＋tools）、fresh build、目標 diff whitespace | **PASS** |
| `npm run test:unit` | **136／136 PASS，6 檔**，包含 F3／API／scope 94 案與其他既有單元案例，直接使用產品程式 |
| dev F3 回歸 | **38／38 PASS**：新增 16 案＋既有 22 案；涵蓋最後修改受影響的 B07、B09、B13、B15、B16 |
| built 修正與 Feedback | **17／17 PASS**：同 16 新案＋完整 smoke，使用本次 fresh build |
| F2 代表案例 | **3／3 PASS**：pending 互斥／未知鎖／取消採用／兩種關閉；dirty 導航／history／beforeunload；Latest Auth／無紀錄分類與保留輸入 |
| 歷史交付證據核對 | **59／59 來源 bytes hash、10／10 raw 結果 hash 相符**；最終 38／17 案 PASS 對應最後修正，歷史失敗保留 |

環境：Node 24.21.0、npm 11.19.0、Nuxt 4.6.1、Nuxt UI 4.11.3、Playwright 1.64.0、Chromium 156.0.8078.4。F3 fixture 的 srcDir 指向產品 app；F2 fixture 直接 import 產品共用程式。Browser API **全部合成攔截**，不代表真實後端整合 PASS。

built Feedback 實測：GET me **1**、PATCH **3**，預期 403 console 診斷 **2**，其他 errors **0**、非預期／icon API 請求 **0**；Toast 與兩種 Dialog close icon 皆使用本地 SVG mask 且尺寸非零。去敏逐案結果、附件、命令、來源／原件 hash 見 [本次證據](evidence/F3_Correction_Independent_Verification_20261012.json)，raw 留在 ignored `output/playwright/f3-correction-review/`，沒有覆寫原交付證據。

Vitest 首次因 sandbox `spawn EPERM` 未啟動，經自動核准允許重跑後 136 案 PASS；不是產品 FAIL。dev 對合成 `#name` 的不存在錨點有 router warning，未影響 URL、dirty 或焦點斷言；build 有既有 DEP0155 診斷，未阻擋 build。無新增產品 finding。

## 未驗證與停止點

- 真實 API 註冊／Login／PATCH、Cookie flags／CORS／保存讀回與特殊 Email：**本次未重跑**，僅保留歷史證據；無 DB、時鐘或服務組態變更。
- 真實 disabled 帳密／既有 Cookie 後停用、AUTH_TOKEN_EXPIRED：**BLOCKED**，受控前置仍缺；合成 PASS 不能解除真實整合缺口。AUTH_TOKEN_INVALID 保留原 reviewer 的隔離 Cookie 純 GET PASS，本次未重跑。
- live 後端 SHA **UNCONFIRMED**；真實 Server 寫入故障、其他瀏覽器與人工實機 **NOT RUN**。上述缺口不阻擋後續經授權的獨立開發，但相關整合／正式驗收仍須補齊，不能据此 accepted。
- 正式 AI／人工驗收仍延後，**NOT RUN**。F4 未開始，沒有自行 accepted 或推送；複核交付時未提交本次文件，後續由 Owner 明確授權本機提交。

僅新增本報告及去敏證據，沒有修改產品／測試／規格／進度。複核交付時 HEAD 為 `43c725e`，兩份文件尚未提交；Owner 後續授權將兩份文件作單一目的本機提交，提交 SHA 與最終 Git 狀態見 Git log／交付訊息。**F3 獨立 review 完成、待 Owner 集中確認**。
