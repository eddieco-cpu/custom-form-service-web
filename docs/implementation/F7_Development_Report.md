# F7 開發報告 — Lifecycle、Visibility 與 Owner 管理

版本：1.0／2026-10-14（Asia/Taipei）。**F7 開發完成、待集中 review。** Owner 已通過 [精簡實作計畫 v1.0](F7_Implementation_Plan.md) review，授權整輪開發、自測、範圍內修正、普通 API 專用合成測資及本機提交；v1.1 記錄跨寫入舊 GET 隔離補充，不另設計畫或測試計畫核准 gate。正式驗收延後、accepted 不變；以下 PASS 均為開發自測。

## 1. 接手、來源與實際環境

- 接手前端 `C:\Users\user\Desktop\custom-form-service-web`：master／`47dbce558bc628d250911f56af621ba8da2e8093`，與 Owner 基準一致。首次規劃前工作樹乾淨；開發開始時僅有本輪 README、總計畫進度及 F7 計畫三份未提交文件，併入本輪交付。
- 依 [AGENTS v1.1](../../AGENTS.md)、[round-development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫 v1.3](V1_Frontend_Implementation_Plan.md) F7／§7／§7.1／§8，以及 F7 計畫 §1 的完整來源表執行。主要行為引用前端 [01 §7～10](../specs/01-pages-routing-and-access.md)、[02 v1.1 §1／3／4／7／10／12](../specs/02-form-editor-and-lifecycle.md)、[03 §9](../specs/03-response-and-statistics.md)、[04 §7～12](../specs/04-auth-state-and-error-handling.md)、[05 §3～10](../specs/05-ui-and-interaction.md)、[06 v1.1 §4～5／8～11](../specs/06-technical-architecture.md)、[07 §6／9～10](../specs/07-api-integration-map.md)。00 的排除範圍維持。
- 後端正式來源為唯讀 [SNAPSHOT](../../backend-ref/SNAPSHOT.md)：`7591633137c5a6f57c1fce8e1ba19ab394015880`；00／01／02／03a／03b／03c／04／05 的版本與章節見 F7 計畫 §1。本輪核對 03b §8～9、03c §6、04 §4／6～8、05 §8～10／13.3～15；未改契約，manifest **108／108**。實際另置 checkout 為 `C:\Users\user\Desktop\custom-form-service`、master／同 SHA，既存 untracked SNAPSHOT.md 未動。
- Node **24.21.0**／npm **11.19.0**；installed 與 lockfile 一致：Nuxt 4.6.1、Nuxt UI 4.11.3、Tailwind 4.3.3、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0、lossless-json 4.3.1。無依賴／lockfile 變更，沿用 CSR、strict 與既有 scripts。
- 前端 built preview 為 `http://localhost:3000`，API 為 `http://localhost:5000/api/v1`。本輪 readiness／health／OpenAPI 200；真實業務結果另見 §4。5000 PID 29108／dotnet，啟動 UTC `2026-10-11T11:51:59.3428202Z`。規劃時 command-line 讀取 PermissionDenied 留歷史；開發時唯讀授權 probe 確認程序引用 `src\CustomFormService.Api\bin\Debug\net10.0\CustomFormService.Api.dll`，ProductVersion `1.0.0+7591633137c5a6f57c1fce8e1ba19ab394015880`，SHA256 `06E2A62DB9C4376701E75B0CE3E7283D34B129D378C884E33FB1CB764A0AF180`。DB identity／migration 仍 **UNCONFIRMED**；未重啟／重建後端或 DB。
- 實測 Chromium **156.0.8078.4**、Chrome **156.0.8078.12**、Edge **155.0.4283.45**。版本、命令、案例、source hash、首次失敗與重測見 [verification-summary.json](evidence/F7_20261014/verification-summary.json)，[artifact-manifest.json](evidence/F7_20261014/artifact-manifest.json) 記錄交付證據 hash。

## 2. 實作與使用者行為

