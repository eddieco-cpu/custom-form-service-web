# F8 開發報告 — Submit、Receipt、Latest 與 knownSubmitted

版本：1.0／2026-10-14（Asia/Taipei）。**F8 開發完成、待集中 review。** Owner 已通過 [F8 精簡實作計畫 v1.0](F8_Implementation_Plan.md)，明確授權整輪開發、必要自測、範圍內修正、受影響回歸、正常 API 建立保留合成測資及單一目的本機提交；三份既有規劃文件亦已核准，一併同步。沿用「計畫確認 → 整輪開發、自測與範圍內修正 → 集中 review」，沒有新增中途測試計畫核准關卡。本報告只記開發自測，集中 review／正式 AI 驗收／人工驗收均未執行；accepted 不變，不推送、不展開 F9。

## 1. 接手與來源版本

- 前端實際位置 `C:\Users\user\Desktop\custom-form-service-web`，分支 master，接手 HEAD **`134629a8ce9d2b276ec7a3a10a6843977814f41b`**，與 Owner 指定相同。開發前只有已核准 README／總計畫／F8 計畫三份規劃變更，沒有其他待保護的使用者變更。
- 依 [AGENTS v1.1](../../AGENTS.md)、[development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫 v1.3](V1_Frontend_Implementation_Plan.md) F8／§7／§7.1 與核准計畫執行。產品依前端 00／01／03／04／05／07 v1.0、02／06 v1.1；受影響章節與正式後端 00／01／02／03a／03b／03c／04／05 的版本／章節詳見計畫 §1。本輪未發現需更動產品規則或 API 的來源衝突。
- 唯讀 `backend-ref/` 快照來源 master／**`7591633137c5a6f57c1fce8e1ba19ab394015880`**，manifest 108 筆保持相符。實際後端 checkout `C:\Users\user\Desktop\custom-form-service` 仍為該 SHA，既存 `?? SNAPSHOT.md` 未動。
- 20:45 開發前 health／readiness／OpenAPI 200；20:50:34 的 [runtime 觀察](evidence/F8_20261014/backend-runtime.json)確認 PID 29108 dotnet command 指向 `CustomFormService.Api.dll`，ProductVersion `1.0.0+7591633137c5a6f57c1fce8e1ba19ab394015880`、SHA-256 `06e2a62db9c4376701e75b0ce3e7283d34b129d378c884e33fb1cb764a0af180`。DB identity／migration 仍 UNCONFIRMED；沒有用 checkout 或 OpenAPI 代替提交／讀回證據。
- [環境紀錄](evidence/F8_20261014/environment.json)：Node **24.21.0**／npm **11.19.0**；Nuxt 4.6.1、Nuxt UI 4.11.3、Tailwind 4.3.3、Vue 3.5.43、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0、lossless-json 4.3.1，八項 installed／lockfile 相符。CSR、strict、30 秒 timeout、credentials=include、零自動 retry 沿既有配置；沒有新增依賴、Endpoint、BFF 或答案持久化。

Owner 對 F7 最終獨立複核的採納已同步於 README／總計畫 §9.31：R1／R2／R3／R4／R3-N1 全部 CLOSED、F7 code review 通過。F7 原報告、失敗原件與既有缺口維持；本輪自測不取代該歷史結論，也不替 F8 宣告 code review 通過。

## 2. 實際變更與行為

