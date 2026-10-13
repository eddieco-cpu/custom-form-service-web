# F6 實作計畫 — Editor UI、Create／Draft 保存與 Preview

版本：1.0／2026-10-13（Asia/Taipei）。**F6 計畫待 Owner review；本次尚不開發。** Owner 已確認 F5-R1 結案、F5 code review 通過；正式驗收維持延後，F1～F5 accepted 不變。本輪沿用「計畫確認 → 整輪開發、自測與範圍內修正 → 集中 review」，不新增開發測試計畫核准關卡。

## 1. 目標、範圍與來源

承接已 review 的 F5 Domain，完成 `/forms/new` 與 Owner Draft edit 的根設定、五題型／config、label-only Options、題目／選項排序、Create／Draft 保存、dirty／錯誤定位，以及供 Preview／F8 共用的 input／readonly Renderer。Preview 使用當下未保存定義的獨立快照，不呼叫 Response API。

依 [總計畫](V1_Frontend_Implementation_Plan.md) v1.3 §5 F6、§7／§7.1／§8.1；本輪直接回答工程提醒 6／8，並承接 1～5／7／9 的既有機制與驗證責任。參照 [AGENTS](../../AGENTS.md) v1.1 與 repo [development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)。

| 來源／版本 | 本輪使用章節 |
| --- | --- |
| 前端 [00](../specs/00-v1-frontend-overview.md) v1.0、[01](../specs/01-pages-routing-and-access.md) v1.0（2026-10-10） | 00 §3～5 範圍；01 §1／§7～10 Auth、Owner／status、push／replace 與資料生命期 |
| 前端 [02](../specs/02-form-editor-and-lifecycle.md) v1.1 | §1～3／§5～11：初值、config／variant、Draft、切換、排序、Delta、Preview；§4／§12 僅作 F7 邊界 |
| 前端 [03](../specs/03-response-and-statistics.md) v1.0、[05](../specs/05-ui-and-interaction.md) v1.0 | 03 §5～7 五題型、未作答／0、Stars／Range；05 §1～7／§9～10 版型、手機、驗證、時間、Dialog、readonly |
| 前端 [04](../specs/04-auth-state-and-error-handling.md) v1.0、[06](../specs/06-technical-architecture.md) v1.1、[07](../specs/07-api-integration-map.md) v1.0 | 04 §4～5／§7～12；06 §4～11；07 §1／§3／§5／§9～10：scope、保存基準、精度、離頁、結果不明與錯誤 path |
| [F5 計畫](F5_Implementation_Plan.md)／[開發報告](F5_Development_Report.md)、[F5-R1 修正](F5_R1_Correction_Report.md)／[獨立複核](../review/F5_R1_Correction_ReReview_Report_20261013.md) | 使用目前 HEAD 的 Domain；合法 config undefined／省略一致，非法 null／未知 key 仍拒絕，原失敗紀錄保留 |
| 正式後端：唯讀 [SNAPSHOT](../../backend-ref/SNAPSHOT.md)，2026-10-11／`7591633137c5a6f57c1fce8e1ba19ab394015880` | [00](../../backend-ref/docs/specs/00-v1-overview.md) v1.1／[01](../../backend-ref/docs/specs/01-v1-domain-specification.md) v1.1 FORM-01～07、QST、SUB-02～03；[02](../../backend-ref/docs/specs/02-v1-database-specification.md) v1.0 §3／§7～9；[03a](../../backend-ref/docs/specs/03a-v1-api-contract-common.md) v1.0 §2～6、[03b](../../backend-ref/docs/specs/03b-v1-api-contract-auth-user-form.md) v1.0 §6.1／§7.1～7.2；[03c](../../backend-ref/docs/specs/03c-v1-api-contract-submission-statistics.md) v1.1 §3.2；[04](../../backend-ref/docs/specs/04-v1-error-catalog.md) v1.0 §2.4／§6～8；[05](../../backend-ref/docs/specs/05-v1-system-constraints.md) v1.1 §10～13 |

業務語意引用上述契約，不另建規則。本次未發現阻擋 F6 的契約衝突。前端舊文件的「R10 尚未實作」是歷史狀態，依 F0 與快照已辨識為過時記錄；快照記錄 R10 accepted／R11 結果待 Owner 確認，不代表本次 live Statistics 已驗證。

**Round 邊界。** 既有 Visibility 先唯讀呈現 API 真實值，專用即時 PATCH、Publish／Close／Delete／Count／分享留 F7；本輪不提供可誤點的管理命令。new 的 Visibility 必選並隨 Create 保存。正式填答／提交／Latest／knownSubmitted 留 F8，Statistics 留 F9。F6 只交付 Renderer 的 readonly 能力與合成展示，不接 Latest。沿用 Nuxt CSR／strict／Nuxt UI／Tailwind，不新增 Endpoint、BFF、持久化或跨頁恢復。

## 2. 接手基準與前置判讀

