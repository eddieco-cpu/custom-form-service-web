# F3 精簡實作計畫 — Auth、Header、首頁與 Profile

版本：1.0／2026-10-12（Asia/Taipei）。**F3 計畫待 Owner review；開發尚未授權、未開始。** Owner 已確認 F2 R1～R3 局部複核並同意結案；[F2 補充自測結果](../test-results/F2_Supplemental_Test_Report.md) 無阻擋。F1 P3 局部複核通過；F1／F2 正式驗收延後，均未 accepted。

## 1. 範圍與來源

依總計畫 v1.3 F3／§7／§7.1 項目 1、3、7，承接 F0 v1.1 §6／§7.4 已確認決議及 F2 共用 client／User decoder／request scope／operation／dirty／feedback。

- 本輪：client Auth plugin、共享初始化、auth／guest 命名 middleware、session revision、登入／註冊 Tabs、合法返回、Header／手機導覽、首頁三入口、Profile 顯示與 PATCH、dirty 確認登出及錯誤／結果不明核對。
- 表單 nav 僅到後續頁殼，明示尚未完成，不放假的資料或 API 操作。統計頁不套 auth middleware；F3 只用合成公開 route harness 證明初始化不阻塞，真實 Statistics loader 留 F9。
- Google 隱藏；不新增帳密修改、重設密碼、Email 驗證、JWT storage、跨分頁同步、BFF 或 endpoint。F4～F10 不提前實作。

來源：前端 [01](../specs/01-pages-routing-and-access.md) v1.0 §1～4／§6／§10、[04](../specs/04-auth-state-and-error-handling.md) v1.0 §1～12、[05](../specs/05-ui-and-interaction.md) v1.0 §1～2／§5／§7～10、[06](../specs/06-technical-architecture.md) v1.1 §1～5／§7、[07](../specs/07-api-integration-map.md) v1.0 §1～4；後端 [Part A](../../backend-ref/docs/specs/03a-v1-api-contract-common.md) v1.0 §5、[Part B](../../backend-ref/docs/specs/03b-v1-api-contract-auth-user-form.md) v1.0 §3.1／§4.1～4.3／§5、[Errors](../../backend-ref/docs/specs/04-v1-error-catalog.md) v1.0、[Constraints](../../backend-ref/docs/specs/05-v1-system-constraints.md) v1.1 §4。實際可讀來源 `backend-ref/` 唯讀快照，2026-10-11 匯出 SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`；本次 manifest 108／108 相符。前端計畫接手 HEAD `c68f5bd63b1f73cc5b780013bb2d6cc603b0235f`，本次交付 SHA 見 Git log／交付訊息。

## 2. 依賴與前置

沿 lockfile／既有安裝：Node 24.21.0、npm 11.19.0、Nuxt 4.6.1／UI 4.11.3、Tailwind 4.3.3、Zod 4.6.5、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0；不預計新增依賴。F2 精確數值 gate 已具沿用證據，不為 Auth 字串欄位重跑數字題工作。

2026-10-12 本次只讀 health／ready／OpenAPI 均 200；列有 register／login／logout 及 GET／PATCH me，Origin `http://localhost:3000` 回 ACAO 同 Origin、ACAC=true。**這只是連線／metadata，未證明真實 Auth、Browser CORS／Cookie 或 live commit。** 原件 hash 見 F2 補充證據的 `planningReadOnlyProbe`。live Git SHA／effective Cookie flags、既有合成帳號可用性仍待 F3 開發前確認；不將快照 SHA 當 live 版本。

真實拓樸採 frontend `http://localhost:3000`、API `http://localhost:5000/api/v1`、credentials=include。沿本機既有 DB 與保留合成帳號；可用已授權 Register 建立帶 RunId 的新合成帳號並保留，不重建 DB、不 SQL 改資料。disabled／有效過期 Cookie 等特殊資料由已同意的後端受控安排提供，未取得時該真實案例 **BLOCKED**；普通 UI、unit 與合成故障工作仍可完成。API 不可用只阻擋真實整合，不能改用 fixture 宣稱 PASS。

已知事項：原目錄 npm ci unlink EPERM、原 audit 風險尚未解除；依賴無變更先沿現有安裝，不為 F3 自動重裝／升級。若實際妨礙必要檢查再記阻擋範圍。F1／F2 延後正式驗收是進度狀態，Owner 已授權接續規劃；目前沒有已知 F2 產品缺陷阻擋本計畫。

## 3. 主要實作方式

### Auth 狀態與責任

