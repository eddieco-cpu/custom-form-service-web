# F7 精簡實作計畫 — Lifecycle、Visibility 與 Owner 管理

版本：1.1／2026-10-14（Asia/Taipei）。**Owner 已通過 v1.0 review，授權整輪開發、自測與範圍內修正。** v1.1 同步 Owner 的跨寫入舊 GET 隔離要求與正常 API 專用測資授權，直接實作，不另送計畫 review。F6-R1／F6-R2 結案、F6 code review 通過；正式驗收延後、accepted 不變、既有缺口保留。沿用「計畫確認 → 整輪開發、自測與範圍內修正 → 集中 review」。§7 保留原規劃交付歷史。

## 1. 範圍、來源與接手觀察

承接 F6，接入 Publish／Close／Delete／result-visibility／respondent-count 及 Clipboard 分享；完成 Draft edit 與 Published／Closed Form 頁的 Owner 管理和唯讀定義。回應總計畫 §7.1 項目 4，並承接 3／5／6／7 的權限、停止點、桌機／手機與驗證責任。正式填答／Submit／Latest 留 F8，Statistics 內容與存取整合留 F9；本輪統計入口只驗目的 URL／導航，不宣稱統計功能完成。

| 引用來源 | 本輪章節／版本 |
| --- | --- |
| [AGENTS](../../AGENTS.md)、[development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫](V1_Frontend_Implementation_Plan.md) | AGENTS v1.1；skill 目前 tracked 版；總計畫 v1.3 §5 F7、§7／§7.1、§8.1～8.3 及最新 §9 進度；Owner 本次授權優先 |
| 前端 [00](../specs/00-v1-frontend-overview.md)／[01](../specs/01-pages-routing-and-access.md) | v1.0／2026-10-10；00 §3～5，01 §7～10：角色、狀態、入口與 push／replace |
| 前端 [02](../specs/02-form-editor-and-lifecycle.md)／[04](../specs/04-auth-state-and-error-handling.md) | 02 v1.1 §1／3／4／7／10／12；04 v1.0 §4～5／7～12：定義與政策分離、dirty、錯誤、核對與互斥 |
| 前端 [03](../specs/03-response-and-statistics.md)／[05](../specs/05-ui-and-interaction.md)／[06](../specs/06-technical-architecture.md)／[07](../specs/07-api-integration-map.md) | 03 v1.0 §1／9／12；05 v1.0 §3～10；06 v1.1 §4～5／8～11；07 v1.0 §1～3／6／9～10：Count／分享、Dialog、精度與 DTO |
| 正式後端：唯讀 [SNAPSHOT](../../backend-ref/SNAPSHOT.md) | 2026-10-11／`7591633137c5a6f57c1fce8e1ba19ab394015880`；[00](../../backend-ref/docs/specs/00-v1-overview.md) v1.1 §4～5／9；[01](../../backend-ref/docs/specs/01-v1-domain-specification.md) v1.1 FORM-03～10、STA-01～02、CON-01～03；[02](../../backend-ref/docs/specs/02-v1-database-specification.md) v1.0 §7／12／15 |
| 正式後端 API／錯誤／限制 | [03a](../../backend-ref/docs/specs/03a-v1-api-contract-common.md) v1.0 §2～6／9；[03b](../../backend-ref/docs/specs/03b-v1-api-contract-auth-user-form.md) v1.0 §3.5／7.1／8～9；[03c](../../backend-ref/docs/specs/03c-v1-api-contract-submission-statistics.md) v1.1 §6；[04](../../backend-ref/docs/specs/04-v1-error-catalog.md) v1.0 §2.4／4／6～8；[05](../../backend-ref/docs/specs/05-v1-system-constraints.md) v1.1 §6／8～10／13.3～15 |
| F6 前置／歷史證據 | [F6 計畫 v1.1](F6_Implementation_Plan.md)、[開發報告](F6_Development_Report.md)、[修正報告](F6_R1_R2_Correction_Report.md)、[局部獨立複核](../review/F6_R1_R2_Correction_ReReview_Report_20261014.md)；結果與缺口沿用，不寫成本次執行 |