- 前端目錄：`C:\Users\user\Desktop\custom-form-service-web`；**master／`0a8ceeb560b06a7ca2f847f019f8894cd346bce0`，接手工作樹乾淨**，與 Owner 指定一致。F5-R1／F5 review 狀態同時由 Owner 本次確認與已提交複核支持；不是本次重新執行 review。
- 本次實測 Node **24.21.0**、npm **11.19.0**；安裝目錄與 lockfile 對應版本一致：Nuxt 4.6.1、Nuxt UI 4.11.3、Tailwind 4.3.3、vue-draggable-plus 0.6.1、Zod 4.6.5、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0、lossless-json 4.3.1。預計沿用，沒有安裝／升級或改 lockfile。
- 本次後端 manifest **108／108 hash 相符**；僅讀唯讀快照。2026-10-13 **19:34:14 台北時間**起，以各 5 秒上限 GET `/health`、`/health/ready`、`/openapi/v1.json`，均 **200**。OpenAPI 3.1.1／info.version 1.0.0，列 `/api/v1/forms` POST／GET、`/api/v1/forms/{formId}` GET／PATCH／DELETE 及 Statistics GET。這是 metadata／readiness 觀察，沒有 Cookie 或業務保存證據。
- live 後端 checkout 路徑／Git SHA／執行組態版本及 DB identity／migration 仍 **UNCONFIRMED**。不假定服務與快照同 commit；開發串接前重新記錄可取得的版本，無法取得的項目仍明列，不用 OpenAPI 的 1.0.0 冒充 Git SHA。
- F2 精確數值 gate／dirty／寫入政策與 F3 Auth／F4 loader 可承接；歷史 F5／F2 unit 225／225、lint／strict typecheck／build PASS 見複核，**本次未重跑，不列本次 PASS**。真實 R5／R6 Create／PATCH／GET 保存讀回尚未執行；帳號／保留資料與特殊狀態前置見 §8。

## 3. 桌機／手機配置與共用呈現

### 3.1 Editor 局部線框

桌機 Header 沿用 64px；內容置中最大 960px。根設定區在寬度足夠時分兩欄，題目維持整張卡片，不做題目側欄或隱藏根設定。

```text
┌ 共用 Header：建立表單／我的表單／個人資訊／首頁／Avatar ┐
│ 建立／編輯表單  [草稿]             [預覽] [保存草稿／保存] │
│ 建立者：目前名稱  未保存提示／已保存資訊／待核對提示        │
│ title、description                                     │
│ responseMode、responseIdentity │ 截止日期時間（台北）      │
│ Visibility：new 三選必選／edit 真實值唯讀＋F7 接入提示     │
│ 正式 id／建立／更新時間：edit 次要唯讀資訊；new 尚未產生   │
│ 欄位錯誤摘要 → 點擊定位實際控制                          │
│ 題目卡：手柄／題號、題型、↑↓、刪題                       │
│ title、description、required、config                    │
│ Choice：Option 手柄、label、↑↓、刪除、增加選項           │
│ [新增題目]                                              │
└────────────────────────────────────────────────────────┘
```

手機沿用 56px Header、左右各 16px；根設定單欄，題型、上下移動、刪除可換行，各必要控制完整顯示。底部固定保存區，內容預留實際操作區高度＋`env(safe-area-inset-bottom)`；new／edit 在 F6 都只有保存，F7 才接 edit 發布。Preview 在頁首／次要操作區可達；刪題留題目卡，Form 刪除留 F7。

```text
┌ 選單／Header／Avatar ┐
│ 建立／編輯表單 [草稿]│
│ 建立者／dirty 提示   │
│ 根設定（全部單欄）   │
│ Visibility／唯讀說明 │
│ [預覽] [重新載入]＊  │
│ 錯誤摘要／欄位訊息   │
│ 題目卡＋config       │
│ Options label＋↑↓    │
│ [新增題目]           │
│ 操作區及 safe-area 留白│
├ 固定 [保存草稿／保存] ┤
└─────────────────────┘
＊重新載入只用於既有正式 id；new 未保存／Create 結果不明走列表核對。
```

Visibility 的共用根設定元件預留 F7 模式：radio 附「切換立即保存，與定義保存分開」提示、該控制 loading／失敗還原／待核對文字；**本輪 edit 只顯示值與尚待 F7 接入的說明，不呈現已可即時保存的錯覺**。將來回完整 DTO 只能合併該設定與 metadata，不能覆蓋 dirty 定義；F6 定義 PATCH 不含 resultVisibility。

欄位與題目有穩定 key／label／錯誤關聯；首錯聚焦且捲動避開固定 Header／底部操作區。長標題、Option label、UUID 與保留換行的 description 以一般文字完整換行；不當 HTML 執行，不靠截斷處理溢位。保存中的 disabled／loading 有可讀提示。

### 3.2 Renderer／Preview 局部線框