| 範圍／主要檔案 | 已完成行為 |
| --- | --- |
| [form service](../../app/services/form.ts) | Publish／Close 無 Body POST、Delete 無 Body DELETE／204 不解析 JSON；Visibility PATCH 僅 resultVisibility；Count GET 非負整數。Lifecycle 回應核對同 id 與預期 status，管理回應核對 Owner id |
| [management domain](../../app/domain/form-management.ts)／[composable](../../app/composables/useFormManagement.ts) | Owner＋可靠資源／Session 才能管理；確認快照包含 id、status、內容與 Session revision；確認期間內容／Session 改變即取消資格。候選重讀不直接覆蓋定義，明確 reload 才走採用與 dirty permit |
| [FormManagement](../../app/components/forms/FormManagement.vue) | Publish／Close／Delete 確認與取消／×；Count 按下才 GET、0 正常呈現、可再次讀取、不輪詢。失敗保留上次數值並標「本次未更新」。Clipboard 成功 toast；拒絕時提供可全選的完整 URL，Closed 另列政策查看資格 |
| [ResultVisibilityControl](../../app/components/forms/ResultVisibilityControl.vue) | 真實初值的三個 radio、切換即保存，顯示 pending／unknown；相同已確認值不送。Visibility pending 可繼續編輯本地定義，其他同 Form 寫入鎖住 |
| [FormEditor](../../app/components/forms/FormEditor.vue)／[editor composable](../../app/composables/useFormEditor.ts)／[editor domain](../../app/domain/editor-page.ts) | Draft Owner 保存與發布分開，dirty 禁用 Publish、提示先保存；對已保存 baseline 作完整 Publish 驗證與 API path 定位，保留預覽。成功 Publish clean＋toast＋push Form 頁；手機固定列有保存／發布且不新增自動串接寫入 |
| [FormReadPage](../../app/components/forms/FormReadPage.vue)／[FormDefinitionView](../../app/components/forms/FormDefinitionView.vue)／[FormRootInfo](../../app/components/forms/FormRootInfo.vue) | Published／Closed 以唯讀題目呈現。Published Owner 可 Close／Delete／政策／Count／填答分享；自然截止仍 Published、可 Close。Close 成功留頁並切 Closed 統計入口／分享、撤下 Count。Closed Owner 可 Delete／政策；非 Owner 無管理，owner_only 不顯統計入口 |
| [dirty scope](../../app/composables/useDirtyScope.ts) | Delete 的一次確認同時包含 dirty 丟棄，204 後清當頁內容／錯誤／Count／確認、replace `/forms`，導航不再詢問。unknown reload／資格核對只有事先丟棄 consent 且內容 revision 未改才可採用；取消或失敗保留內容與鎖 |

new 沒有正式 id 時維持 Create／預覽，沒有 F7 管理／分享；Create 成功取得正式 id 後，共用鎖立即使用該 id。非 Owner Draft 的 404、停用 User、三種 Auth 失敗 Dialog／返回登入沿用既有規格。Auth／Owner 被否定後，即使取消 dirty 導航，內容仍可留作本地保留，寫入資格不恢復；一般 GET 也不能自動恢復。

### Visibility 合併與未知寫入

`mergeVisibility` 只把 `resultVisibility` 及 metadata 的 id、userId、status、creatorDisplayName、createdAt、updatedAt 合併到**目前定義及 frozen baseline**；定義欄位、Question／Option key、raw config、省略 variant、精確 number／時間、途中新增的未保存編輯都保留。回應整份 DTO 的 title／questions 不作定義替換，政策成功後仍 dirty；政策本身與 metadata 已是確認值。

同 Form 的 Delta／Visibility／Lifecycle／Delete 共用 lease，pending 不可並寫。各 unknown policy 沿用既定鎖：Delete unknown 鎖住同 Form 三種寫入；Delta 與 Lifecycle unknown 互鎖；Visibility 成功不解除其他 unknown。transport sent、5xx、已送出的契約錯誤列 unknown，不能盲重送；必須採用新的可靠 Form GET，或確認當前正式 404，才能解除。Count 是 read，失敗不產生寫入 unknown。

### 跨寫入舊 GET 隔離與資格撤回

