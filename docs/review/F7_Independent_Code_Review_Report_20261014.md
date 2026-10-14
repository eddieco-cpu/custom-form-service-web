# F7 獨立集中 Code Review

日期：2026-10-14（Asia/Taipei）。**F7 集中 review 完成、待 Owner 確認；有四項 P2，尚不能宣告 code review 通過。** 本次產品與既有測試未修改；正常工程檢查及既有案例通過，另以 fresh built fixture 診斷重現七個失敗情境，歸納為以下四個缺陷。正式驗收延後、accepted 不變、既有缺口保留。

## 1. 具體 findings

### F7-R4／P2：將管理 404／Lifecycle 衝突同步至 Draft 保存資格

**位置：** [form-management.ts](../../app/domain/form-management.ts) 第 143 行；接入位置 [useFormEditor.ts](../../app/composables/useFormEditor.ts) 第 31 行。

`failure()` 對 FORM_NOT_FOUND、FORM_ALREADY_PUBLISHED 等只設定 **ManagementState.unavailable**，沒有撤銷 EditorPageState.permission；Editor 的 permissionAllowed 又只檢查 management.denied。因此管理命令已停用，F6 定義保存仍認為 Owner Draft 資格有效。這不是單純保留可複製內容，而是仍能送出已知不合法的 PATCH。

**獨立重現：** 已載入 Owner Draft 並修改 title，Visibility PATCH 回正式 404／FORM_NOT_FOUND；關閉錯誤、取消一次丟棄確認後，title 保留，但保存仍 enabled，點保存實際多送一份 Draft PATCH。另以 clean Draft Publish 回 409／FORM_ALREADY_PUBLISHED、背景候選與關閉 Dialog 後的 GET 均 500，仍可編輯 title／保存並送 PATCH；該 PATCH 再被 FORM_NOT_EDITABLE 拒絕。兩案均使用攔截，未真正寫入。見 [追加 Browser 原件](evidence/F7_20261014/browser-extra-probes-first.json) 前兩案及 [404 畫面](evidence/F7_20261014/save-after-management-404.png)、[409 畫面](evidence/F7_20261014/save-after-publish-conflict.png)。

**影響：** 違反前端 04 §8／§10「取消保留可查看／複製內容，已知操作不合法仍須停用」，以及 F7 計畫 §3 的 404／409 資格撤回。應讓同 Form 的失效存在性／Lifecycle 資格同時約束 Editor 保存，可靠 current GET 採用後才依當前狀態恢復；保留 dirty 內容與丟棄 gate。既有 F6 自己的 PATCH 404 分支會撤銷資格，但新增的 F7 管理分支漏接，屬本輪引入的耦合缺陷。

### F7-R3／P2：把唯讀 Form 的 unknown 接入 dirty／beforeunload guard

**位置：** [FormReadPage.vue](../../app/components/forms/FormReadPage.vue) 第 9～11 行。

Published／Closed Form 管理 bridge 把 dirty 固定成 false、authorize 固定允許，頁面也未註冊 DirtyScope。Close／Visibility／Delete 結果不明雖有 shared unknown 與重讀入口，卻不參與 SPA leave／beforeunload。

**獨立重現：** Published Close 的 POST 模擬 `net::ERR_FAILED`，關閉結果不明 Dialog 後確認 Close disabled、核對入口仍存在；點首頁直接離開，原生確認 **0 次**。另一獨立頁同樣進 unknown，重新整理也 **0 次 beforeunload**，直接重新初始化 App／讀 Form，unknown 不再呈現。見 [Browser 診斷](evidence/F7_20261014/browser-probes.json) 的兩個 R3 案。

**影響：** 前端 04 §7 將結果不明視為待核對資料，§8 與 F7 計畫 §3 要求待核對納入 dirty guard，不因當頁無定義差異而解除。這個缺口也使此頁的 Delete 確認無法取得實際的待核對資料丟棄 permit。應將管理 anyUnknown 接入當頁 guard／ActiveDirtyScope，成功 current 採用或 204 清理才解除；保留已確認 Delete 成功導航只確認一次的行為。本 finding 不要求加入跨頁資料恢復。

### F7-R2／P2：隔離 Clipboard Promise 的晚回副作用