```text
┌ 預覽                         × ┐
│ title／建立者／設定摘要          │ ← 標題與關閉保持可達
├─────────────────────────────────┤
│ 題目 1／必填標示／description    │
│ text／number／Choice 試填控制     │ ← Body 獨立捲動
│ Stars：每列 10 顆＋0 分 radio    │
│ Range：尚未作答／目前 N 分       │
│ 空內容／缺 config 的呈現提示     │
├─────────────────────────────────┤
│                    [關閉預覽]   │
└─────────────────────────────────┘
```

桌機固定 90vw × 90vh；手機寬 `calc(100vw - 4px)`，高先宣告 `calc(100vh - 4px)` 再由 `calc(100dvh - 4px)` 覆寫，四邊約各 2px。手機螢幕鍵盤出現時 Body 可捲動至輸入，標題／底部關閉仍可達，必要時使用當頁 visual viewport 尺寸調整可見區，維持 Dialog，不另開 URL。

Preview 鎖背景捲動、focus trap；關閉／×／遮罩皆可關，Esc 不關，關閉回觸發按鈕。每次開啟建立新 snapshot／空答案，掛載後捲回頂；關閉丟棄試填答案，不問 dirty。題目／title／Option label 空用「（暫無內容）」；無 Options 用「尚未設定選項」；Rating bounds 缺少／矛盾用「尚未設定完整評分範圍」並停用該題。description 空省略、deadline 無值顯示未設定、Visibility 未選顯示尚未選擇；占位文字不寫回 Editor／Request。過去 deadline 不禁止本地試填。

Readonly 使用同一題型／答案模型，顯示完整文字、所選 label、精確數字、分數或尚未作答，不發 update、不提供清除／可誤認為修改的控制。F8 的 Latest 將來只需傳入映射後 model 與 readonly 狀態；本輪以合成答案驗 Renderer，未讀 Latest 或推測提交狀態。

## 4. 檔案責任與 F5 接法

以下為預計檔案，例行拆分可在本輪方案內調整，不另設元件核准關卡。

| 預計檔案 | 具體方案 |
| --- | --- |
| `app/pages/forms/new.vue`、`app/pages/forms/[formId]/edit.vue` | 取代目前頁殼，仍用命名 auth middleware；new 取得真實 User 才呼叫 `createEditor(displayName)`，edit GET 完整 DTO 後判 Owner／Draft。new 進頁不 POST／不 GET Form／不造 id |
| `app/composables/useFormEditor.ts`、`app/domain/editor-page.ts` | composable 管頁面生命期／焦點，controller 管保存／採用候選與可測的錯誤分流；使用 F4 `useFormRead`／`FormReadController` 的讀取與 Auth 機制。Editor session 獨立於 loader 的 data，不直接綁 DTO。初次讀取、手動重讀與背景狀態核對分開 adoption；F4 讀取 contextChanged 清除 data 不得連帶丟掉 dirty 控制 |
| `app/services/form.ts` | 增 Create（POST `/forms`，201）與 Draft PATCH（200），只接受 F5 typed Body、共用 serializer／decoder；PATCH 核對回應 id。採用前再核對目前 User／resource／status；不可可靠採用的已送成功回應走結果不明，不以候選造基準 |
| `app/components/forms/FormEditor.vue`、`EditorRootSettings.vue`、`QuestionEditor.vue`、`OptionEditor.vue`、`EditorActions.vue` | 根欄位與五題型控制、readonly metadata、new Visibility；Options 只開 label，value 不可改。UForm 整合既有 Zod／F5 issues，不另寫驗證契約。變更呼叫 `add/removeQuestion`、`add/removeOption`、`changeQuestionType`／`changeVariant` |
| `app/components/forms/FormRenderer.vue`、`FormPreviewDialog.vue`；`app/components/questions/` 題型輸入、`RatingStars.vue`、`RatingRange.vue`；`app/domain/rating-input.ts` | Renderer 接 F5 `AnswerDefinition`／`AnswerModel`、readonly／disabled／Preview mode 與 issues；沒有 API／路由／dirty 副作用。小型 Rating helper 處理未操作／有效操作／清除的答案轉移，供元件與 unit 共用，實際 pointer／鍵盤事件另由 Browser 驗。Preview 用 `editorSnapshot`→`answerDefinition`→`emptyAnswers`，不經 Create／Answer request builder 取得顯示資料 |
| `app/components/forms/FormReadPage.vue`、既有 `FormRootInfo.vue`／feedback | 保留 F4 正式 Form 頁行為；移除 edit 舊殼文字，必要共用根資訊／欄位摘要。`locateDetails`＋送出 map 對實際 control key 定位；ActionErrorDialog／useDialogFocus 沿用，不拋棄未知明細 |
| `tests/unit/f6-editor-page.spec.ts`、必要 `f6-rating-input.spec.ts`；`tests/fixtures/f6/`、`tests/e2e/f6-browser.spec.ts`、`f6-live.spec.ts`、`playwright.f6.config.ts` | unit 驗 controller 的外部轉移／採用條件與必要評分事件邏輯；Browser 驗實際 app 互動。fixture／built／live 模式分開結果及產物，fixture 可沿 F4 薄 harness 注入測試 session，不能複製另一套 Editor |

