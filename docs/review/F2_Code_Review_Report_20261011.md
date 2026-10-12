# F2 獨立 Code Review／F1 P3 局部複核

日期：2026-10-11（Asia/Taipei）。審查提交：`e0d06e589d5eb3b65f0057bdd7fb8b1694625d76`，parent：`a2599215adbc4cf916d53b7d2fcfeb1c67e212d6`。接手及結束 HEAD 相同，接手工作樹乾淨。

**結論：F2 本版有三項 P2，建議修正並複核後再通過 code review；F1 P3 補正的局部複核通過。F1／F2 均未 accepted。** 本次沒有修改產品、既有測試、套件／lockfile、規格或進度文件，沒有設計／執行正式驗收，沒有開始 F3。

## 1. 授權、來源與方法

依 repo 最新 [AGENTS v1.1](../../AGENTS.md)、[development skill 的 review 邊界](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[核准 F2 計畫 v1.0 §3～5／§7](../implementation/F2_Implementation_Plan.md)、[總計畫 v1.3 §5 F2、§7／§7.1／§8](../implementation/V1_Frontend_Implementation_Plan.md) 執行。F2 diff 為 43 檔，包含共用程式、unit、隔離 harness、必要依賴及文件；計畫只追加授權紀錄，沒有改寫核准設計。

已核對前端 00～07：02／06 v1.1，其餘 v1.0。重點為 02 §6／§6.1／§10、03 §4～5／§8／§10～12、04 §4／§7～12、05 §5～9、06 §4～11、07 資源與錯誤摘要。F1 P3 另核對提交 `8c953df10bc43382277440fefb018df50d31c496`、[原 review P3](F1_Code_Review_Report_20261011.md)、[補正報告](../implementation/F1_P3_Correction_Report.md) 及五組已提交證據。

後端來源為本 repo 唯讀 `backend-ref/`，依 [SNAPSHOT](../../backend-ref/SNAPSHOT.md) 的來源 SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`／2026-10-11 匯出；00／01／03c／05 v1.1，02／03a／03b／04 v1.0。查證 03a JSON／Envelope／204／GET 無副作用、03b resource shape、03c Receipt／Statistics 九欄位與 respondents、01 数值／config、02 INTEGER／JSONB、04 錯誤與 path、05 精度／retry。`DefinitionNumber.cs` 容量規則與 adapter 逐項對照。manifest **108／108 相符**。R10 accepted、R11 結果待 Owner 確認仍僅是該快照紀錄；本次未查 live process／SHA 或操作 API／DB。

方法為實際 diff／程式／測試／歷史原件閱讀，加上必要獨立 lint、strict typecheck、產品 build、unit 與既有 Browser 自測。診斷以 Vite `ssrLoadModule` 載入未修改的實際共用 TypeScript；只在 ignored output 加一次性診斷程式，沒有新增或修改測試檔案。所有 fetch／操作結果均為合成 fixture／mock；Browser 使用 native fetch＋攔截。

本次去敏證據：[F2_Independent_Verification_20261011.json](evidence/F2_Independent_Verification_20261011.json)。完整本次 log／JSON／trace／診斷位於 ignored `output/playwright/f2-review/`，未覆蓋原 F1／F2 evidence；摘要附原件 SHA256。

## 2. 阻擋 findings

此處「阻擋」指本版 F2 code review 建議先處理，與正式驗收或 Owner accepted 分開。沒有發現 P0／P1。

### F2-R1 [P2] Draft 待核對限制沒有涵蓋另一個發布操作

- **位置**：[operation-state.ts:29](../../app/domain/operation-state.ts#L29) 的 `snapshot`、第 42～45 行 `run`，第 66 行釋放 lease；[useOperationState.ts:15](../../app/composables/useOperationState.ts#L15) 每個 policy 建立獨立 state。
- **觸發／實際行為**：同一 coordinator／`form:a`，先以 `delta` 收到已送 timeout。該 state 為 `unknown`、`needsReconciliation=true`、`blocked=true`，但 finally 釋放共用 lease。另一個 `lifecycle` state 尚為 idle，`run` 只檢查自己的旗標，仍呼叫 send。獨立診斷實測 **publishCalls=1、publishResult=success**，期間未核對或採用任何 GET。
- **影響／依據**：前端 02 §10、04 §11 及 F2 計畫 §4.3 明定 Delta 結果不明後，重讀建立可靠基準前要停用保存／發布。待核對限制目前只保護原 state；以同 Form 共用 coordinator 並不足以保護發布，後续接入可能在保存結果不明時發布不確定版本。產品尚未接入，因此不是宣稱已有真實表單被錯誤發布。
- **建議**：提供並驗證 Form 層級的政策限制，讓 Delta 待核對阻擋後續保存／發布，可靠 current read 且成功採用後才解除；或明確建立共用的跨操作 gate，要求所有相關 caller 在送出前經此 gate。不要全面封鎖規格仍允許的核對／離頁等入口。
- **證據／現有測試缺口**：摘要 `diagnostic`；`scoped-state.spec.ts` 只驗 pending 時不同操作互斥、unknown 時同一 state 的鎖，沒有驗 delta unknown→另一個 lifecycle。Browser harness 亦只檢查 pending 的第二寫入及原 save 的 unknown 鎖。診斷中另一 visibility 可執行只說明 state 相互獨立，不將其一概列為規格禁止行為。

### F2-R2 [P2] Latest GET 失敗被當成寫入結果不明

- **位置**：[error-presentation.ts:14](../../app/domain/error-presentation.ts#L14)。
- **觸發／實際行為**：`presentError({kind:'transport-error',reason:'timeout',sent:true}, 'latest')`，以及 Latest 的 500 Envelope，均得到 `kind='unknown-result'`、Dialog「操作可能已完成，請主動核對後再操作」。
- **影響／依據**：Latest 是 GET，後端 03a §9 規定無業務寫入副作用；前端 03 §4、04 §9～11 要求保留答案並處理讀取失敗。`sent` 表示请求已送出，不表示它是 write；目前以呈現情境排除三種 read，漏掉 `latest`。這會把查看既有答案的失敗錯誤說成可能寫入完成，混淆安全重試／核對政策。
- **建議**：讓未知寫入判定使用明確讀寫語意，至少將 Latest 失敗保持為讀取失敗 Dialog、保留原輸入並允許手動重試。仍保留 Latest RESPONSE_NOT_FOUND、Auth 分流及真正 write 的結果不明行為。
- **證據／現有測試缺口**：摘要 `diagnostic.latestErrors` 兩筆均重現；目前 contextual unit 只測 Latest 404，未覆蓋其 timeout／500／malformed response。

### F2-R3 [P2] 核對 Browser case 未等待取消完成，兩個 handler 處理同一確認

- **位置**：[f2-common.spec.ts:47](../../tests/e2e/f2-common.spec.ts#L47)～51。
- **觸發／實際行為**：第一次核對 click 後，`save disabled`、`raw='unsaved'` 原本就成立，斷言可在 GET／confirm 尚未結束時通過。接著掛第二個 `page.once('dialog', accept)`；第一次 confirm 此時才到，dismiss 與 accept handler 同時處理它。
- **獨立結果**：完整 suite **5 PASS／1 FAIL**；僅重跑該 case 仍 **0 PASS／1 FAIL**，皆有 `dialog.accept: Cannot accept dialog which is already handled!`。首次 trace：第一 click 11530.459ms，第二 click 已開始於 11798.087ms，dismiss／accept 分別於 11800.977／11801.276ms，同一尚未完成的 dialog 被兩者處理。
- **影響**：這是必要 Browser 證據的同步缺陷，讓「取消→接受→解除限制／兩種關閉路徑」不能可靠重現。原開發 6／6 是歷史結果，本次不可沿用為 PASS；也不能把這次保存仍 disabled 直接歸因於產品 reconciliation 壞掉。
- **建議**：等待第一次 dialog 已出現且 dismiss 已完成，再等待該次核對流程 settle、確認資料及鎖仍保留，最後才安裝下一次 accept handler／click。用 Promise／可觀察完成狀態同步，不以固定 sleep 或原本就成立的斷言代替。
- **證據**：摘要 `browser`、`browserReconcileRetry`、`traceDiagnosis`；原 trace 路徑與 hash 見摘要。本次遵照授權沒有修測試或改預期求 PASS。

## 3. 非阻擋觀察與證據界線

### N1 [P3／既有依賴] Audit 警示需要依暴露面追蹤，不能只看總數或自動 fix 建議

位置：`package.json` 的 Nuxt 4.6.1 及既有 lockfile 依賴鏈；F2 package／lock diff **只新增 lossless-json 4.3.1**，下列警示不是該新增套件帶入。

本機 `npm config get offline` 為 true；最初直接 `npm audit --json` 退出 0、報 0。此結果不作安全通過證據。重新執行 `npm audit --json --offline=false --fetch-retries=0 --fetch-timeout=20000` 查官方 registry，退出 **1**，重現 **15 個受影響 package 節點：1 low／7 high／7 critical**。這是傳遞依賴的計數，並非 15 個獨立漏洞；摘要保留各節點、版本、advisory 與 fixAvailable。

| 根因／實際依賴鏈 | Audit 節點與本輪暴露面判斷 |
| --- | --- |
| `nuxt→@nuxt/devtools 3.4.2→simple-git 3.36.0→@simple-git/argv-parser 1.1.1` | argv-parser／simple-git 的 Git 命令、設定、環境變數安全檢查繞過；critical 傳播到 devtools、nuxt、@nuxt/nitro-server、@nuxt/vite-builder、@nuxt/vite-server，共 7 節點。`nuxt.config.ts` 明確 `devtools.enabled=false`，沒有產品 Git endpoint，產物不含此鏈；未找到本輪讓表單／API 資料進入 Git argv／env 的路徑。屬工具鏈風險，不能由總數推論 CSR 帳號頁已有 RCE。參考 [VISUAL advisory](https://github.com/steveukx/git-js/security/advisories/GHSA-v5rq-49vh-5v5c)、[trailer 設定 advisory](https://github.com/steveukx/git-js/security/advisories/GHSA-x6jw-m9v5-85vh)、[include 設定 advisory](https://github.com/steveukx/git-js/security/advisories/GHSA-g4wm-2vf7-vfgr)、[長選項縮寫 advisory](https://github.com/steveukx/git-js/security/advisories/GHSA-858h-whjf-mvg5)。 |
| `nuxt→@nuxt/nitro-server→nitropack 2.13.4→globby 16.2.4→fast-glob 3.3.3／micromatch 4.0.8→braces 3.0.3` | high 傳播到 braces、micromatch、fast-glob、globby，共 4 節點。深層 glob pattern 的資源耗盡風險；本輪使用 repo／工具的固定 glob，未把 API／題目輸入當 glob。產物不含此鏈。維護者對 advisory 的適用性亦有爭議，不能把 build PASS 當漏洞不存在。參考 [原 repo issue／維護者回應](https://github.com/micromatch/braces/issues/70)。 |
| `nuxt→@nuxt/nitro-server→nitropack 2.13.4→listhen 1.10.1→node-forge 1.4.0` | high 傳播到 node-forge、listhen、nitropack，共 3 節點。RSA PKCS#1 v1.5 驗簽問題；本輪 localhost HTTP，listhen 使用 forge 的本地證書處理與生成，未找到業務／JWT 驗簽路徑，產物沒有 forge。JWT 由另一後端處理，不能將此警示說成後端 JWT 已可偽造。參考 [原 repo 修補討論](https://github.com/digitalbazaar/forge/pull/1152)。 |
| `@nuxt/ui／Vitest→Vite→esbuild 0.27.7`；Nitro 另有 `esbuild 0.28.2` | low 節點為根目錄 esbuild 0.27.7；Windows 自帶 development server 的 servedir traversal，修補基準 0.28.1。Nuxt／Vite 以 esbuild 編譯，未查到呼叫 esbuild serve；3000 是 Nuxt／Nitro server，不能只因 Windows＋dev server 就判同一漏洞可達。Nitro 的 0.28.2 不在此受影響版本區間。參考 [esbuild 原 advisory](https://github.com/evanw/esbuild/security/advisories/GHSA-g7r4-m6w7-qqqr)。 |

上述暴露面結論是 advisory 前置條件、實際依賴鏈、本地使用程式及本次產物的**靜態推論**；沒有做漏洞利用或完整安全驗收。`.output/server/package.json` 無上述受影響套件，CSR build 未引入 Git／glob／forge／esbuild server 的業務執行入口，支持本機目前使用範圍較窄；不保證未來開啟 DevTools、接 untrusted glob／Git config 或部署服務後仍安全。

registry 的 critical 與部分原 maintainer advisory 的 high 分級、範圍表達不完全一致；不擅自重算 registry 數量。`fixAvailable` 提議 Nuxt **3.7.4** 是破壞性降版，不能當作與已核准 Nuxt 4 工程相容的修復方案。本次沒有 audit fix／force／升降版；依賴處理需要另行核對相容性。以當前本機關閉 DevTools／HTTP／固定工具輸入的範圍，本項列非阻擋追蹤，不等於修復或安全 PASS。

### npm ci EPERM：歷史失敗仍有效，副本成功只證明副本

已讀原 `ci-first.log`：EPERM **unlink** 位於原目錄 `node_modules/@unrs/.resolver-binding-win32-x64-msvc-…/resolver.win32-x64-msvc.node`。這不是本次 unit 的 **spawn** EPERM，兩者不可混用。實際根因未確定：不能宣稱已證實某 process／防毒鎖檔，也不能直接推論 lockfile 有缺陷。

`ci-first.log`、`restore-install.log`、`ci-clean.log` 原件 SHA256 與 F2 已提交摘要全部相符。乾淨副本原 log 明列 983 packages、postinstall prepare 完成；原件與現有 `output/playwright/f2/repro-ci/package-lock.json` 的 hash 均為 `514545e78546b99dacd0b3b8c49e89d0f7dab5b26acb3da725d58c8551dbb1a2`。可支持「F2 開發時乾淨副本安裝成功」，不能支持「原目錄 ci 問題解除」或「本次獨立重跑 ci 成功」。

**本次 npm ci／install NOT RUN**：未為審查再次移除原目錄依賴，也未停止不明 process／清除 locked remnants；使用現有可用依賴執行獨立檢查。因此本次 build／unit PASS 是原目錄現有安裝的使用證據，不是 fresh install 證據。glob deprecated、6 筆 install-script policy 與 Vue DEP0155 亦與 audit 分开；沒有擅自 approve scripts 或將警告改寫為修復。

## 4. 六項重點核對與實際限制

| 重點 | 本次結論／程式與證據 |
| --- | --- |
| 精確數值／比較／容量 | `exact-number.ts` 保存 token、immutable、sign／digits／BigInt exponent 比較；不展開巨大 exponent。raw ±1073741823、integral 131072、fractional 16383 與後端 helper 一致，零也先驗 raw exponent／fractional capacity。36 個 unit gate 及 11 個 Browser 合法 token／4 個拒絕 token 通過；長小數、大整數、相鄰值、負數、1／1.0／1e0、-0／0、inclusive bounds 均有固定預期。未發現先經 JS 浮點失真。 |
| DTO 全路徑 | `response.text→parseExactJson→decoder`；Form config、Receipt／Latest 共用 receipt decoder、Statistics Number value 保存 ExactNumber，clone／serializer 再送 number token。count／sortOrder／pagination／Rating／Text length 經 integer grammar 與值域後才轉 number。原 config 省略與空 object、nullable 必填、未知 enum／key、Statistics 九欄位及 respondents 省略／[]／null 有檢查；沒有补 Owner／config、截斷集合。Receipt 無 type，Rating／Option 歸屬留 Definition mapper，符合 F2 邊界。重複 Option 等完整 Definition-aware mapping 未驗，本次不稱其完成。 |
| Client／錯誤 | 30000ms timer 涵蓋 fetch＋body read，external abort、finally 移除 listener／timer，程式無 retry loop。204 不讀 body，local 不送、2xx shape 失敗為 contract、4xx Envelope 保留 code／details、5xx write unknown。unit 驗 abort sent／not sent、body timeout 與零重試；Browser native network／30s timeout 的 request 次數及保留輸入通過。Latest presentation 有 R2；未做真實 Server commit 後失聯。 |
| scope／session／loading／互斥 | RequestScope 捕捉 resource／generation／session，stale 在 apply／error 前擋掉；finish 按 ticket identity，不清新 loading。unit 及 Browser 舊 401／換 ID／換 session／舊 finally 通過。Operation run clone 送出快照、lease 釋放、舊結果回 stale；不同 Form 可並行，同 Form pending 不送第二命令。跨 state unknown→publish 有 R1。 |
| 核對解除 | domain unit 證明取消／stale predicate 不解除，同一 state 成功 adoption 才解除；multiple／create adoption 保留 duplicateRisk，後續再送需確認。Browser 取消／接受完整 case 有 R3，不能列本次全 PASS。`reconcile` 依 caller 提供可靠 read／current predicate；真實 Profile me、Delete 404、single／multiple Latest、Create 列表尚未接入，不代填整合成功。 |
| dirty／單次授權／清理 | DirtyScope 的 permit 綁 identity／revision／action，導航 root redirectedFrom 共用一次；afterEach／onError／finishAction／replaceData finally／unmount 清除。watch sync 管理 beforeunload。Browser SPA param 取消、替換取消、action redirect 一次、下一次離頁重新問、beforeunload dismiss／accept／clean 移除通過。這是 fixture，沒有真實 logout／delete 結果；成功／失败之後 action caller 的 permit 收尾仍須對應輪次接入。 |
| Harness／產品 build | fixture alias `@f2` 指向實際 `app`，引用真正 Client／decoder／composables／元件；未重寫另一套共用實作。独立 Nuxt root、buildDir／Nitro output 在 ignored 目錄；主 `app/pages` 僅工程首頁，F1 config testMatch 不收 F2 case。本次 `.output` 搜尋 fixture markers／endpoint 無命中；無產品測試 route／BFF。fixture 自身 strict typecheck 通過。 |
| 安裝／audit | 如 §3；原 unlink 問題未解除，乾淨副本 PASS 是歷史原件且 hash 可核對。本次 registry audit 警示仍存在，已按依賴鏈／實際暴露面區分，未做安全利用或修復。 |

Browser harness 的少量 `as ExactNumber`／config／item cast 位於診斷 UI，事前 decoder 已驗型別，不是 product decoder 以 cast 绕過驗證。Unit 的 JSON.parse 只用於安全的 string／Rating 預期，不拿它建立高精度 Number fixture。

## 5. F1 P3 局部複核

`8c953df` 對既有 `foundation-smoke.spec.ts` 的改動只新增 Dialog close icon computed mask／width／height 斷言與 attachment；原 visible、network、操作、焦點回復、兩個寬度檢查保留。F2 未改該 case 或五組 P3 歷史證據。

本次獨立產品 build 的 **預設 preview** 重跑原 case **1／1 PASS**：close icon 本地 `data:image/svg+xml` mask，寬高各 **19.263916px**；Dialog 關閉及 trigger focus 通過，18 requests、errors／unexpectedRequests 為空。五組已提交 P3 摘要均含新 mask 與非零尺寸，對應補正設計。

**原 P3「空白 span 也可 PASS」缺口已補足，局部複核通過。** 本次只重跑代表 preview，沒有重跑 dev／URL override／static 的五組矩陣，也沒有 generate。五組全 PASS 仍引用補正時歷史紀錄，不冒稱本次獨立五組執行。F1 正式驗收延後、F1 未 accepted。

## 6. 獨立執行紀錄

環境：Node **24.21.0**／npm **11.19.0**、Nuxt 4.6.1／UI 4.11.3／TypeScript 5.9.3／Vitest 5.0.3／Playwright 1.64.0／Chromium 156.0.8078.4／lossless-json 4.3.1。未換指定版本。

| 命令／檢查 | 本次結果 |
| --- | --- |
| `npm run lint` | PASS，退出 0 |
| `npm run typecheck` | PASS，Nuxt strict＋tools tsc，退出 0 |
| `node node_modules/nuxt/bin/nuxt.mjs typecheck tests/fixtures/f2/browser` | PASS，退出 0 |
| `npm run build` | PASS，退出 0；原目錄預設 CSR node-server 產物，保留既有 DEP0155 提示 |
| `npm run test:unit -- --reporter=json --outputFile=…/unit.json` | 首次 FAIL spawn EPERM，未開始案例；完整子程序權限重跑 PASS **78／78，5 files** |
| F2 既有 `test:e2e --config=playwright.f2.config.ts`，隔離 reporter／output | **FAIL：5 PASS／1 FAIL**，0 skipped／flaky；R3 case 失敗，其餘含數值、read stale、dirty、network／30s timeout、read retry 通過 |
| 同命令僅 `--grep 'pending mutual'`，另存原件 | **FAIL：0 PASS／1 FAIL**，保留與首次相同的同步錯誤；未修改 case |
| F1 預設 `npm run test:e2e`，隔離 reporter／output | PASS **1／1**，本次 preview／P3 局部複核 |
| `node output/playwright/f2-review/probe.mjs` | 退出 0，診斷成功重現 R1／R2；這是已知錯誤的重現，**不是產品正確性 PASS** |
| 官方 online `npm audit --json …` | 退出 1，15 警示；沒有 audit fix／install |
| manifest／歷史三份安裝 log hash／lockfile hash／diff scope | PASS；backend 108 筆相符，原產品／測試／套件／規格無變更 |
| npm ci／install、generate、F1 五組完整重跑 | NOT RUN；選用理由與歷史證據界線見 §3／§5 |

第一次 Vitest sandbox 的 spawn EPERM 已保留，完整子程序權限重試成功；沒有自動核准拒絕事件。產物／trace 只含工程頁與合成 fixture，交付摘要採必要欄位及 hash，不含 Cookie／Token／帳密／storageState。

## 7. 未驗證事項與停止點

- **NOT RUN**：真實 API／Cookie／CORS／PostgreSQL 保存讀回、live 後端 SHA／健康檢查、正式 AI／人工驗收、其他瀏覽器／實機手機、F3 Auth 初始化或產品頁、漏洞利用與完整安全審查。
- **Browser 證據缺口**：R3 的採用解除／後半兩種 close 流程未可靠完成；unit 不能代填這部分 Browser PASS。歷史 Browser 有 PASS，本次失敗保留。
- **接入責任未驗**：useOperationState 只 watch leaseKey，session 由 caller 的 isCurrent predicate 提供，現有 Browser session 案例是 read；write 的 session／離頁後 toast／route 沒有獨立 Browser 案例。fixture 未產生 business toast／導航 callback，因此 read stale PASS 不能擴寫成全部產品副作用已驗。自然 goBack 案例在回到重新建立的 clean scope，未獨立驗 dirty 時的 goBack／goForward 取消；全域 guard 的覆蓋有靜態依據，該分支仍未執行。
- **後續輪次責任**：Definition／Answer／Latest 完整 mapper、基準／Delta、真實 Auth session 更新、每種未知写入核對入口與 action 成敗 permit 收尾，仍依已核准輪次接入。本次沒有提前開發這些功能。

交付只新增本報告及 `docs/review/evidence/F2_Independent_Verification_20261011.json`；診斷與生成物留 ignored output。**沒有建立 commit／push／PR／部署**；HEAD 仍 `e0d06e589d5eb3b65f0057bdd7fb8b1694625d76`，剩餘 Git 狀態為上述兩份新審查檔案。產品、既有 tests、正式規格、總計畫與原 evidence 未改。

停止於 **F2 獨立 review 已交付／待後續指示；F1 P3 局部複核通過，正式驗收仍延後；F1／F2 未 accepted，F3 未開始**。