**位置：** [FormManagement.vue](../../app/components/forms/FormManagement.vue) 第 21～22 行；fallback 呈現於第 42 行。

`copy()` await Clipboard 後直接 toast／修改 fallbackUrl，未捕捉 Form ID、Session、資格、頁面存活或操作世代；toast 文案甚至取完成當下的 status。API scope／controller.dispose 無法保護這個元件內的 Promise。

**獨立重現：** 保持 Published 分享的 Clipboard Promise pending，SPA 到首頁後才 resolve，首頁仍出現舊「填答連結已複製」toast。另一案在 pending 時讓 Visibility 真正的 fixture 403／FORM_ACCESS_DENIED 撤下管理，再 reject Clipboard；雖然分享按鈕已不存在，舊完整分享 URL 卻新出現在管理區 fallback。見 [Browser 診斷](evidence/F7_20261014/browser-probes.json) 的兩個 R2 案及 [離頁後 toast](evidence/F7_20261014/clipboard-after-leave.png)、[撤銷後 fallback](evidence/F7_20261014/clipboard-after-denial.png)。

**影響：** 違反 F7 計畫 §3 的離頁／換 ID／Session 後不產生舊 toast／資料更新，以及 §2 的 Owner 分享入口資格。應用捕捉到的命令狀態產生文案，完成後先核對當頁／資源／Session／資格及當次 copy 世代，再顯示結果；換資源或卸載使舊 completion 失效。這是呈現與資格一致性問題，不宣稱分享 URL 會繞過後端授權。

### F7-R1／P2：發布前本地驗證失敗時定位第一個可修正欄位

**位置：** [form-management.ts](../../app/domain/form-management.ts) 第 73 行；UI 接收位置 [FormEditor.vue](../../app/components/forms/FormEditor.vue) 第 34 行。

`begin('publish')` 的 invalid 分支只傳 issues 後返回，UI watcher 只 setErrors，沒有呼叫 focusField。現有「關閉操作錯誤後聚焦」只涵蓋 API error Dialog，本地驗證失敗不會打開該 Dialog。

**獨立重現：** 載入合法但尚不完整的已保存 Draft：Rating `config={max:5}`、缺 min。clean 狀態按發布後，摘要與 min 欄位訊息正確，POST Publish **0 次**，但 activeElement 仍是「發布」BUTTON，未聚焦可編輯的 `questionId.config.min`，亦未定位該欄位。見 [Browser 診斷](evidence/F7_20261014/browser-probes.json) 第一案及 [畫面](evidence/F7_20261014/publish-local-validation.png)。

**影響：** 前端 05 §5 規定前端提交驗證失敗須捲到／聚焦首錯；F7 的新發布入口未沿用此行為。長表單／手機底部發布時，使用者需要自行尋找缺項。應在本地 Publish 驗證錯誤套入後定位第一個實際可編輯控制；保留完整 baseline 驗證、不送 API、不偷保存的既定行為。既有 B06 的 API error 聚焦 PASS 無法覆蓋這個入口。

四項均可在既有 F7 範圍內修正；本次只有 review，未自行實作修正。

## 2. 範圍、來源與版本