**控制綁定。** number config／答案都保留 raw string，不用 `v-model.number`、Number coercion 或 HTML 預設 step 限制；數字鍵盤提示可用 inputmode，科學記號仍能輸入。Deadline 控制形成完整台北日期＋時間到秒，再交既有 helper；初始化只改可見格式、不改 `deadlineSource`。空可選 config 用空輸入／省略，非法非空仍留 raw 且擋保存；description 清除用 null。既有省略 variant 顯示 effective 值但不寫回；不為 Rating 缺 bounds 補 1／5。F5-R1 的 undefined／null／未知 key 語意維持。

**排序／切換。** vue-draggable-plus 只允許手柄啟動；拖完取得完整 key 順序交 F5 reorder，不跨題拖移 Options。上下移動使用同一入口，首／末停用對應方向，鍵盤可達，移動後保留操作焦點並提示位置。未改集合保留稀疏排序；增刪／重排才由 F5 建立 0..n-1。Choice→非 Choice 先確認清 Options，取消仍是原題型／資料；確認才套目標 config，切回 Choice 建新 Options，不復原已清選項。Choice 互換保留 ID／value；variant 變更保留相容 bounds／其他設定。

**評分事件。** Stars 顯示 max 顆、每列 10 顆，上限 100；min>1 的前段保留位置但不可選，累積亮星數等於分數。min=0 顯示獨立 0 radio，與星分互斥；hover／focus 不作答。Range 的視覺位置是 `answer ?? min`，答案初始仍 undefined；pointer 點當前 min／拖曳／合法方向鍵操作明確提交整數，不能只依值變動的 change。focus／Tab／hover 不提交答案。optional 可清除回 undefined（Range 視覺回 min）；required／readonly 無清除。一般 Number 不套 Rating 的 0～100 限制。

## 5. 保存、回應 IDs 與基準重建

### 5.1 保存狀態與互斥

依正式 id 選 Create／Delta，送出時取得同一份 F5 `body`＋`map` 快照；new 驗 Visibility 必選與 Draft 有效性，edit 用最後成功 baseline。頁面使用 F2 `useOperationState('create'／'delta')`，同 Form leaseKey 採 `form:<formId>` 供 F7 管理寫入沿用，new 採 `new:<pageKey>`；page／formId／session revision ticket 保護採用。沿用 30000ms timeout、credentials=include、retry=0。

| 結果／狀態 | 本輪行為 |
| --- | --- |
| `invalid` | 欄位／摘要提示，捲到首錯；不發 API、不改 raw／baseline |
| 既有 `noop` | 不發 PATCH、不製造新 updatedAt；即使點保存也不假裝有新寫入 |
| `ready`→pending | 保存 loading，凍結根設定、題目／Options／config、拖曳／↑↓／增刪、重讀與其他寫入；不以 UI 取消宣稱 Server 回滾 |
| current success 且完整 DTO 可採用 | 下列一次性重建；Create toast「草稿已建立」後 push edit，PATCH toast「已保存」、留原 URL |
| 明確 API 失敗／本地未送錯誤 | finally 結束 loading；保留 model／baseline／IDs，按 §7 分流，合法可修正案例允許手動保存 |
| 已送 network／timeout／abort、500、無法解碼或不可信回應 | finally 結束 loading；Dialog＋待核對提示，保留輸入，不採 candidate 作基準；Delta 硬鎖，Create 重複風險確認，見 §6 |
| 已離頁／換 ID／換 Session 的晚回 | 不更新 model、baseline、issues、toast 或 route；釋放本次 loading／lease。忽略晚回不表示 Server 沒有保存 |

### 5.2 只由 Server 回應建立已保存版本

1. 解碼並確認回應屬目前資源／操作／Session；Create／Draft success 應為該 Active User 的 Draft。完整 FormDetail 的 id、Question／Option UUID、原 config／順序／deadline 與 metadata 是採用來源。
2. 呼叫 F5 `loadEditor(dto)` 一次，整份換成新 `EditorSession`。回應內每項 `key=serverId`，新題與 Option 從 tmp key 轉成正式 ID；直接採完整回應，**不以 label、相同 title、Array index 或 Option value 猜新 ID 對應**。已有項目以回應 ID 保留，移除的項目不留舊基準。
3. 同步更換 immutable baseline、清除已失效的欄位 map／錯誤與 Preview snapshot；原省略 variant、合法空 config、Server 正規化文字、稀疏排序及 deadline 原精度均重新建立。此時 `editorDirty=false`，之後更動與此版比較。
4. 首次成功先建立 clean 再 push `/forms/{id}/edit`，edit 按正常 loader GET 重建，不使用跨頁 store 還原。路由失敗仍保留已建立的正式 id／基準與前往編輯入口，不能再次 POST Create；保存分流依已取得的正式 id。PATCH 不額外 GET 才宣稱成功；另一次使用者重讀驗持久化。

