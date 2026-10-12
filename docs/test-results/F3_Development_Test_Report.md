# F3 開發自測結果

版本：1.0／2026-10-12（Asia/Taipei）。來源為核准 F3 Implementation Plan v1.0 與 Owner 整輪授權。**這是開發自測；正式 AI／人工驗收 NOT RUN。**

## 環境、方法與證據

前端接手 SHA `3987c388d1fc6690315c5244dfe10bf00554c724`，本次 code 隨 F3 單一目的提交；實际 SHA 見交付訊息／Git log。Node 24.21.0／npm 11.19.0、Nuxt 4.6.1／UI 4.11.3、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0／Chromium 156.0.8078.4。lockfile 未改。後端唯讀快照 SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`／108 manifest 相符；live API metadata 1.0.0，live Git SHA 未確認。

Browser 直接從 `http://localhost:3000` 呼叫 `http://localhost:5000/api/v1`。真實測試無 route 攔截、使用既有 DB，合成帳號密碼只在執行時產生、未輸出或保存；註冊帳號保留。其他測試使用明列的 route 攔截；公開 harness 位於 tests fixture，沒有加入產品 route，也不代表 Statistics Endpoint 讀取。trace／自動失敗截圖對 F3 關閉，只有合成 QA 圖。原始證據在 ignored `output/playwright/f3/`，交付 [去敏摘要](evidence/F3_20261012/verification-summary.json)。

Unit 適用狀態轉移／驗證／redirect／世代；Browser 適用 Cookie／CORS、保存讀回、導航與 beforeunload；受控攔截觸發 500／network／malformed／timeout 等不能穩定安排的故障。timeout 使用 Chromium clock 推進 30001ms，驗證實際 client 的 30000ms timer 分支，明列合成時間，不宣稱真實 Server timeout。沒有為樣式建立鏡像 unit；未重跑無關數值／時間 gate 或 F1 歷史五種部署模式。

## 真實 Browser＋API

| Case | 觀察／實際結果 | 自測 | 人工 |
| --- | --- | --- | --- |
| LIVE-01 | Register 201 不設 Cookie／不登入；登入 replace `/profile?from=live#name`，PATCH normalized 姓名成功；SPA 不重 me，刷新／新分頁真實讀回；Logout 204 → `/login` 且 Cookie 移除 | PASS | NOT RUN |
| LIVE-CORS（同 LIVE-01） | 3 個真實 JSON OPTIONS preflight；GET／POST／PATCH credentialed 回 ACAO=`http://localhost:3000`、ACAC=true | PASS | NOT RUN |
| LIVE-COOKIE（同 LIVE-01） | HttpOnly／Lax／Path=/／Host-only／Secure=false；wire Expires=JWT exp，無 Max-Age；document.cookie 不可見 Token；登出移除 | PASS | NOT RUN |
| LIVE-EMAIL-single-label | 帶 RunId 的 `@localhost` 註冊、登入、返回 Profile、登出 | PASS | NOT RUN |
| LIVE-EMAIL-quoted | 含空白 quoted local part 由 Server 接受，帶回 Email 後可登入 | PASS | NOT RUN |
| LIVE-EMAIL-unicode | 中文 Email 真實註冊／登入 | PASS | NOT RUN |
| LIVE-EMAIL-invariant-casing | U+0130 Email 由 Server 正規化，以回值登入 | PASS | NOT RUN |
| LIVE-ERROR | `a@@example.test` 通過基礎 gate 到 Server 400／email details；錯誤帳密 401 留 login | PASS | NOT RUN |

LIVE-01 去敏 RunId／次數／flags 見摘要。正常頁完整 App 初次 me=1，成功 Login／PATCH 後仍 1；刷新後 2，新分頁獨立 1。特权测试暫讀 Cookie 的 JWT exp，只產出布林比較，產品程式不讀 Token。

## 合成 Browser 與 unit

| Case | 驗證目標 | 最終自測 | 人工 |
| --- | --- | --- | --- |
| B01 | me 去重／SPA、normalized no-op／PATCH 白名單、avatar 載入失敗、1440／390 nav／長姓名完整可讀 | PASS | NOT RUN |
| B02 | 首次 401 完整返回、未登入 nav 返回點擊目標、settled null 不重查 | PASS | NOT RUN |
| B03 | 初始化 unknown 原頁重試、不建空 Profile、不自動再查 | PASS | NOT RUN |
| B04 ×4 | 公開合成 loader 與 me pending／disabled／401／500 獨立 | PASS | NOT RUN |
| B05 | Tabs／首欄焦點、100／101 Code Points、duplicate Email／未知 details 摘要、短登入密碼不套註冊規則 | PASS | NOT RUN |
| B06 | dirty SPA／history back／beforeunload 刷新取消；Header logout 取消零 POST／成功一次確認 | PASS | NOT RUN |
| B07 | 操作 Auth 401 不被 Esc／遮罩關閉；× 後 dirty 取消保留輸入、session 仍失效 | PASS | NOT RUN |
| B08 | 操作 disabled 保留 User／輸入／登出；disabled Login 留登入 Tab | PASS | NOT RUN |
| B09 ×4 | Profile 500／network／malformed／timeout 不重送，讀取失敗／替換取消保留，明確採用解除 gate | PASS | NOT RUN |
| B10 | Register／Login／Logout 結果不明與手動核對／重試 | PASS | NOT RUN |
| B11 | PATCH 離頁後晚回不更新 User／toast／route，輸入 freeze／finally loading 結束 | PASS | NOT RUN |
| B12 | guest 正確 query/hash；外部／未知／login loop 退回首頁 | PASS | NOT RUN |
| B13 | me 明確核對離頁後晚回不改下一頁／User | PASS | NOT RUN |
| B14 | 首次 disabled 不建 Profile、保留登出；logout 晚回不改新 route／User | PASS | NOT RUN |
| B15 | GET me 核對 Auth 401 更新 session、Dialog → dirty → login 完整返回；保留原輸入 | PASS | NOT RUN |
| B16 | 核對回不同 User，確認一次即建立新基準、更新 Header／session 並解除 unknown gate | PASS | NOT RUN |