預計 `app/plugins/auth.client.ts`、`composables/useAuth.ts`、`domain/auth-state.ts`、`middleware/auth.ts`／`guest.ts`、`services/auth.ts`／`user.ts`。useState 保存 User/null、idle/pending/settled、當次初始化錯誤／unknown；同 App 私有 Promise 不放 DTO／storage。plugin 背景啟動 GET me；middleware 等同一 Promise。settled null 不再初始化，只有手動重試／核對或完整 App 重啟可再 GET。頁面以共用 gate 防止 unknown／無 User 時建立可保存的空模型。

| 事件 | 狀態更新／導航責任 |
| --- | --- |
| bootstrap 200 | 採 User、settled；auth 放行；guest replace 合法 redirect 或 `/` |
| bootstrap 三種正式 Auth 401 | User=null、settled；auth replace `/login?redirect=完整站內 path＋query＋hash`；guest 留 login；公開頁不因 me 跳轉 |
| bootstrap AUTH_USER_DISABLED | 記本次錯誤，舊 User 保留；無 User 時 Header 預設 icon＋登入中、仍可登出；需要 User 的頁面原 URL 停用錯誤，guest 留 login；不建立 User.status 或全域 API 封鎖 |
| bootstrap network／timeout／500／不可解碼成功 | unknown，保留可用舊呈現；保護頁原 URL 重試，login 可手動登入；公開內容不等待／不被 me 錯誤覆蓋 |
| Login 200 | 採 User、settled，推進 session revision／Auth 世代，頁面 replace 合法返回；不補 GET me |
| Register 201 | 不改登入狀態；toast，回登入 Tab、帶 email、清密碼、保留 redirect；不自動 Login |
| PATCH me 200 | 當前 scope 成功才更新 User／Header、姓名基準與 toast；推進 Auth 資料世代防旧 me 覆蓋，身分未變不當成新 session；不補 GET me |
| Logout 204 | dirty 先確認才 POST；成功清 User、settled、session revision 前進，使用本次 permit replace `/login`，不保留 redirect、不第二次詢問 |
| 普通操作正式 Auth 401 | 當前 scope 更新登入失效／session revision；先錯誤 Dialog，關閉或 × 後按 dirty guard replace login；取消保留頁面／輸入，不恢復登入有效 |
| AUTH_INVALID_CREDENTIALS／操作 disabled | 前者只留 login 顯示帳密錯誤；後者保留舊 User／输入與登出，無強制登出 |

以 session revision＋Auth 請求／資料世代擋晚回 bootstrap、明確核對及寫入回應；成功 Login／Logout／PATCH 後舊 me 不得覆蓋。session 變動、換頁與卸載後，舊 callback 不改新 User／model／toast／route。核對先驗 current，再明確採用；每頁舊資料與輸入不跨頁恢復。

### 登入、驗證與返回

`pages/login.vue` 採 UForm＋Zod refinement，雙 Tabs 不改 URL。送出快照白名單：Register 三欄、Login 二欄、PATCH me 只有 displayName。loading 停用相關輸入／重複操作；details 的 email／password／displayName 定位原欄位，未知位置保留摘要，前端錯誤聚焦首欄。

沿 F0 寬鬆 Email 基礎驗證：text＋inputmode=email、不用 `type=email`／`z.email()` 作 gate；Register 檢查 trim 後非空、包含 @、≤254 Code Points，完整格式由 Server MailAddress 判式決定。Login 只驗必要非空欄位，不套 Register 密碼長度／格式。ASCII Email trim＋lowercase；非 ASCII 只 trim，交 Server ToLowerInvariant，User.email 採回值。姓名 White_Space trim 非空≤100 Code Points；註冊 Password 原樣 10～128 Code Points，不使用 UTF-16 maxlength、不 NFC。

代表案例：`a@localhost`、quoted local part、中文 Email 不能被套件預設擋；U+0130 不靠 client Unicode casing 判身份；emoji 姓名 100／101、Password 9／10／128／129 及頭尾空白；錯誤 `a@@example.test` 等可到 Server 回 email details，前端不宣稱格式完全對等。

`utils/redirect.ts` 用 URL parser、origin 及明確已知 route matcher（排除 catch-all）驗證；保留合法 query/hash。拒外部 URL、`//host`、反斜線、非法 percent 編碼、login 自循環與未知路由；無效回 `/`。涵蓋正式已知 forms routes 的殼，不能藉 fallback page 誤認任意路由有效。首次導登入、Login／guest 返回用 replace；普通 nav 用 push。

### Header、首頁、Profile 與 dirty

`layouts/default.vue`／`components/AppHeader.vue` 接四 nav 固定順序、avatar 失敗用本地 icon、姓名選單／Profile／Logout；初始化中共用等待、unknown 中性、未登入 avatar 不可點且 nav redirect 到點擊目標。desktop 64px／mobile 56px 固定 Header，低於 1024px 展開 nav、保留 avatar與內容預留；姓名當純文字，手機可完整讀取。