代表案例：PATCH 新增一題與兩個 Options，200 回三個新 UUID；第二次只改其中一個 label，應送正式 Question ID＋Option ID 的更新，不再送新增。無改保存不發 PATCH。既有 `config={}` text 的 title 更新不補 variant；number 清 placeholder 的完整 replacement 保留精確 bounds；Choice→text→Choice 往返依 F5 固定案例明確刪舊 Options＋新增無 id Options，成功後下一次編輯採新 IDs。這些在 controller unit、Browser fixture 及真實保存讀回各驗其責任。

## 6. Dirty、離頁、重讀與結果不明

### 6.1 當頁資料與一次丟棄授權

`isDirty=editorDirty(definition, baseline)`；`useDirtyScope` 另接 operation.needsReconciliation，因此結果不明即使 raw 改回舊值也仍有待核對資料。new 以明確初值比較，edit 以最後成功 GET／PATCH 比較；既有 Visibility 不納入定義 dirty。Preview 試填使用自己的答案，開關／操作不改 Editor dirty。

註冊到 `useActiveDirtyScope`，讓 Header 登出先確認再 call logout；取消不送 logout，成功後的既有 discard permit 導向只確認一次。SPA nav／自然上一頁、下一頁／同元件換 formId 走同一 guard；dirty 時 beforeunload 原生提示，clean／卸載移除。沒有全域永久 bypass、KeepAlive 或 storage 恢復。

Editor model 不受 loader data 清除牽動。操作中 Auth 401 會更新共用 session revision 並撤銷有效登入狀態，但先保留 editor／baseline／已捕捉 Auth flow；Dialog 關閉／× 後才嘗試 login redirect，dirty 取消仍可留頁查看／複製，不能被 watcher 先清空或立刻換成 Gate。外部換帳號／同路由狀態變更的讀取只作候選，取代 dirty 或導向前取得單次丟棄授權；舊成功／舊錯誤都不能回寫新頁。

### 6.2 可找到的手動核對入口

| 原操作／目前情境 | 核對與解除條件 |
| --- | --- |
| Create 結果不明，沒有可靠 formId | 提示「先到我的表單核對，再次保存可能建立重複表單」，提供普通列表 link 可另開分頁及既有 nav；本頁保留輸入。列表相同 title 不證明該次成功，不能自動認領 id。若仍手動再按保存，先原生確認重複風險，取消不送；每次再送前保留此限制直到可靠成功或離開本頁 |
| Draft Delta 結果不明 | 原頁明確「重新載入表單」按鈕＋核對說明；核對前停用保存及供 F7 接入的發布資格，不重送含新項目的舊 Delta。允許查看／複製本地輸入 |
| 手動重讀可能取代 dirty／待核對資料 | 先 `authorizeAction` 取得丟棄 permit，再 GET，期間停用編輯；送出前不清空資料。只在成功、current、permit 仍有效且完整 DTO 已採用後 `operation.reconcile`。確認取消不 GET／不清基準；GET 網路／500／disabled 等失敗保留資料與鎖；失敗不把「按過重讀」視為已核對 |
| GET 確認 Published／Closed | 確認丟棄後採目前狀態，replace Form URL，definition 保存仍不可用；同 transition 不再詢問。不是把 conflict 當成前一次成功 |
| GET／操作確認不存在或管理權限否定 | 先保留錯誤及輸入，按 §7 丟棄／導航；不能以 404／403 當成可再次保存的基準。取消取代可留本地內容但撤下失效寫入 |

背景因 FORM_NOT_EDITABLE／權限錯誤取得的新 FormDetail 只作候選，不能盲目覆蓋 dirty；若需要取代／導航，使用同一確認流程。解除同 Form 的待核對限制僅在可靠 current 資源已採用後，沿 F2 coordinator，不能只清本地旗標。沒有新核對中心、冪等鍵、自訂版本合併或自動重送。完整刷新仍經 beforeunload 且丟棄當頁輸入；手機強制結束不保證提示，仍不增加恢復機制。

## 7. 錯誤明細、Auth 與狀態分流

UForm 欄位錯誤用 `FieldIssue.targetKey/field`；API 明細由此次 body 同建的 map 交 `locateDetails`，再找當頁 control registry。例：只更新畫面第三題的第二選項，Request `questions[0].options[0].label` 必須聚焦該選項，不能聚焦畫面第一題。刪除項／未知 suffix／控制已不存在的 detail 留 Dialog／摘要，原 path／message 不丟失。

前端驗證不發非法 Request；API validation 先 Dialog＋可定位欄位訊息，關閉後才定位首個可達錯誤，避免焦點與 Dialog 競爭。錯誤已顯示後修正可更新欄位提示，不每次 keypress 開 Dialog。F7 Publish 的完整 saved Definition map、F8 Answer index／漏答 ID 不沿用本輪 Delta map。

