# F9 獨立集中 Code Review

2026-10-16（Asia/Taipei；執行跨 10-15～10-16）。**本次未發現新增、可重現且需修正的 P0／P1／P2／P3 產品 findings；F9 集中 code review 通過，待 Owner 確認。** 產品與既有 tests 全程唯讀。正式 AI／人工驗收未執行，accepted 不變。

## 1. 範圍與精簡覆蓋表

比較 **`e25fe36ce887ce9a74fcbc66ee14e9edb4b7adf0` → `20381116101824aeccca405eaaf4336f6fea9784`**。接手 master／HEAD 等於交付 SHA，工作樹乾淨。讀實際 diff、九份產品檔、F9 unit／fixture／Browser／live／config、F3 mock 增補、共用 Auth／RequestScope／client／decoder／Header／登入返回、核准計畫、開發報告及本機原件；沒有以報告 PASS 代替執行。本輪新增的診斷位於 ignored `output/playwright/f9-review-20261015/`，可重現副本在 [diagnostics](evidence/F9_Independent_20261016/diagnostics/)。

以下覆蓋表已於工具執行前向 Owner 列出，同輪直接執行，沒有新增核准 gate。

| 審查目標 | 預期來源 | 測試方式 | 沿用／新跑證據與缺口 |
| --- | --- | --- | --- |
| Statistics／me 並行、真正換身分、晚回應與 finally | F9 §3；前端 04／06 | diff、deferred unit、fresh built、harness、跨輪 | 新跑 284 unit＋18 獨立診斷；Browser 正常 Abort 與不可取消 unit 分開 |
| 九 Root、三層 count、Number、完整 Latest 與名單 | 前端 03 §10～12；後端 03c §3／8 | 固定輸入、完整 Body／UI／獨立 GET；獨立 Python Decimal oracle | 新跑 L02；歷史 27／本次 22 份成功 Body 重算，匿名／同名／長內容另驗 |
| Closed 權限、Draft／Published、401 返回及公開壞 Cookie | 後端 03a／03c／04／05 | 真實 L01～L03；受控故障 fixture | 本次 42 真實分案；六項特殊前置仍 BLOCKED |
| 42／59 數量及分次適用性 | 開發報告、reporter、原件／build-source | 逐案去重、run／首敗／重測／來源核對 | 歷史結果保留；交付版另作單次完整 live 重跑 |
| F3 mock、UTC／request 分段、network 嚴格度、harness 隔離 | 實際 tests diff、F9 §6 | 靜態核對、lint／strict／build、獨立 harness strict、產物掃描 | 既有斷言不變；產品產物無 harness；中間測試快照限制見 §5 |

流程依 [AGENTS v1.1](../../AGENTS.md)、[development skill review 邊界](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫 v1.3 F9／§7／§7.1](../implementation/V1_Frontend_Implementation_Plan.md)、[核准 F9 計畫 v1.0](../implementation/F9_Implementation_Plan.md)。產品依前端 00／01／03／04／05／07 v1.0、02／06 v1.1；重點 03 §9～12、04 §2～6／§9～12、05 §2～3／§6～10、06 §4～6／§8／§10～11、07 §8～10。後端以 [SNAPSHOT](../../backend-ref/SNAPSHOT.md) 八份正式契約為準：00／01／03c／05 v1.1，02／03a／03b／04 v1.0；重點 01 STA-01～05／SUB-06、03a §2～6、03c §3.4～3.5／§7～8、04 §4／5／7／10、05 §5～6／§10～13。未發現本輪需改契約或產品規則的衝突；文件早期「R10 尚未完成」保持歷史語境，未用來推定目前服務不可用。

## 2. 分級 findings 與獨立判讀

| 等級 | 需修正 findings |
| --- | --- |
| P0／P1／P2／P3 | 各 0 |

