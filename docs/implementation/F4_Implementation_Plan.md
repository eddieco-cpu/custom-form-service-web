# F4 精簡實作計畫 — 我的表單與 Form 讀取／路由

> 以下 v1.0 保留原規劃交付紀錄；Owner 已核准並授權整輪執行，目前進度見 §7 與 [F4 開發報告](F4_Development_Report.md)。

版本：1.0／2026-10-12（Asia/Taipei）。**F4 計畫待 Owner review；開發未開始。** Owner 已確認 F3 局部複核結果，F3-R1、F3-R2、N1 結案，F3 code review 通過。F1／F2／F3 均未 accepted，正式驗收仍延後，既有未驗證事項保留。

## 1. 範圍與依據

依總計畫 v1.3 的 F4／§7／§7.1 項目 3、5、7，沿用 AGENTS v1.1 與 [Round Development Skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)。本輪完成 `/forms` 清單、共用 FormDetail loader、Owner／狀態判斷，以及 `/forms/{formId}`／`edit` 的讀取、原 URL 錯誤與必要導向。

清單含每頁 10 筆、status 篩選、手動刷新、分頁、桌面表格／手機卡片與空狀態；Form 頁與 Owner Draft edit 頁呈現真實根資訊、Creator、唯讀狀態。Draft edit 的編輯器、Form 頁的題型控制／填答、管理操作仍明示尚未完成，分別留 F5～F8；`new`／`statistics` 保留既有頁殼，不接新 API。F4 不建立 Editor／Answer model、五題型 Renderer、寫入／Latest／Count／Statistics 操作或資料持久化。

引用來源（2026-10-10）：前端 [01](../specs/01-pages-routing-and-access.md) v1.0 §1／§5／§7／§9～10、[02](../specs/02-form-editor-and-lifecycle.md) v1.1 §3、[03](../specs/03-response-and-statistics.md) v1.0 §1～2、[04](../specs/04-auth-state-and-error-handling.md) v1.0 §2～6／§9～10／§12、[05](../specs/05-ui-and-interaction.md) v1.0 §1～3／§6～10、[06](../specs/06-technical-architecture.md) v1.1 §4～5／§8／§10、[07](../specs/07-api-integration-map.md) v1.0 §1～3／§9～10；00 的排除範圍維持。

後端權威來源為本 repo 唯讀 `backend-ref/`：2026-10-11 匯出、SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`。本輪核對 [Part A](../../backend-ref/docs/specs/03a-v1-api-contract-common.md) v1.0 §5～6、[Part B](../../backend-ref/docs/specs/03b-v1-api-contract-auth-user-form.md) v1.0 §3.3～3.6／§6.2～6.3／§7.1、[Domain](../../backend-ref/docs/specs/01-v1-domain-specification.md) v1.1 FORM-06～08 與 [Errors](../../backend-ref/docs/specs/04-v1-error-catalog.md) v1.0 §4～5／§7／§12。本次未發現影響 F4 的契約差異；前端固定 pageSize=10 是既定 UI 選擇，後端 default=20 的契約不變。

## 2. 前置與本次實際觀察

- F2 的 client、DTO／decoder、精確數值／時間、request scope／feedback 及 F3 Auth／Header 可承接；F3 review 通過足以支撐本次規劃，不能推定正式驗收完成。複核報告與去敏證據已保存於 `02bccb3b49c60ab2cbd84edfaa51ccfa43afcce7`，原文件／歷史失敗不覆寫。
- 接手 HEAD `43c725e9c0664743b445b98abb5114c0f675945c` 原有兩份未追蹤複核文件；規劃期間它們已由上述本機提交保存，編輯前 HEAD 為 `02bccb3`、工作樹乾淨，產品／測試／工程組態未變。本次前端 `node --version`／`npm --version` 實測為 **24.21.0／11.19.0**；package／lockfile 沿 Nuxt 4.6.1、UI 4.11.3、Tailwind 4.3.3、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0、lossless-json 4.3.1，不預計新增依賴。
- 2026-10-12 **16:44:12 台北時間**，唯讀 `/health`、`/health/ready`、`/openapi/v1.json` 均 **200**；OpenAPI **3.1.1**、info.version **1.0.0**，列有本輪兩支 GET。帶 Origin=`http://localhost:3000` 的回應 ACAO 同 Origin、ACAC=true。**僅為連線／metadata 觀察，未執行 Form 業務讀取或 Browser Cookie／CORS 測試，live Git SHA／DB 版本仍 UNCONFIRMED。** 開發前再確認服務／測資與實際版本，不以快照 SHA 代稱 live。
- 後端快照 manifest 本次 **108／108 hash 相符**；OpenAPI 亦列 Statistics GET，快照的 R10 已實作／accepted 是歷史狀態，本次沒有執行 Statistics／重核後端 accepted，F4 不依賴它。
- 真實表單／Owner 與其他 Active 帳號尚未盤點。真實 disabled、有效過期 Cookie 的受控前置仍缺；原目錄 npm ci native binding EPERM、既有 audit 風險、其他 Browser／人工實機未驗證事項保留。依賴不變不自動重裝／升級；缺前置只阻擋相應真實案例，記 BLOCKED，不阻擋獨立 UI／fixture 工作。