| 分支 | 可觀察行為與驗證 |
| --- | --- |
| 首次 GET error | 沿 F4 原 URL read error／手動重試／必要 Auth 返回；不以假 DTO 初始化 Editor |
| VALIDATION_ERROR／FORM_DEFINITION_INVALID | 保存輸入與 baseline，Dialog＋欄位明細／摘要；修正後手動送，測 Create 與稀疏 Delta map |
| 操作 AUTH_REQUIRED／AUTH_TOKEN_INVALID／AUTH_TOKEN_EXPIRED | 更新共用 Auth 失效；Dialog 只關閉／×，Esc／遮罩不關；之後 dirty→login?redirect=當前完整 URL。取消保留可複製資料，SPA 不額外 GET me 或重送保存 |
| AUTH_USER_DISABLED | 保留當頁輸入、既有 Header User 與登出；顯示停用錯誤，不主動登出、不建全域 disabled 封鎖 |
| FORM_NOT_EDITABLE | 停用保存／發布資格，GET 真實狀態作候選；確認丟棄後依 01 replace Form 頁，取消保留內容但不能再寫 |
| FORM_ACCESS_DENIED | 撤下被否定的管理能力，即使舊 User.id 看似 Owner 也不恢復；可讀時取得候選，取代／回 Form 頁先確認，身份明確重建後才重判 |
| 操作 FORM_NOT_FOUND | Dialog 後確認丟棄才換成原 URL 找不到；取消保留可複製輸入並停用失效寫入，第一次 GET 404 沒有此輸入取代流程 |
| network／timeout／500／無可靠回應 | 使用前端結果不明呈現，不偽造 API error.code；依 §6 核對，不在 close handler 自動 GET／重送原保存 |

## 8. 必要開發自測、測資與缺口

### 8.1 選用方法與代表案例

以下是未來 F6 開發自測安排，**不是本次已執行結果或正式驗收計畫**。必要 Browser／真實保存讀回不能改列不適用；前置未具備記 BLOCKED／NOT RUN。所有 fixture／攔截結果標示模擬，不代稱後端整合 PASS。

| 方法／時點 | 驗證目標與理由 |
| --- | --- |
| controller 完成：Vitest | 成功 adoption／新 IDs／clean、明確失敗不改基準、unknown 鎖與 reliable GET 解除、取消／失敗重讀保留、Create 重複確認、no-op 不送；換 ID／Session／離頁晚回不寫 UI。這是跨 Domain 與共用機制的高風險轉移，固定 DTO／Body 驗，不複製全部 F5 測試 |
| UI 接好：Browser fixture／built | **B01** new 初值／未選 Visibility 阻擋／無進頁 POST；**B02** 五題型 CRUD、Choice 切換確認／取消與往返、Options label-only／value 穩定；**B03** 手柄拖曳／↑↓／稀疏排序／還原；**B04** 保存 pending 不能編輯／重複送、201→push edit／200 留頁、新 IDs 後第二次送 update、no-op；**B05** Create／Delta API 明細正確聚焦、未知／刪除項留摘要 |
| UI 接好：Browser fixture／built（續） | **B06** dirty nav／自然上一頁下一頁／同元件換 ID／beforeunload 取消與確認、clean 無提示／成功首次導航不重問、登出取消不 API；**B07** 三種操作 Auth 401 的關閉／×、Esc／遮罩不關、dirty 取消保留、disabled 不登出；**B08** Delta unknown→改回舊值仍鎖→重讀取消／失敗仍鎖→current 成功才解除、Create 列表不自動認領／每次重試確認；**B09** FORM_NOT_EDITABLE／403／404 候選不直接覆蓋、晚回成功／錯誤不出舊 toast／route |
| Renderer／Preview 完成：Browser | **B10** 快照與 editor 隔離、每次空答案／scroll top、無 POST Response／Latest／Publish／Visibility、遮罩／×／關閉有效、Esc 無效、背景 scroll lock／focus trap／關閉回觸發；**B11** Stars 0／min>1／100 顆十列、Range 未操作／focus 仍空、點初始 min 與 0、方向鍵、optional 清除、required／readonly 無清除；**B12** 空 title／Options／Rating bounds／未選 Visibility 的呈現、長內容、精確 Number 字串、桌機／手機尺寸與無整頁水平溢位 |
| 保存完成：Browser＋真實 API | **L01** 合成 Active User 登入，真實 Cookie＋credentials CORS；new 無 Form 呼叫，首次最小 Draft（questions=[]）201→edit GET，重進／完整刷新 GET 持續存在，SPA 不多查 me；**L02** 五題型／新 Question＋Option 的 Create／PATCH→獨立 GET 讀回，核對 ID、value、排序、config、nullable 根資訊與第二次 update／delete／no-op；**L03** F5 指定 Choice 往返及 number 完整 replacement 用真實 PATCH／GET 驗，Request token 與讀回精確等值；**L04** 保留含微秒的 Draft deadline，僅改 title 不送 deadline，GET 原瞬間／精度維持；真正修改／清除以 UI→UTC／null 讀回。每案記實際 resource id／前後端版本，不用攔截冒充保存 |
| 真實 Auth 邊界（前置具備時） | 可用瀏覽器清 Cookie 在 dirty 保存觸發真實 AUTH_REQUIRED，再驗 Dialog→取消離頁保留／確認登入返回；真實 invalid／expired／disabled 需受控前置，否則其真實分支 BLOCKED，fixture 覆蓋單獨列結果 |
| 手機／鍵盤人工自測 | 真實觸控手柄與↑↓、軟鍵盤下 Preview 可見／捲動／關閉／focus、100 星辨識／誤觸、Range 點初始 min、safe-area／固定操作區不遮欄位；桌機鍵盤走完整流程。Owner 人工驗收維持 NOT RUN，不能以 Chromium viewport 等同實機或代填人工 PASS |