- 前端 `C:\Users\user\Desktop\custom-form-service-web`：branch **master**、HEAD **`47dbce558bc628d250911f56af621ba8da2e8093`**，與 Owner 基準一致，編輯前工作樹乾淨。本次沒有重跑 F6 review。
- 本次實測 Node **24.21.0**／npm **11.19.0**；installed／lockfile 核對一致：Nuxt 4.6.1、Nuxt UI 4.11.3、Tailwind 4.3.3、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0、lossless-json 4.3.1。沿用既有 CSR／strict／npm scripts，不新增依賴、Endpoint、BFF 或持久化。
- 快照 manifest **108／108 相符**。依歷史實際位置唯讀核對後端 checkout `C:\Users\user\Desktop\custom-form-service`：master／上述快照 SHA，既存 untracked `SNAPSHOT.md` 未動。磁碟 DLL ProductVersion `1.0.0+7591633137c5a6f57c1fce8e1ba19ab394015880`，SHA256 與 F6 runtime 證據一致；5000 埠仍為 PID 29108／dotnet，自 2026-10-11 19:51:59 台北時間啟動。程序 command-line／assembly 綁定讀取受 PermissionDenied，**本次執行版本對應仍 UNCONFIRMED**，不以磁碟檔案冒充重新確認的 runtime。
- 2026-10-14 **08:51:44～47 台北時間**，唯讀 GET `/health`、`/health/ready`、`/openapi/v1.json` 各 5 秒上限，均 **200**；列 DELETE Form、POST publish／close、PATCH result-visibility、GET respondent-count／statistics。這是 metadata 觀察，**本次沒有業務 API／Cookie／保存讀回證據**，不能推定 R7／R9／R10 真實整合 PASS。DB identity／migration 仍 UNCONFIRMED。

本輪未發現需要改契約的衝突。前端文件的「R10 尚未實作」保留為歷史記錄；快照已記 R10 accepted／R11 結果待 Owner 確認，目前 OpenAPI 有 Statistics 描述。其真實功能留 F9 核對，不以此解除歷史缺口。

## 2. 操作資格、確認與成功後行為

Owner 由目前已確認的 User.id＝FormDetail.userId 判定；另需當頁 Session revision／資源資格有效、未被 API 否定。前端按鈕不是授權證明，Server 按正式 Authentication→解析→存在性→Owner→Lifecycle／Validation 順序判定。

| 狀態／角色 | 本輪入口與條件 |
| --- | --- |
| new、尚無正式 id | 維持 F6 保存草稿／預覽；沒有 Publish／Delete／即時 Visibility／Count／分享 |
| Draft Owner edit | 保存／預覽；Publish 需 clean 定義、可靠基準與發布驗證通過；Delete；Visibility 即時保存。沒有對外分享／統計入口 |
| Published Owner，含已截止 | Close／Delete／Visibility；主動查看不同填答者人數、複製填答連結（03 §9／總計畫 F7 的 Published 分享）；已截止提示不可提交，仍 Published、可 Close，不提前開放統計 |
| Closed Owner | Delete／Visibility、查看統計／複製統計連結；沒有 Close／Publish／定義保存。人數留統計 Root，F7 不另加 Closed Count 按鈕 |
| 非 Owner | Draft 依 API 404；Published／Closed 只有唯讀資訊，沒有管理／Count／複製管理入口。Closed：owner_only 隱藏統計入口，respondents／public 顯示；曾否提交由 F9 Statistics API 判定 |
| 未登入／失效、停用、已刪除 | 沿用 01／04：登入返回或原 URL 停用／找不到；操作中先 Dialog。停用不主動登出；已否定的管理資格不能由舊 User／取消導航恢復 |

| 命令 | 確認／Request | 成功結果 |
| --- | --- | --- |
| Publish | 提示發布後定義凍結、僅 Visibility 可另調整；確認才 POST publish，**無 Body**。有 dirty 顯示「請先保存後再發布」，不以丟棄代替保存，不自動串連 PATCH＋Publish | 驗 decoded 200／同 id／Published，採成功 DTO、clean、toast「表單已發布」，**push** `/forms/{id}`；沒有定義修改入口 |
| Close | 提示停止收件且不能重新開啟；確認才 POST close，**無 Body**；截止不是禁用原因 | 採 200／Closed DTO，toast「表單已關閉」，**留 Form 頁**；切換統計／統計分享入口，撤下 Published Count／填答分享 |
| Delete | 正式 id、Owner、三狀態；提示刪除後無法查看／恢復。dirty／待核對資料時同一 Dialog 加上丟棄內容文案；取消／× 不送 DELETE | **204 不解析 JSON**，清當頁資源／錯誤／Count／確認狀態，toast「表單已刪除」，**replace** `/forms`；不重問 dirty、不留返回已刪頁 |
| Visibility | 三個 radio 初始化真實值，標示「切換後立即保存」；不另加確認／套用。切換即專用 PATCH `{resultVisibility}`，相同已確認值不送 | 回應值／metadata 局部合併（§4），toast「結果可見性已更新」，留原頁 |