| 位置 | 本輪變更與目的 |
| --- | --- |
| `app/domain/response-mapping.ts`、`app/services/response.ts` | 正常 POST Submit／201、主動 GET Latest／200；通用 lossless Receipt 後，按 saved Definition 校驗 formId、Question／Option IDs、型別、重複、required／config 與整份答案。Number 保留 ExactNumber，Rating 僅在確認範圍後轉安全整數。先建整份空模型再 mapping；缺 optional 清空，錯誤整份拒絕，201 另核對送出候選語意，不部分採用。 |
| `app/domain/response-page.ts`、`app/composables/useFormResponse.ts` | 當頁模型／baseline／資格／knownSubmitted／Latest 候選／錯誤與未知核對；進頁、刷新、重入及 URL context 變更空白，零 Latest 預查。Auth 失效留本地內容、撤資格；成功 GET me＋Form 且通過 dirty 確認才綁新身分，換本人 context 不沿用舊答案或 response 風險。 |
| `app/components/forms/FormReadPage.vue`、`FormSubmitSuccessDialog.vue` | 正式五題型填答、資格核對、主動本人 Latest、最近提交時間、single readonly／本地輸入標示、必須完成／×的成功 Dialog、操作錯誤／首錯聚焦；正常 Closed／已截止進頁留空 readonly，可讀本人 Latest；F9 統計頁未展開。 |
| `app/components/forms/FormRenderer.vue` | 沿 F6 共用控制與穩定 Question key／Renderer instance；加入欄位明細及首個可用控制定位。readonly optional 全 White_Space 顯示「尚未作答」，raw 未被覆寫。Preview 仍使用自己的空模型／基準，沒有正式 Submit／Latest／資格副作用。 |
| `app/domain/operation-state.ts` | response-single／multiple 使用既有同 Form lease；Lifecycle／Delete 未確認狀態 gate 約束提交。新增受限的 response context 重置，只清已結束本人 context 的 response 軟限制，保留管理 unknown；普通 Form GET／Latest 不清 multiple duplicateRisk。 |
| `playwright.f8.config.ts`、F8 unit／Browser／live tests | 本輪必要資料／狀態、fresh built fixture、真實 Cookie／CORS／保存讀回與受影響回歸。獨立 Run label／reporter 保存重測與首次 FAIL，沿 F6 精確 network diagnostics，沒有降低既有 F6／F7 tests 斷言。 |

沿 F5 `emptyAnswers`／`answerDirty`／`validateAnswers`／`buildAnswerRequest`、exact snapshot／path map：text 按 White_Space／Code Point 語意驗證，Number raw／精確值保留，選項送 Server ID，Rating 未操作與 0 分開，全 optional 可送 `{answers:[]}`，multiple 同內容可新增 Response。optional 省略後 `answers[i]` 仍定位正確題目；`questions.<questionId>`／多選索引／未知 path 摘要均保留。

single 的 decoded 201／可靠 Latest 200／RESPONSE_ALREADY_SUBMITTED 才建立 knownSubmitted；dirty Latest 取消保留本地輸入及原 baseline，但已提交證據仍成立並 readonly。Latest 404／讀取失敗不退回既有證據，也不證明先前未知 POST 失敗。multiple 未知提交採用 Latest 後仍保留 duplicateRisk，再次 Submit 明確確認，取消零 POST；可靠後續 201 或該本人 context 結束才解除。

正式頁只有一個 DirtyScope／ActiveDirtyScope；答案語意差異與 response／管理 unknown 都參與導航／beforeunload。Submit pending 凍結答案與資料取代，與 Close／Visibility／Delete 互斥；管理成功 DTO 只合併 whitelist metadata，不覆寫答案。read scopes、Session／URL／content／write revision 使跨寫入舊 GET 永久失效；finally 不清新請求 loading。本機截止 timer 僅停後續操作，不丟棄同 context 可靠晚回 201。

FORM_NOT_SUBMITTABLE 先撤 Submit、查最新 Form，不以舊 Published 假定 Closed；提前關錯誤 Dialog 仍等待候選結果，再按可靠 Closed／dirty 導航。候選 GET 失敗另外顯示讀取錯誤與新 Dialog revision，不重送原 POST。一般手動 Form／資格 GET 失敗維持 F7 inline read error；已載入頁面的 Auth 操作錯誤才按 Dialog／dirty／原 URL login 分流。

## 3. 開發自測結果

