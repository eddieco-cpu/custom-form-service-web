# F2 Development Report — API／Model 共用基礎

| 項目 | 實際紀錄 |
| --- | --- |
| 版本／日期 | 1.0／2026-10-11（Asia/Taipei） |
| 授權／停止點 | Owner 已通過 F2 計畫 v1.0 review 並明確授權開發／自測／單一目的提交；**開發完成、待 code review** |
| 前置狀態 | F0 accepted；**F1 P3 補正已交付，待局部複核及正式驗收，F1 尚未 accepted**；本輪不代填驗收 |
| 前端接手 | `C:\Users\user\Desktop\custom-form-service-web`；master／`a2599215adbc4cf916d53b7d2fcfeb1c67e212d6`，接手工作樹乾淨 |
| 後端來源 | 本機唯讀 `backend-ref/`，2026-10-11 匯出／SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`；108 筆 manifest 相符。live process SHA／API 可用性本輪未驗 |
| 執行環境 | Node 24.21.0、npm 11.19.0；Chromium 156.0.8078.4；Nuxt 4.6.1、UI 4.11.3、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0；新增 lossless-json 4.3.1 |

## 1. 來源與實作範圍

依 [AGENTS v1.1](../../AGENTS.md)、[development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[已核准 F2 計畫 v1.0](F2_Implementation_Plan.md)、[總計畫 v1.3 F2／§7／§7.1](V1_Frontend_Implementation_Plan.md)、[F0 v1.1 已確認決議](F0_Alignment_Report.md)。受影響前端來源：02／06 v1.1，其餘 00～07 v1.0；細章對應沿 F2 計畫 §1。正式後端契約：00／01／03c／05 v1.1（2026-10-10），02／03a／03b／04 v1.0（2026-09-28），位置與來源 commit 依 [SNAPSHOT](../../backend-ref/SNAPSHOT.md)。另核對 `DefinitionNumber.cs` 的原始 exponent／數值容量及 API Part B／C／Error Catalog 的 resource shape。

未發現需要變更契約的差異。R10 accepted、R11 結果待 Owner 確認沿快照紀錄；未重新確認後端驗收，也未假定 live API 已可串接。本輪只建立共用能力與隔離 fixture；完整 Editor／Delta／Answer builder、Auth／D-12、產品頁與真實端點流程留既定輪次。

| 實際檔案 | 行為與目的 |
| --- | --- |
| `app/services/api-client.ts`、`app/domain/api/*` | native fetch，credentials include，JSON 字串 body；30000ms 涵蓋 body read，retry=0；直接 resource、204、Envelope／未知 code、local／transport／contract Result。泛型 Body 可接 typed Request；204 decoder 失敗正確分類為契約錯誤。Client 不導航、不保存 User |
| `app/utils/exact-number.ts`、`exact-json.ts` | immutable token、sign／digits／BigInt exponent 比較、容量檢查、lossless text parse／serialize、plain-data clone；安全整數在驗 int32／題型值域後轉換。拒絕原生浮點送出及 ExactNumber 隱式轉換 |
| `app/domain/api/decoders.ts`、`models.ts` | User／FormDetail／SummaryPage／Receipt／Count／Statistics runtime decode，必填／nullable／enum／config key 驗證；五題型分支、原 config 省略、Statistics 九欄位與 respondents 缺省／空陣列。Receipt 數字保留 exact，未依缺少的題型猜 Rating；只定 Editor／Answer／Statistics model 邊界 |
| `app/utils/unicode.ts`、`datetime.ts` | Unicode White_Space 邊緣 trim、Code Point、Password 原樣、ASCII Email 候選；100ns ticks／嚴格日期、台北秒顯示、原 ISO fraction 保留、改回基準／清除／真正修改時間候選 |
| `app/domain/request-scope.ts`、`operation-state.ts` 與 composables | resource／generation／session／卸載隔離與 loading ownership；同 App／Form 管理 lease、獨立 scope、送出快照、finally 清理；未知結果限制與可靠採用 callback，multiple／Create 核對後仍需重複風險確認 |
| `app/domain/dirty-scope.ts`、`useDirtyScope.ts` | scoped dirty／未知結果旗標、beforeunload、SPA leave／param update、一次 action／redirect permit、revision 失效、候選取得後才確認取代；取消保留資料，卸載移除 listener／guard |
| `error-presentation.ts`、`feedback/ReadError.vue`、`ActionErrorDialog.vue` | 情境化 Auth／Login／Latest／Statistics／Form 錯誤；request path→穩定 key map 消費介面，未知 detail 保留。原頁手動 retry、操作 Dialog 不因 Escape／遮罩關閉，×／關閉共用一次 callback；無自動 retry／toast／導航副作用 |
| `tests/unit/*`、`tests/fixtures/f2/*`、`tests/e2e/f2-common.spec.ts`、`playwright.f2.config.ts` | 純規則／競態 unit、原始 text fixture、載入實際 helper／composable／元件的獨立 Nuxt CSR harness。主 build 搜尋無 fixture route／文字；F1 config 僅新增原案例的 testMatch，避免預設 smoke 誤啟 F2 fixture |
| package／lock、README、總計畫 §9.6／F2 計畫 §7、本報告／evidence | 只 pin 新必要依賴並記實際進度／使用方式／證據；npm scripts、strict、正式規格、F1 case／歷史證據未改 |

## 2. 精確數值 gate

**PASS（前端合成自測）**：36 個 unit gate 案例及 Chromium 原生 fetch 的代表收送路徑通過。比較採固定序關係／wire 字串，沒有僅以 adapter 自比求 PASS。

- 長小數 `0.123456789012345678901234567890123456789`、`9007199254740993`、`1e80`／10^80+1、`1e-101`、`1e400`／`1e401`、負數序關係及相鄰大整數保持精度。
- `1/1.0/1e0`、`-0/0` 等值；空候選與 0 分開；精確 min=0.1／max=0.1000000000000000000001 兩端 inclusive、越界與 min>max 正確判定。
- 原始 exponent ±1073741823、整數 131072 位、小數 16383 位沿後端既有容量；接受 `1e131071`、`1e-16383`、`0e1073741823`，拒絕相鄰超界／非法 grammar／零的 raw exponent／尾隨零的 fractional 超界，沒有截斷或展開巨大 exponent。
- 原始 Form config／Receipt／Statistics text 全路徑→decoder→clone→serializer 不失真；Rating／count 等只在有題型及合法範圍才轉 int。number string、null number、非法整數／enum／config 拒絕。
- Browser 實際輸入 11 個合法 token，各送 1 個 POST，Body 精確為 `{"value":<token>}`，JSON number 不加引號；各回 Receipt／FormDetail／Statistics 三路 exact token。4 個容量超界候選不送 request。捕捉 Body 與測試摘要見 [去敏證據](evidence/F2/verification-summary.json)。

本輪 unit／Browser gate 不證明 PostgreSQL、真實 Receipt／Latest／Statistics 保存讀回；後續 F8／F9 依原計畫補整合證據。gate 首次啟動失敗及 Browser 首次失敗保留於 §4，沒有改預期或放寬容量。

## 3. 必要自測與實際結果

| 命令／檢查 | 結果與界線 |
| --- | --- |
| npm metadata／install lossless-json@4.3.1 | 受限 cache-only 首次 ENOTCACHED；有權限重試 PASS，僅新增精確 pin／lock entry |
| 原目錄 `npm ci --fetch-retries=0 --fetch-timeout=20000` | **FAIL／原目錄重現受阻**：EPERM unlink unrs native binding；未將原目錄記 PASS。後續 npm install 恢復可用依賴，PASS |
| 乾淨副本同命令 npm ci | **PASS**：`output/playwright/f2/repro-ci`，package-lock SHA256 與原目錄相同，983 packages／postinstall prepare 完成；不代替原目錄問題解決 |
| `npm run test:unit`（JSON reporter） | **PASS 78／78**，5 files：F2 77（API／decoder 27、Unicode／時間 5、精確 gate 36、scoped state 9），另沿用 F1 tooling smoke 1；mock fetch／fake timer／純規則，非真實 API |
| `npm run lint` | **PASS**，首輪 5 項錯誤保留並修正 |
| `npm run typecheck` | **PASS**，沿 F1 Nuxt strict＋tools tsc；未放寬型別或排除測試 |
| `node node_modules/nuxt/bin/nuxt.mjs typecheck tests/fixtures/f2/browser` | **PASS**，fixture 自身 strict 檢查；初始 tsconfig 與 Result 判別錯誤保留 |
| `npm run build` | **PASS**，產品 Nuxt CSR build；`.output` 無 F2 fixture 路由／標記。build 有既有 Vue exports DEP0155 warning，未因此改套件 |
| `npm run test:e2e -- --config=playwright.f2.config.ts` | **PASS 6／6**、0 skipped／flaky：數值 raw fetch；pending snapshot／輸入 freeze／同 Form 無第二寫入；500 未知鎖／取消及採用／Dialog ×與關閉；舊 401 error／舊 finally／session／換 Form 晚回；dirty SPA／同元件 param／back／單次 redirect／取代取消／beforeunload 取消及接受／clean 移除；native network 及實際 30000ms timeout 無 retry；read 404 原頁手動 retry。全為 fixture／故障攔截 |
| gate 的去敏 Body 保存／受影響重跑 | **PASS**：同 Browser command 加 `--grep 'numeric gate'`；完整 6-case report 與首次失敗另存，不被單案例 report 覆蓋 |
| 後端快照／diff／秘密／產物排除 | manifest **108／108 PASS**；backend-ref 未改。新增證據只含合成資料／命令摘要／hash；未提交 Cookie／Token／帳密／storageState／trace／node_modules／產物 |
| 真實 API／Cookie／CORS／DB、正式 AI／人工驗收、F1 五組完整 smoke／generate | **NOT RUN**；本輪無 Auth／真實持久化行為，依核准計畫不重跑不受影響的完整 F1 矩陣。正式驗收需另行授權 |

測試方法依高風險規則與瀏覽器行為選用：unit 驗精度／契約／時間／Unicode／競態；Browser 驗原生 fetch／timeout／導航與 unload／元件互動。未新增只鏡像樣式的測試或人工 PASS。真實 API 整合沒有以 fixture 成功代填。

## 4. 首次失敗、補正與證據保存

原始命令／JSON report／首次失敗 trace 在 ignored `output/playwright/f2/`；提交的 [verification-summary.json](evidence/F2/verification-summary.json) 保留實際結果、去敏錯誤摘要、案例與原檔 SHA256。F1 原 evidence 未改。

| 首次紀錄 | 原因／修正／結果 |
| --- | --- |
| `metadata-first.log`／`install-first.log` | cache-only ENOTCACHED；以已授權套件操作的 escalation 重試 metadata／install，PASS；保留兩版 log |
| `ci-first.log` | native `@unrs/.resolver-binding-win32-x64-msvc-…/resolver.win32-x64-msvc.node` EPERM。沒有停不明 process／刪 locked remnants；`restore-install.log` 恢復原工作目錄，`ci-clean.log` 證明獨立乾淨副本 lockfile 安裝 PASS；原問題仍未解除 |
| `gate-unit-first.log` | Vitest config 子程序 spawn EPERM，未實際開始案例；escalated `gate-unit-retry` PASS，沒有當成 gate 內容 FAIL／PASS 混用 |
| `lint-first.log` | Unicode 契約明確包含控制字元的兩個 regex、3 個 fixture page 的單字 component name。僅對該兩行加附理由的 no-control-regex exemption；fixture defineOptions 命名，lint 重跑 PASS |
| `typecheck-first.log` | vi.fn 推論無參數，但測試要查送出 snapshot；補明 mock 參數型別，重跑 PASS |
| `harness-typecheck-first.log`／`harness-typecheck-retry.log` | fixture 缺自己的 tsconfig；補 generated project references 後發現 blocked／stale 合併 kind 不可充分 narrowing。Result 改分開判別成員，fixture／root strict 都 PASS |
| `browser-first.json`／`browser-first-artifacts` | **3 PASS／2 FAIL**：× 名稱實際是 Close，測試誤寫 Close dialog；reload 案例重建頁後 fill 未建立 sticky user activation，未能保留輸入。修正名稱、先真實 click、明確斷言 beforeunload type；5-case retry PASS，補 6-case final PASS。未放寬 dirty 行為；首次 JSON／trace 原件保留，必要 excerpt／hash 交付 |
| 交付前 diff 核對 | typed Request 加 Body 泛型以支持 interface；204 decoder throw 改 contract-error，新增代表 unit；另補五題型 decoder 案例及實際 Body annotation。受影響 unit／型別／lint／build／gate 重跑 PASS；不覆寫原 log |

安裝實際輸出 15 個 audit 警示（1 low／7 high／7 critical）、glob deprecated 與 6 個 install-script policy 警示。只記工具觀察；未做 audit fix／升級或額外批准 scripts。lockfile diff 僅 lossless-json entry，其餘指定版本未改。這些警示不代表本輪已修復或已完成安全驗收。

## 5. 既有缺口、Git 與停止點

F1 P3 局部複核／正式驗收未結案；Owner 本次已明確允許按 F2 計畫開發，沒有將 F1 改 accepted。實際影響 F2 的既有缺口是原目錄 npm ci native binding EPERM，影響該目錄安裝重現；乾淨副本與恢復後原目錄的必要開發檢查可完成，故沒有未完成的 F2 必要 gate。Cookie／CORS、Auth session 提供與產品寫入流程仍由 F3／對應輪次接入，F2 composable 只接 getter／callback；不將沒有這些產品功能列成 F2 驗收 PASS。

本輪提交目的為 `feat: implement F2 API and shared model foundations`，包含上述 app／unit／isolated harness／必要 package／組態／交付文件，共 43 檔。交付前 index 與工作樹一致，剩餘未暫存／未追蹤變更 0；F1 案例／evidence 與正式規格無差異。實際 commit SHA 由 `git log -1` 與本次交付回報識別（本報告納入該提交，避免自引用 SHA）；parent 為接手 SHA。提交後另檢查 remaining Git state，未推送／PR／部署，沒有提交不相關變更。

**開發完成、待 code review。F1 P3 仍待局部複核及正式驗收，F1／F2 均未 accepted；不開始正式驗收或 F3。**
