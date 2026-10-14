# F8 精簡實作計畫 — Submit、Receipt、Latest 與 knownSubmitted

版本：1.0／2026-10-14（Asia/Taipei）。**Owner 已通過本版 review，授權整輪開發、必要自測、範圍內修正、受影響回歸與單一目的本機提交。** 現有三份規劃文件視為已核准變更，一併同步授權與進度；§6 保留原規劃交付歷史。Owner 採納 F7 最終獨立複核：R1／R2／R3／R4／R3-N1 全部 CLOSED，F7 code review 通過。正式驗收仍延後、accepted 不變；原報告、失敗證據與既有缺口保留。沿用「計畫確認 → 整輪開發、自測與範圍內修正 → 集中 review」，不新增中途測試計畫核准關卡。

## 1. 範圍、來源與接手基準

在 `/forms/{formId}` 接正式填答、POST Submit／201 Receipt、主動 GET Latest、本頁 single 的 knownSubmitted；完成五題型、收件資格、dirty／資料取代、互斥、錯誤與結果不明核對。承接總計畫 §5 F8、§7／§7.1 項目 4／6／7，並沿用 1／3／5／8／9 的共用資料、Auth、Renderer、版本與驗證基準。Preview 維持獨立試填快照，不接正式資格／Submit／Latest；Statistics body 與真實存取矩陣留 F9。

| 來源 | 本輪依據 |
| --- | --- |
| [AGENTS](../../AGENTS.md)、[development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫](V1_Frontend_Implementation_Plan.md) | AGENTS v1.1／tracked skill／總計畫 v1.3，最新 Owner 授權與 §9.31；本次只規劃 |
| 前端 [00](../specs/00-v1-frontend-overview.md)／[01](../specs/01-pages-routing-and-access.md)／[03](../specs/03-response-and-statistics.md) | v1.0／2026-10-10；00 §3～5、01 §7～10、03 §1～8：角色、空白進頁、提交／Latest／readonly 與路由 |
| 前端 [02](../specs/02-form-editor-and-lifecycle.md)／[04](../specs/04-auth-state-and-error-handling.md)／[05](../specs/05-ui-and-interaction.md)／[06](../specs/06-technical-architecture.md)／[07](../specs/07-api-integration-map.md) | 02 v1.1 §6.1／11；04 v1.0 §4～12；05 v1.0 §2～10；06 v1.1 §4～11；07 v1.0 §1／7／9～10：模型分離、精度、dirty、Dialog、錯誤與未知結果 |
| 正式後端 [SNAPSHOT](../../backend-ref/SNAPSHOT.md)／[00](../../backend-ref/docs/specs/00-v1-overview.md)／[01](../../backend-ref/docs/specs/01-v1-domain-specification.md)／[02](../../backend-ref/docs/specs/02-v1-database-specification.md) | 唯讀匯出 2026-10-11／`7591633137c5a6f57c1fce8e1ba19ab394015880`；00 v1.1 §4～6／9；01 v1.1 §3、FORM-07～10、SUB-01～07、CON-02／04；02 v1.0 §10～11：不可變 Response／完整 Latest |
| 正式後端 [03a](../../backend-ref/docs/specs/03a-v1-api-contract-common.md)／[03b](../../backend-ref/docs/specs/03b-v1-api-contract-auth-user-form.md)／[03c](../../backend-ref/docs/specs/03c-v1-api-contract-submission-statistics.md)／[04](../../backend-ref/docs/specs/04-v1-error-catalog.md)／[05](../../backend-ref/docs/specs/05-v1-system-constraints.md) | 03a v1.0 §2～6／9；03b v1.0 §7.1／8.3～8.4；03c v1.1 §3.1～3.2／4～5；04 v1.0 §2.4／4～9；05 v1.1 §5.3／6／8～12／13.3～15：DTO、精確順序、path、Cookie 與交易界線 |
| 共用模型／歷史結論 | [F5 開發](F5_Development_Report.md)、[F6 計畫 v1.1](F6_Implementation_Plan.md)／[開發](F6_Development_Report.md)、[F7 計畫 v1.1](F7_Implementation_Plan.md)／[開發](F7_Development_Report.md)、[F7 最終獨立複核](../review/F7_R3_N1_Correction_ReReview_Report_20261014.md)；本次閱讀不重跑歷史結果 |