| 重點 | 獨立判讀及實際證據 |
| --- | --- |
| me 與 Stats 分離 | Statistics 沒有 auth middleware，service 僅送 credentialed Statistics GET，沒有 Form／Latest／Count 預查。plugin 背景 me 與頁面並行；明確 bootstrap 來源不推進 Stats 私有 credential 世代。me200／401／403／500 與 Stats200 的兩種順序各通過，公開結果不被撤下或導航。 |
| sessionRevision／舊 me | Auth 原 generation／revision 採用條件保留；Login／Logout／invalidate／不同 User 的 Profile 或 verify 仍變更 sessionRevision。bootstrap 來源沿 initialize→verify→candidate→applyRead／invalidate 傳遞。同 ID 改名不通知換身分。原 F3 Auth unit、跨輪 Browser、新增 Login／Logout 超越晚 me200／401／403 均通過。 |
| 自身 401／外部 context | 自身 invalidate 的同步通知只清內容／scope，不自行重查或撤掉當次 auth flow；flow 接續自己的新 revision，導航前再比 path／generation／revision。初次只 replace 一次；已有資料的手動讀取先撤名單、Dialog 關閉／×才返回。外部 login／logout／verify／invalidate／route／dispose 撤銷 flow。獨立 Browser 證明自身401後晚 me200不復活 Header；外部 Login 清 manual401 Dialog，新的403留原 URL、無舊名單。 |
| 晚回 200／401／403／finally | 所有採用及 Auth 副作用先驗 current ticket；finally 僅結束仍 active 的同一 ticket。換 Form／query／hash／Session／卸載與重試均隔離。Browser Abort 舊請求不冒稱已交付晚 Body；不可取消的晚 Body／finally 由原 unit＋獨立 deferred 診斷證明 B loading／Header／導航不受污染。 |
| 資料與 UI | 九 Root 不補 status／Creator ID／responseIdentity；三層 count 分開呈現，不由 Item 加總推 Root。Number 直接顯示 ExactNumber token；匿名省略 respondents，具名只列當 Item、同名不同 ID 不合併。30 題／200 分布／120 人／2000 Code Points／101 評分列完整，390px 無水平溢位、可捲至末名；重試失敗清私人內容。已目視 [手機末端名單](evidence/F9_Independent_20261016/images/mobile-long-names.png)／[本次真實完整統計](evidence/F9_Independent_20261016/images/live-current-names.png)。 |
| 契約權限／錯誤 | 真實兩 Identity×三 Visibility×四身分 24 格，private guest401／無資格403／public200；Draft Owner409、非Owner／guest404；Published含自然到期 Active409／guest404；無效 UUID400 先於 Auth，已刪／不存在404。清 Cookie 得 AUTH_REQUIRED，未冒稱 expired。 |
| F3／工具修正 | F3 只增加精確 GET `/api/v1/forms` 空清單 mock，原登入返回／me次數斷言與未宣告請求失敗保留。Email required marker 改為可命中的 label，返回仍檢查合法完整 redirect。UTC 用完整 tick 比同一瞬間，不截成毫秒。單 GET 邊界改用 request 發送事件，仍嚴格斷言頁面只送自身 Statistics GET。network helper 未修改，精確 method／URL／status／reason／次數／console 配對未放寬。 |
| harness | plugin 僅在隔離 fixture config 注入 Auth／router 事件，沿真實產品頁，不複製 loader。tools tsconfig 僅排除該 client plugin，另由 app tsconfig 的 strict vue-tsc 檢查。fresh harness build／strict／8 案皆通過；掃描完整產品 `.output` 未發現 f9Harness／controls.client／fixtures/f9。 |

## 3. 本次實際版本、工程與 Browser 結果

Node **24.21.0**／npm **11.19.0**；15 項直接依賴宣告／lock／installed 全相符。Nuxt4.6.1、UI4.11.3、Tailwind4.3.3、TypeScript5.9.3、Playwright1.64.0、Vitest5.0.3、lossless-json4.3.1。Chromium156.0.8078.4、Chrome156.0.8078.12、Edge155.0.4283.45。無 install／依賴更新；CSR、30秒 timeout、credentials include、零自動 retry 沿既有設定。

實際後端 `C:\Users\user\Desktop\custom-form-service` HEAD **`7591633137c5a6f57c1fce8e1ba19ab394015880`**；既存 `?? SNAPSHOT.md` 未動。PID **34068** command 綁該 checkout Debug/net10.0 DLL，ProductVersion `1.0.0+7591633137c5a6f57c1fce8e1ba19ab394015880`，SHA-256 `06e2a62db9c4376701e75b0ce3e7283d34b129d378c884e33fb1cb764a0af180`；health／ready／OpenAPI200，OpenAPI3.1.1含 Statistics GET。八份實際正式契約與 snapshot bytes 全相符。見 [environment](evidence/F9_Independent_20261016/execution/environment.json)、[契約比較](evidence/F9_Independent_20261016/execution/backend-contract-comparison.json)。未查 DB identity／migration／runtime DI provider，不以 readiness 代稱這些已確認。