確認 Dialog 沿用 05 §7：確認／取消、× 視為取消，pending 不重複確認；焦點／背景捲動沿用既有 helper。確認送出前重驗 Form ID、Session、狀態、dirty／內容 revision，失效就撤銷，不執行舊確認。

**一次丟棄授權。** Delete 的單一確認通過後，讓 DirtyScope 的 `authorizeAction` 接受此既有確認結果，記住當次內容 revision，避免再呼叫 window.confirm。送出後凍結可編輯資料；204 且 context／permit 仍有效，才清頁面資料及 dirty，再 replace 清單，因此成功導航不重問。失敗／unknown／取消／Session 改變即清 permit，保留輸入，後續普通導航仍要確認；導航拒絕也清授權，已確認 204 的資源不得恢復成可寫。不提前清 model／baseline，不設永久 bypass。

桌機沿用 editor 960px／Form 800px；Draft 底部加入保存／發布及原因，預覽／刪除分開。手機沿用固定主要操作區與 safe-area，根設定的 Visibility radio、核對入口、Count 與完整分享 URL 可換行；Published／Closed 不展示可誤認為可保存的定義輸入。

## 3. 寫入、錯誤與結果不明

保存沿用 F6 Delta；發布使用**最後成功 GET／PATCH 的完整已保存 baseline 快照**。確認前與實際送出前執行 F5 `validatePublish`，本機時計只提前提示，Server Time 最終裁定。`publishPathMap(saved)` 按完整已保存 Question／Option 順序映射，不能用前一次 Delta map：例如只 PATCH 第三題後，Publish `questions[2].config.max` 仍指第三題；稀疏 sortOrder／Options 亦按保存後 DTO 順序。400 `FORM_NOT_PUBLISHABLE`／其他驗證明細留 editor；可定位者聚焦，未知／已無控制的 path 完整留摘要，不偷偷補值或保存。

**互斥。** 重用同 App WriteCoordinator，以正規化 `form:{uuid}` 作唯一 lease，涵蓋 Draft 保存、Publish／Close、Visibility、Delete；各 policy 的 loading 合併為同 Form pending，UI 與 controller 都攔重送，不只停一個按鈕。保存／Publish／Delete 凍結定義；Visibility pending 至少停政策控制及全部寫入命令，其他定義輸入可繼續、成功合併使用回應時的當前 model。Count 用獨立 read scope，不讓 GET 取消寫入；資源重讀／資格核對在寫入 pending 時不可採用舊資料。每個 scope 在 finally 結束 loading；換 ID／離頁／Session 改變使晚回失效，不產生舊 toast／導航／資料更新。Abort 不代表 Server 回滾；跨分頁交易先後仍由後端處理。

| 結果／限制 | 可見核對入口與解除條件 |
| --- | --- |
| 明確 4xx 驗證失敗 | Dialog＋欄位／摘要；保留輸入與基準，修正後手動操作；Visibility 還原最後成功值 |
| Delta unknown（承接 F6） | 停保存／Publish；「重新載入表單」經 dirty 確認、可靠 current GET／採用完整 DTO 才重建 IDs／baseline／解除，不因改回舊值解除 |
| Publish unknown | 停 Publish 及 Draft 保存，定義可能已凍結；重讀核對真實 status，仍 Draft 才可重新確認發布，Published／Closed 依 01 導合法頁。Close unknown 暫停 Close，重讀後依真實 status 顯示合法操作 |
| Visibility unknown | 還原最後已知成功值但標示「待重新確認」，暫停該設定寫入；其他操作仍需其各自狀態／資格。手動重新載入；dirty 取消時保留定義與鎖，確認並採用可靠完整 GET 後重建基準與真實政策，不將畫面還原當 Server 還原 |
| Delete unknown | 暫停該 Form 寫入，存在性尚未確認；手動重讀。200 採用可靠現況後按新資格操作；正式 `FORM_NOT_FOUND` 404 是目前不存在，經必要丟棄確認才切原 URL 找不到，不自動再 DELETE／跳清單／發成功 toast |
| 重新核對取消／失敗／stale | 不清未知標記／不換 baseline。loading 結束後可重試核對；待核對也納入 dirty guard，不因畫面值與舊基準相同而解除 |