- 前端 `C:\Users\user\Desktop\custom-form-service-web`：**master／HEAD `134629a8ce9d2b276ec7a3a10a6843977814f41b`**，與 Owner 指定基準一致；編輯前工作樹乾淨。
- 本次唯讀實測 Node **24.21.0**／npm **11.19.0**；七項 installed／lockfile 相符：Nuxt 4.6.1、Nuxt UI 4.11.3、Tailwind 4.3.3、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0、lossless-json 4.3.1。沿既有 CSR／strict、30 秒 timeout、credentials=include、零自動 retry，不新增依賴、Endpoint、BFF 或持久化。
- backend-ref manifest **108／108 相符**。依已確認位置唯讀核對後端 checkout `C:\Users\user\Desktop\custom-form-service`：HEAD 同快照 SHA，既存 `?? SNAPSHOT.md` 未動。2026-10-14 **20:03:09～11 台北時間**，`/health`／`/health/ready`／`/openapi/v1.json` 各 5 秒上限，均 **200**；OpenAPI 有 POST responses／GET responses/me/latest。沒有業務 API 讀寫或 Browser；不把 metadata 視為 R8／R9 整合 PASS。
- F7 曾確認 runtime assembly 綁定／版本；**本次未重查 runtime 綁定**，不以 checkout 推定執行程序版本。DB identity／migration 仍 **UNCONFIRMED**。快照 R10 accepted／R11 結果待 Owner 確認是歷史來源；前端文件的「R10 尚未實作」亦為歷史記錄，不影響本輪 F8 契約，不替 F9 作串接結論。

本輪相關正式契約與前端規格未發現需改產品／API 的衝突；未來若實際回應不符，依 AGENTS 記錄來源／差異並只暫停受影響部分。

## 2. 共用模型、Receipt 與答案定位

沿用 F5 `savedAnswerDefinition`／`emptyAnswers`／`answerDirty`／`validateAnswers`／`buildAnswerRequest` 與 exact snapshot。正式 Definition 只投影成功取得的 FormDetail；Renderer 綁本地 key，正式 Request 轉 Server Question／Option ID。本頁 AnswerSession 與會因 Auth／Form loader contextChanged 清空的讀取 state 分開，錯誤不清本地答案；不把整份答案放跨頁 store。F6 Preview 每次建立自己的空 AnswerModel，共用 Renderer 但不共用 session／baseline／knownSubmitted／errors。

| 題型 | 本輪接法與代表案例 |
| --- | --- |
| text | 保留 raw；驗證／dirty 用 White_Space trim＋Code Point，內部換行／空白與大小寫保留。optional 空白省略；required 空白擋送；emoji 的長度不以 UTF-16 計算 |
| number | 保留 raw／ExactNumber，精確比較 config bounds、JSON number token 收送／Receipt mapping。`0` 保留、空字串省略；`1`／`1.0`／`1e0` 等值，`9007199254740993` 與長小數不經 Number()；非法／超過可處理能力拒絕，不新增小數位上限 |
| single_choice | radio／select 同一模型，送該題 Server Option ID；同名 label 不合併，label／Option value 不作答案 |
| multiple_choice | checkbox／multi_select 同一集合，送不重複 Server Option ID Array；[] optional 省略，required 擋送；選取順序不製造 dirty |
| rating | Stars／Range 沿 F6；未操作為 undefined，0 是答案。Range 點初始 min 即作答、focus 不作答；Stars 100 顆／每列十顆、min>1 禁選前段、0 radio 互斥、optional 清除；readonly 無修改／清除 |

全部 optional 可送 `{answers:[]}`，不加「至少一題」或「multiple 再送前必須修改」。既有省略 variant 只使用有效呈現值，不補寫 config；缺／非法正式定義不套 Preview 占位或 Rating 預設修補。

**新增 Definition-aware Receipt mapper。** 通用 `decodeReceipt` 保持 lossless；再核對 formId、唯一 Question ID、型別、同題 Option ID／多選不重複、required／config 與整份正規化答案。Number 保留 ExactNumber；只有已確認 Rating 的 0～100 整數才轉安全整數。先建所有題目空狀態再套 Receipt，不依 Array 順序配題，也不保留缺失 optional 的舊值。未知題／選項、型別不符、重複或無法可靠 mapping 一律拒絕整份採用，不部分覆蓋。提交 201 在完成解碼／mapping／送出候選語意核對前不建立成功基準；已送出的異常 201 按結果不明處理。Latest 的異常回應是讀取失敗，保留輸入與原基準。`submittedAt` 原精度保留，UI 用共用台北時間 helper。

