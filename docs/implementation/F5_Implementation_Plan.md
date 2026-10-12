# F5 精簡實作計畫 — Editor／Answer Domain 與 Delta

版本：1.0／2026-10-12（Asia/Taipei）。**F5 計畫待 Owner review；本次尚不開發。** Owner 已確認 F4-R1 結案、F4 code review 通過；F1／F2／F3／F4 均未 accepted，正式驗收仍延後，既有真實測資缺口保留。

## 1. 範圍、完成判準與依據

依總計畫 v1.3 F5／§7／§7.1 項目 2、4、5、7，交付供 F6／F8 使用的純資料模組：Editor 初值、key／ID、穩定 Option value、保存基準與 dirty、題型／config／選項／排序操作；Create／Draft Delta builder、Draft／Publish 分離驗證、錯誤 path map；Preview／正式填答的五題型答案模型、required／optional 驗證及純 Answer request builder。

完成判準：§3 的固定預期單元案例與必要 lint／strict typecheck／build 通過；DTO／基準不被編輯污染，no-op 不產生待送 PATCH、tmp key 不冒充 Server ID、錯誤可正確定位或留摘要；diff 核對完成，交付 `F5_Development_Report.md`、必要去敏證據與單一目的本機提交，再集中 review。

本輪沒有 UI 元件／頁面接入或 API 呼叫。Editor／Renderer／Preview 與保存留 F6，Lifecycle／Visibility 留 F7，提交／Latest／knownSubmitted 頁面流程留 F8；不新增持久化、BFF、Endpoint 或合併衝突機制。

引用 [AGENTS](../../AGENTS.md) v1.1、repo [development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫](V1_Frontend_Implementation_Plan.md) v1.3 F5／§7／§7.1／§8.1／§9.8。受影響前端：2026-10-10 的 [02](../specs/02-form-editor-and-lifecycle.md) v1.1 §2／§5～10、[06](../specs/06-technical-architecture.md) v1.1 §4／§6～9／§11；[03](../specs/03-response-and-statistics.md) v1.0 §4～7、[04](../specs/04-auth-state-and-error-handling.md) v1.0 §7／§9／§11～12、[05](../specs/05-ui-and-interaction.md) v1.0 §4～6、[07](../specs/07-api-integration-map.md) v1.0 §5／§7／§10；00 排除項與 01 路由責任維持。