unknown 包含已送出的 network／timeout、500 及無法可靠解碼的回應；未送出的本地驗證錯誤不假稱 unknown。未知政策與互鎖由既有 OperationState 補足本輪必要的 Publish→Delta／Delete 存在性限制；Visibility 成功的局部合併**不得呼叫全 Form reconciled**，也不能解除另一操作的未知鎖。可靠手動完整 GET 的採用才解除相應共享 gate；Delete 的 current 正式 404 只處理資源不存在。

409 `FORM_ALREADY_PUBLISHED`／`FORM_ALREADY_CLOSED`／`FORM_INVALID_STATE_TRANSITION`、`FORM_NOT_EDITABLE`：Dialog 後讀最新候選，不重送、不把 conflict 當先前成功；取代 dirty／導向先確認，取消保留可查看／複製內容，已知不合法寫入停用。403 `FORM_ACCESS_DENIED` 撤下管理資格；普通資源 GET 不能只依舊 User.id 恢復，沿用 F6「核對登入與資格」明確 GET me＋Form 重建當前身份／權限。操作 404 同樣先 Dialog／丟棄確認，取消留內容並禁失效寫入。

三種 Auth 401 共用操作 Dialog→關閉／×→dirty 確認→login redirect；Esc／遮罩不關。取消離頁保留本地內容但不恢復寫入資格。`AUTH_USER_DISABLED` 保留 User／登出與輸入，只呈現錯誤，不建立全域 User status 封鎖。這些分支亦適用 Count；其 network／500 是讀取失敗，不能當成未知寫入。

## 4. Visibility 合併、Count 與分享

**合併白名單。** editor 的新選擇獨立於 Definition 修改：保留 `lastConfirmedVisibility`／pending 值。成功後在目前 `session.definition` 與不可變 `baseline.definition` **僅替換 resultVisibility 及 metadata（status、creatorDisplayName、createdAt、updatedAt；id／userId 必須匹配）**；baseline 用既有 exact clone／freeze helper 建新物件。title、description、responseMode／Identity、deadline 原精度／輸入、Questions／Options／config／keys／IDs／排序及原保存基準均不取回應 Definition 覆蓋。一般 Draft PATCH 仍不帶 resultVisibility。

代表例：已保存 A，使用者改成 B 並新增本地題目；Visibility pending 時再改成 C；回應仍含 A，成功後畫面保留 C／本地題目，baseline 定義仍 A，兩邊政策／metadata 更新，dirty 維持，後續 Delta 只送真正定義差異。只切政策時定義仍 clean，失敗仍保留 B／C；no-op 回應不得自行改 updatedAt。回應 status 若揭露外部 Publish／Close，立即停用不合法定義寫入、保留本地內容，經明確重讀／丟棄確認才換畫面，不因政策成功偷偷丟棄 dirty。全頁 Form DTO 同樣先檢查 scope；本輪唯讀頁可採可靠 DTO，未來答案 model 的取代留 F8。

**Count。** 只在 Owner Published 主動按「查看填答人數」才 GET，pending 防重複，成功顯示「不同填答者人數」與這次取得值（0 也是成功），再次按才重查，不輪詢／不以清單值冒充本次查詢。刷新失敗保留先前值並標示未更新；離頁／換 Session／Close 後晚回不更新。API 三狀態皆可、multiple 同人多份仍一人；service／契約案例可驗 Draft 0 與 Closed，UI 入口按 §2；不讀他人答卷或自行加總 Response／Options。

**分享。** Published 複製 `window.location.origin + /forms/{id}`，標明需登入；已截止仍顯示截止提示。Closed 複製 `/forms/{id}/statistics`，旁邊依已確認政策顯示「僅建立者／建立者及填答者／所有人」，待核對時不把資格說明當最新。呼叫 Clipboard 成功才 toast；拒絕／不支援時提供可選取完整 URL 及手動複製，URL 保留至取消／換資源，不用假成功。Draft／new 無分享。Closed Visibility 成功即更新資格說明／入口，不另呼叫 Statistics；分享不授權他人存取。