- 指定前基準：`47dbce558bc628d250911f56af621ba8da2e8093`；指定交付及全部產品檢查的 HEAD：`084020ae3c8a2f0db1e818cd8b555d5800de5099`。repo `C:\Users\user\Desktop\custom-form-service-web`、branch master，接手工作樹乾淨。
- 核對 96 檔 diff，包括全部產品／測試／config 變更、開發報告、計畫／進度文件及證據；閱讀相關 call sites：AuthSession、RequestScope、OperationState／WriteCoordinator、DirtyScope、Editor model／baseline／Delta、Publish validation／path map、API client／decoder與 UI。證據原件經解析、hash 與原件比對，不以自測 PASS 代替缺陷判斷。
- 依最新 [AGENTS v1.1](../../AGENTS.md)、本機 `C:\Users\user\.codex\skills\.system\review-agent\SKILL.md` 的 defect-first／完整 diff／禁止委派規則，以及 repo development skill 的 review 階段界線。review skill 原文要求「Do not modify files, create commits」；本次 Owner 明確要求保存 review 文件／證據與本機提交，該指示優先，產品與既有 tests 仍維持唯讀。沒有子代理或外部 review 訊息。
- 核准 [F7 計畫 v1.1](../implementation/F7_Implementation_Plan.md) §1～6／§8、[總計畫 v1.3](../implementation/V1_Frontend_Implementation_Plan.md) F7／§7／§7.1／§8；前端 00～07 全部閱讀，主要為 01 §7～10、02 v1.1 §1／3／4／7／10／12、03 §1／9、04 §4～12、05 §3～10、06 v1.1 §4～11、07 §3／6／9～10。
- 正式後端來源為唯讀 [SNAPSHOT](../../backend-ref/SNAPSHOT.md)，SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`。核對 00 §4～5、01 FORM-03～10／STA-01～02／CON、02 §7／12／15、03a §2～6／9、03b §3.5／7.1／8～9、03c §6、04 §4／6～8、05 §6／8～10／13.3～15；manifest **108／108** 相符。未發現須改 API／產品規格的來源衝突。
- 本次實測 Node **24.21.0**／npm **11.19.0**；fresh build Nuxt **4.6.1**、Nitro **2.13.4**、Vite **8.3.4**、Vue **3.5.43**；Vitest **5.0.3**、Playwright **1.64.0**。Chromium **156.0.8078.4**，Chrome／Edge 的獨立 smoke 使用本機 channel；版本及來源／build hash見 [獨立證據](evidence/F7_20261014/verification-summary.json)。沒有依賴／lockfile 修改或重新安裝。
- 另置後端 checkout HEAD 同快照 SHA，既存 untracked SNAPSHOT.md 未動；本次 DLL ProductVersion／SHA256 與開發 runtime 原件一致，5000 PID 29108／dotnet、啟動 UTC `2026-10-11T11:51:59.3428202Z`。本次不重查程序 assembly 綁定、不發業務 API，不能把 DLL／listener 核對當成 fresh backend integration；DB identity／migration 仍 UNCONFIRMED。見 [環境核對](evidence/F7_20261014/environment.json)。

## 3. 六項優先核對的獨立判讀

| 重點 | 判讀與實際證據 |
| --- | --- |
| 跨寫入 GET revision／資格撤銷／F4～F6 | acquire 即推進正規化 Form revision；captureRead 同時捕捉 idle，寫入／denial 後永久失效。loader／兩段資格 GET／候選／Count 的採用核對 scope／Session／revision。denial 與 reconcile 分離，普通 GET 與 SPA 返回不解除，成功明確 me＋Form adoption 才 confirmPermission。unit／F7 B07、B10～B11、B16、補充 Domain 及 F6 Browser 通過。**管理 404／409 對 F6 保存漏接資格，另列 R4；不宣稱共用流程全無回歸。** |
| Visibility 局部合併 | mergeVisibility 對當前定義及 frozen baseline 僅更新政策與 metadata，id／userId 核對；C／途中新增題目與原 A baseline、keys／config 省略／number 原值／微秒 deadline 保留。成功未呼叫 reconciled，其他 Delta／Lifecycle unknown 維持。受影響 unit、B04～B05、獨立 Domain 通過；狀態揭露 Published 時原定義禁寫，不直接丟棄 local input。 |
| Publish 完整 baseline／dirty／分離 | begin／confirm 皆對完整已保存 baseline 驗證，dirty 擋 Publish，service POST 無 body；path map 使用完整 Definition key，未知 details留 Dialog。B01／B06 與 unit 通過，沒有自動 PATCH＋Publish。**本地驗證焦點缺口為 R1；衝突後保存資格為 R4。** |
| Delete 一次確認／204／permit | 確認 snapshot核對 ID／Session／status／content revision；dirty 丟棄併入一次確認，204 不解析 JSON，clear後replace。三態 B03、B12及三種 × 取消 probe通過；獨立 Domain 的明確失敗／unknown／Session變更均撤銷 permit，保留 content且不 toast／navigate，Delete unknown鎖所有同 Form writes。唯讀頁unknown丟棄guard仍有 R3。 |
| Lifecycle／409／403／404／Auth／Count／分享 | Close成功留頁、截止仍Published、Closed合法統計入口／Visibility／Count移除等既有案例通過。三 Auth與disabled按各自分支，403 denial晚回GET不能復活；Count零／主動再次GET／read failure及Close後晚回有 unit或Browser斷言。**R2分享晚回、R3唯讀unknown guard及R4失效保存均獨立FAIL。** Count本次未另驗真實 API 去重。 |
| FAIL／斷言／版本／去敏／Delete inventory | [獨立稽核](evidence/F7_20261014/development-evidence-audit.json)：來源hash20／20對應交付commit及工作樹，artifact hash70／70，65份本機原件比對一致；首次FAIL保留，沒有以最新PASS覆寫。分次結果及適用界線見下一節。專用15個Form IDs一致，6份Delete均授權、無body／204與獨立404，9份保留；沒有本次新增資源。 |

## 4. 獨立執行結果

所有 Browser 使用真實本機 binary；API **全部攔截合成 fixture**，不是後端整合。F7／F6 built 使用本次 fresh production `.output`；scope兩案使用專用fixture dev harness，沒有冒稱built。另名reporter／artifact存 `output/playwright/f7/`，未覆寫開發或歷史原件。一次性reviewer probes存 `output/f7/review-20261014/`，可重現的來源副本隨去敏證據交付；沒有新增或修改 repo tests。

| 命令／方法 | 本次結果 |
| --- | --- |
| `npm run lint`／`npm run typecheck`／`npm run build` | **PASS**，exit 0；Nuxt＋tools strict。build原DEP0155警告保留。 |
| 核准F7指定的7份受影響unit | **231／231 PASS**。首次sandbox spawn EPERM是startup failure、未執行案例；本機成功重跑分列。 |
| `npm run test:unit -- tests/unit/f5-editor.spec.ts tests/unit/exact-number-gate.spec.ts tests/unit/common-adapters.spec.ts` | **58／58 PASS**；補核Publish完整性／精度helper。本次unit合計 **289／289、10 files**，不稱完整unit suite。 |
| `F7_MODE=built`、`F7_RUN_LABEL=independent-review-local`，`npm run test:e2e -- --config=playwright.f7.config.ts` | **24／24 PASS**，一次完整fresh built run；sandbox第一次只spawn EPERM，0案執行。 |
| F6 built，grep B01／B02-B03／B05～B09／pending old GET | **15 PASS／2 skipped**；保存／dirty／Auth／衝突／舊回應。兩個harness-only case的skip明列，不代填PASS。 |
| F6 fixture，grep `same-component ID update`／`pending old GET` | **2／2 PASS**，補上述skip；同元件ID／舊GET世代與pending finally回歸。 |
| `npx vue-tsc --noEmit -p tests/fixtures/f6/browser/tsconfig.json` | **PASS**，harness strict。 |
| F7 built `F7_CHANNEL=chrome`／`msedge`，grep `saved publish`／`Clipboard fallback` | 各 **2／2 PASS**，系統瀏覽器smoke，非完整矩陣。 |
| Reviewer Domain probes | **6／6 PASS**：peer／ID／pending／denial revision、Visibility保留、省略／exact／time、Delete validation／unknown／Session與permit、政策成功不解其他unknown。 |
| Reviewer fresh built Browser probes | **7個行為FAIL，對應四項findings**；另三種confirmation ×取消 **3／3 PASS**。故既有測試全部通過不代表F7 review通過。 |
| 本機文件／來源保護／秘密與diff核對 | 結果及hash見verification-summary；產品／tests／規格／原報告與證據／backend-ref維持原樣。 |

本次review probes也保留工具／診斷失敗：Domain第一版嘗試把含BigInt的內部Deadline model用JSON serializer匯出，1案probe FAIL／其餘5PASS；改為直接deepEqual時間基準後，第二次輸出仍遇BigInt，最後只匯出originalIso，六案PASS，精度／省略／keys斷言保留。confirmation × probe第一次用英文Close，產品採zh_tw，因此一案selector timeout；中止尚未完成的後續×，改用「關閉」只補跑三案PASS，R4兩個已完成FAIL保留。這些是reviewer診斷構造問題，不算產品缺陷或產品修正。證據audit初次git子程序EPERM、optional listener metadata sandbox未取得亦分開記錄；不拿這些作產品PASS／FAIL。

## 5. 開發報告／真實證據原件稽核

- 原件實際可讀：`output/f7/development-20261014/`、`output/playwright/f7/`；僅本機讀取private credential的實際值作去敏比對，未輸出或交付其內容。65份reporter／live／environment原件逐byte相同；log只依已聲明的LF／尾空白／EOF空行正規化比較。交付manifest全部70筆相符，backend manifest全部108筆相符。
- 首次built **11PASS／8FAIL**原件中有Count零值缺失、radio check後立即回復、Dialog close selector歧義；最終仍驗Count 0／2與兩次GET、policy還原／unknown鎖、本地content保留、dirty cancel、API error焦點／unknown path。改click符合即時失敗回復；footer／× selector變精確，不是刪除必要斷言。
- 首次live L06有原生Dialog already-handled與cleanup failure；最終加入handled promise，保留取消後content／disabled、接受離頁→login及Server未保存title讀回。built permission完整24案 **23PASS／1FAIL**與live-role SPA返回FAIL均保留；最終只加Home／back URL等待，仍驗無Owner命令、無多餘me、明確me＋成功Form恢復、Form GET500不能解鎖。Edge的`edge`錯channel首次兩案launch FAIL，`msedge`重跑才PASS。
- 最後產品source hash對應交付SHA；歷史各run有開始時間／build logs，但**沒有每個中間run獨立的不可變產品snapshot或build digest**。因此本次不把早期23案PASS／live主流程說成最終所有路徑都測過。後續denial補強影響路徑有built permission／局部SPA／live-role補驗；此前保存、政策持久化、三態Delete、Count的真實歷史證據只支持其已執行情境。最終版本次重新fresh build並完整24案、F6受影響回歸與新增診斷；真實最終版本流程沒有本次重跑。
- 兩個主流程run各保留6份Form，其中各3份delete-*：總 **15個不同Form IDs／6份soft-delete／9份未刪**，與retained索引逐run一致。六次DELETE path都對應事先登記的專用資源，request無body，CORS response有204，每次後續GET是正式FORM_NOT_FOUND 404。清單排除由真實GET request／測試斷言／成功reporter支持，原件未持久化完整清單Body，不宣稱本次重讀清單。
- 成功主流程76次request、16次獨立Form GET；失敗主流程15次readback也保留。九格政策matrix response／readback均同id／值／status；資格成功run四個observations與實际me次数一致。原wire未收集Count成功Body，四次GET／Response準備與UI `0→1→1→2` 數值斷言、reporter支持該歷史案例，不作本次獨立真實去重重驗。
- 本次掃描所有已交付F7 evidence：與兩份private credential檔的實際password值無匹配，無JWT樣式／秘密值欄位／storageState或trace。兩張開發mobile圖已目視；本次新圖全部合成資料。Auth request body未收集，CORS只交付allow-origin／allow-credentials。沒有新增合成帳號／Form／Response、真實写入、Delete、SQL、DB reset／volume操作。

## 6. 未驗事項、Git與停止點

真實invalid／expired／disabled及Server commit故障仍需既有受控前置，**BLOCKED**；本次fixture不能解除。DB identity／migration仍 **UNCONFIRMED**；實機touch／100星／軟鍵盤／safe-area、歷史≥11／21列表及所有特殊狀態、F8 Submit／Latest UI、F9 Statistics權限矩陣／內容、Firefox／WebKit、npm ci／audit、正式AI／人工驗收均 **NOT RUN**，依原授權／必要性保留。沒有重新執行真實整合，亦未宣告後端R10／R11或F7 accepted。

本次只新增本報告與去敏review證據，追加README／總計畫review進度；產品、既有tests、正式規格、AGENTS／skills、依賴、backend-ref、正式驗收文件及所有歷史原件不修改。交付前核對Git／diff／秘密／文件連結，作單一目的本機提交 `docs: record F7 independent code review findings`；本報告在該commit內，完整文件提交SHA與剩餘Git狀態由Git log及交付訊息提供，避免自引用SHA。本次啟動的preview已停止，既有後端不動。

**停於「F7 集中 review 完成、待 Owner 確認」。** 四項P2未修正，正式驗收延後、accepted不變、既有缺口保留；不推送、不展開F8。