數值代表：`9007199254740993.1234567890123456789`、科學記號與 1／1.0／1e0 等值；以 F2 lossless parser／serializer／ExactNumber 核對完整 JSON number token，GET 不經原生 JSON.parse／Number 失真。Deadline fixture 可含七位小數，live 用後端實際可保留的微秒資料（例如 `.123456Z`），按讀回原值與瞬間比較，不預設 DB 可逐字保存任意 ISO 表示。Unicode trim／Code Point 用代表文字／emoji 驗 UI→候選，不加題目 title／label 的業務 maxlength。

Browser 基準承接 F0／F1：Playwright Chromium 完整自測，桌機 1440×900、手機 390×844，另 320px 窄屏與手機橫向檢查大量內容；記實際 binary／viewport。Windows Chrome／Edge 可用版本做代表保存／Preview smoke；缺失記 NOT RUN。Firefox／WebKit 與未具備實機不列已測，F10 複查沿用責任。fixture 全案在可重現 harness 執行，代表成功／dirty／Preview 另以 fresh built app 複驗；不以 dev 唯一結果代稱 build UI PASS。

### 8.2 命令、證據與適用性

授權開發後依 F1 最終 scripts 執行一次必要 `npm run lint`、`npm run typecheck`（Nuxt＋tools strict）、`npm run build`、`git diff --check`；預計 unit 命令如下（新檔將在開發時建立）：

```powershell
npm run test:unit -- tests/unit/f6-editor-page.spec.ts tests/unit/f6-rating-input.spec.ts tests/unit/f5-editor.spec.ts tests/unit/f5-definition-request.spec.ts tests/unit/f5-config-omission.spec.ts tests/unit/f5-answer.spec.ts tests/unit/scoped-state.spec.ts tests/unit/f4-form-read.spec.ts tests/unit/exact-number-gate.spec.ts tests/unit/common-adapters.spec.ts tests/unit/api-client.spec.ts
npm run test:e2e -- --config=playwright.f6.config.ts
```

Playwright config 預計 `F6_MODE=fixture|built|live`，fixture 選 fixture spec，built 選同產品互動 spec 並用 `npm run preview`，live 選真實保存 spec 並同樣用 fresh built preview。3000 需空閒，`reuseExistingServer=false`；只管理本輪自己啟動的前端服務，不停止不明程序／既有後端。模式設定在程序啟動前注入，結束移除本輪環境變數；輸出分 `output/playwright/f6/{mode}/`。若新增獨立 Nuxt harness，另跑其 strict typecheck；不無理由重跑全部 F1～F4 Browser 或 npm ci／audit。

證據記去敏的 method／path／status／請求數、固定預期與實際 Body／readback、正式 IDs、dirty／lock 轉移、必要桌機／手機／Preview 截圖、實際版本與命令 exit code。純數值 evidence 保存 literal wire，避免寫摘要時又浮點化。密碼、Cookie／Token、含憑證 headers／storageState／trace 原件只留 ignored 本機並檢查；交付僅不含秘密的合成證據。失敗及修正前後結果追加保留，不能覆寫為 PASS。

本輪選 unit、Browser、真實 API 與有意義的操作自測，是因新增保存／路由／beforeunload／拖曳／評分／Dialog；不為單純樣式建鏡像 unit。正式 AI／Owner 人工驗收、負載／容量、全站發布→提交→Statistics 流程不在 F6，分別維持延後或留 F7～F10。真實未知 Server commit 的故障安排未具備；攔截 network／500／30 秒 timeout 只證明前端未知結果處理，不宣稱已驗真實交易故障。

### 8.3 前置與目前缺口