## 5. 預計檔案與單輪工程順序

| 預計位置 | 具體責任 |
| --- | --- |
| `app/services/form.ts`、`app/domain/api/decoders.ts`（必要型別沿用 form／response） | 新增四種管理寫入與 Count；Publish／Close／Delete 無 Body，Visibility sole field，Delete 204；驗 id／預期 status／Count 非負整數，不以錯 DTO 當成功 |
| `app/domain/form-management.ts`、`app/composables/useFormManagement.ts`（新增） | 角色／狀態資格、確認快照、操作／未知限制、metadata 合併、Count 與 action 錯誤；獨立讀取與寫入 scope；資料仍僅當頁 |
| `app/domain/editor-page.ts`／`operation-state.ts`、`app/composables/useFormEditor.ts`／`useOperationState.ts`／`useDirtyScope.ts` | F6 保存與新管理共用 lease／pending／核對，unknown 納入 guard，刪除單次 permit；不放寬原 Delta／Session gate，不為操作另建持久化 store |
| `app/components/forms/FormEditor.vue`／`FormReadPage.vue`／`FormRootInfo.vue`、`app/composables/useFormDetail.ts` | 接 Owner 操作與反應狀態；Form 頁補唯讀題目／Options，必要拆 `FormDefinitionView.vue`；根設定 readonly／Visibility 例外；loader 不與候選採用競爭 |
| `app/components/forms/FormManagement.vue`／`ResultVisibilityControl.vue`（新增）、既有 focus／error helper | 可共用確認 Dialog、radio、Count、分享 fallback；沿用 Error Dialog／聚焦，Publish mapping 重用 `app/domain/error-path.ts`，不建第二套 index 規則 |
| `tests/unit/f7-form-management.spec.ts`、`tests/e2e/f7-browser.spec.ts`／`f7-live.spec.ts`、`playwright.f7.config.ts`（開發時新增） | §6 有風險行為；必要 harness 另 strict；沿用 F6 精確 network diagnostics 宣告／配對，不按觀察結果反填 allowances |

計畫核准且明確開始後：service／controller／合併與資格 → Editor／Form 管理 UI、單次確認／核對 → fixture 與真實自測 → 範圍內修正／受影響回歸 → 整輪交付集中 review；以上是工程順序，沒有中途人工測試計畫 gate。

## 6. 必要開發自測、前置與完成條件

以下均是**未來 F7 開發自測安排，本次 NOT RUN**。Cookie／CORS、真正狀態保存／讀回需 Browser＋真實 API；模擬單列，不解除真實缺口。

| 方法／時點 | 必要目標及選用理由 |
| --- | --- |
| controller 完成：Vitest | 狀態／角色資格；保存與發布分離／clean gate；Publish 完整 baseline index 與未知 path；同 Form lease／pending；未知限制、取消／失敗重讀不解除／current 採用才解除；Visibility C／A 局部合併、config／keys／數值／deadline 不變；Delete 一次 permit／失敗撤銷；ID／Session 晚回隔離。驗外部可觀察轉移，不寫樣式鏡像 |
| UI 完成：fresh built Browser＋攔截／必要 harness | **B01** dirty 擋 Publish、先保存再確認、取消／×零寫入、成功 push／凍結；**B02** Close 正常／已截止、留頁與 Closed 入口；**B03** 三態 Delete、dirty 一次確認、取消／失敗／unknown 不清資料、204 replace 且不重問；**B04** 三態 Visibility、pending 定義繼續編輯不丟、明確失敗／unknown 還原但鎖；**B05** 互斥／快速點擊／no-op／重讀；**B06** 完整 Publish errors 定位與衝突／403／404 候選、取消保留；**B07** Auth 三碼關閉／×／dirty／disabled、SPA／同元件換 ID／Session／beforeunload；**B08** Count 零／非零／再次主動讀／讀取失敗、不輪詢；**B09** 分享成功／Clipboard 拒絕／缺 API 與完整 URL、三政策說明；桌機 1440×900／手機 390×844 及 320px 窄屏，確認管理與長 URL 可達 |
| 真實 Browser＋API：必要正常流程 | **L01** 專用合成 Draft：dirty 擋發布→真實保存／獨立 GET→Publish／獨立 GET，status 及凍結定義一致；**L02** Draft／Published／Closed 的三種 Visibility 切換（用資源安排覆蓋），Dirty 定義保留，獨立 GET 確認政策／metadata；**L03** 普通 Published 與自然到期 Published 均 Close，獨立 GET 為 Closed、留頁；**L04** 專用三態資源 Delete→204／清單排除／獨立 GET 404，dirty 只問一次；**L05** multiple 保留測資 Count `0→1→1→2`（同人兩次＋另一人一次）、重查而非輪詢；**L06** 兩個 Active 帳號對比管理入口／權限、清 Cookie 真實 AUTH_REQUIRED 與登入返回，資格重建。記 credentialed fetch、Cookie reload／CORS、實際版本與 IDs，不靠 unit 推定 |
| 桌機鍵盤／可用實機自測 | Dialog 確認／取消／焦點回復、radio 鍵盤、手機固定操作區／safe-area、分享完整 URL 選取；有設備才做實機觸控／軟鍵盤。Chromium viewport 不等同實機；Owner 人工驗收仍 NOT RUN |