[WriteCoordinator](../../app/domain/operation-state.ts) 在**取得寫入 lease 的當下**推進該 Form revision。Form loader、資格核對 GET me／Form、Count、候選 GET 開始時捕捉 revision 及是否 idle；即使 pending 結束，任何跨過寫入的 ticket 都永久失效。採用前仍檢查 request scope、資源／Session、revision 與必要 dirty permit；寫入期間開始的 GET 同樣不能建立可信 baseline。不同頁面操作 instance 共用 coordinator；不依賴 pending 當下的 boolean 判定。

- unit 覆蓋寫入成功後舊 GET 不蓋新 status／Visibility／baseline、unknown 後舊 GET 不解鎖、GET me 及第二段 Form GET 各自在寫入前開始、不同 ID／Session，以及 pending 期間 GET。
- Browser 以延遲 Form GET 驗證 Close 成功後舊 Published 回應不覆蓋 Closed；Close unknown 後晚回不解除鎖，只有新的 GET 可核對。Delete unknown 的可靠 404 以已取得的一次 dirty consent 清資料並解鎖。
- FORM_ACCESS_DENIED 記在 App 共用 coordinator，綁定 Session revision，亦推進讀取 revision，避免資格否定前的 GET 復活。普通重讀與 SPA Home／返回不解除；只有新的明確 GET me＋**成功採用**的當前 Form GET／新的已確認 Session，或完整 App 啟動重新核對可恢復。保留 DTO 但 Form GET 500 的資格核對仍失敗；這兩層分別以 fixture 與真實正常換帳號 Cookie 案驗證。

## 3. 工程與 fixture 自測

| 方法／實際命令 | 結果與理由 |
| --- | --- |
| `npm run lint` | **PASS**；最後 Browser 導航同步修正後重跑，[log](evidence/F7_20261014/logs/lint-closeout.log) |
| `npm run typecheck` | **PASS**；Nuxt app＋tools strict，涵蓋新 Browser／unit，[log](evidence/F7_20261014/logs/typecheck-closeout.log) |
| `npm run build` | **PASS**；最後產品版本 fresh build，[log](evidence/F7_20261014/logs/build-permission.log)。DEP0155 套件 export deprecation 警告保留；沒有更換依賴 |
| `npm run test:unit -- tests/unit/f7-form-management.spec.ts tests/unit/f6-editor-page.spec.ts tests/unit/f5-definition-request.spec.ts tests/unit/f5-config-omission.spec.ts tests/unit/scoped-state.spec.ts tests/unit/f4-form-read.spec.ts tests/unit/api-client.spec.ts` | **231／231、7 files PASS**；管理規則、合併、baseline／發布定位、未知鎖／舊 GET、dirty／資格／Count與受影響 F4～F6／API 共用回歸，[log](evidence/F7_20261014/logs/unit-permission.log) |
| `$env:F7_MODE='built'; $env:F7_RUN_LABEL='permission'; npm run test:e2e -- --config=playwright.f7.config.ts` | **23 PASS／1 FAIL**（完整 24 案）；失敗為測試 Home 尚未完成就 goBack，後述保留原件 |
| 同 config，`F7_RUN_LABEL='permission-spa'`，`--grep 'conflict candidate\|readonly qualification'` | 受影響 **2／2 PASS**；加入 Home／返回 URL 等待，保留管理資格與失敗核對斷言。逐案最新 **24 個不同案例全部 PASS**；不是宣稱重新完整跑 24／24，[逐次 reporter](evidence/F7_20261014/verification-summary.json) |
| 同 config，`F7_CHANNEL='chrome'`／`'msedge'`，`--grep 'saved publish\|Clipboard fallback'` | Chrome **2／2 PASS**、Edge **2／2 PASS**；系統瀏覽器 smoke，非完整矩陣 |
| `npm run test:e2e -- --config=playwright.f6.config.ts --grep 'F6-B01\|F6-B05\|F6-B06\|F6-B07\|F6-B08\|F6-B09\|same-component ID update\|pending old GET' --reporter=json`；第二輪 `--grep 'F6-B07\|F6-B09 conflict'`；補跑 `--grep 'F6-B02/B03' --reporter=line,json` | fixture 第一輪 **16／16 PASS**；資格共用鎖補強後再驗 **8／8 PASS**；更新政策初值斷言的五題型／重排單案 **1／1 PASS**。另指定本輪 output／JSON reporter path，見 [log](evidence/F7_20261014/logs/f6-permission.log)／[reporter](evidence/F7_20261014/browser/f6-permission-results.json)／[政策單案](evidence/F7_20261014/browser/f6-policy-assertion-results.json)；F6 僅更新一項被 F7 取代的政策唯讀提示斷言，改驗初始 radio 值 |
| `npx vue-tsc --noEmit -p tests/fixtures/f6/browser/tsconfig.json` | **PASS**；受影響 F6 harness strict，[log](evidence/F7_20261014/logs/f6-harness-typecheck.log) |

