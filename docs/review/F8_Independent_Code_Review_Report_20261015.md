# F8 獨立集中 Code Review

日期：2026-10-15（Asia/Taipei；本次工作跨 10-14～10-15）。**未發現新增、可重現且需要修正的產品 findings；F8 集中 code review 通過，待 Owner 確認。** 正式驗收仍延後，accepted 不變。本次產品與 tests 維持唯讀，沒有新增真實業務寫入、測資或修正產品。

## 1. 比較範圍與來源

- 前端位置：`C:\Users\user\Desktop\custom-form-service-web`，master；比較基準 **`134629a8ce9d2b276ec7a3a10a6843977814f41b`** → 開發交付／接手 HEAD **`b9f91e825173cbe81721061978e2d20dd5698c6d`**。接手工作樹乾淨。
- 獨立閱讀實際 101 檔 diff、8 份產品檔、F8 config／unit／Browser／live tests、共用 Answer／exact／decoder／Auth／DirtyScope／RequestScope／管理與 Renderer／Preview，及 [核准 F8 計畫](../implementation/F8_Implementation_Plan.md)、[開發報告](../implementation/F8_Development_Report.md)、交付證據及 ignored 本機原件。沒有以開發報告的 PASS 代替本次執行。
- 流程依最新 [AGENTS v1.1](../../AGENTS.md)、[repo development skill 的 review 邊界](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫 v1.3](../implementation/V1_Frontend_Implementation_Plan.md) F8／§7／§7.1／§8。沒有另外找到 repo 專用 code-review skill；採獨立 diff／契約／行為檢查，不進修正或正式驗收階段。
- 產品來源：前端 [00](../specs/00-v1-frontend-overview.md)／[01 §7～10](../specs/01-pages-routing-and-access.md)／[03 §1～8](../specs/03-response-and-statistics.md)／[04 §4～12](../specs/04-auth-state-and-error-handling.md)／[05 §4～10](../specs/05-ui-and-interaction.md)／[07 §1、7、9～10](../specs/07-api-integration-map.md) v1.0；[02 §6.1、11～12](../specs/02-form-editor-and-lifecycle.md)／[06 §4～11](../specs/06-technical-architecture.md) v1.1。核對時未發現需變更 API／既定產品行為的來源衝突。
- 正式後端來源為 [唯讀快照](../../backend-ref/SNAPSHOT.md) master／**`7591633137c5a6f57c1fce8e1ba19ab394015880`**：00／01／03c／05 v1.1，02／03a／03b／04 v1.0。重點為 03c §3.1～3.2、§4～5，03a §2～6、§9，03b §7.1、§8.3～8.4，04 §2.4、§4，01 FORM-07～10／SUB-01～07，05 §6、§8～12。後端程式與 tests 僅用來查證，未改寫契約。

## 2. 分級 findings 與六項重點結論

| 等級 | 新增 findings |
| --- | --- |
| P0／P1／P2／P3 | 各 0；沒有需附行號要求修正的項目 |

結論適用於本次 diff、已讀正式契約及下列實際驗證；不代表未執行的真實特殊狀態、正式或人工驗收已通過。