**沿 F5 path map。** 送出 frozen Body 時一起固定 map；例如畫面第 1／2 題 optional 空白省略，畫面第 3 題在 Request 為 `answers[0]`，`answers[0].value` 必須定位第 3 題。漏答用正式 **`questions.<questionId>`**；多選用 **`answers[i].value[j]`**。沿 `locateDetails` 的 exact map，不套 Delta／Publish index；可定位者顯示欄位明細並聚焦首個可用控制，無控制／未知 path 完整留 Dialog 摘要。前端驗證失敗不送 API；API `VALIDATION_ERROR` 用 Dialog＋欄位，修正不反覆彈 Dialog。

## 3. 資格、knownSubmitted、Latest 與 dirty

初次進頁、刷新、重新進入、換 Form ID 都建立空答案／clean 基準；**不預查 Latest**，不沿用前頁記憶體。knownSubmitted 是當頁 single 證據，不由 FormDetail、Owner、Count、Visibility 或歷史 SPA 資料推論。

| 事件／狀態 | 答案、基準與入口 |
| --- | --- |
| Published 未截止、可靠當頁身分 | Owner 與非 Owner 同樣可提交；single 初始 knownSubmitted=false，multiple 同樣空白；兩者都有「查看我的填答」 |
| Published 已截止／Closed 正常進頁 | 空答案唯讀、無 Submit；保留 Latest／Owner 管理與既有 Closed 統計入口；不跳首頁。到期仍 Published；本機 timer 僅更新提示／資格，不輪詢 API、Server Time 最終裁定 |
| Submit decoded 201 | 保留送出時 UI 答案，依正規化語意核對 Receipt 後建立 clean 基準及 submittedAt；「提交成功」Dialog 不自動關閉，只完成／×，不改 URL。single latch true、唯讀、移除 Submit；multiple 仍收件則可編輯／同內容再新增一份 |
| single Latest 可靠 200 | 即取得已提交證據；knownSubmitted=true。乾淨直接整份 mapping；dirty 在取得成功候選後才確認取代，確認才採用／重建 clean 基準。取消保留原 model／baseline／dirty，仍撤 Submit／唯讀，標示本地值不是已查得的 Server 答案；不得取消已提交證據 |
| multiple Latest 可靠 200 | 成功後才確認 dirty 取代；取消保留全部輸入／基準。採用後缺 optional 清空、顯示「最近一次提交」與時間；仍收件可編輯／新增提交，Closed／已截止唯讀 |
| Latest `RESPONSE_NOT_FOUND` | Dialog「您從未填答過」，保留答案／基準／模式；不設全頁 404、不回退已成立的 knownSubmitted、不把結果當成某次未知 POST 未完成的證明 |
| `RESPONSE_ALREADY_SUBMITTED` | single latch true、撤 Submit／停答案修改；保留本次輸入與原基準，清楚標示未查得 Server 答案，主動 Latest 才取真實答案；Owner 管理不移除 |

每按 Latest 都新 GET；不以舊 cache 或 Submit Receipt 代替。GET pending 停答案修改／Submit／替換操作，成功取代確認期間亦保持候選／內容 revision 有效。Form ID／Session／RequestScope 或同 Form write revision 變動使舊候選永久失效，finally 不結束新請求 loading。

**本地資料與資格分開。** Submit 需要目前有效 grant（資源＋User／Session revision）、Published 未截止、未遭存在性／狀態否定；single 另需 knownSubmitted=false。Auth 失效撤 grant、保留本地輸入供查看／複製，不由取消導航或舊 User.id 恢復。沿 F6 明確「核對登入與填答資格」GET me＋Form，成功核對且必要丟棄確認後，才綁新 context／重建空答案與基準；非 Owner Published／Closed 也能取得本人填答／Latest 資格，不沿用 Owner-only 的 verify 回傳判準。同一 context 的 knownSubmitted 不因普通 Form GET 清掉；換本人 context／重新進頁才重新初始化。