首頁共用 User 歡迎＋建立表單／我的表單／Profile 三入口，無新首頁查詢。Profile 正常掛載只取共用 User，id/email/avatar 唯讀，displayName raw 與 normalized candidate／最後成功基準分開；無實際差異不送 PATCH，改回基準 clean。

增加當頁 dirty scope 註冊橋接供 Header 使用：只有當前 mounted page 的 scope，卸載清除。Logout 先 `authorizeAction`，取消零 POST；等待期間禁重複動作及相應輸入，失敗 `finishAction` 清 permit，成功一次 `navigateWithPermit`。Profile 保存重用 F2 profile policy／送出快照與 current predicate；500／timeout／malformed 保留輸入並停用再保存，提供明確 GET me 核對，成功且丟棄確認採用後才重建基準／解除。GET 核對失敗是 read-failure，不清基準。Login／Register／Logout 不明按 04 §11 提供手動重試／me／切登入核對入口，不自動 retry 或假成功；Logout 失敗保留現有 UI，不宣稱 Cookie 仍有效。

## 4. 測試方式與交付

| 方法／時點 | 目標、案例與理由 |
| --- | --- |
| Unit：狀態／helper 完成時 | shared Promise 去重、settled null 不重查、200／401／403／unknown、Login／Logout／PATCH 後晚 me、session／卸載 stale、redirect 有效 path＋query＋hash 與各繞過、Email 寬鬆策略／Code Point／Password、字段快照與 Profile 基準；純狀態及規則可穩定重現 |
| 合成 Browser：頁面接入後 | 初始化去重／SPA 不多查、public harness 不被 me 阻塞、unknown 手動 retry、兩 Tab／details、初次與操作 Auth、disabled 保留、Profile dirty／替換取消、Header Logout 取消零 POST／成功一次確認、write unknown／手動核對、舊結果無 toast／route；以攔截穩定觸發故障，明列模擬 |
| 真實 Browser＋API：正常流程接通後 | 註冊不登入／不設 Cookie、Login＋GET me＋刷新／新分頁，各完整 App 一次 me、SPA／Profile不多查、PATCH 姓名後真實讀回、Logout 清 Cookie；核對 JSON preflight、credentialed CORS、HttpOnly／SameSite／Path／Host-only／Development Secure／Expires（去敏記錄、不輸出值）。正常帳號與 quoted／single-label／Unicode Email 依可用合成資料建立並保留，不能以 unit／攔截代稱通過 |
| 特殊真實資料 | disabled 正確帳密／已有 Cookie 後 API 回停用、過期／無效 Cookie；需確認 fixture／受控安排，缺前置記 BLOCKED，合成案例另列，不製造 Token 或 SQL 停用 |
| 工程交付前 | F1 scripts `npm run lint`、`npm run typecheck`（Nuxt＋tools strict）、`npm run build`；重跑 F3 unit／Browser 及被實際共用改動影響的 F2 回歸，無影響不全面重跑／重裝。只測必要行為，不為樣式加鏡像 unit |
| 操作自測 | Browser 1440px／390px、手機 nav、avatar fallback、長名、鍵盤／焦點、Dialog ×／關閉、Profile 離頁／刷新；人工實機操作若未執行列 NOT RUN，不能填人工 PASS |

開始真實測試前記前後端實際版本、Origins、非秘密 effective 設定與 RunId；不能確認 live SHA 就明列未確認，保留可追溯服務來源缺口。使用既有 DB，敏感 raw 不入 repo，證據只記 Cookie flags／是否存在，不提交憑證、storageState、Token 或帶登入秘密的 trace。

首次失敗保留命令／log／案例，區分環境、同步、產品／契約；修正後只重跑受影響檢查，不改預期求 PASS。若正式 payload 衝突只暫停該串接、列來源／章節／差異；環境缺口列 BLOCKED／NOT RUN，不把 fixture 換成真實結果。交付 `F3_Development_Report.md`、去敏證據及單一目的本機提交；報告明列 scope、版本、結果、未驗證事項、SHA／Git 狀態。真實 Cookie／CORS 等必要項未通過時不能聲稱完整測試完成。

## 5. 兩個人工關卡與停止點

依本次 Owner 指示，F3 起採兩個人工關卡：**計畫確認 → 整輪交付後集中 review**。本版交付停於 **F3 計畫待 Owner review**，沒有改 Auth／Header／Profile app code、安裝或執行 F3 開發測試。

待計畫核准，再由 Owner 一次授權整輪開發、必要測試與範圍內修正；一般工程選擇／開發自測不逐項再設人工關卡。整輪完成後集中 review；契約衝突、必要環境阻擋仍如實回報受影響部分。正式驗收／accepted 維持 Owner 另行指定，F1／F2 仍未 accepted，不由本版或自測代填。