授權開發後必要 `npm run lint`、`npm run typecheck`（Nuxt＋tools）、`npm run build`、`git diff --check`；`npm run test:unit -- tests/unit/f7-form-management.spec.ts tests/unit/f6-editor-page.spec.ts tests/unit/f5-definition-request.spec.ts tests/unit/f5-config-omission.spec.ts tests/unit/scoped-state.spec.ts tests/unit/f4-form-read.spec.ts tests/unit/api-client.spec.ts`，補受影響 Publish／exact adapter 案例，不重複全 F5。Browser 用 `npm run test:e2e -- --config=playwright.f7.config.ts`，預計 built／fixture／live 分別記錄，live 無 API 攔截；獨立 harness 另 Vue strict。沿用 30 秒 API timeout 與 F0／F1 瀏覽器基準，記實際 binary；Chrome／Edge 做代表管理／分享 smoke，可用性不足明列。Firefox／WebKit、負載、後端 DB／併行重驗不屬本輪必要範圍；npm ci／audit 不因本輪無依賴變更重跑，原限制保留。

| 前置／既有缺口 | 對 F7 的具體影響與安排 |
| --- | --- |
| R7／R9 真實可用性、runtime／DB 版本 | 開發串接前重查 readiness 與可取得的實際版本；本次 metadata 不是操作證據。不可用則 L01～L06 相關項 BLOCKED，可完成 fixture；runtime 綁定／DB identity／migration 未確認繼續列 UNCONFIRMED，不 reset DB／volume 或 SQL 修資料 |
| 合成角色／三態與刪除資源 | [F6 三次帳號／五份 Draft 索引](evidence/F6_20261013/retained-live-runs.json)是歷史保留資料，憑證可用性本次未確認；保留原件與資源不作破壞性測資。開發授權後用安全注入的合成帳號或普通註冊／登入、正式 Create／Publish／Close 準備**本輪專用**資源；Delete 只作用於明列 F7 刪除案例資源，保留 soft-delete／IDs，不做清理硬刪 |
| 非 Owner／換帳號／Published／Closed／已刪除缺口 | F7 可透過上述正常 API 安排兩個 Active 帳號與專用資源，取得本輪真實 L01～L06 證據後逐案標更新；未執行前原缺口仍保留。不把新 fixture 或少量 Form 等同解除所有歷史特殊狀態／≥11 或 21 筆列表缺口 |
| 到期與 Count 去重測資 | 以未來短期限正常 Draft 保存／發布，自然到期後 Close，記 Server 讀回與時點，不調系統時計／DB。Count 需 multiple、全題 optional 的專用 Published，兩個 Active 填答者；以正式 Response API 預備同人兩份／另一人一份或使用已核對保留資料，僅為 F7 Count 測資，不實作 F8 UI。未具備則 L03 到期／L05 BLOCKED，不能以 0 人 PASS 替代去重 |
| 真實 invalid／expired／disabled、故障／unknown commit | 仍需已同意受控安排；不造簽 Token、不 SQL 改帳號、不停不明服務。未具備真實分支 BLOCKED；攔截 network／500／timeout／晚回只證明前端處理，不能宣稱 Server commit 故障已測。正常清 Cookie 案例不解除其餘三種 Auth 缺口 |
| 實機／100 星／軟鍵盤／safe-area | 原 F6 實機缺口保留；F7 新管理區實機可達性受相同設備前置影響。必要 Browser 若 binary／3000 埠不可用記 BLOCKED；缺實機項 NOT RUN，不擴成重新驗完整 Renderer 或代填人工 PASS |
| F8／F9 尚未開發、正式驗收延後 | 本輪不送 UI Response／Latest 或渲染 Statistics。Closed 入口／分享只驗 link 與資格說明，真實統計頁成功／權限矩陣留 F9；F7 自測／review 不更新 accepted 或代填正式 AI／人工結果 |