| 重點 | 獨立判讀與結果 |
| --- | --- |
| Definition-aware Receipt／Latest | [mapper](../../app/domain/response-mapping.ts) 先建全部空答案，按 Question／Option ID mapping，再經完整 builder 驗 required／config／型別；未知／重複／無法可靠解讀時整份拒絕。Number 維持 ExactNumber，Rating 才作有界整數轉換；201 另比較送出候選的正規化語意。unit、built 五型／optional／0、精確 wire、missing optional 及獨立「錯誤但合法的長整數 201」／「Latest 缺 required」均 PASS，沒有部分覆蓋或假成功。 |
| 錯誤 path | 共用 Answer builder 固定本次送出的 index map；`answers[0].value[0]` 在前面 optional 被省略後定位實際多選題，`questions.<id>` 定位缺答題；未知 path 完整留摘要。F8 built 首控聚焦／Dialog 明細 PASS，沒有將 Request index 當畫面 index。 |
| knownSubmitted／multiple risk | 可靠 201、可靠 single Latest、RESPONSE_ALREADY_SUBMITTED 三來源符合規格。dirty single Latest 取消保留 model／baseline／dirty，仍 known／readonly 且標示本地值；一般 Form GET 不退回該證據。multiple unknown 經 Latest200／404、Form GET 或後續400仍保留 duplicateRisk；取消重送零 POST，後續可靠201才解除。相關 unit／repo Browser／獨立 composable PASS。 |
| response context 重置 | [resetResponseContext](../../app/domain/operation-state.ts) 僅處理 response policy 的私有 unknown／risk／revision，不清 shared management unknown、不 release lease。實際 Vue composable＋Router 診斷確認新 URL context 的 Form GET 失敗時管理 unknown 仍在；pending POST 換 context 期間同 Form 仍 busy，舊201不能採用，結束後才載入新空白頁。普通 Form GET 不恢復被撤 grant；新本人核對的 Form404不復活資格。可靠新 Form 成功採用依原管理 reconcile 規則解除鎖，與 response reset 本身分開。 |
| 互斥／stale／finally／deadline | Submit 與管理共用正規化 `form:{uuid}` lease；`captureRead` 使跨任何同 Form 寫入的舊 GET 在寫入完成後仍失效。scope、Session、URL、content revision 與 generation 分別保護採用及 loading；unit、F7完整回歸及獨立診斷 PASS。本機 deadline timer 不參與已送出合法201的 current 判準，repo unit／built 的截止後晚回201仍成功、clean且readonly。 |
| 狀態錯誤與導航／Auth／permit | FORM_NOT_SUBMITTABLE 先撤資格；提前關 Dialog 等待目前 status GET。Closed 成功才走 dirty→首頁；候選500顯示新的讀取錯誤，不猜 Closed、不重送；URL變動後舊 Closed 候選不導航／覆蓋新 context。Auth三碼／disabled／不存在／deadline、dirty取消保留及Header logout／Delete單次permit，在F8／F7原tests與補驗PASS。 |
| 正式 Renderer／Preview／F6～F7 | 正式頁單一答案 session／DirtyScope，管理 DTO 只合併 metadata；Preview 獨立 snapshot／空答案，不帶正式資格／Response API。F6 built／fixture 與 F7完整回歸 PASS；已目視 [本次320px readonly長文字／精確數字](evidence/F8_20261015/images/independent-readonly-320.png)、開發 mobile／live 原圖。畫面可換行；實機體驗仍未驗證。 |

獨立診斷原件：[7項 composable](evidence/F8_20261015/composable-probes.json)、[5項 Browser](evidence/F8_20261015/browser-probes.json)；可重現腳本位於同目錄 `diagnostics/*.mjs.txt`。使用未修改產品 composable、真實 Vue reactivity／memory Router 及 built UI；fetch／業務 API 皆為合成攔截，並非後端整合執行。

## 3. 本次實際驗證

Node **24.21.0**／npm **11.19.0**；installed／lockfile 八項相符：Nuxt4.6.1、Nuxt UI4.11.3、Tailwind4.3.3、Vue3.5.43、TypeScript5.9.3、Vitest5.0.3、Playwright1.64.0、lossless-json4.3.1。Chromium **156.0.8078.4**、Chrome **156.0.8078.12**、Edge **155.0.4283.45**。沿既有 CSR／strict、30秒 timeout、credentials include、零自動 retry；沒有安裝／換版本。

