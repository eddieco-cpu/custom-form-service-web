# F2 Implementation Plan — API／Model 共用基礎

| 項目 | 本次紀錄 |
| --- | --- |
| 版本／日期／狀態 | 1.0／2026-10-11（Asia/Taipei）；**F2 計畫待 review** |
| 本次授權 | 僅規劃；不修改應用／測試、不安裝套件、不執行精確數值 gate 或程式自測；不開始 F3 |
| 前端接手 | `C:\Users\user\Desktop\custom-form-service-web`；`master`／`8c953df10bc43382277440fefb018df50d31c496`，起始工作樹乾淨 |
| 前置狀態 | F0 accepted；**F1 P3 補正已交付，待局部複核及正式驗收，尚未 accepted**；本次規劃不代替任何前置確認 |
| 後端來源 | 本 repo `backend-ref/` 唯讀快照，2026-10-11 匯出，來源 SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`；不是 live process 版本證明 |

## 1. 目標、來源與依賴

建立共用傳輸、契約解碼、資料語意、錯誤呈現及當頁狀態機制。依 [AGENTS v1.1](../../AGENTS.md)、[development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫 v1.3 §5 F2、§7／§7.1 項目 1／4／5／7、§8](V1_Frontend_Implementation_Plan.md) 與 [F0 v1.1 §5～8／§11 已確認工程方向](F0_Alignment_Report.md) 規劃。

前端 00～07 已閱讀；受影響章節為 [02 v1.1 §6／§6.1／§10](../specs/02-form-editor-and-lifecycle.md)、[03 v1.0 §4～5／§8／§10～12](../specs/03-response-and-statistics.md)、[04 v1.0 §1／§4／§7～12](../specs/04-auth-state-and-error-handling.md)、[05 v1.0 §5～9](../specs/05-ui-and-interaction.md)、[06 v1.1 §2～11](../specs/06-technical-architecture.md)、[07 v1.0 §1／§3／§7～10](../specs/07-api-integration-map.md)；01 §9～10 約束原 URL 錯誤與導航責任，00 §4 約束排除項。

後端正式契約依 [SNAPSHOT](../../backend-ref/SNAPSHOT.md)：00／01／03c／05 為 v1.1（2026-10-10），02／03a／03b／04 為 v1.0（2026-09-28）。本輪重點核對 01 §3／§6／SUB-02～03、02 §3／§8／§11、[03a §2～5／§9](../../backend-ref/docs/specs/03a-v1-api-contract-common.md)、[03b §3／§6～7](../../backend-ref/docs/specs/03b-v1-api-contract-auth-user-form.md)、[03c §3／§4.4／§8](../../backend-ref/docs/specs/03c-v1-api-contract-submission-statistics.md)、[04 §2～4](../../backend-ref/docs/specs/04-v1-error-catalog.md)、05 §10～12／§15／§17。DTO 依正式文件手寫；F0 A-05 已指出 OpenAPI 的 number／string 與 JsonElement 描述不足，不由其生成較寬鬆契約。

| 依賴／缺口 | 對 F2 的影響與解除方式 |
| --- | --- |
| F1 P3／驗收未結案 | 不阻擋本次規劃。F2 開發前須有足以支撐 F1 依賴的核准結果，或 Owner 明確允許獨立工作先行；不代填 accepted。歷史 npm ci 原目錄 EPERM／乾淨副本成功仍依 F1 review 保留 |
| Runtime／既有工具 | 沿 F1 `package.json`／lockfile：Node `24.21.0`、npm `11.19.0`、Nuxt `4.6.1`、UI `4.11.3`、Zod `4.6.5`、Vitest `5.0.3`、Playwright `1.64.0`；僅本次靜態讀取，開發時再記實際 runtime／Browser 版本 |
| 新必要依賴 | F0 選定 `lossless-json` **`4.3.1`**，目前未列入 package.json；開發授權後核對 API／metadata、pin、更新 lockfile 並 npm ci。本次未安裝／驗相容性。不加固定精度 decimal、日期庫、HTTP wrapper、Pinia 或 Nuxt test-utils |
| 精確數值 gate | 尚未實作／執行。F2 開發先完成 §3；FAIL／BLOCKED 時不得交付「數值已可用」或開始依賴它的 F5／F6／F8 數字題工作；F9 Number 解碼亦受此限制 |
| Live API／Cookie／資料 | 本次未查 live API／SHA／可用狀態。F0／快照記 R10 accepted、R11 結果待 Owner 確認；不沿用舊規格「R10 未實作」作全面阻塞。F2 自測用合成 fixture；真實 Cookie／CORS 留 F3 |

未發現新增契約衝突；F0 的歷史進度／OpenAPI 差異沿原處理。開發若遇 payload 衝突，列來源檔名／章節／版本、案例與影響，僅暫停該部分。

## 2. 範圍與預計檔案

以下均為授權開發後的預計檔案；一般命名可隨實作微調，責任不變。

| 預計位置 | 實作方案與界線 |
| --- | --- |
| `app/services/api-client.ts`、`app/domain/api/result.ts` | native fetch＋AbortController；注入公開 base URL、fetch／timer 供測試；typed Result、204、Error Envelope、timeout／network／契約處理失敗；不含 endpoint 業務流程或導航 |
| `app/domain/api/{user,form,response,statistics,error}.ts`、`decoders.ts` | readonly DTO／enum／nullable 型別及 decoder：User、FormDetail、Summary Page、Receipt、Count、Statistics；Request 與 DTO 分開。Create／Delta／Answer builder 留後續輪次 |
| `app/domain/models.ts` | Editor 本地 key／Server ID／原值與候選；Answer 未作答／raw text／精確候選；Statistics 無 config／Owner ID。只定介面邊界；完整 baseline／Delta／Latest mapper 留 F5，顯示 mapper 留 F9 |
| `app/utils/{exact-number,exact-json,unicode,datetime}.ts` | 精確數字 immutable 值、JSON 收送、snapshot clone／等值比較、文字與時間 helper；不使用 JSON 深複製破壞 exact 值 |
| `app/domain/{request-scope,operation-state,dirty-scope,error-presentation}.ts` | 純機制與可測狀態轉移、互斥 lease、單次丟棄授權、錯誤明細定位介面 |
| `app/composables/{useRequestScope,useOperationState,useDirtyScope}.ts` | Vue 生命期接入、finally loading、SPA leave／param update、beforeunload；接外部 session revision getter，不建 User store／Auth 初始化 |
| `app/components/feedback/{ReadError,ActionErrorDialog}.vue` | 沿 F1 UApp／本地圖示；首次讀取原頁可手動重試、操作錯誤／結果不明 Dialog 保留輸入；關閉按鈕與 × 共用 callback，不靠遮罩觸發導航，非自動關閉 |
| `tests/unit/*`、`tests/fixtures/f2/*`、`tests/e2e/f2-common.spec.ts` | 高風險純規則 unit；原始 JSON text fixture；隔離的 Nuxt CSR browser harness 接實際共用 composable／元件，模擬 read/write、路由與資料替換；不新增產品頁 |
| `package.json`／`package-lock.json`、必要測試組態、開發報告 | 開發時僅新增必要依賴及 harness 啟動／strict 檢查支援；沿 F1 scripts。報告附實際 gate／自測結果、版本／證據、commit／Git 狀態與缺口 |

F2 不建立 auth plugin、auth／guest middleware、登入註冊、Header、Profile 或產品首頁；不接 17 個 endpoint 操作、不改 F1 P3 case／歷史證據、不增 BFF、持久化、背景輪詢、跨分頁同步或核對中心。

## 3. 精確數值方案與可行性 gate

`ExactNumber` 是保存合法 token 的 immutable 值；UI 保留 raw string，空與 `0` 分開。採 JSON number grammar（含 e／E），拒絕 `01`、`+1`、`.1`、`1.`、不完整 exponent、NaN、Infinity、逗號；一般 Number 不經 Number()／parseFloat／Zod coercion／LosslessNumber 隱式轉換。

收：`response.text()` → lossless parse（保留全部 number token）→ decoder。number config／Statistics value 保持 ExactNumber；Receipt 無 type，數字 value 同樣保留，後續依 Form 題型才將合法 Rating 轉 0～100 整數。count／sortOrder／pagination／text length 等經精確整數與各自 int32 值域驗證才轉 JS number；拒絕 number string／超界值。

送：typed Request → ExactNumber 顯式轉 LosslessNumber → lossless stringify → fetch string Body，仍為 JSON number。clone 保留 exact 值，不用 JSON 深複製。比較 sign＋去前導／尾隨零的 digits＋BigInt exponent：先量級、再逐字邏輯補零，不展開巨大 exponent。`1/1.0/1e0`、`-0/0` 等值，不製造 dirty；Statistics 分組／排序仍採 API。

容量沿快照 [DefinitionNumber.cs](../../backend-ref/src/CustomFormService.Api/Validation/DefinitionNumber.cs)：raw exponent ±1073741823、整數位 131072、小數位 16383，屬既有能力檢查。zero 正規化前驗 raw exponent／fractional capacity，非零再驗 integral capacity。失敗保留輸入、回本地欄位／契約處理錯誤，不偽造 Server code 或改值保存。

**執行時機：授權 F2 開發後，先裝候選依賴並完成 adapter／decoder，再執行此 gate；通過才將數值能力交給後續輪次。現在全部 NOT RUN。**

| Gate 案例 | 驗證方法與 PASS 判準 |
| --- | --- |
| 長小數／大整數 | `9007199254740993`、`0.123456789012345678901234567890123456789`：UI token→serializer 的 Body→decoder→clone→再序列化，與固定預期精確值等值；Body 不加引號；相鄰大整數不可合併。fixture 直接保存 JSON text，不能先用 JS numeric literal 建測資 |
| exponent／等值／排序比較 | `1/1.0/1e0`、`-0/0` 等值；`1e80` 小於 10^80+1 的完整整數、`1e-101>0`、`1e400<1e401`、`-1e401<-1e400`。用固定預期的等值／序關係查驗，不能只用同一 adapter 比較自己的輸出求 PASS |
| 精確 min／max | min=`0.1`、max=`0.1000000000000000000001`，兩端 inclusive；小於 min／大於 max／min>max 皆正確判定；不用浮點 tolerance |
| 既有容量界限 | `1e131071`、`1e-16383`、`0e1073741823` 接受且 round-trip；`1e131072`、`1e-16384`、`0e1073741824`、`0e-1073741824` 拒絕且不發 request。另覆蓋尾隨零與負 exponent 的 fractional 檢查；不把 compact exponent 展開成巨大字串 |
| DTO 全路徑／安全轉整數 | FormDetail config、Receipt／Latest、Statistics number item 都用原始 fixture 經 client text decoder 保留精度；Rating／count／sortOrder／pagination 只在合法範圍轉換。number string、null number、非法／超界整數回契約處理失敗，不能補 default |
| Browser bundle／native fetch | harness 使用真正 Browser fetch＋Playwright 攔截的原始 JSON text：捕捉送出 Body，回 Receipt／FormDetail／Statistics fixture，畫面讀得精確文字及比較結果，且 request 只發一次。證明瀏覽器 bundle／傳輸路徑可行，標示模擬，不代表 DB 保存／API 真實讀回 |

gate 須 unit＋Browser 代表路徑通過，記版本、案例與去敏 Body／結果。前置不足記 BLOCKED，未跑記 NOT RUN；FAIL 留 token／差異／原結果，修正後重跑受影響案例。套件不能保真時暫停數值交付、提出替代 adapter 供 review，不改契約／Node／預期；其他獨立工作可繼續。F8／F9 補真實 DB／Receipt／Latest／Statistics 證據，模擬不代稱整合 PASS。

## 4. 共用工程設計

### 4.1 Client、DTO 與錯誤

使用 F1 `runtimeConfig.public.apiBaseUrl`、`credentials: 'include'`；有 body 才設 application/json。GET／write **30000ms** timeout、retry=0（非 SLA）；timer 涵蓋 body 讀取、finally 清理。預期 204 直接回 void，不解析空 Body。

Result 分 `success<T>`、`api-error`（status／code／message／details）、`transport-error`（network／timeout／abort）、`contract-error`（JSON／shape／enum／精度）、送出前本地失敗。2xx 驗預期 status／decoder；4xx 有有效 Envelope 才是明確失敗。已送 write 的 500、異常／無法解碼 Body、timeout／abort／網路皆結果不明；發送前序列化失敗無副作用。read 原頁錯誤／手動重試。

Decoder 驗必填／nullable／enum／config 合法 key 與型別，保留 Draft 省略 variant／bounds／原時間。Statistics 依 type 分 item，驗九個 Root 欄位；respondents 缺省與 [] 分開、null 拒絕，不補 Owner／config 或截斷集合。Receipt 保留 string／string[]／ExactNumber，題型／Option 歸屬留有 Definition 的 mapper。error 已知 code 與未知 fallback 分開，不丟明細、不靠 message 導航。

presentation 接 `read/action/bootstrap/login/register/latest/statistics` 情境及 callbacks；不更新 User／導航。Login 401、Latest 404、Statistics 403、首次 Form 404 分開；D-12／session 更新留 F3。

錯誤定位介面收送出快照的 path→穩定 key／questionId map：Delta request `questions[0]`、Publish 已保存 Definition index、Answer `answers[0]`／`questions.<questionId>` 為不同 namespace；未知 path 留摘要。F2 驗 map 消費機制，F5／F7／F8 才建立各自 builder map，不能按當前畫面 index 猜題。

### 4.2 Unicode／時間

White_Space helper 採 F0 §7.4 集合，只 trim 頭尾；iterator 計 Code Point，不做 NFC。候選 helper 分 description 空→null、optional 文字 key 空→省略、Password 原樣；Answer builder 留 F5。Zod refinement 共用 helper，不以 UTF-16 maxlength／min/max 擋 emoji。

unit：U+0085／NBSP／U+3000 移除、FEFF／200B 保留、中間空白不合併、😀=1、e＋combining acute=2、Password 頭尾空白原樣及 9／10／128／129 邊界。Email 沿 F0：ASCII trim／lowercase，非 ASCII trim 後交 Server ToLowerInvariant；quoted／Unicode／single-label domain 及真實驗證留 F3。

Datetime 保存 original ISO＋精確 UTC instant（BigInt 100ns ticks，嚴格日期／offset／0～7 位 fraction 驗證），另保存可見台北年月日時分秒。Intl 明確 Asia/Taipei／24 小時制顯示到秒；格式化不回寫。台北輸入檢查完整年月日時分秒及閏日，不用 Date 自動溢位修正；Date 若用於顯示，不能作精確基準比較。真正改時間才輸出秒精度 UTC；清除為 null；改回可見基準復用原 ISO／隱藏 fraction。F2 提供 baseline／候選 helper，F5 決定 PATCH 省略，F6 接 UI。

代表 unit：`2026-10-10T10:30:00.123456Z` 顯示 18:30:00 且未改保留；offset 等值、7 位 fraction 不丟失、改回基準、改為台北 18:31:00→`2026-10-10T10:31:00Z`、跨日／閏日／非法日期／清除。超出可處理精度報契約處理失敗，不截斷；不宣稱 DB 保存 100ns。截止提示不改 Form status，Server 時間仍是權威。

### 4.3 請求 scope／loading／寫入互斥與結果不明

每請求捕捉 page instance／resource key／generation／session revision；離頁、param／session／新 generation 使舊 scope 失效。資料／error／toast／route callback 全驗 scope，舊 finally 不清新 loading token；Abort 不證明回滾。F3 提供 session revision，F2 用注入值驗晚回。

Form ID 共用 management write lease（Draft／Publish／Close／Delete／Visibility），雙擊／另一管理命令不送第二請求，不同 Form 獨立。Create／Profile／Auth／Response 各自 scope。保存 freeze 定義、提交 freeze 答案／替換、Visibility 停用該控制與同 Form 寫入；finally 釋放 lease，結果不明限制獨立保留。

| 狀態轉移 | 機制與可用操作 |
| --- | --- |
| idle／核對完成→pending | 取得 lease、固定送出快照，停用對應輸入／重複命令；失敗取得 lease 不發送 |
| pending→成功／明確失敗 | 可靠成功由 caller 採 Server 值／建 clean 基準；明確失敗保留輸入並按業務 code 限制；finally 結束 loading |
| pending→結果不明 | 已送 write 無可靠結果或 500；Dialog 提示可能完成、保留輸入／原 URL、不自動 retry；結束 loading，保留需核對旗標，即使 model 與舊 baseline 等值亦不解除 |
| 結果不明→核對完成 | 使用者主動核對，可靠 read 且仍屬 current scope；需替換資料時先 dirty 確認、成功採用後才重建基準／解除限制。read 失敗、取消丟棄、stale response 都維持限制 |

F2 提供 policy／reconciliation callbacks，各輪接既有入口：Delta 重讀前鎖保存／發布；Visibility 核對前鎖設定（UI 還原不證明 Server 還原）；Publish／Close／Delete 重讀 status／404；Profile 手動 me；Create 列表核對、再保存提示重複。single 主動 Latest、再送仍受 Server 保護；multiple Latest **不清除未知那次提交的重複風險**，再送需確認。Register／Login 主動登入／重試或 me，Logout 保留 UI 可手動重試；本輪不接這些 API。

### 4.4 Dirty／單次丟棄授權

`useDirtyScope` 接當頁 baseline/current 的語意比較 callback 與待核對旗標；exact number／datetime 語意比較由上述 helper 提供，Editor 完整比較留 F5。初始化／成功建立新基準 clean，改回基準清 dirty；Preview 不註冊正式 dirty。資料生命期只當頁記憶體，卸載清理。

dirty 時加 beforeunload（preventDefault＋相容 returnValue），clean／unmount 移除；SPA leave、自然前後頁與同元件 param update 以原生 window.confirm，取消保持 URL／model／基準且不啟新 read。原頁錯誤畫面／重讀／Latest 替換同樣經顯式 discard callback，不能先毀掉輸入。

丟棄許可綁 scope／dirty revision／action 或 transition ID，只供當次動作與 redirect chain；取消／失敗／完成／新修改／卸載清除。登出／刪除先確認後送 API，成功導向不重問，失敗／不明不豁免下次 nav。Latest 取得候選後才問、取消不套用；harness 驗上述行為。

## 5. 授權開發後必要自測與交付

所有下列程式／Browser 驗證本次 **NOT RUN**，是開發自測安排，不是正式驗收計畫或 AI／人工 PASS。

| 方法／時點 | 目標、選用理由及預期證據 |
| --- | --- |
| 新依賴安裝／npm ci | 授權後新增 lossless-json，記 package／lockfile 及 Node／npm、實際 exit／相容性。若原目錄 EPERM 重現，保留失敗、不停止不明 process 或刪 native remnants；記受阻範圍與可重現證據，不沿用歷史成功當此次 PASS |
| `npm run test:unit` | 先跑 §3 gate，再完成 Unicode／時間、204／Envelope／malformed body、fake timer timeout／abort／零重試、path map、dirty 許可、scope 晚回及 lease。純轉換／競態風險適合 Vitest；測固定外部規則，不鏡像內部組織 |
| `npm run lint`／`npm run typecheck`／`npm run build` | 本輪交付必要；typecheck 沿 F1 Nuxt checker＋strict tools tsc，涵蓋新增 app／test／harness；不得放寬 strict。Browser fixture 自身也須檢查，主 build 不包含 harness 測試頁 |
| `npm run test:e2e -- --config=playwright.f2.config.ts` | 預計使用獨立 F2 config，workers=1、localhost:3000、reuseExistingServer=false；webServer 啟動 `tests/fixtures/f2/browser` 隔離 Nuxt CSR harness（沿 root 組態、輸出隔離到 ignored output）。輸入須 user gesture，觀察真實 beforeunload dialog 的取消／離開、clean 移除、SPA／param／back／單次 redirect 確認、替換取消；晚回不得改新頁 errors／toast／route／loading。另驗 §3 native fetch 路徑及 Action Dialog 關閉／明細。真正瀏覽器行為不能用 unit 代填 |
| fixture／攔截故障 | 合成 UUID／文字與原始 JSON text，明列模擬。network／timeout／500／錯誤 Envelope／延遲回覆只證明前端處理；斷言每次操作 request 次數、輸入保留、解除條件及同 Form 無第二寫入。不使用真實 Cookie／帳密、不改 DB |
| 交付前 diff／文件檢查 | gate／命令結果、README 必要指引、去敏證據、秘密／生成物排除、backend-ref 未改、F2 範圍與 Git 狀態；單一目的提交及 `F2_Development_Report.md`。不無理由重跑 F1 五組模式／generate／全站矩陣 |

harness 隔離載入實際共用程式，主 build 無測試 route／proxy；啟動或型別受阻記 BLOCKED，不省略必要 Browser 項。實機手機／排序／Stars／Preview／長名單人工體驗留對應輪次；真實 Cookie／CORS 留 F3，保存讀回留 F6／F8／F9。正式驗收需另行指定。

完成判準：共用契約／機制及代表案例可 review；精確數值 gate 實際通過，必要 lint／strict typecheck／build／unit／Browser 實際完成且無未解決缺陷；fixture／真實 API、阻塞、歷史失敗與正式驗收狀態分開記錄。若必要項受阻，只交付具體缺口與可用範圍，不宣稱 F2 完成／accepted。開發交付後停於待 code review／後續指令，不自動進正式驗收或 F3。

## 6. 本次規劃交付與停止點

初次規劃交付只新增本計畫，當時未提交，HEAD 沿首頁接手 SHA。Owner 隨後授權提交本計畫；單一目的本機提交的實際 SHA／剩餘 Git 狀態見 Git log 與交付回報。Git／來源／package／組態靜態閱讀及文件檢查不是 gate、相容性或產品執行證據。應用／測試／套件／lockfile／正式規格／backend-ref 未修改；install／npm ci／lint／typecheck／build／unit／Browser／精確數值 gate／live API／正式 AI 與人工驗收均 **NOT RUN**，未推送／PR／部署。

文件自查：相對檔案連結無缺失、控制字元 0、最終換行及新檔 `git diff --no-index --check` 通過；Git 變更範圍僅本計畫。此為文件檢查，沒有執行 gate。

**F0 accepted；F1 P3 補正已交付，待局部複核及正式驗收，F1 尚未 accepted；F2 計畫待 review，開發未開始；不展開 F3。** 等待本版計畫 review、必要依賴確認與明確開發指令。

## 7. Owner 開發授權與交付（2026-10-11）

以上 v1.0 為原規劃／停止點的歷史紀錄；計畫提交為 `a2599215adbc4cf916d53b7d2fcfeb1c67e212d6`。Owner 隨後明確確認本版 review 通過並授權依此開發、精確數值 gate、必要自測與單一目的提交，未要求 F1 accepted 作為本次先行工作的前置。實作與實際檢查見 [F2 Development Report](F2_Development_Report.md)。本次沒有改變核准的範圍或產品契約。

目前 **F2 開發完成、待 code review**；F1 P3 仍待局部複核及正式驗收、尚未 accepted。正式驗收 NOT RUN；不開始 F3。