| 前置／缺口 | 授權開發時的處理與未具備結果 |
| --- | --- |
| live 後端版本／R5-R6／DB readiness | 開始串接前重查 metadata/readiness、可取得的 checkout SHA／執行版本與 migration 證據；當前 readiness 200 未解除保存讀回缺口。若 API 不可用，L01～L04 BLOCKED，仍可完成 fixture UI；不能宣稱 F6 真實保存完成 |
| 合成帳號／保留資料 | F4 歷史只有保留合成帳號與空清單讀取，沒有本次可用憑證／Owner Draft 的已確認來源。F6 開發授權後，用本機安全注入的既有合成帳號，或普通註冊／登入 UI 建本輪合成帳號，Create／PATCH 建本輪需保留的 Draft。記帳號代號／Form IDs，不提交密碼；不得據歷史文件假造登入成功 |
| 新 IDs／五題型／含微秒 Draft | 以正常 Create／Draft PATCH 產生、GET 留證；含微秒資料可用正式 API 預備，再進真實 UI 保存讀回。保留所有合成 Forms，不刪除清理；不重建 DB、不刪 volume、不 SQL 修改 |
| Published／Closed／非 Owner／已刪除等外部變動 | 普通角色／狀態 fixture 可穩定驗本輪候選與取代流程；真實狀態需既有合成資料或已同意受控安排。F6 不自行 publish／close／delete 建此測資，未具備的真實案例 BLOCKED，F7 承接管理 API |
| 真實 invalid／expired／disabled、特殊故障／晚回 | 不直接改 SQL、造／簽 Token 或停服務。需安全受控安排；未具備維持 BLOCKED，fixture 可驗 UI，但不能列真實特殊 Auth／交易 PASS |
| 手機實機／軟鍵盤、3000 埠、Browser binary | 開發時記可用設備／服務／版本；缺實機人工項目 NOT RUN，Browser 必要但環境受阻記 BLOCKED，不以 viewport 解除實機缺口 |
| 既有非空 ≥11／21 清單／filter／縮頁第二支 GET Auth、npm ci native binding EPERM／audit | 原 F4／F5 缺口保留；新增本輪少量 Draft 不等於解除全部清單測資。沿用現有依賴，不為計畫或 UI 自測重裝；確需改共用層時才追加受影響回歸 |

前置確認與開發自測均在已核准整輪開發範圍內安排，**不新增測試計畫 review／執行 gate**。若契約或環境阻擋，列檔案／章節、實際觀察、受影響案例；完成可獨立工作並交付缺口，不自行標 accepted 或展開下一 Round。

## 9. 整輪實作次序、完成判準與交付

計畫確認且 Owner 明確指令開始後，依序接頁面／controller／保存與基準→根設定／題目／排序→Renderer／Preview→dirty／錯誤／核對→必要自測與範圍內修正。此為單輪內工程順序，沒有 A／B 分段授權或中途測試計畫核准點；完成後集中 review。

完成判準：本輪全部範圍已接實際頁面；五題型／排序／Renderer／Preview 的代表性操作符合 §3～7，成功後 IDs／基準可靠、no-op 不送、pending 不可編輯、未知不盲重送、dirty／錯誤取消不丟資料；必要工程檢查／受影響 unit／Browser 通過。真實 Create／Draft PATCH／獨立 GET 保存讀回是必要目標，未具備時明列 BLOCKED，交付標「開發自測已完成的範圍、待真實整合」，不得將整合缺口藏在 fixture PASS。實機未跑另列，不代填 Owner 人工結果。

交付 `F6_Development_Report.md`、必要去敏證據、README／總計畫進度、已驗證本輪變更的單一目的本機提交；記來源／前後端實際版本、各命令／案例 PASS／FAIL／BLOCKED／NOT RUN、fixture／真實 API、失敗歷史、commit SHA／剩餘 Git 狀態，停於「F6 開發完成、待集中 review」（含未解除缺口）。正式驗收仍由 Owner 後續指定，accepted 不自行更新。

## 10. 本次規劃交付與停止點

本次只有本計畫、README 最新進度與總計畫 §9 追加紀錄；產品／測試／依賴／backend-ref／舊 review 與證據不修改。Git／來源、manifest、runtime／lockfile 與唯讀 metadata 的實際觀察見 §2；文件連結／表格／控制字元／末尾換行、diff 與提交範圍核對於提交前完成。首次文件 checker 因 Node 子程序 `spawnSync git EPERM` 中止，改用 host Git 核對歷史與不啟動子程序的文件檢查；另依尺寸檢查補明手機 `100dvh` 宣告，原失敗保留於本次工具紀錄，沒有產品測試失敗或規格變更。

本次文件核對 **PASS**：三份文件共 105 個本機連結可解析，表格欄數、code fence、必要主題、控制字元／末尾換行與 diff check 通過；README／總計畫去除本次追加後的歷史文字一致。`git diff --exit-code` 對 app／tests／scripts／依賴／backend-ref／AGENTS／skills 為 exit 0。提交前另核對 staged diff，僅納入上述三份文件。

install／npm ci／lint／typecheck／build／unit／Browser／Create／PATCH／業務 GET／DB 操作／正式 AI／人工驗收均 **NOT RUN**。本次 metadata GET 200 與靜態閱讀不是保存／整合 PASS。完整文件 commit SHA／提交後 Git 狀態由交付訊息與 Git log 記錄，避免同一 commit 的文件自指 SHA；前端基準 SHA 已列 §2。

**停止於「F6 計畫待 Owner review」。本次不開發、不推送、不展開 F7～F10；F5-R1 結案、F5 code review 通過，正式驗收維持延後、accepted 不變。**