| 命令／方法 | 本次結果與證據 |
| --- | --- |
| `npm run lint` | **PASS**；[log](evidence/F8_20261015/logs/lint.log) |
| `npm run typecheck` | **PASS**，Nuxt strict＋tools／tests；[log](evidence/F8_20261015/logs/typecheck.log) |
| `npm run build` | **PASS**；[log](evidence/F8_20261015/logs/build-first.log)，既有 DEP0155 dependency warning 保留。當前source fresh build後執行下列built案例；[156份產物digest](evidence/F8_20261015/fresh-build-digest.json)保存。 |
| `npm run test:unit -- tests/unit/f8-response-page.spec.ts tests/unit/f5-answer.spec.ts tests/unit/scoped-state.spec.ts tests/unit/f7-form-management.spec.ts tests/unit/f6-editor-page.spec.ts tests/unit/api-client.spec.ts` | **201／201，6 files PASS**；[log](evidence/F8_20261015/logs/unit.log) |
| `node node_modules/nuxt/bin/nuxt.mjs typecheck tests/fixtures/f6/browser` | **PASS**；[log](evidence/F8_20261015/logs/f6-harness-typecheck.log) |
| `F8_MODE=built F8_RUN_LABEL=independent-review npm run test:e2e -- --config=playwright.f8.config.ts` | **29／29 PASS**；[reporter](evidence/F8_20261015/browser/f8-built-results.json) |
| `F7_MODE=built F7_RUN_LABEL=f8-independent-review npm run test:e2e -- --config=playwright.f7.config.ts` | **51／51 PASS**，完整既有F7，包含N1及外部content／write／Session／leave；[reporter](evidence/F8_20261015/browser/f7-built-results.json) |
| F6 built，grep `F6-B01\|F6-B02/B03\|F6-B05\|F6-B06\|F6-B07\|F6-B08\|F6-B09\|Preview isolation\|Stars/Range\|F6-R1` | **18 PASS／3 skipped**；[reporter](evidence/F8_20261015/browser/f6-built-results.json)。三項原test標記為fixture-only的參數／多Renderer案例，於下列fixture補跑，不計PASS。 |
| F6 fixture，grep `Preview isolation\|Stars/Range\|Renderer readonly\|F6-R1\|same-component ID update\|pending old GET` | **7／7 PASS**；[reporter](evidence/F8_20261015/browser/f6-fixture-results.json)，涵蓋前列三項fixture限定行為。 |
| F8 built，Chrome／Edge各grep `B01/B03 single\|B04 multiple` | **各2／2 PASS**；[Chrome](evidence/F8_20261015/browser/chrome-results.json)／[Edge](evidence/F8_20261015/browser/msedge-results.json)，代表smoke，不冒稱完整跨瀏覽器驗收。 |
| `node --experimental-transform-types output/playwright/f8-review/composable-probes.mjs` | **7／7 PASS**；[log](evidence/F8_20261015/logs/composable-probes-final.log) |
| `node --experimental-transform-types output/playwright/f8-review/browser-probes.mjs` | **5／5 PASS**；[log](evidence/F8_20261015/logs/browser-probes-complete.log)，全部精確network診斷相符、零pageerror／未宣告API。 |
| 歷史原件、source、wire／Receipt／Latest獨立核對 | **PASS**；[完整audit](evidence/F8_20261015/evidence-audit.json)／[log](evidence/F8_20261015/logs/evidence-audit-first.log)。 |

完整 F6 命令、各次預期／實際與首次失敗見 [verification summary](evidence/F8_20261015/verification-summary.json)。Browser 全部攔截業務 API；只啟動／結束本次自己的server，未停止或啟動既有後端。沒有依賴變更，未重跑install／audit；未擴增Firefox／WebKit、負載或DB並行測試。

## 4. 真實 L01～L05 原件與最終 source 適用性

[audit](evidence/F8_20261015/evidence-audit.json) 核對開發manifest **84／84**、本機raw **81／81**、final-source digest **12／12**、backend snapshot **108／108** 相符。rawSha256直接驗原始bytes；交付文字依collector記錄僅正規化BOM／換行／尾空白，inline圖取原reporter body驗hash。歷史報告、首次FAIL及原件均未修改。

三個保留run `f8-1791984869005-first`、`f8-1791986410082-final`、`f8-1791987582885-reader-final` 各有7份201 Receipt、8次200獨立Latest、2次404無本人Response；共 **21份Receipt／24次Latest200／6次Latest404**，另各1次Form GET。逐份對照POST wire及正規化後精確語意，Latest按id／formId／submittedAt／全部answers核對對應Receipt；multiple三次不同id、optional缺題、Number／Rating0及all-optional[]均相符。最新reader-final是本次交付適用的live證據；前兩run保留歷史，不合併冒充final重測。

| 案例 | 原件核對與適用結論 |
| --- | --- |
| L01 | Owner／respondent各自五型201、各自獨立Latest；精確Number token `9007199254740993.12345678901234567890123456789`、正式Question／Option ID與0保留。live test source另斷言single刷新空白及409。 |
| L02 | 第一份5答，第二／三份各2答（Number0／Rating0），Latest匹配最新完整Receipt，沒有從前份補optional；同內容再送是不同Response id。 |
| L03 | private／anonymous全部optional，wire／Receipt／獨立Latest皆空answers；歷史Browser仍有credentialed登入。 |
| L04 | 原獨立Form GET仍Published，該份saved Definition可直接經本次mapper重驗deadline前Receipt；expired／Closed兩次Latest匹配同份Receipt。另一Form拒送後Latest404；Closed錯誤／dirty行為另核對live原test與reporter。 |
| L05 | 兩人的Latest分別匹配自己的Receipt；新本人Latest404，live source有清Cookie、401 dirty取消／接受、正常登入與資格核對／返回空白斷言；原件無違規寫入／pageerror／network差異。 |

最新run **70個CORS response**均為origin `http://localhost:3000`／credentials `true`；Cookie／CORS／401證據屬10-14歷史真實執行，本次沒有重跑Login／Submit／Close或以fixture取代。其餘L01～L03／L05的原件未逐份保存完整GET FormDetail body，因此本次可獨立重驗wire／Receipt／Latest語意及原test斷言，不能宣稱每份都做了新的真實Definition讀取。12份final-source digest全部與交付HEAD／本次唯讀source一致，未發現需排除final reader結果的source差異。