證據分 fixture／真實 API，保存事先預期、實際 method／path／status／次數、獨立 GET／清單讀回、必要合成畫面、dirty／鎖／導航與版本；保留首次 FAIL 及受影響重測。原 wire／含憑證 artifact 留 ignored 本機且檢查內容，提交去敏摘要，不含密碼／Cookie／Token／敏感個資。只管理自己啟動的前端服務，`reuseExistingServer=false`，不停止既有後端。

完成判準：上述範圍接實際頁面，確認／dirty／成功導航、metadata 合併、未知核對與資格撤銷符合來源；必要工程／受影響 unit／Browser 通過，真實 L01～L06 逐案有證據或明列 BLOCKED／NOT RUN。前置缺失不改列不適用，也不以 fixture 替代整合。交付 `F7_Development_Report.md`、必要去敏證據與進度，授權開發後按 AGENTS 作單一目的本機提交，停於「F7 開發完成、待集中 review」；有缺口時明列完成範圍與待真實整合。

## 7. 本次交付與停止點

本次只新增本計畫、追加 README 與總計畫進度；產品／tests／依賴／backend-ref／規格／AGENTS／skills／歷史報告及證據不修改。實際 Git／runtime／manifest／唯讀 metadata 觀察見§1；文件連結、格式、diff 與歷史保護另作交付核對，不冒稱產品測試。

本次文件核對 **PASS**：三份文件共 126 個本機連結可解析，表格欄數、code fence、控制字元、末尾換行與空白檢查通過；README／總計畫移除本次追加後，歷史文字一致。`git diff --check` 通過，產品／測試／依賴／正式規格／後端快照／歷史報告及證據的受保護路徑 diff 為 exit 0；Git 剩餘變更僅這三份文件。

本次 install／lint／typecheck／build／unit／Browser／業務 API 讀寫／DB 操作／正式 AI 與人工驗收均 **NOT RUN**；沒有本機提交，HEAD 維持接手基準，文件修改留工作樹供 review。**停止於「F7 計畫待 Owner review」**；尚不開發、不推送、不展開 F8，正式驗收延後、accepted 不變、既有缺口保留。

## 8. Owner 開發授權補充

跨寫入的 GET 沿用 scope／revision：同 Form 的 WriteCoordinator 每次取得寫入 lease 即推進 revision；Form 重讀、GET me＋Form 資格核對、Count 與候選 GET 在開始時捕捉 revision／idle。開始後只要發生寫入，該 GET 即永久失效，pending 結束不能恢復；寫入期間開始的 GET 亦不能建立可靠基準。採用 status／Visibility／baseline 或 reconcile 之前同時核對 request scope、Session、寫入 revision 及丟棄 permit。補驗寫入成功、unknown、資格核對兩段 GET、pending 結束後晚回與換 ID／Session，不擴成另一套版本衝突功能。

Owner 授權用正常 API 建立本輪專用合成帳號／Form／Response 測資；Delete 僅作用於明列 F7 專用刪除資源，歷史帳號／Forms／證據保留。整輪完成交付 F7_Development_Report.md、去敏證據與進度，分列 fixture／真實 API、BLOCKED／NOT RUN，保留首次 FAIL／重測，依 AGENTS 本機提交；停於「F7 開發完成、待集中 review」，不推送、不展開 F8。

實作時依 04 §9 將已否定的同 Form 管理資格留在 App 共用 coordinator，綁定 Session revision；普通 Form 重讀與 SPA 返回不能解除。僅新的明確 GET me＋成功採用的 Form GET／新的已確認 Session，或 App 完整重啟重新核對，可恢復；資格否定亦推進讀取 revision。這是既定資格撤回的落實，驗證時涵蓋保留 DTO 但 Form GET 失敗的情況。