正式後端來源為唯讀 [backend-ref 快照](../../backend-ref/SNAPSHOT.md)，2026-10-11／SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`：核對 [Domain](../../backend-ref/docs/specs/01-v1-domain-specification.md) v1.1 FORM-04～06／QST／SUB-02～03、[Part B](../../backend-ref/docs/specs/03b-v1-api-contract-auth-user-form.md) v1.0 §6.1／§7.2、[Part C](../../backend-ref/docs/specs/03c-v1-api-contract-submission-statistics.md) v1.1 §4.1～4.4、[Part A](../../backend-ref/docs/specs/03a-v1-api-contract-common.md) v1.0 §2／§4、[Errors](../../backend-ref/docs/specs/04-v1-error-catalog.md) v1.0 §2.4／§6、[Constraints](../../backend-ref/docs/specs/05-v1-system-constraints.md) v1.1 §10～12。資料語意引用上述契約，不另建規則；本次未發現影響 F5 的契約差異。

## 2. 資料結構、主要模組與既有功能接法

| 預計檔案 | 方案／接點 |
| --- | --- |
| `app/domain/models.ts`、`app/domain/editor.ts` | 擴充現有 boundary 為 `EditorDefinition`／`EditorBaseline` 與 Question／Option model；new 採 02 §2 初值，既有 FormDetail 經獨立投影，不雙向綁 DTO。每項有穩定 key／可選 serverId，新項 key=`tmp_UUID`；Option value 在新增時產生同題唯一 `opt_UUID`，改 label／排序不改 value。Creator／status／timestamps 唯讀 |
| `app/domain/definition-validation.ts` | Zod refinement 使用 F2 adapter；原始文字／數值控制字串與合法候選分開，非法非空輸入不能當未設定。分開 `validateDraft`／`validatePublish(definition, now)`；new Visibility 必選，既有 Visibility 不參與定義 dirty／PATCH。Publish 增完整性與 deadline 檢查，caller 注入時間，Server 最終判定優先 |
| `app/domain/api/form.ts`、`app/domain/definition-request.ts` | Create／Draft Delta 型別與白名單 builder，回 `invalid`／`noop`／`ready`；ready 含獨立 readonly Body＋path map。新增送完整必要欄位、不送 id；更新只送差異，刪除才 id-only；無內容 Delta 省略，`[]` 不代表清空。F6 日後接既有 client／serializer |
| `app/domain/answer.ts` | 依題型區分 text 原字串、number raw＋可選 ExactNumber、single 未選／選項 key、multiple key 集合、rating `undefined`／明確整數；由獨立題目投影建立全空答案與基準。Preview 可用未保存 key；正式 builder 必須解析為真實 Question／Option ID，缺 ID 即拒絕，不送 Option value。只產生有效 answers 與 map |
| `app/domain/error-path.ts` | 產生 F2 `ErrorPathMap` 的 delta／publish／answer 三種 map，交既有 `locateDetails`；回穩定 key／欄位 suffix，未知或已刪控制的 detail 留摘要。F6／F7／F8 才接 Dialog、欄位訊息與焦點 |
| `tests/unit/f5-editor.spec.ts`、`f5-definition-request.spec.ts`、`f5-answer.spec.ts`；必要 `tests/fixtures/f5/` | 直接 import 產品純函式，使用正式 DTO／raw JSON 及固定預期 Body／定位；不另建 Browser harness |

**基準與 dirty。** Baseline 保留 Server ID、原 sortOrder、原始 config 的省略 key、deadline 原精度；effective variant 只由題型 fallback 計算，不寫回 config。數值候選用 ExactNumber／有界整數，dirty 比對 model 與基準，數值用精確等值、時間用 F2 deadline helper；未完成／非法輸入仍能辨識差異。new 未輸入可 clean 但尚不合法，載入不製造 dirty，改回基準清 dirty；Rating 缺 bounds 不補值。

| 代表編輯案例（Q3／O2 為 Server UUID 別名） | builder 預期／驗證時點 |
| --- | --- |
| 既有 text `config={}`，顯示 input；未改／切 textarea 再切回 input | clean／no-op，variant 仍省略；model／builder unit |
| 同上只改 title | `questions:[{id:Q3,title:新值}]`，不送 config；builder unit |
| 原 `config={minLength:2}`，只加 placeholder | 完整 `config:{minLength:2,placeholder:新值}`，保留其他設定／省略 variant；真正切 textarea 才明確送 variant；builder unit |
| 載入 sortOrder 10／30；之後交換／還原 | 未改保留原值；交換送兩題 0／1、ID／value 不變；還原原成員／順序回基準排序與 clean；model／builder unit |
| 新增再本地刪除；刪既有 O2／整題 | 前者無新增／刪除 Delta；O2 用 `options:[{id:O2}]`；整題只送 Question id-only；builder unit |

集合比較最終成員／順序，實際增刪／重排的集合才產生 0..n-1，未變集合保留原 sortOrder；不以「曾操作」旗標把稀疏排序永久判 dirty。先驗完整最終候選，再建立每個 ID 至多一次的 Delta；description 清除用 null，deadline 未改省略／清除用 null。

**題型切換。** 純函式先回是否需確認清 Options，F6 UI 日後確認才套用，取消不改 model。Choice 互換保留 Options／ID／value、換目標預設 variant；Choice→非 Choice 清本地 Options，Delta 送 type＋目標完整 config，不送非空 Option Delta。非 Choice→Choice 建兩個新選項；其他切換採目標初值，同題型 variant 切換保留相容設定。確認清除的選項不因切回題型自動復原。

**快照與錯誤（§7.1 項目 4）。** 若只更新畫面第三題，Delta `questions[0].options[0].label` 映到該題／Option key；Publish map 用完整已保存 Definition 順序，不能沿用 Delta map；Answer 跳過 optional 空題後按送出索引映射，漏答用 `questions.<questionId>` 定位。Body／map 同次建立且獨立複製，後來重排不改舊 map，不依 detail 陣列順序猜位置。

基準重建入口只接受解碼後完整 FormDetail，依 Server 回應重建 key／ID、原 config／排序與 clean 基準，不靠 label／Array index 猜新 ID；失敗不採候選作基準。F5 提供純重建／快照函式；F6 才在 current scope 成功時採用，pending 凍結定義並沿同 Form 互斥，明確失敗保留 model，unknown 結束 loading 但鎖保存／發布，直到手動 GET 經丟棄確認且成功採用可靠基準才解除。F5 不另寫 loading／未知結果狀態機。

**答案。** number 空字串／rating 未操作為未作答，0 有效，Range 視覺初值 min 與答案分開。Text trim 空白／multiple `[]` 等 optional 空題省略，全部 optional 可回 `answers:[]`；required 空題、非法非空 optional 值皆阻擋。Choice 驗同題歸屬／重複；Number 以 ExactNumber 比較 bounds、等值及精確 JSON number token，不經 Number()／truthy／數值 coercion。Preview snapshot／答案與 Editor 獨立；F8 才接成功提交／整份 Latest mapping 後的基準及資料取代流程。

## 3. 必要測試、風險與缺前置處理

| 方法／時點 | 目標與選用理由 |
| --- | --- |
| Model／操作完成：Vitest | new 初值、載入 clean／原 config、獨立快照、tmp／Server ID、label 重複合法／value 穩定；五題型切換／取消清 Options；稀疏排序與增刪重排／還原、改回清 dirty。純規則可直接驗，不需 Browser |
| Validator／builder 完成：Vitest | Draft 空 Questions／Choice 無 Options／Rating 缺 bounds可保存，Publish 拒絕；非法已提供 config／null／未知 key、整數／bounds、Unicode trim／Code Point。§2 各例、Create 白名單、nullable／deadline、noop／id-only／config 全替換；固定預期 wire 與候選效果，避免僅自比 |
| path／基準完成：Vitest | Delta 第三題／巢狀 Option、刪除項／未知 detail 留摘要；Publish 與 Delta 不混用；Body／map 不受後續編輯影響；成功 DTO 含新 IDs 重建 clean，未採成功回應不改基準 |
| Answer 完成：Vitest | 五題型 required／optional、空／0／清除、精確 bounds；長小數／9007199254740993／科學記號經本輪 builder→F2 serializer／parser 往返，1／1.0／1e0 等值；Option ID 非 value、跨題／重複拒絕，省略後 path／漏答 ID 定位、Preview key 不漏進正式 Body |
| 交付前工程檢查 | `npm run lint`、`npm run typecheck`（Nuxt＋tools strict）、`npm run build`、`npm run test:unit -- tests/unit/f5-editor.spec.ts tests/unit/f5-definition-request.spec.ts tests/unit/f5-answer.spec.ts tests/unit/exact-number-gate.spec.ts tests/unit/common-adapters.spec.ts`、`git diff --check`。兩份 F2 unit 回歸驗本輪直接使用的精確收送／時間／文字／path 接合，不全面重跑 F1～F4 |

Browser／真實 API／人工實機本輪不適用：沒有 Cookie／CORS、導航、beforeunload、UI 或保存讀回的新接法；有效 F2／F3／F4 歷史證據按未變機制沿用，不列成本次新 PASS。若開發確需改共用機制，再補其受影響 unit／必要 Browser 回歸；**開發自測不新增測試計畫核准關卡**。真實保存讀回留 F6／F8 依 scope 執行，不能以 unit 代填。

主要風險為初始化補值／排序製造 dirty、id-only 誤刪、config replacement 遺失設定、數值失真與錯誤標到另一題；用以上固定案例在 UI 接入前驗證。缺 ID／不可解析值直接回 invalid，不猜值；契約衝突列檔名／章節，只停受影響模組。

F5 不依賴真實 Form／DB 測資，可獨立完成契約 fixture。既有真實非空 ≥11／21 筆清單／filter／縮頁第二支 GET Auth、Owner Draft／Published／Closed 跨角色、隱藏／已刪除／截止 Form、特殊 Auth／disabled／受控故障／晚回仍 **BLOCKED**；readiness／live 版本未確認不解除缺口，F6／F8 接真實操作前再核對。原 npm ci native binding EPERM／audit、其他 Browser／人工實機缺口保留；本輪不為純 Domain 自測重裝、升級或重建 DB。

## 4. 規劃基準、本次檢查與停止點

- 工作目錄 `C:\Users\user\Desktop\custom-form-service-web`；起點 **master／`88c1e6b4007c04ba8831560d48880ba9f7311d52`，工作樹乾淨**。實測 Node **24.21.0**／npm **11.19.0**；現有 package／lockfile 為 Nuxt 4.6.1、UI 4.11.3、Tailwind 4.3.3、TypeScript 5.9.3、Zod 4.6.5、Vitest 5.0.3、Playwright 1.64.0、lossless-json 4.3.1，預計沿用、不新增依賴。
- F2 共用能力與 F4 完整 FormDetail loader／review 結果可承接。沿用 [F2 精確 gate 歷史證據](F2_Development_Report.md#2-精確數值-gate)與[獨立核對](../review/F2_Code_Review_Report_20261011.md)；本次 Git 核對 `exact-number.ts`／`exact-json.ts`／`datetime.ts`／gate 測試自 F2 原交付至本 HEAD 無 diff，沒有重跑 gate。F4 review 結果引用[已提交複核](../review/F4_R1_Correction_ReReview_Report_20261012.md)，不覆寫歷史結果。
- 後端快照 manifest 本次 **108／108 hash 相符**。2026-10-12 **22:00:31 台北時間**起唯讀 probe：`/health`／`/openapi/v1.json` **200**，OpenAPI 3.1.1／info.version 1.0.0 列 Create／Draft PATCH／Response／Statistics；`/health/ready` 在 **5 秒 timeout** 內未完成，readiness **UNCONFIRMED**。live Git SHA／process checkout／DB 版本 **UNCONFIRMED**；未做業務讀寫或 Browser／DB 操作，metadata 不代表整合 PASS，快照 R10 狀態不代稱 live。
- 本次新增計畫並同步 README／總計畫最新進度，產品／測試／依賴／backend-ref 不變；提交前核對文件連結／控制字元／末尾換行與 `git diff --check`。install／lint／typecheck／build／unit／Browser／業務 API／正式 AI／人工驗收均 **NOT RUN**，不把規劃案例當執行證據。文件提交完整 SHA／最終 Git 狀態見交付訊息與 Git log，避免自指 SHA。

沿用 **計畫確認 → 整輪開發、自測及範圍內修正交付後集中 review**；本版 Owner review 並明確指令開始後才開發，正式驗收另由 Owner 指定。

**停止於「F5 計畫待 Owner review」。本次不開發 F5、不推送、不展開後續 Round，也不將 F4 改為 accepted。**