**只註冊一個正式 DirtyScope／ActiveDirtyScope。** 用答案對空白／Latest／Submit 基準的語意差異，並包含待核對提交及 F7 管理 unknown；改回基準可 clean，但不能清未知限制。SPA leave／history／同元件換 ID、beforeunload、資料取代、Auth／首頁導向都沿共用 guard。manual Form 重讀先確認，失敗／取消不清答案；可靠採用後才按確認的取代目的重建，普通政策／Close DTO 只更新根資訊與資格，不重建答案。Visibility 成功、Close 成功不丟 dirty；Closed 後本地輸入仍可查看／複製且不能提交。Delete 確認包括答案丟棄、204 單次 replace；Header logout 沿 F7-N1 已修正的自身清理／單次 permit，外部 revision 仍撤授權。正式 Renderer 不重複渲染唯讀 Definition 造成兩套題目控制。

桌機／手機沿 Form 最大 800px、手機左右 16px：根資訊與收件／已知提交／本地未提交標示 → 共用題目 Renderer＋欄位錯誤 → 提交／查看我的填答／最近一次提交時間；Owner 管理獨立區域。核對入口／停用原因與長答案可換行；readonly 保留完整答案語意。成功／錯誤 Dialog 沿共用焦點／捲動，不因按鈕撤下把焦點留在已消失控制。

## 4. 提交互斥、錯誤與結果不明

Submit 使用 `response-single`／`response-multiple` OperationState，與保存／Publish／Close／Visibility／Delete 共用正規化 **`form:{uuid}` lease**。UI 與 controller 同時防雙送；Submit pending 凍結答案與替換／同 Form 寫入。Latest／Form／GET me＋Form／Count 各用獨立 read scope 與 F7 `captureRead`：讀取開始後若有同 Form 寫入，即使 pending 已結束也不能採用該舊 GET。管理寫入期間不能啟動可用的 Latest 核對；Latest pending 期間若管理寫入發生，其舊結果不得覆蓋答案、knownSubmitted、基準或解鎖。送出／Dialog後導航都核對 Page／Form／Session／content／write context；Abort／離頁不代表 Server 回滾。

資格 gate 補接 F7 的未確認 Close／Publish 狀態及 Delete 存在性鎖，不能在管理 unknown 時以舊 Published DTO Submit；Visibility unknown 不改變收件規則。沿 shared coordinator 做必要政策依賴，**不把管理 permissionDenied 等同非 Owner 無填答權**，但已刪除／Auth／非 Published 的否定須約束 Submit。Latest 的成功不能解除 Lifecycle／Delete／Visibility／Delta unknown；普通 Form GET 不能解除未知提交或 multiple duplicateRisk。loading 在各自 finally 結束。

送出前的收件資格與晚回的 context 檢查分開：本機 deadline timer 在 pending 中到期，只停用後續 Submit，不能把同 context 的合法 201 丟棄；Server 可能在截止前取得 submissionTime、截止後才回應。仍採 Receipt／clean／成功 Dialog，multiple 到期後唯讀。此案例在 controller unit 與 Browser 攔截自測驗證。

| 結果 | 本頁分流與解除條件 |
| --- | --- |
| `VALIDATION_ERROR` | Dialog＋送出 map 明細，留原輸入與基準；Question／Option 歸屬是 detail，不把父回應當全頁 404；修正後手動 Submit |
| `SUBMISSION_DEADLINE_EXCEEDED` | 立即標截止／禁 Submit；錯誤 Dialog 關閉／×後導 `/`，經 dirty guard；取消留可查看／複製內容，不復活資格 |
| `FORM_NOT_SUBMITTABLE` | 先撤 Submit、主動 GET 最新 Form 候選；可靠判 Closed 後同上 Dialog 關閉→首頁／dirty。Draft 等依 01 路由；讀取失敗／stale 不用舊 status 推定 Closed，不自動重送；取代本地內容先確認 |
| `FORM_NOT_FOUND` | 操作 Dialog、撤失效寫入；丟棄確認才切原 URL 找不到。取消保留輸入供複製；Latest `RESPONSE_NOT_FOUND` 走 §3，不套此流程 |
| Auth 三種 401 | 更新共用 Auth／撤 grant，保留答案；操作 Dialog 只關閉／×（Esc／遮罩不關）→dirty→login redirect 完整原 URL；取消仍失效。晚回舊請求／自身 Auth invalidation 不先清答案 |
| `AUTH_USER_DISABLED` | 保留 User／Header 登出與輸入、顯示停用錯誤，不主動登出、不新增全域 User status；單一操作失敗不冒稱未登入 |
| 已送 network／timeout／500／不可解碼 201 | 結束 loading，Dialog「未能確認操作結果，操作可能已完成」；保留輸入／舊基準與待核對狀態，不顯成功、不自動重送。未送的本地失敗不標未知寫入 |
| single 未知提交 | 可見「查看我的填答」核對入口；可靠 200 成立 knownSubmitted，可依 §3 確認取代／唯讀。404／失敗／取消不宣告原 POST 失敗；仍可選擇手動再送，由 Server single 保護，不能自動重送 |
| multiple 未知提交 | 主動 Latest 只協助查看目前最新整份；成功／404／內容相同／時間接近均不能證明那一次 POST 已完成。採用成功候選可更新展示／基準，但 **duplicateRisk 保留**；再次 Submit 前明確確認可能新增重複 Response，取消零 POST。風險只隨本頁後續可靠 201 或該 context 結束解除，不藉 GET Form／Latest 自動清除 |