| 命令／方法 | 本次結果 |
| --- | --- |
| `npm run lint` | PASS；[log](evidence/F9_Independent_20261016/execution/lint.log) |
| `npm run typecheck` | PASS，Nuxt＋tools strict；[log](evidence/F9_Independent_20261016/execution/typecheck.log) |
| `npm run build` | 沙箱 EPERM 首敗保留；正常本機權限 fresh build PASS，之後產品未改；[log](evidence/F9_Independent_20261016/execution/build-elevated.log) |
| `npm run test:unit -- tests/unit/f9-statistics-read.spec.ts tests/unit/f9-statistics-view.spec.ts tests/unit/f3-auth.spec.ts tests/unit/scoped-state.spec.ts tests/unit/api-client.spec.ts tests/unit/exact-number-gate.spec.ts tests/unit/common-adapters.spec.ts tests/unit/f7-form-management.spec.ts tests/unit/f8-response-page.spec.ts --reporter=json --outputFile=output/playwright/f9-review-20261015/raw/unit-results.json` | **284／284 PASS，9 files**；[reporter](evidence/F9_Independent_20261016/execution/unit-results.json) |
| `node node_modules/vitest/vitest.mjs run --config output/playwright/f9-review-20261015/reviewer.vitest.config.ts --reporter=json --outputFile=output/playwright/f9-review-20261015/raw/reviewer-unit.json` | **18／18 獨立診斷 PASS**；[reporter](evidence/F9_Independent_20261016/execution/reviewer-unit.json) |
| `node node_modules/nuxt/bin/nuxt.mjs build tests/fixtures/f9/browser`；`node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tests/fixtures/f9/browser/tsconfig.json` | harness build／獨立 strict PASS；[build](evidence/F9_Independent_20261016/execution/harness-build.log)／[strict](evidence/F9_Independent_20261016/execution/harness-strict.log) |
| `F9_MODE=built F9_RUN_LABEL=review-20261015-ready npm run test:e2e -- --config=playwright.f9.config.ts` | **23 PASS／8 alternate-build skipped**；[reporter](evidence/F9_Independent_20261016/browser/built-review-20261015-ready-results.json) |
| `F9_MODE=harness F9_RUN_LABEL=review-20261015 npm run test:e2e -- --config=playwright.f9.config.ts --grep F9-B02` | **8 PASS／1 product-build skipped**；[reporter](evidence/F9_Independent_20261016/browser/harness-review-20261015-results.json)。前項8 skipped皆在此通過，此處1 skipped已在產品組通過，未計 skipped為PASS。 |
| `F9_MODE=regression F9_RUN_LABEL=review-20261015 npm run test:e2e -- --config=playwright.f9.config.ts --grep 'F3-B01\|F3-B02\|F3-B06\|F3-B07\|F3-B08\|F3-B10\|F3-B15\|F3-B16\|logout\|ActiveDirtyScope\|verified new respondent'` | **26／26 PASS**；原24案全涵蓋，grep另選中F3-B14／F7-B13停用與登出代表案；[reporter](evidence/F9_Independent_20261016/browser/regression-review-20261015-results.json) |
| `F9_MODE=built F9_CHANNEL=chrome`／`msedge`，同 config／Run label，grep `public bad-Cookie AUTH_TOKEN_INVALID\|private AUTH_REQUIRED` | **各2／2 PASS**；[Chrome](evidence/F9_Independent_20261016/browser/built-chrome-review-20261015-results.json)／[Edge](evidence/F9_Independent_20261016/browser/built-msedge-review-20261015-results.json)，皆 fixture smoke |
| 獨立 Playwright config，built grep `own Statistics`／harness grep `external Login` | **各1／1 PASS**；[built](evidence/F9_Independent_20261016/execution/reviewer-browser-built-results.json)／[harness](evidence/F9_Independent_20261016/execution/reviewer-browser-harness-results.json)；原件內含精確 network diagnostics |
| `F9_MODE=live F9_RUN_LABEL=independent-review-20261015 npm run test:e2e -- --config=playwright.f9.config.ts` | **3／3 runner tests、42真實分案PASS；6 BLOCKED**；[reporter](evidence/F9_Independent_20261016/browser/live-independent-review-20261015-results.json)／[完整真實原件](evidence/F9_Independent_20261016/live/f9-1792079923977-independent-review-20261015-sanitized.json) |

本次 fixture Browser 共 **63 PASS**＝產品23＋harness8＋跨輪26＋Chrome2＋Edge2＋獨立診斷2。均為 fresh built／隔離 built，業務 API 攔截明列，不能替代下面的真實整合。工程及診斷原始 logs 另存 ignored raw，交付副本僅正規化 BOM／換行／尾空白，SHA 對照見 [raw-copy-index](evidence/F9_Independent_20261016/raw-copy-index.json)。