本次10-15 17:45台北時間唯讀重查：[後端觀察](evidence/F8_20261015/backend-observation.json) 顯示實際checkout仍為快照SHA、既存`?? SNAPSHOT.md`未動，磁碟DLL ProductVersion同SHA／SHA256 `06e2a62db9c4376701e75b0ce3e7283d34b129d378c884e33fb1cb764a0af180`。**未找到綁定該assembly的dotnet程序，health／ready／OpenAPI均未連通，本次runtime版本無法確認。** 不以磁碟DLL／checkout代替現行runtime或重跑真實整合；歷史20:50 runtime綁定證據仍只屬開發當次。

## 5. 首次失敗與重跑界線

本次沒有修正產品。以下診斷失敗保留，未將之改成PASS或混列產品缺陷：

| 原始結果 | 原因與處理 |
| --- | --- |
| unit啟動BLOCKED | sandbox spawn EPERM；初次filter亦誤列不存在檔名但未執行任何test。依核准計畫明列六份後正常重跑201／201；[原log](evidence/F8_20261015/logs/unit-first.log)保留。 |
| composable runner啟動FAIL；後續4PASS／3FAIL | Node strip-only不支援parameter property，改加transform；診斷腳本誤讀computed ref一層，修正診斷存取後7／7。保留[原log](evidence/F8_20261015/logs/composable-probes.log)／[首次案例結果](evidence/F8_20261015/composable-probes-first.json)。 |
| Browser診斷初次輸出FAIL；第二次1PASS／4FAIL | 診斷JSON輸出遇ExactNumber DTO，保留log及四張圖；第二次顯示close定位同時命中×與底部「關閉」。只修診斷序列化／定位，[原log](evidence/F8_20261015/logs/browser-probes-first.log)／[第二次結果](evidence/F8_20261015/browser-probes-second.json)保留。 |
| Browser第三次4PASS／1FAIL | URL變更實際取消舊GET，診斷未宣告該ERR_ABORTED；[第三次結果](evidence/F8_20261015/browser-probes-third.json)保留。最後在觸發前明列僅該method／完整URL／reason／1次／console0，並等待requestfailed，再放行舊候選；5／5。沒有全域忽略或改產品預期。 |
| 後端診斷首次BLOCKED | sandbox拒絕CIM／外repo Git；首次JSON的null PID是診斷建構產物，不能視為程序綁定。正常唯讀權限重查後程序清單為空、metadata仍不可用；[首次原件](evidence/F8_20261015/backend-observation-first.json)保留。 |

開發原unit／lint／typecheck／Browser／F7讀取錯誤回歸等首次FAIL仍完整存在於原84份交付證據及81份本機原件，已驗hash；本報告沒有更寫其歷史結果。新的交付證據去敏掃描涵蓋已知合成密碼、JWT、秘密欄位及reporter內嵌文字，結果PASS；沒有提交Cookie／Token／密碼／storageState。

## 6. 未驗證事項、Git 與停止點

- **NOT RUN**：本次真實L01～L05重執行；已依授權核對歷史原件，未新增真實業務寫入／測資。現行後端健康與runtime確認為**BLOCKED**，沒有自行啟服務。
- **BLOCKED**：受控真實invalid／expired token、AUTH_USER_DISABLED、Server提交後fault／timeout／500／交易回滾安排；fixture只證明前端分流，沒有新增特殊身分或故障處置。DB identity／migration仍**UNCONFIRMED**。
- **NOT RUN**：實機touch／軟鍵盤／safe-area、Owner人工與正式AI驗收；F4大量列表及其他歷史缺口未由本次解除。Google／遠端正式服務延期，F9未展開。
- 驗證後`git diff --check`及交付HEAD至產品／tests／scripts／依賴／規格／AGENTS／skills／歷史開發文件的protected diff為PASS；[交付核對](evidence/F8_20261015/closeout-checks.json)及[新證據manifest](evidence/F8_20261015/artifact-manifest.json)保存，前後端snapshot／歷史報告未改。僅新增本報告與`docs/review/evidence/F8_20261015/`，作單一目的本機文件提交。完整commit SHA及提交後Git狀態見本次交付訊息／Git log，避免報告自我SHA循環；原始ignored診斷保留於`output/playwright/f8-review/`。

**停止於「F8 集中 review 完成、待 Owner 確認」。** F8 code review通過不代表正式驗收或Round accepted；accepted不變、不推送、不展開F9。