下表為**目前交付 source／fresh build**的實際最新結果，歷史過程結果另保留，不合併成虛構測試數。所有 fixture 案例使用模擬 API；必要真實保存／讀回分列於 §4。

| 方法／實際命令 | 結果與證據 |
| --- | --- |
| `npm run lint` | **PASS**；[final log](evidence/F8_20261014/logs/lint-final.log)。 |
| `npm run typecheck`（Nuxt strict＋`tsc --noEmit -p tsconfig.tools.json`） | **PASS**，包含 app／本輪 tests／configs；[final log](evidence/F8_20261014/logs/typecheck-regression-corrected.log)。 |
| `node node_modules/nuxt/bin/nuxt.mjs typecheck tests/fixtures/f6/browser` | **PASS**，受影響 F6 harness strict；[log](evidence/F8_20261014/logs/f6-harness-typecheck.log)。 |
| `npm run build` | **PASS**；[final build](evidence/F8_20261014/logs/build-regression-corrected.log)。12 份本輪 source 與完整 `.output` SHA-256 見 [digest](evidence/F8_20261014/final-source-build-digest.json)。 |
| `npm run test:unit -- tests/unit/f8-response-page.spec.ts tests/unit/f5-answer.spec.ts tests/unit/scoped-state.spec.ts tests/unit/f7-form-management.spec.ts tests/unit/f6-editor-page.spec.ts tests/unit/api-client.spec.ts` | **201／201 PASS（6 files，其中 F8 58 案）**；[log](evidence/F8_20261014/logs/unit-closeout.log)。mapping／exact、資格／knownSubmitted／dirty、未知／互斥／stale／晚回與既有規則受影響回歸。 |
| `$env:F8_MODE='built'; $env:F8_RUN_LABEL='reader-final'; npm run test:e2e -- --config=playwright.f8.config.ts` | **29／29 PASS，零 skipped／flaky**；[reporter](evidence/F8_20261014/browser/built-reader-final-results.json)。Chromium 156.0.8078.4，fresh built app＋攔截；五型 variants／required／0／optional、201／Latest、三種 Auth／disabled、dirty／beforeunload／logout／Delete、crosswrite、multiple risk、提前關錯誤及晚回截止等。 |
| `$env:F7_MODE='built'; $env:F7_RUN_LABEL='f8-regression-corrected'; npm run test:e2e -- --config=playwright.f7.config.ts --grep 'F7-R2\|F7-R3\|F7-B02\|F7-B03\|F7-B09\|F7-B10\|F7-B11\|F7-B16'` | **34／34 PASS**；[reporter](evidence/F8_20261014/browser/f7-built-f8-regression-corrected-results.json)。原 F7 tests 未修改；Owner管理／unknown dirty／beforeunload／單次 Delete／Header logout／GET failure 與隔離。 |
| `$env:F6_MODE='fixture'; npm run test:e2e -- --config=playwright.f6.config.ts --grep 'Preview isolation\|Stars/Range\|Renderer readonly\|F6-R1'` | **5／5 PASS**；[reporter](evidence/F8_20261014/browser/f6-fixture-results.json)。Preview API／模型隔離、Stars／Range、readonly、同名與跨 Renderer 控制隔離；原 F6 tests 未修改。 |
| F8 built，`F8_CHANNEL=chrome`／`msedge`、`F8_RUN_LABEL=smoke`，相同 config，grep `B01/B03 single\|B04 multiple` | **Chrome 156.0.8078.12 2／2、Edge 155.0.4283.45 2／2 PASS**；[Chrome](evidence/F8_20261014/browser/built-chrome-smoke-results.json)／[Edge](evidence/F8_20261014/browser/built-msedge-smoke-results.json)。single Submit／刷新空白／Dialog及 multiple Latest 整份取代代表 smoke，未宣稱完整跨瀏覽器驗收。 |