## 3. API、檔案與工程方案

| 本輪 API（省略 `/api/v1`） | 輸入／結果／責任 |
| --- | --- |
| `GET /forms` | `page`、固定 `pageSize=10`、`status?`；全部省略 status。200 以既有 `decodeSummaryPage` 取得 items／pagination；只列本人未刪表單，維持 API `updatedAt DESC, id DESC`，count 為不同填答者數 |
| `GET /forms/{formId}` | Path ID 編碼後送 API，認證／UUID／資源存在順序由 Server 判定。200 以 `decodeFormDetail` 取得完整 tree／根資訊；不從列表推定 Owner 或最新 status，不以 PATCH 試探權限 |

沿 F2 `createApiClient`：credentials=include、30000ms timeout、無自動 retry、lossless JSON／原 datetime 字串。DTO 不雙向綁為編輯資料；不可解碼回應為讀取失敗，不能補 default 當成功。F3 的 me 只用共用初始化／明確初始化重試，不因每頁、篩選或 Form GET 成功新增 me。

| 預計檔案 | 具體責任 |
| --- | --- |
| `app/services/form.ts` | 兩支 GET、URLSearchParams 查詢白名單、既有 decoder；傳入 request scope 的 AbortSignal，無導航副作用 |
| `app/domain/form-read.ts` | 純讀取決策：Owner／pageMode／status 路由、超界頁一次對齊、formId validation 明細分流；資料語意引用上述規格 |
| `app/composables/useFormsList.ts`、`useFormDetail.ts` | 當頁 requested key／成功 snapshot／錯誤／loading，沿用 `useRequestScope`；current 檢查後才採資料、更新 Auth 或導航，卸載清除 |
| `app/pages/forms/index.vue`、`[formId]/index.vue`、`[formId]/edit.vue` | 命名 auth middleware、初始化 gate／資源 loader、清單操作／唯讀頁殼、原 URL 錯誤與 replace；不改公開 statistics 的 middleware |
| `app/components/forms/FormsList.vue`、`FormRootInfo.vue` | 桌面表格／手機卡片語意一致；根資訊／中文 enum／台北時間／Creator 純文字，Owner 次要 metadata。沿現有 ReadError／ActionErrorDialog／焦點 helper，不新增整套 feedback |
| `tests/unit/f4-form-read.spec.ts`、`tests/e2e/f4-browser.spec.ts`、`f4-live.spec.ts` 與必要 fixture／Playwright config | 純決策、實際產品頁互動／路由與真實 GET 分開；沿既有 scripts／工具 strict，fixture 直接使用產品程式 |

### 清單與分頁