正式驗證順序引用 03c §4.3、04 §4：Authentication→解析→存在性→Published→Deadline→single→Answers；例如逾期且已提交以截止錯誤為先。前端不依「我已填過」改寫 Server code，不加 Idempotency-Key 或 Receipt 歷史列表。

## 5. 預計檔案、工程順序與必要自測

| 預計位置 | 責任 |
| --- | --- |
| `app/services/response.ts`（新增）、`app/domain/api/response.ts`／`decoders.ts` | POST sole answers／201、GET Latest 無 Body／200；既有 client／lossless decoder與 Definition-aware 校驗，不帶 userId／formId body／submittedAt／UI keys |
| `app/domain/response-page.ts`、`app/composables/useFormResponse.ts`（新增）、`app/domain/answer.ts` | Receipt mapper、當頁 session／baseline、knownSubmitted、資格、送出／Latest候選／錯誤／unknown；共用 F5 builder／mapper，按需要補純函式，不另造答案契約 |
| `app/components/forms/FormReadPage.vue`／`FormRenderer.vue`、`FormSubmitSuccessDialog.vue`（新增） | 正式 Renderer／錯誤與首錯聚焦、readonly／輸入 freeze、Latest／核對入口、成功 Dialog；沿 F6 stable key＋Renderer instance 識別，Preview 副作用隔離 |
| `app/composables/useFormDetail.ts`／`useFormManagement.ts`、`app/domain/form-management.ts`／`operation-state.ts`、共用 dirty helper | 必要的候選採用／管理 metadata 與答案分離、回應政策精準解鎖、同 Form gates／單次丟棄；不無關重構 F5～F7 |
| `tests/unit/f8-response-page.spec.ts`、`tests/e2e/f8-browser.spec.ts`／`f8-live.spec.ts`、`playwright.f8.config.ts`（開發時新增） | 下面必要自測；必要 harness 另 strict。沿 F6 事先宣告的 method／完整 URL／status或reason／次數精確 network diagnostics，不事後放寬 |

本版核准且明確授權開始後：純 mapping／controller／資格與互斥 → 正式 UI／Dialog／dirty 接入 → fixture與真實自測 → 範圍內修正／受影響回歸 → `F8_Development_Report.md`、去敏證據與進度、集中 review。工程順序不是中途人工核准 gate。

以下是**未來開發自測，本次均 NOT RUN**。選 Vitest 驗證資料／狀態風險；Browser 驗證導航、beforeunload、Dialog／控制、請求與 Cookie／CORS。mock 不替代保存／讀回；不為樣式建立鏡像測試。