F7 Browser 使用 built app，1440×900 桌機、390×844／320×844 手機 viewport；[Visibility 畫面](evidence/F7_20261014/images/visibility-mobile.png)、[Closed 分享 fallback 畫面](evidence/F7_20261014/images/closed-mobile.png) 已目視核對。驗證確認／取消／×、push／replace／留頁、dirty 原生 confirm、先保存再發布、全路徑錯誤焦點、政策途中輸入、互斥、未知重讀取消／失敗、當前 404、三種 Auth／disabled／nonOwner、Clipboard 成功／拒絕與 Count 主動讀取。Cookie／CORS 或 Server 成功不能由這些攔截結果推定。

fixture 的 network／console 沿用 F6 精確診斷 helper：在操作前宣告 method、完整 URL、status 或 failure reason 及次數；未知 console／pageerror／requestfailed 不放行。reporter 內 `declared-network-diagnostics` attachment 保留事前 expected 與 actual，不追認失敗。首次 Count 產品錯誤列在首次 reporter，最終案例無非預期診斷。

### 首次 FAIL 與修正後重測

| 首次結果（原件保留） | 修正與實際重測 |
| --- | --- |
| [unit-initial](evidence/F7_20261014/logs/unit-initial.log) startup `spawn EPERM` | sandbox 不允許 Vitest worker，測試未執行；授權本機環境 124 PASS，後續範圍增加至最終 231 PASS，非產品 assertion FAIL |
| [lint-first](evidence/F7_20261014/logs/lint-first.log) 5 error，之後 [lint-corrected](evidence/F7_20261014/logs/lint-corrected.log) 1 error | 整理 import、const／unused 與 test duplicate import；最後 lint-closeout PASS |
| [typecheck-with-tests](evidence/F7_20261014/logs/typecheck-with-tests.log)、[typecheck-browser-first](evidence/F7_20261014/logs/typecheck-browser-first.log) FAIL | test 用 immutable definition replacement；QuestionDelta union 先檢查 id；最後 strict PASS |
| [built-first](evidence/F7_20261014/browser/built-first-results.json) **11 PASS／8 FAIL** | Count 事件未綁定 class this，改 `controller.count()`；radio 測試由 check 改 click，避免立即失敗回復值被誤認；Dialog footer／× 明確選取。修後完整 **23／23 PASS**，之後擴增為 24 案 |
| [live-first](evidence/F7_20261014/browser/live-first-results.json) L06 FAIL | 原生 dialog dismiss 尚未完成即註冊 accept 造成重複處理；測試等待 handled promise，且 fixture Auth 同樣補明確等待；[live-corrected](evidence/F7_20261014/browser/live-corrected-results.json) L01～L06 PASS，原資源保留 |
| [built-permission](evidence/F7_20261014/browser/built-permission-results.json) 23 PASS／1 FAIL；[live-role](evidence/F7_20261014/browser/live-role-results.json) FAIL | Home 導航未完就 goBack；測試補兩段 URL 等待，未改產品或放寬資格斷言；fixture 局部 2 PASS／[live-role-corrected](evidence/F7_20261014/browser/live-role-corrected-results.json) PASS |
| [built-edge-smoke](evidence/F7_20261014/browser/built-edge-smoke-results.json) 2 launch FAIL | 首次 channel `edge` 不受 Playwright 支援；改 `msedge`，2／2 PASS；不是產品或 binary 缺失 |
| [staged diff check](evidence/F7_20261014/logs/git-diff-cached-first.log) FAIL | 新交付的十份 log 有額外末尾空白行；只正規化交付 logs 的末尾換行，原 logs 不改、結果文字保留，重新 stage 後 diff check PASS |