**22 個合成 Browser 案例為逐案最新結果彙整**：原 20 案完整執行為 19 PASS／1 cold compile 同步 FAIL，B01 局部重跑 1／1 PASS；新增 B15／B16 最終同一命令 2／2 PASS。不是聲稱同一命令 fresh 22／22。F3 unit **48／48**，共用 F2 API／scoped-state **46／46**，同一最終 unit 命令 **94／94**；包含晚 bootstrap 不覆蓋 Login／Logout／PATCH、明確核對世代、不同 User revision、redirect 繞過、Unicode／Password／欄位快照。

## 命令、首次失敗與修正

| 命令 | 最終結果 |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck`（Nuxt＋tools strict） | PASS |
| `npm run build` | PASS |
| `npm run test:unit -- tests/unit/f3-auth.spec.ts tests/unit/api-client.spec.ts tests/unit/scoped-state.spec.ts` | 94／94 PASS |
| `npx playwright test --config playwright.f3.config.ts f3-live.spec.ts` | 1／1 PASS |
| `npx playwright test --config playwright.f3.config.ts f3-email-live.spec.ts` | 5／5 PASS |
| `npx playwright test --config playwright.f3-fixture.config.ts`＋受影響局部重跑 | 原 20 案最終 PASS；各輪原始結果保留 |
| `npx playwright test --config playwright.f3.config.ts f3-reconciliation.spec.ts` | 2／2 PASS |
| `npm run test:e2e`（built preview／合成 Auth） | 1／1 PASS；驗 CSR／config／本地可見 icons／手機 nav |

保留首次失敗，不用同步錯誤掩蓋產品缺陷：

- 初次真實測試比較 Chromium 校正後 cookie.expires 與 JWT exp 失敗；改比較 wire Set-Cookie Expires，正式契約等值通過，另記 Browser 時鐘校正差值。
- 首次 typecheck 的 UForm validateOn `submit` 不合法、lint layout root／控制字元 regex／fixture component name；改用支援的 validateOn、layout 包層與明確說明／命名，最終 PASS。
- 首次 fixture 8 PASS／10 FAIL；UForm 首欄焦點是產品問題，改控制 ref 與自行管理 loading 後通過。其餘包括 URL 未等待、被取消 navigation 等待、Dialog 本地化名稱／兩個關閉控制造成歧義，按可觀察結果修正工具。第二輪 8 PASS／5 FAIL，補等待 Dialog 已處理／popover 實際展開／route 完成；五個受影響案重跑全 PASS。
- 最終原 20 案的 B01 cold compile 在 5 秒內尚未取得欄位，改首畫面就緒最多 30 秒等待，局部重跑 PASS；沒有固定 sleep 或降低產品斷言。
- B15 首次對 Dialog 的 inert 背景使用預設可達性 locator，找不到被隱藏的 textbox；允許讀隱藏背景控制以核對保留值，重跑 PASS。
- smoke 首次把桌面隱藏的手機 icon 當可見控制而報寬度 0；改檢查可見 icon，原 SVG mask／非零尺寸要求保留。工具 strict 的 Window cast 亦修正。

Playwright 首次 spawn EPERM 經自動審核後允許同一授權操作；沒有自動審核拒絕。NO_COLOR／FORCE_COLOR、DEP0155 及刻意保留但不存在的 hash anchor scroll 警告不影響案例；不將警告稱為 API 契約差異。原件 hash／每轮命令結果見摘要。

## BLOCKED／NOT RUN 與停止點

| 未驗證項 | 狀態／原因 |
| --- | --- |
| 真實 disabled 正確帳密 Login | BLOCKED：缺受控 disabled 帳號 |
| 真實既有 Cookie 後帳號停用的 API | BLOCKED：缺後端受控安排，不 SQL 改狀態 |
| 真實 AUTH_TOKEN_INVALID／AUTH_TOKEN_EXPIRED Cookie | BLOCKED：缺受控 Cookie，不製造 JWT／改時鐘或 DB |
| 真實 Statistics loader／表單操作 | NOT RUN：後續輪次，F3 僅頁殼／公開合成 harness |
| 真實 Server 故障已 commit 與否 | NOT RUN：攔截只驗前端未知結果處理 |
| 人工實機、其他 Browser、正式 AI／人工驗收 | NOT RUN；沒有代填人工 PASS |
| npm ci／install／audit／generate、無關 F2 資料 helper／F2 Browser 全套 | NOT RUN／沿用適用歷史證據；無依賴或共用 helper 變更，不為湊層級重跑 |

首次失敗、歷史 F1／F2 結果及 backend-ref 保留；去敏證據不含 Cookie／Token／密碼／storageState。自測結果與缺口交付後停於 **F3 整輪交付、待 Owner 集中 review**，不 accepted、不推送、不開始 F4。