## 4. 新 Run 真實 L01～L03 與獨立預期

Run **`f9-1792079923977-independent-review-20261015`**；前後端 Origin分別 `http://localhost:3000`／`http://localhost:5000`，API `/api/v1`，preview綁IPv4 `127.0.0.1:3000`，Browser hostname仍localhost。同一 fresh產品build，全組**沒有 route／業務API攔截**，新建3個review專用合成帳號，正常API建表／發布／提交／關閉及專用政策／姓名更新；Cookie HttpOnly／SameSite Lax／localhost實測。沒有沿用舊帳號做姓名修改。未執行 DELETE／SQL／DB或volume重建／時鐘修改。

| 分組 | 本次分案／結果與固定預期 |
| --- | --- |
| L01 | **25 PASS**＝anonymous／identified各12格矩陣＋真實私有Login返回／清Cookie手動401 Dialog。owner_only A200/B403/C403/guest401；respondents A200/B200/C403/guest401；public全200。各200完整Body／UI符合B固定一份答案，匿名省略名單，identified public guest可讀姓名；每次進統計只有自身Stats GET。 |
| L02 | **2 PASS**。4份歷史Response／3人，Root3；A最新整份省略文字與歷史optional，Question counts為 **[2,3,3,3,3,3,3,0]**。MC Items **[2,3,0]**，加總5大於Question3。Number **0／9007199254740992／9007199254740993**分組，長小數精確，1／1.0／1e0合成一組3人；B／C同名不同ID保留。姓名／政策正常PATCH後新GET／UI反映目前值；deadline為2030-12-31T10:30:00.123456Z同一瞬間、台北18:30:00。 |
| L03 | **15 PASS**＝兩Identity零資料2案＋Draft／Published／自然到期Published三種身分9案＋獨立Form GET證明自然到期未Close1案＋已刪／不存在／無效UUID3案。零資料仍完整Root／零票／具名[]；各錯誤留原URL，guest404不被Header401改成登入導航。 |

三個Active Context＋guest分離；**150個API response** CORS Origin／credentials全符，未宣告network diagnostic／pageerror／越界寫入均0。登入返回保留query＋hash；清Cookie只證明missing Cookie，未冒稱invalid／expired。

[獨立 Python oracle](evidence/F9_Independent_20261016/diagnostics/oracle.py.txt) 使用stdlib Decimal／獨立ISO瞬間比較，**不import產品mapper、ExactNumber或live test的expected builder**。先對固定Create輸入核完整12份Definition（僅Server IDs注入），再以另列固定答案核10份POST wire／201 Receipt，按每人submittedAt／id取最新完整Response重算所有層級與全部名單；對**22份成功Statistics完整Body**逐欄核對，包含獨立GET。結果 [review-oracle](evidence/F9_Independent_20261016/execution/review-oracle.json)。原live test同時核UI，各題／Item／姓名／精確值均查驗，不只是UI與同一API數字互比。

[資源索引](evidence/F9_Independent_20261016/resource-index.json) 記錄Run label／每個ID／用途：**3帳號、12份Form（9Closed／1Draft／2Published）、10份Response，全保留**。既有已刪UUID只讀；舊資料無改寫或刪除。密碼僅在ignored private-credentials原件，不進報告或提交。

## 5. 開發證據59／42核對及版本適用性

[完整audit](evidence/F9_Independent_20261016/execution/evidence-audit.json) 核對 backend-ref **108／108**、產品來源與根組態 **93／93**、15項依賴一致；產品source digest仍為 **`3547457891d3165544b00165c7db58e15023f04f740f48697f7632c8d52d00f2`**，與開發交付相符。比對**43份**開發reporter／live／unit／log與ignored原件；JSON等為exact bytes，部分log僅BOM／換行／尾空白正規化，逐份raw/delivery SHA保存。已保留所有首次失敗，沒有重寫歷史結果。