## 4. 真實 API／Cookie／CORS 結果與測資

使用正常註冊／登入、Create／PATCH／Publish／Close／Visibility／Response／GET，沒有 fixture 攔截、造簽 Token、SQL 改業務資料或 DB 清理。實際命令為 `F7_MODE=live` 下 `npm run test:e2e -- --config=playwright.f7.config.ts`（首次與 corrected 當時只有主流程），後續分別 `--grep 'matrix continuation'`、`--grep 'real cached Owner'`，用 F7_RUN_LABEL 分別保留 reporter。最新三個工作流程分次執行，均 **PASS**；不是聲稱同一次三案完整跑過。所有 run（含失敗）、專用 ID／用途／是否可刪與現況見 [保留測資索引](evidence/F7_20261014/retained-live-runs.json)。

| 計畫案例 | 本輪真實證據與結果 |
| --- | --- |
| L01 Draft 保存／Publish | UI Create 201、Draft PATCH 200，各有獨立 GET；dirty 禁 Publish，保存後另確認無 Body Publish 200，讀回 Published，UI 撤下定義輸入與保存。**PASS** |
| L02 Visibility | Draft 三政策各自 PATCH＋GET，未保存 title 留在本地、Server 仍保存版；Published／Closed 政策修改與刷新讀回。另 [九格政策矩陣](evidence/F7_20261014/live/f7-matrix-1791946261307-sanitized.json) 驗 Draft／Published／Closed × 三政策，每格 UI PATCH 200／獨立 GET 200＋同 id／值／status。**PASS** |
| L03 Close | 一般 Published Close 200＋GET Closed；正常建立未來 12 秒 deadline、自然等待截止，GET 仍 Published，UI 顯已截止且可 Close，200＋GET Closed。**PASS**；未調系統／DB 時計 |
| L04 Delete | 每次完整工作流程各建立 Draft／Published／Closed 三份專用刪除資源，UI 確認 DELETE 204、replace 清單、後續 GET 404、清單不再包含；dirty Draft 一次確認、沒有多餘原生 confirm。兩次合計 **6 份** soft-delete，其他資源不刪。**PASS** |
| L05 Count | multiple、全題 optional 專用 Published；0 → Owner 一份 1 → 同 Owner 第二份仍 1 → Other 一份 2，四次 UI GET 200。**PASS**；普通 Response API 僅準備本輪人數去重測資，未實作 F8 UI |
| L06 身分／權限／Auth | 新 Active Other 讀 Published 沒有管理，直接正常 PATCH 403／FORM_ACCESS_DENIED；清 Cookie 後 UI write 401／AUTH_REQUIRED，Dialog 後取消 dirty 導航保留但禁寫，允許導航、正常登入返回再核對。**PASS** |
| L06 資格延續補驗 | [真實 Cookie 與快取 Owner 不一致](evidence/F7_20261014/live/f7-role-1791948760592-sanitized.json)：正常 Other login 改 HttpOnly Cookie，SPA 快取 Owner 的政策寫入得到真實 403；撤下管理。改回 Owner Cookie＋明確 me／成功 Form GET 恢復；再否定後 Home／back 管理不恢復且沒有額外 me；明確核對 Other 移除 Owner 指令，完整 App reload 重新確認 Owner。**PASS** |

[完整成功 run](evidence/F7_20261014/live/f7-1791945744889-sanitized.json) 有 76 次實際 API request、16 次獨立 GET readback（包括三份 Delete 後的 404）及 CORS 觀察；Delete 後清單另有 request 與排除 ID 的 test assertion。[首次 run](evidence/F7_20261014/live/f7-1791945344721-sanitized.json) 到 L06 失敗，已完成資源與 15 次讀回保留。Auth request body／Cookie／Token／秘密 headers 未收集；CORS 只記 allow-origin／allow-credentials。成功與失敗 run 的非預期 console／pageerror／network 配對問題均 0，明列專用 Delete 違規 0。