初次 page=1、全部；切 status 同時回 page=1，以單一查詢快照發一次 GET，不讓 filter／page watcher 各送一次。手動刷新只重讀目前條件，無輪詢。資料保留最近成功的 query key：**同條件刷新**顯示舊資料＋loading，成功才替換；失敗保留並標示未更新／可重試。**換頁／篩選**顯示新條件 loading／error，避免把前條件 items 當新結果；session 改變立即清掉舊帳號 items／pagination。

`totalPages=0` 採空清單，page 回 1、不連續重查；`page>totalPages>0` 顯式回最後有效頁，只追加一次 GET。例：page=3 刷新得到 totalPages=2，讀 page=2 一次；第二次若仍超界，留可手動刷新的對齊提示，不再自動追查。換 filter／session 使原對齊流程失效。空「全部」提供建立表單，篩選空結果說明條件；分頁不把超界 200 當 404。每列含 01 §5 全部欄位，Draft link 至 edit、Published／Closed 至 Form，再由該頁 GET 判定。

### Form loader、Auth 與路由責任（§7.1 項目 3）

scope key 包含當頁路由／pageMode／formId（清單為 page／status），另綁 sessionRevision；切條件、換 ID、session 變動及卸載同步 invalidate。Abort 僅節省請求；**success、error、Auth callback、route 及 finally 均須防止 stale 副作用**。例：A 的慢 200／401 在 B 載入後到達，不覆蓋 B、不清新 User、不導 login、不結束 B 的 loading。session 變動清舊資料與 Owner 判定，若仍留在有效受保護頁，依當前身分重新 GET；沒有跨頁 Definition cache。

當前 Auth 401 先確認 ticket、保存錯誤與返回 fullPath，再套用身分失效；自身造成的 revision 變動清資源但不清這次 Auth Dialog。Dialog 放在資源／Auth gate 外，關閉導航由當頁流程世代守護，不能重用已被自己失效的 request ticket 而跳過導航；其後外部 Login／Logout、換頁或卸載則撤銷舊流程。接入後以 Browser 驗關閉／× 都能返回且不誤導新 session。

| 情境 | 狀態更新／頁面與導航責任 |
| --- | --- |
| 共用 Auth 初始化 pending／unknown | 等同一初始化；unknown 原 URL 重試 gate，明確重試成功後才啟動 loader，不以空 User 建資料 |
| 首次初始化 Auth 401 | 沿 F3 middleware／gate replace login，redirect 保留完整 path＋query＋hash；settled null 不另查 me |
| 首次 me disabled | 保留 Header／登出；原 URL 停用流程，不建立全域 disabled API 封鎖。Form 資源讀取若進行仍以自己的 API 錯誤為準，不假造 Owner |
| 當前 Form GET 200，Draft Owner | 以共用 User.id=`userId` 判 Owner；Form URL replace edit，edit 顯示完整根資訊與未完成編輯器說明 |
| 當前 Form GET 200，Published／Closed | Owner／非 Owner 的 edit URL 均 replace Form；Form URL 留原頁。過期 Published 仍是 Published，額外已截止提示；Closed／已截止都不因正常讀取回首頁 |
| 非 Owner Draft／不存在／已刪除 | API `FORM_NOT_FOUND`，原 URL 找不到；不推測是哪一種原因、不跳固定 error page |
| UUID 無效 | 有效登入後 API `VALIDATION_ERROR`＋formId 明細，原 URL 連結無效；不在初始化之前用 client UUID 驗證掩蓋 Auth 優先序 |
| 首次資源讀取正式 Auth 401 | current 才 `session.invalidate`；replace login 返回原完整 URL；不由 client interceptor 全域導航 |
| 已有資料後手動刷新／重讀正式 Auth 401 | 讀取語意但用操作 Auth Dialog；current 才失效身分，關閉／× 同一路徑導 login，沿 F3 焦點恢復。舊 User 的私有資料不繼續呈現；F4 無編輯輸入，不新建 dirty scope |
| 資源 `AUTH_USER_DISABLED` | 原 URL 停用讀取錯誤、保留既有 User／Header／登出；不 `logout`、不主動跳登入 |
| network／timeout／500／異常 Body | 原 URL read-failure、loading 結束、手動 retry；同條件刷新保留可靠 snapshot 並標示非最新，不能當 404／未登入或寫入結果不明 |