Browser 自測包括 1440×900、390×844 與 320px viewport，長答案／100 Stars、控制可達性與不水平溢位斷言；已目視 [320px 合成畫面](evidence/F8_20261014/images/built-reader-final-results-mobile-answer.png) 及 [真實 multiple 畫面](evidence/F8_20261014/images/live-reader-final-results-live-multiple.png)。這是 Chromium viewport／桌機 Browser 自測，未代表實機觸控、軟鍵盤或人工驗收。

沒有改依賴，不重跑 install／audit；沒有新增與樣式鏡像的 unit。未要求完整 Firefox／WebKit、負載／DB 交易／後端並行重驗，不將前端 409 或 fixture race 當後端並行驗收。unit／build／Browser 子程序首次受 sandbox EPERM 阻擋後，以既有授權正常命令重跑；沒有停既有後端，前端測試只管理自己啟動的 server，`reuseExistingServer=false`。

## 4. 真實 API L01～L05 與保留測資

`F8_MODE=live`＋`F8_RUN_LABEL=reader-final`，同一 `npm run test:e2e -- --config=playwright.f8.config.ts`：**1 個分組測試 PASS，內含 L01～L05 全部成功斷言**，零 skipped／flaky。[最新 reporter](evidence/F8_20261014/browser/live-reader-final-results.json)／[去敏實際 wire、Receipt 與獨立讀取](evidence/F8_20261014/f8-1791987582885-reader-final-sanitized.json)。正常 Register／Login／Create／Publish／Close／Submit API 執行；GET 包含本人 Latest／資格／Form。沒有攔截實際業務回應、真實 Delete／PATCH／SQL／DB reset；對歷史測資沒有寫入。

| 案例 | 真實觀察與結果 |
| --- | --- |
| L01 | Owner／非 Owner 同樣適用 Published 收件規則，分別五題型 201，獨立 Latest 是自己的不同 Receipt。Owner text trim／換行／emoji、`9007199254740993.12345678901234567890123456789` 精確數字、正式 Option IDs、Rating 0；single 成功 readonly，刷新空白，重送 409 後建立 knownSubmitted。 |
| L02 | multiple 第一份完整五型，第二份只留 Number 0／Rating 0；獨立 Latest 缺 optional Text／Choice，UI 整份取代清空本地文字。同內容再提交取得不同 Response id，再獨立 Latest 等於第三份。 |
| L03 | 全 optional 的 private／anonymous Form 正常提交 `answers:[]`，201 與獨立 Latest 均 []。登入資格仍必要，Latest 不受結果 Visibility 限制。 |
| L04 | 正常短期限 Form 截止前 201，自然到期仍 Published／readonly，獨立 Latest 可讀；正常 Close 後 Closed／readonly／Latest 可讀。另一 F8 專用表單在其他 Owner tab 正常 Close，主頁 dirty Submit409→GET Closed→Dialog→dirty 首頁；獨立 Latest404 證實該被拒送出沒有新增本人的 Response。 |
| L05 | 真實清 Cookie 後 POST401（AUTH_REQUIRED）撤 grant，dirty 取消留輸入；正常登入另一 Active 帳號，明確 GET me＋Form 核對後空白、新本人 Latest404，Owner 控制不殘留。再次清 Cookie／401，接受 dirty 導 login、正常登入返回原 Form 空白。L01 雙帳號 Latest 各自 Receipt 隔離。 |

最新 run 7 份成功 Receipt／**10 次獨立 Latest（8×200、2×404）**，另一次獨立 GET Form 確認自然到期仍 Published；70 個實際 API response 全部觀察 CORS origin `http://localhost:3000`／allow-credentials `true`。Browser credentialed fetch、HttpOnly access Cookie 存在／清除／正常重新登入與刷新均實測，未保存 Cookie 值。預期401／409／404按 method／完整URL／status／次數在操作前宣告；network diagnostics 差異、pageerror、非授權 method／資源寫入均空陣列。