本輪合計正常建立 **4 個合成帳號、15 份 Form**；6 份明列 delete-* 專用資源已 soft-delete，**9 份未刪保留**（含兩次失敗的測資）。政策矩陣與兩次資格補驗重用第二次 Owner／Other，不新增帳號、不 Delete。F6 歷史三次帳號／五份 Draft 與證據原樣保留；沒有清理硬刪。再跑 live 主流程會新建帳號／Forms；matrix／role 需 ignored 私密帳號檔，本次可用不等於可公開憑證。

去敏交付位於 `evidence/F7_20261014/`；兩份 `*-private-credentials.json` 僅留 ignored `output/playwright/f7/`。以實際生成密碼逐值比對交付檔、JWT pattern／秘密 value fields 掃描均 PASS；無 storageState／trace 交付。交付 logs 僅正規化 CRLF／末尾空白／額外 EOF 空白行，原始本機 logs／artifacts 保留，`.gitignore` 追加 `output/f7/`。manifest／source hash 明列 UTF-8 文字以 LF 核對、PNG 用原 bytes，避免 Git autocrlf 造成誤判。圖片只含合成資料，不提交敏感個資。

## 5. 既有缺口與本輪限制

| 狀態 | 項目及對 F7 的影響 |
| --- | --- |
| **BLOCKED** | 真實 invalid／expired Token、disabled User 尚無已同意受控前置；fixture 驗前端三 Auth／disabled，不解除相應真實缺口。清 Cookie 只驗 AUTH_REQUIRED |
| **BLOCKED** | 真實 Server commit 結果不明／故障安排未具備；500／network／晚回以 fixture 驗前端鎖與核對，不能代稱後端交易故障 PASS |
| **UNCONFIRMED** | DB identity／migration 未確認。runtime command-line assembly 綁定本輪已確認；這不等於 DB 或 Statistics 真實結果確認 |
| **NOT RUN** | 實機 touch、100 星、軟鍵盤／safe-area 與人工體驗；F7 viewport／目視只支持畫面，F6 相關設備缺口保留 |
| **NOT RUN** | 歷史 F4 ≥11／21 筆清單／所有篩選特殊狀態未完整重測；F7 少量、分帳號的測資與專用刪除不解除全部歷史缺口。僅本輪普通三態／角色／Delete 個案取得真實結果 |
| **NOT RUN** | Firefox／WebKit、npm ci／audit、完整不受影響測試；無依賴變更，已按風險選必要層級。未因形式新增鏡像測試或正式驗收文件 |
| **NOT RUN** | F8 Submit／Latest UI、F9 Statistics body／真實權限矩陣；本輪只接統計 URL／政策資格說明，不作跨輪實作。R10／R11 歷史狀態不能代填目前統計 API PASS |
| **NOT RUN** | 正式 AI／人工驗收、Owner accepted；沿用延後決議。集中 code review 尚未開始，本報告不代填 review PASS |

## 6. Git、交付與停止點

本輪產品／tests／去敏證據、計畫授權補充及 README／總計畫進度作單一目的本機提交，commit subject：`feat: implement F7 form lifecycle and visibility management`。接手 SHA 如 §1；交付 commit 包含此報告，完整 SHA／剩餘 Git 狀態以提交後交付訊息及 `git log -1` 為準，避免在 commit 內寫自引用 SHA。

交付前檢查本輪 diff、文件連結／格式、證據 hash／去敏、專用 Delete inventory 與未改保護路徑；未動正式規格、AGENTS／skills、依賴、backend-ref、正式驗收文件或歷史 F6 report／evidence。文件檢查結果另附 [closeout-checks](evidence/F7_20261014/closeout-checks.json)；本機原始失敗及成功原件保留。沒有 push、PR、部署、DB reset／volume 操作。

**停於「F7 開發完成、待集中 review」**；正式驗收維持延後、accepted 不變，未解除的既有缺口如 §5 保留，不展開 F8。