| 歷史執行 | 獨立核對與適用範圍 |
| --- | --- |
| fixture產品首輪／定位重測 | 首輪17PASS／4FAIL；三案Email exact locator停在登入，缺少後續401的network差異仍失敗，未被忽略；另一案URL編碼表示。重測7PASS包含4修正、2新壞Cookie、1既有timeout；去重得產品23，不把重跑加成新覆蓋。 |
| harness／跨輪／Browser smoke | harness8；跨輪首23PASS／1FAIL，F3補精確清單GET後該案PASS，去重24；Chrome／Edge各2。合計 **23＋8＋24＋2＋2＝59**，project＋title去重且不以skipped取代已執行。 |
| `f9-1792077354728-live-initial` | L01的25分案PASS；L02完整deadline Z／+00:00表示比較FAIL；L03 NOT RUN。此run的首次FAIL保持。 |
| `f9-1792077429649-instant-retest` | L02固定語意分案PASS；後續讀回區段把前個獨立GET的遲到response事件算入，單GET斷言FAIL；L03 NOT RUN。 |
| `f9-1792077518649-boundary-retest` | 沿首輪專用帳號／Closed L02／原四份Response；L02兩案及L03十五案PASS。request發送邊界解決觀察分段，不放寬請求白名單。 |

歷史真實 **25＋2＋15＝42個最終PASS、6個BLOCKED**；是不同適用run合併，並非宣稱某一次從頭42案全通過。歷史去重3帳號／13Form／14Response也與原件一致。[歷史oracle](evidence/F9_Independent_20261016/execution/historical-oracle.json) 另以固定Create／POST／Receipt重算，13份Definition、14份Receipt及27份成功Statistics Body全部相符，包括首次deadline字串比較失敗時實際同一瞬間。

限制：原交付保存一份最終source/build digest，沒有每次中間測試原碼的獨立完整快照；不能聲稱中間test bytes等於最終test。錯誤log保留當時定位／UTC／區段斷言片段，可查核修正原因；本次交付版來源唯讀、新build及單一新Run的42分案全通過，提供目前交付版的獨立執行證據。

## 6. 本次首次失敗、缺口與交付停止點

| 本次原始狀態 | 原因／處置 |
| --- | --- |
| 環境probe受阻 | 沙箱讀外repo Git失敗／無法確認listener；正常唯讀權限重查綁定PID／DLL／readiness，未改服務或DB。 |
| build FAIL／preview未啟動 | 沙箱Nitro建立`.output/server/node_modules/unhead`遇EPERM；後續preview缺server entry，**未執行Browser案例**。保留[首build](evidence/F9_Independent_20261016/execution/build.log)／[首Browser](evidence/F9_Independent_20261016/execution/browser-built.log)，fresh build正常權限PASS後換新label重跑，未以殘缺產物記PASS。 |
| 獨立oracle首FAIL | 診斷漏套L02改名對L03零資料Root Creator的影響；修正診斷的固定事件階段，保留[首次log](evidence/F9_Independent_20261016/execution/historical-oracle.log)。完整固定輸入／全Body比較未放寬；後續又補Definition／POST wire驗證均PASS。 |
| 獨立Browser證據位置／harness前置 | 首built案例實際1PASS，但診斷reporter相對路徑落在config目錄，copy未找到；找回原件而未重跑充數。harness相對server路徑未解析至repo，未進案例；保留[log](evidence/F9_Independent_20261016/execution/reviewer-browser-harness.log)／[reporter](evidence/F9_Independent_20261016/execution/reviewer-browser-harness-precondition-results.json)，僅診斷config補絕對證據路徑／cwd後1PASS。 |

**BLOCKED：** 真實invalid Cookie、expired Cookie、disabled Cookie、disabled Creator、Server fault、真實timeout六案，沒有已同意的受控前置。本次不偽造Token、不SQL停用／改時鐘、不改後端。fixture故障不解除真實缺口；F1～F8既有特殊Auth／交易故障缺口維持。DB identity／migration／DI provider仍UNCONFIRMED。

**NOT RUN：** 實機touch／軟鍵盤／safe-area、正式AI驗收、人工驗收、npm ci重現安裝／audit。現有版本已安裝且lock相符，本次不變依賴，未無理由重裝。Google／遠端正式服務仍延期，沒有新增其範圍。

去敏檢查核本機實際password值、JWT模式、秘密欄位、reporter內嵌JSON；不提交private credentials／Cookie／Token／storageState／trace。新證據含完整合成Statistics Body與正常API wire；原件留ignored，raw/delivery hash可核。git核對產品、既有tests、scripts、規格、依賴、AGENTS／skills、backend-ref與歷史報告無變更；只新增本報告及本review證據，以單一目的本機提交。完整提交SHA／最後Git狀態以交付訊息及Git log為準，避免報告自填自身SHA循環。

**停止於「F9 集中 review 完成、待 Owner 確認」。** 不更新accepted、不推送、不展開F10。依本次指定的先後順序，Owner確認集中review結案後，再交付完整前端獨立驗收計畫供審查；本次沒有先執行正式驗收或代填人工結果。