角色／狀態導向用 **replace**，普通點列表 link 用 push；新頁仍正常 GET，不用跨頁 cache 避免第二讀取，也不按已過時列表 status 強制導向。不跨頁恢復原 Definition。根資訊顯示 02 §3／03 §1 的 title、可選 description、Creator、status、三項設定與 deadline；Owner 額外 id／建立／更新時間，`userId` 只作判定，不假造 FormDetail count。日期用現有 `formatTaipei`，原微秒保留，純顯示不回寫；截止提示可用本機時間，無 API 輪詢，Server 最終收件判定留 F8。

## 4. 必要測試、測資與證據

以下是計畫核准後的**開發自測**，不是正式驗收計畫或已執行結果。

| 方法／時點 | 目標、代表案例與選用理由 |
| --- | --- |
| Vitest：service／純決策完成後 | query 固定 10／全部省略 status、一次篩選查詢、0／1／11 筆與超界一次上限、Owner／status／pageMode 矩陣、formId details 分流；deferred success／error／finally 在換條件／ID／session／卸載後無副作用。重跑受影響 `api-client`／`scoped-state`／F3 Auth 回歸；純規則有風險才測，不加樣式鏡像 unit |
| 合成 Playwright：產品頁接入後 | filter／pagination／refresh、首次 loading／失敗、刷新失敗保留、超界連續縮頁不循環、空狀態與 row link；Owner Draft／非 Owner Draft 404、兩角色 Published／Closed edit replace、已截止留頁；無效 UUID／刪除／三種 Auth 401／disabled／network／500／異常 Body。慢 A 在 B、session 或卸載後不能改資料／Auth／URL／loading；兩支 GET 請求計數、SPA 無額外 me、無 Form 寫入／Latest／Count／Statistics。Browser 驗外部可觀察導航與操作，攔截全標模擬 |
| 真實 Browser＋API：既有測資與服務確認後 | 沿 F3 Login，用有效 Cookie 讀本人清單／三狀態／不同帳號可讀範圍、Draft 隱藏、Published／Closed edit 導向、已刪除或不存在／無效 UUID，以及 ≥11 筆時真實分頁／filter／刷新；真實 GET 帶 Cookie、credentialed CORS、新分頁／刷新各自一次 me、SPA 不多查。使用實際 API 與 Browser，不能以 fixture 補成整合 PASS |
| UI 操作自測：頁面接通後 | 1440px／390px 表格／卡片全部欄位、長標題／Creator／UUID 換行、台北時間／未設定、鍵盤 filter／分頁／重試／link／Dialog 焦點、讀取失敗後重試可用；檢查 console／page error 與非預期請求，不全面重跑不受影響的五組 F1 組態 |
| 交付前工程檢查 | F1 最終 scripts：`npm run lint`、`npm run typecheck`（Nuxt＋tools strict）、`npm run build`、`npm run test:unit -- <受影響檔案>`、`npm run test:e2e -- --config=<F4 config>`；built 產品做代表性清單／detail 導向 smoke，`git diff --check`。共用機制若有變更才加相應 F2／F3 回歸，不在通過後無理由擴大重跑 |

fixture 準備 0／1／10／11／多頁 items、三種 status／兩角色、不同填答者 count、null／七位小數 deadline、長文字與可控晚回／故障；採正式 DTO，完整 Form tree 不暗中截斷。真實自測用既有 DB、保留的合成帳號／表單或已同意的受控安排；**本次未盤點，不假稱已有 ≥11 筆、三狀態、已刪除或停用／過期資料，也不以 F4 的準備名義直接 SQL、reset DB 或自行展開 F6／F7 寫入。** 缺測資或 API 時，相應必要真實案例 BLOCKED／NOT RUN，fixture 可獨立完成但不解除缺口。