三個保留 run 皆各新增 2 個合成帳號、6 份專用 Form、7 份 Response：

- `f8-1791984869005-first`：首次 live，L01～L05 **PASS**。
- `f8-1791986410082-final`：截止／狀態錯誤範圍修正後 live，L01～L05 **PASS**。
- `f8-1791987582885-reader-final`：F7 read-error 相容修正後交付版 live，L01～L05 **PASS**。

合計 **6 個帳號／18 份 Form／21 份 Response** 全部保留，未刪除／清理；所有 Run label、Form ID、用途、最終 Published／Closed 狀態見 [完整保留索引](evidence/F8_20261014/retained-live-runs.json)，每 run 的 Receipt ID／timestamp／實際 body 另在同目錄 `*-sanitized.json`。各帳號為該 Run 的 `owner`／`respondent` 合成角色；登入憑證只留 ignored 本機 `output/playwright/f8/*-private-credentials.json`，未提交。

| 最新 run 資源 ID | 用途／狀態 |
| --- | --- |
| `8956cb1c-d00b-4893-bad3-21179bd8f9c7` | L01 single／Published；Owner／respondent 各一份五型答案 |
| `7bdc7af7-ad6a-4a46-be9b-3e1a1bf69e7e` | L02 multiple／Published；完整／省略optional／同內容三份 |
| `41a28e68-7cbf-4456-8f11-67976383106e` | L03 all optional private anonymous／Published |
| `34aeb4ce-0e51-42d4-b0cd-f1e5cbc641e9` | L04 自然截止後正常 Close／Closed；截止前答案保留 |
| `a7a982d8-5697-40b1-b698-87cd25094251` | L04 dirty期間其他 Owner tab Close／Closed；拒送未新增本人答案 |
| `a26b8ecc-3d45-4060-aaf7-840e9eb87d83` | L05 真實401／兩帳號資格核對／Published；無成功答案 |

## 5. 首次失敗、修正與證據界線

原始本機 reporter／logs 均保留於 ignored output；交付 [verification summary](evidence/F8_20261014/verification-summary.json) 保留各次真實結果，包括 FAIL，不以最後 PASS 擦除過程。主要首次失敗：

| 首次實際結果 | 原因、範圍內修正與後續結果 |
| --- | --- |
| unit 啟動 EPERM；第二次 F8 suite generation FAIL（其他143案PASS） | 子程序 sandbox 與 `%j` 測試名對 ExactNumber 呼叫普通 JSON.stringify；改用不觸發 toJSON 的案例編號。保留 [unit-first](evidence/F8_20261014/logs/unit-first.log)／[unit-second](evidence/F8_20261014/logs/unit-second.log)，產品精度模型未放寬；最後201／201。 |
| typecheck／lint 階段 FAIL | 新 tests 的 readonly fixture／union narrowing及未使用 import／ternary expression 修正；[全部 logs](evidence/F8_20261014/verification-summary.json)保留。最後 app／tools／harness strict 及 lint PASS。 |
| F8 built first **17PASS／3FAIL**，corrected **18PASS／2FAIL** | harness native-dialog 回傳／URL reload wait／locale「關閉」與 Owner menu toggle 定位修正；過程 [first](evidence/F8_20261014/browser/built-first-results.json)／[corrected](evidence/F8_20261014/browser/built-corrected-results.json)不改寫。移除對 speculative ERR_ABORTED 的預期允許，等待實際 late response 完成，維持精確零非預期失敗，不新增全域忽略。 |
| whitespace readonly **1FAIL** | 實際 POST已正確為[]，optional純空白成功後readonly顯示空白；改用共用 trimWhiteSpace 顯示「尚未作答」，raw不變。[before reporter](evidence/F8_20261014/browser/built-whitespace-before-results.json)／[before source digest](evidence/F8_20261014/whitespace-before-source.json)保留；最後同案PASS。 |
| 狀態錯誤 unit **1FAIL／53PASS** | FORM_NOT_SUBMITTABLE 的最新 Form GET 還 pending 就提前關 Dialog，可靠 Closed 導向遺失；closeError 等待同context的statusCheck，失敗明列讀取錯誤，不以舊status推論。[before log](evidence/F8_20261014/logs/unit-status-before.log)保留；新增早關／讀取失敗／晚回 Browser與unit後全套PASS。 |
| F7受影響首跑 **31PASS／3FAIL** | F8把普通 Form／資格 GET500改成Dialog，遮蔽F7 inline錯誤後的核對／Visibility控制；恢復普通GET失敗inline，Auth／compound status失敗依原語意分流、核對開始清舊inline錯誤。[first regression](evidence/F8_20261014/browser/f7-built-f8-regression-results.json)保留，F7原tests未變；相同34案**34／34 PASS**，再跑F8完整／Chrome／Edge／真實L01～L05均PASS。 |