| 方法／時點 | 必要目標與代表案例 |
| --- | --- |
| mapper／controller 完成：Vitest | 五型／optional／required／0／all optional []、精確 number／Code Point；整份 Receipt／Latest ID／型別校驗／缺 optional 清空；省略後 Request index／漏答 ID／多選 index／未知摘要；knownSubmitted 三來源與dirty取消；multiple duplicateRisk 跨 Latest／Form GET 保留；單一 lease／跨寫入 GET／Session／ID／finally／晚回隔離 |
| UI 完成：fresh built Browser＋攔截／必要 harness | **B01** 進頁／刷新／再入／換 ID 空白，零預查Latest／同SPA me不多查；**B02** 五型 variants、required／optional／0、100星／Range初始min與清除、首錯可達；**B03** single／multiple 201 Dialog 完成／×不自動關、保留／clean、同內容再送；**B04** 每按Latest新GET，成功後dirty取代／取消、無紀錄保留、缺optional清空、single取消仍已知／本地標示；**B05** Deadline／Closed 初入不跳轉、操作錯誤Dialog→dirty→首頁／取消，404／Auth三碼／disabled；**B06** timeout／500／異常201、single手動核對、multiple重複確認取消零寫入／採用Latest仍保留風險；**B07** Submit×Close／Visibility／Delete互斥、管理DTO不蓋答案、跨寫入Latest／GET永久stale、換ID／Session／卸載；**B08** SPA／history／param／beforeunload、Header logout／Delete單次permit、未知但等值仍提醒、Preview零Response API與答案／radio隔離 |
| 真實 Browser＋API：必要保存／讀回 | **L01** 專用 single 五題型，Owner 自己填與非 Owner 適用同資格；wire 精確 Number／Option IDs、201／獨立 Latest 等值與刷新空白，再次提交 409；**L02** multiple 第一份完整五題→第二份清除 optional Text／Choice，另保留 Rating 0／Number 0；明確 Latest 整份缺題空白／submittedAt、不補第一份，同內容再送取得不同 Receipt id；**L03** 全題 optional answers=[] 正常 201／Latest，anonymous 仍需登入、Latest 不受 Visibility 限制；**L04** 正常 Published 短期限自然到期／正常 Close 後初入 readonly 仍讀本人 Latest；先進頁再在另一正常 Owner context Close，Submit 409／GET Closed／Dialog→dirty 導航；**L05** 真實清 Cookie AUTH_REQUIRED→dirty 取消／接受→登入返回空白、正常兩 Active 帳號 Latest 僅本人／換身分資格核對，credentialed fetch、Cookie 刷新／CORS 觀察 |
| 畫面／鍵盤及可用設備自測 | 桌機1440×900／手機viewport390×844與320px，長文字／重複label／100星不水平溢位、readonly與錯誤首控可達、Dialog焦點；Chromium viewport不等於實機touch／軟鍵盤。實機有設備才測；Owner人工與正式AI驗收仍NOT RUN |

沿 F1 scripts 執行 `npm run lint`、`npm run typecheck`、`npm run build`、`git diff --check`；`npm run test:unit -- tests/unit/f8-response-page.spec.ts tests/unit/f5-answer.spec.ts tests/unit/scoped-state.spec.ts tests/unit/f7-form-management.spec.ts tests/unit/f6-editor-page.spec.ts tests/unit/api-client.spec.ts`，若改 exact／decoder／Auth／dirty 則補相應既有 regression，不無理由重跑所有不受影響 suite。Browser `npm run test:e2e -- --config=playwright.f8.config.ts`，built／fixture／live分開列；受影響 F6 Preview／Renderer與 F7-N1 logout／Delete／管理合併需回歸。沿 F0／F1 Chromium基準，記實際binary；Chrome／Edge各做代表Submit→Latest／readonly smoke，可用性不足記BLOCKED。無依賴變更不重跑npm ci／audit；Firefox／WebKit、負載、DB交易／並行完整重驗不屬本輪必要層級，single保護只做前端正常重送／409與攔截競態，不代稱後端並行驗收。

| 前置／保留缺口 | 本輪安排與界線 |
| --- | --- |
| R8／R9／runtime／DB | 開發串接前重核readiness、實際前後端版本與可取得的程序綁定；必要真實L01～L05若不可用記BLOCKED，不改不適用。checkout／OpenAPI不代替成功提交／讀回；DB identity／migration未確認保留，不reset DB／volume或SQL修改 |
| 合成角色／五題／single／multiple／到期／Closed | 開發授權後用安全注入且已確認的合成帳號或授權的正常Register／Login／Create／Publish／Close準備本輪專用保留資料；記Run label／ID／用途。F5～F7歷史測資只供索引，不改寫／刪除；本輪測資不需要Delete／清理。未取得必要測資或建立授權則對應live BLOCKED，本次不建立 |
| 真實invalid／expired／disabled、Server commit故障 | 仍缺已同意受控安排，記BLOCKED；用攔截三Auth／disabled／500／network／timeout驗前端，不造簽Token、不SQL停用、不停既有後端，不把Latest當交易故障證明 |
| 實機／其他歷史未覆蓋 | touch／軟鍵盤／safe-area、F4≥11／21列表及完整特殊狀態缺口保留，F8少量資料不解除；缺設備實機NOT RUN，必要Browser缺前置BLOCKED |
| 正式驗收／F9 | 本輪自測與集中review不代填正式AI／人工PASS或accepted；不建立正式驗收計畫、執行驗收或展開F9 |