F4 無定義／答案寫入、dirty 或 beforeunload 新接法，因此不新增這些流程及精度 round-trip 全矩陣；FormDetail lossless／datetime 收讀沿 F2，只補本輪顯示與原值不變的代表驗證。人工實機確認若未做記 NOT RUN；正式 AI／人工驗收仍延後，不代填 PASS。

交付 `F4_Development_Report.md` 與必要去敏證據：實際前後端版本／Origins、命令、逐案結果、fixture／真實 API、首次失敗／受影響重測、來源及原件 hash、缺口、commit／剩餘 Git 狀態。敏感 raw／Cookie／Token／密碼／storageState／trace 不提交；合成截圖仍檢查實際內容。既有 F1～F3 未驗證事項及歷史失敗不覆寫。

## 5. 主要風險與完成判準

| 風險 | 處理／確認時點 |
| --- | --- |
| 來源版本與真實環境不一致／缺測資 | 開發前重核 API metadata、契約與測資；live SHA 不明如實記錄。契約差異列檔名／章節，只暫停受影響串接；真實矩陣缺前置記 BLOCKED |
| 舊回應洩漏前帳號資料或誤導航 | session 變動清 snapshot／Owner；scope current 同時保護資料、Auth、route、finally。unit deferred＋Browser 換條件／ID／身分／卸載實證 |
| 分頁縮減循環／刷新顯示錯誤條件 | requested／成功 key 分開；一次自動對齊上限，空清單不重查；UI／unit 各驗連續縮頁與刷新失敗 |
| 頁殼被當成編輯／填答完成 | 真實根資訊唯讀，清楚標示後續功能；Browser 斷言無相關寫入／Latest／Count／Statistics，不假造成功狀態或額外欄位 |
| 誤處理停用／Auth／404／UUID | 按表列 code 與情境分流，Auth 401 current 才失效，disabled 保留登出；普通 API 認證先行，Statistics 不套 F4 loader |

完成判準：F4 範圍的清單、根資訊、角色／URL 與錯誤／競態行為完成；必要工程檢查與選用自測有實際結果，缺前置逐案明列，不把「開發交付」寫成「所有真實測試完成」。交付範圍內程式、測試、報告與單一目的本機提交後集中 review，不推送、不擴張 F5～F10。

## 6. 兩個人工關卡與本次停止點

依 Owner 本次指示維持 **計畫確認 → 整輪開發、自測及範圍內修正交付後集中 review**。待本版確認及明確開發指令後一次執行整輪，不為一般工程決策或開發自測新增人工關卡；正式驗收／accepted 由 Owner 另行指定。

本次只保存 F3 複核成果／Owner 結案進度並提出本計畫：靜態來源／連結／diff 核對、Node／npm 版本及 health／OpenAPI 唯讀 probe；原複核兩檔 hash 保持一致，59 筆產品／測試來源及 10 筆歷史／3 筆獨立 Browser raw 結果 hash 相符，屬證據保存核對，**沒有重跑產品測試**。F4 app code 未修改，install／lint／typecheck／build／unit／Browser／正式驗收均 **NOT RUN**；未變更 backend-ref、服務或 DB。文件本機提交 SHA／最終 Git 狀態見 Git log／交付訊息。

**F4 計畫待 Owner review。尚不開始開發、不推送；F1／F2／F3 不代填 accepted，既有未驗證事項保留。**

## 7. v1.0 核准與授權開發交付追加（2026-10-12）

Owner 明確通過本版 review，授權整輪開發、必要自測與範圍內修正，不另外等待測試計畫核准，並同意註冊／登入新的合成帳號。已依本版完成清單／Form 讀取與路由、必要測試與 [開發報告](F4_Development_Report.md)／去敏證據，真實必要案例缺前置逐案 BLOCKED，獨立工作持續完成；沒有以 fixture 代稱真實整合通過。

**F4 開發與自測完成，待集中 review。** 單一目的本機提交、不推送、不展開 F5～F10；F1／F2／F3 正式驗收仍延後、未 accepted。上文規劃時的 NOT RUN／待 review 為歷史紀錄，實際命令、逐案結果、版本／缺口與 Git 狀態以本次開發報告／交付訊息為準。