[artifact manifest](evidence/F8_20261014/artifact-manifest.json) 記交付 SHA-256；summary 同時記本機 rawPath／rawSha256 與交付 normalized hash。文字證據只去 BOM、換行／尾端空白，沒有更寫測試 status；collector source 隨附 [collect.mjs.txt](evidence/F8_20261014/collect.mjs.txt)。去敏掃描含 reporter inline JSON／text attachments，排除所有已知合成密碼與 JWT；截圖只有合成資料。沒有交付 Cookie／Token／密碼／storageState／秘密 header／私有憑證原件。

## 6. 保留缺口、Git 與停止點

| 項目 | 本輪狀態 |
| --- | --- |
| 真實 invalid／expired Token、AUTH_USER_DISABLED | **BLOCKED**：缺已同意的受控安排；fixture三Auth／disabled前端分流PASS，真實AUTH_REQUIRED已PASS；不造簽Token、不SQL停用。 |
| 真實Server提交後fault／timeout／500與交易回滾 | **BLOCKED**：缺安全的受控故障前置；fixture unknown／malformed201／multiple risk／Latest核對PASS，不宣稱真實交易故障驗收；不停止既有後端。 |
| DB identity／migration | **UNCONFIRMED**：正常API可用與runtime SHA不能取代DB來源確認；未reset DB／volume／SQL。 |
| 實機touch／軟鍵盤／safe-area、Owner操作／正式AI驗收 | **NOT RUN**；Browser viewport結果與人工／正式驗收分開。F4≥11／21列表、完整特殊狀態等歷史缺口未由F8少量測資解除。 |
| Google／遠端正式服務／production HTTPS | 延期，沿既有範圍。F9 Statistics body與存取矩陣未展開。 |

交付前核對 staged diff／文件連結／證據hash／保護路徑與 backend snapshot；未修改 package／lockfile、規格、AGENTS／skills、backend-ref、歷史review／報告／已提交證據或 accepted。README與總計畫只追加本輪授權／進度，F8計畫保留原規劃停止點歷史並追加本輪結果。

[交付核對](evidence/F8_20261014/closeout-checks.json) **PASS**：12份source／156份build／108份backend snapshot hash相符，交付manifest與202個文件連結／30個表格、README／總計畫原歷史內容相符，去敏掃描與保留測資數量通過。核對腳本首次以案例label猜測Latest數量而漏計未標記Latest字樣的讀回，已改按實際Receipt／錯誤body判斷8次200＋2次404，產品與業務測試未重跑或改寫；[原核對失敗log](evidence/F8_20261014/logs/document-check-first.log)保留。

本輪產品／tests、已核准三份規劃文件、本報告與去敏證據作**單一目的本機提交**，完整SHA見本次Git log／交付訊息（避免文件自我SHA循環）；提交後工作樹狀態於交付訊息明列。**停止於「F8 開發完成、待集中 review」**；正式驗收仍延後、accepted不變，未推送、未展開F9。