證據分 fixture／真實 API，保存固定預期、實際method／path／status／次數、送出與Receipt／獨立Latest數值等值、baseline／dirty／knownSubmitted／duplicateRisk／導航／版本與測資索引；保留首次FAIL及修正重跑。raw／storageState／trace若含憑證僅留ignored本機，交付前檢查內容，只提交去敏摘要／必要合成畫面；不提交密碼／Cookie／Token／敏感個資。只管理自己啟動的前端程序，沿 `reuseExistingServer=false`，不停止既有後端。

完成判準：本版範圍接正式頁面且符合來源；必要工程／受影響unit／Browser通過，live逐案有真實證據或明列BLOCKED／NOT RUN。授權開發後依AGENTS作單一目的本機提交，停於「F8 開發完成、待集中 review」；有缺口時明列可完成範圍，不能以fixture冒稱真實整合已完成。

## 6. 本次交付與停止點

本次只有本計畫、README與總計畫進度；F7原報告／review／首次失敗／證據、產品／tests／依賴／規格／AGENTS／skills／backend-ref均保留。Git／版本／manifest與唯讀metadata觀察見§1。lockfile首讀因PowerShell空key解析失敗，改用`ConvertFrom-Json -AsHashtable`重讀七項相符；不視為產品測試。

本次文件核對 **PASS**：新增內容 31 個本機連結／1 個章節 anchor、表格欄數、code fence、控制字元、尾端換行與空白通過；移除本次追加後，README／總計畫歷史文字與 HEAD 一致。`git diff --check` 與產品／tests／依賴／規格／backend-ref／歷史報告及證據的受保護路徑 diff 通過。核對工具曾遇 Node 子程序 Git EPERM 與 README 抽取空行誤差，改用 PowerShell 直接讀 Git、修正抽取後確認一致；這是文件核對工具的失敗／修正，不是產品執行結果。

最終 Git 變更只有 README、總計畫與本 F8 計畫三份文件；install／lint／typecheck／build／unit／Browser／業務 API 讀寫／DB／正式 AI 與人工驗收均 **NOT RUN**。本次不提交，HEAD 維持指定基準，文件留工作樹供 review；不推送。**停止於「F8 計畫待 Owner review」**，尚不開發、不執行業務 API 寫入、不展開 F9；正式驗收仍延後、accepted 不變、既有缺口保留。

## 7. Owner 整輪開發授權

Owner 明確授權依 v1.0 完成整輪開發、自測、範圍內修正、受影響 F6／F7 回歸與單一目的本機提交；接手 HEAD 仍為 `134629a8ce9d2b276ec7a3a10a6843977814f41b`，原三份規劃文件皆已核准，一併提交。正常 Register／Login／Create／Publish／Close／Submit API 可建立 F8 專用合成測資並執行 L01～L05 保存／獨立 Latest 讀回；記 Run label、資源 ID 與用途並保留，不修改或刪除歷史資料。必要前置受阻記 BLOCKED、繼續可獨立工作；fixture／真實結果分列、首次失敗保留。交付開發報告／去敏證據／SHA／Git 狀態後停於「F8 開發完成、待集中 review」；正式驗收延後、accepted 不變，不推送、不展開 F9。授權不新增中途測試計畫核准關卡。

## 8. 授權開發交付進度

本版範圍已完成整輪開發／自測／範圍內修正及受影響回歸，見 [F8 開發報告](F8_Development_Report.md)／[去敏證據](evidence/F8_20261014/verification-summary.json)。工程與harness strict PASS，unit201／201、F8 fresh built29／29、F7回歸34／34、F6 fixture5／5、Chrome／Edge各2／2，最新真實L01～L05保存／獨立Latest分組測試PASS；三個Run全部合成測資保留，首次失敗／重跑與fixture／真實分列。規劃§1／§5／§6中的「本次只規劃／NOT RUN／未提交」為原規劃交付歷史，當前結果以本節與開發報告為準。

**F8 開發完成、待集中 review**；本輪授權單一目的本機提交，正式驗收仍延後、accepted不變，受控特殊Auth／交易故障／DB identity／migration／實機及其他既有缺口保留。不推送、不展開F9。
