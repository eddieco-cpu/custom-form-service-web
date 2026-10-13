# F6 開發報告 — Editor、保存與 Preview

版本：1.0／2026-10-13（Asia/Taipei）。**F6 開發完成、待集中 review。** Owner 通過計畫 v1.0 並授權整輪開發、必要自測與修正；已先同步兩項決議至 [計畫 v1.1](F6_Implementation_Plan.md)，沒有中途測試計畫核准關卡。正式驗收維持延後、accepted 不變，不推送、不展開 F7。

## 1. 基準與實際範圍

接手 repo `C:\Users\user\Desktop\custom-form-service-web`，master／`510b6ee7d03935d553303e5ed745a81b23e59944`、工作樹乾淨；這是前次 F6 計畫提交，承接 Owner 指定的 F5 review 基準 `0a8ceeb560b06a7ca2f847f019f8894cd346bce0`。引用 AGENTS v1.1、repo development skill、總計畫 v1.3 F6／§7／§7.1／§8.1，與前端 00～07 中計畫 §1 所列章節；正式 API 依唯讀 backend-ref 00／01／02／03a／03b／03c／04／05。後端快照 SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`，本次 manifest 108／108 相符。

| 檔案 | 實際責任 |
| --- | --- |
| [new](../../app/pages/forms/new.vue)／[edit](../../app/pages/forms/[formId]/edit.vue)、[FormEditor](../../app/components/forms/FormEditor.vue)、[QuestionEditor](../../app/components/forms/QuestionEditor.vue)／[EditorField](../../app/components/forms/EditorField.vue) | 取代頁殼；根設定、五題型 config、label-only Options、題目／選項手柄與上下移動、切換確認、UForm／F5 驗證與首錯聚焦、metadata、手機固定保存區 |
| [useFormEditor](../../app/composables/useFormEditor.ts)／[editor-page](../../app/domain/editor-page.ts) | Editor session／baseline、資源／Session scope、保存、手動核對與獨立寫入資格；串 F2 operation／dirty／F3 Auth；覆蓋 stale adoption、導航與 loading finally |
| [form service](../../app/services/form.ts) | POST Create 201／PATCH Draft 200；沿 F2 serializer／完整 DTO decoder，核對 PATCH id 與採用時 Owner／Draft |
| [Renderer](../../app/components/forms/FormRenderer.vue)／[Preview](../../app/components/forms/FormPreviewDialog.vue)、[Stars](../../app/components/questions/RatingStars.vue)／[Range](../../app/components/questions/RatingRange.vue)／[rating helper](../../app/domain/rating-input.ts) | F5 AnswerDefinition／AnswerModel 的 input 與 readonly；每次 Preview 的獨立定義快照、空答案；沒有 Response API／Latest／route／dirty 副作用 |
| [CSS](../../app/assets/css/main.css) | 桌機最大 960px、Editor native controls、錯誤 scroll margin；Preview 90vw×90vh／手機各邊 2px、100dvh 與 vh fallback |
| [unit](../../tests/unit/f6-editor-page.spec.ts)、[Browser](../../tests/e2e/f6-browser.spec.ts)／[live](../../tests/e2e/f6-live.spec.ts)、[config](../../playwright.f6.config.ts)、tests/fixtures/f6 | 16 個新 unit、23 個 fixture Browser 案、built 複驗與真實 L01～L04；獨立 readonly／同元件 scope routes 僅存在測試 harness |

沒有改 F5 資料契約、依賴、lockfile、正式規格、backend-ref 或歷史報告。元件採 EditorField＋QuestionEditor 整合根欄位與 Options，沒有為拆分另設 gate。讀取重用 F4 service／RequestScope／formReadError 與 Auth 分流原則，由 Editor controller 自行管理候選採用；不將 dirty session 放入會在 contextChanged 清空 data 的 FormReadController。

產品既有 Visibility 顯示 API 實際值與「此設定目前僅供檢視」，沒有「F7 接入」提示。new Visibility 必選；edit 定義 PATCH 不送 resultVisibility。Publish／Close／Delete／Visibility 即時保存／Count／分享仍留 F7；正式提交／Latest 留 F8，未呼叫這些 API。

## 2. 保存、資格與本地資料

new 取得有效 User 才建立本地模型，進頁沒有 POST／Form GET／假 id。保存用 F5 Create／Delta builder：invalid 不發 Request，saved noop 不 PATCH；送出獨立快照，pending 停用定義修改與重複保存。完整成功 DTO 才呼叫 loadEditor，重建所有 Question／Option Server IDs、config／deadline source、metadata 與 baseline。Create push edit，之後使用真實新 IDs；PATCH 留原 URL。成功 toast、導航、採用都檢查 current；錯誤／晚回結果不清本地資料或建立假成功基準。

本地 session 與 `{userId, sessionRevision, resource}` 寫入資格分開。Auth 401 撤銷資格並更新共用 Auth，Dialog 關閉／× 後由 dirty 決定是否離頁。取消可查看／選取／複製內容，但不能恢復舊 Session 保存；一般 Auth login／換帳號也不自動恢復 grant。「核對登入與保存資格」必須重新 GET me：new 換帳號須確認以目前帳號沿用本地定義；edit 在同意丟棄後還須 GET 該資源、核對目前 Owner／Draft，成功採用才恢復資格與基準。取消、失敗、403／404、非 Draft 均不能解鎖。new／edit 的三種 Auth 401、帳號 B／Owner 不符／回到有效 Owner 由 Browser＋unit 覆蓋。

Delta unknown 由共享 coordinator 封鎖保存，即使改回舊值仍待核對。重新載入先確認取代；取消不 GET，GET 失敗保留輸入與鎖，只有 current 完整 DTO 採用後 reconcile。Create unknown 保留未保存定義，提供列表核對入口，每次重試確認重複風險；列表不認領 id、不假定前次成功。FORM_NOT_EDITABLE 的背景 GET 僅候選，需明確取代才 replace Form URL；403／404 保留內容並撤下資格。欄位 API path 使用此次 Request map，稀疏 Delta 正確定位第三題第二選項；未知 path 留 Dialog。

dirty 包含 F5 語意差異與待核對；導航、history、beforeunload、重讀與登出使用原 F2 guard。成功採用 clean 後的首次導航不再詢問。同元件換 id 切換 read generation，立即啟動新讀取，舊 GET／finally 不覆蓋資料或清掉新 loading。手動 GET 的失敗使用 read 語意，不誤稱新的 unknown write。

## 3. Renderer／Preview 與配置自測

Renderer 保留 number raw 字串，沒有浮點轉換；readonly 顯示完整答案／label／分數／未作答，沒有修改或清除控制。Preview 每次新快照／空答案、捲回頂；試填不污染 Editor／dirty，空 title／Options／Rating bounds／Visibility 顯示提示而不回寫。關閉／×／遮罩可關、Esc 不關，背景鎖捲動、focus trap 與回觸發按鈕已驗證。

Stars 0 radio、min>1 disabled、100 顆／每列十顆；Range 初始 undefined、focus 不作答、點初始 0／3 也作答、方向鍵更新；optional 清除、required／readonly 無清除。題目鍵盤移動到邊界後，焦點保留在該卡可用的移動控制。手柄拖曳、上下移動及稀疏排序還原另測。桌機 1440×900、手機 viewport 390×844、320×640、844×390：Preview 尺寸、長內容、無整頁水平溢位與手機保存區留白通過。這些是桌機 Chromium 的 viewport 自測，不能代稱實機軟鍵盤／觸控／safe-area 測試。

已目視核對 [桌機 Editor](evidence/F6_20261013/editor-desktop.png)、[手機 Editor viewport](evidence/F6_20261013/editor-mobile.png)、[手機長內容 Preview viewport](evidence/F6_20261013/preview-mobile.png)，均為合成資料，沒有秘密或真實個資。

## 4. 實際版本與命令結果

Node 24.21.0／npm 11.19.0；沿既有 Nuxt 4.6.1、UI 4.11.3、Tailwind 4.3.3、draggable 0.6.1、Zod 4.6.5、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0／Chromium 156.0.8078.4、lossless-json 4.3.1。Windows Chrome 156.0.8078.12／Edge 155.0.4283.45 以獨立 Playwright channel 做 smoke。

後端本輪 20:20:46～48 台北時間 `/health`／`/health/ready`／`/openapi/v1.json` 均 200。實際發現 checkout `C:\Users\user\Desktop\custom-form-service`，HEAD 與快照相同，有既存 untracked SNAPSHOT.md 未動；5000 埠 dotnet 程序自 2026-10-11 19:51:59 啟動，所用 `src/CustomFormService.Api/bin/Debug/net10.0/CustomFormService.Api.dll` ProductVersion **1.0.0+7591633137c5a6f57c1fce8e1ba19ab394015880**、SHA256 見 [runtime 證據](evidence/F6_20261013/backend-runtime.json)。這是所觀察 DLL 的來源版本標記，沒有重新建置後端。DB 容器映像 postgres:17.11-alpine 可見，但目前 DB identity／migration 未獨立確認。

| 命令／案例 | 本輪結果與證據界線 |
| --- | --- |
| npm run lint | PASS，最終零錯誤／警告；最初 prop mutation／prefer-const／fixture 名稱／import 順序失敗保留 |
| npm run typecheck | PASS，Nuxt app＋tools strict；最初 UForm errors Ref 與 fixture DTO union 問題保留後修正 |
| npm run build | PASS，最終 fresh build，無依賴變更 |
| npx vue-tsc --noEmit -p tests/fixtures/f6/browser/tsconfig.json | PASS，額外核對 readonly／scope harness Vue strict |
| npm run test:unit | **345／345 PASS，12 files**；新 F6 16 案，包含保存、資格、unknown、stale read/finally；F5／F2／F3／F4 受影響回歸同跑 |
| F6_MODE=fixture; npm run test:e2e -- --config=playwright.f6.config.ts | **23／23 PASS**；API 全部攔截，包含 readonly／同元件 scope 測試 routes |
| F6_MODE=built; 同上 | **20／20 PASS＋3 skipped**；fresh production app，API 仍為明列的模擬；3 個 skipped 是測試專用 route，已於 fixture PASS。非 Owner Draft GET 404 的六個 new／edit Auth 案另以 built 複驗 **6／6 PASS**，保存資格／保留內容預期不變 |
| F6_MODE=built; F6_CHANNEL=chrome／msedge; 同上 --grep 'B01/B04\|B10/B12' | **各 2／2 PASS**；代表保存與 Preview，API 模擬 |
| F6_MODE=live; 同上 | **1／1 PASS**，內含 L01～L04 與真實 Cookie 清除 Auth；fresh built app＋真實 API，無攔截 |
| git diff --check／文件連結／去敏／manifest | 交付核對見 [checks](evidence/F6_20261013/checks.json)；backend-ref 108／108 不變 |
| 正式 AI／Owner 人工驗收 | **NOT RUN／維持延後**，自測 PASS 不代填驗收或 accepted |

輸出原件在 ignored `output/f6/`、`output/playwright/f6/`；.gitignore 僅補本輪原件目錄。Chrome／Edge reporter 使用各自名稱，避免覆蓋完整 built 結果。測試只管理本輪啟動的前端，不停既有 backend／DB。沒有重建 DB、刪 volume、SQL 改業務資料、storageState 或 trace。npm ci／audit 本輪 NOT RUN（未改依賴，既有 F1 環境重現缺口未自行解除）。

## 5. 真實保存讀回與保留紀錄

完整 PASS run `f6-1791895220225`，保留最小 Draft **d75d0097-dc10-446f-bb34-ab7cb3e58562**、五題型 Draft **3f261da1-840a-4456-8a6c-2ad236cc7596**，合成 User 同樣保留；[去敏 wire／九次獨立 GET](evidence/F6_20261013/live-f6-1791895220225-sanitized.json) 保留原 JSON number token，沒有 auth body／Cookie／Token／密碼。

| 計畫案例 | 實際觀察 |
| --- | --- |
| L01 | 真實 register 201／login 200／HttpOnly Cookie／credentials CORS；new 無 Form 呼叫；questions=[] Create 201、push edit、獨立 GET、列表重進與完整刷新仍存在；SPA 不增 GET me，刷新增加一次 |
| L02 | 五題型 Create 與正式 id／sortOrder 0..4；新增第六題／第三 Option PATCH 後 GET 有新 IDs，原 value 保留；第二次以新 id 更新 label、id-only 刪新題、清 description→null；clean noop 保存 disabled |
| L03 | single_choice→text→single_choice，真實 PATCH／GET 原 Options 移除、新 IDs／values；Number 完整 config replacement 刪 min、保留 max **9007199254740993.1234567890123456789** 等值，Request 科學記號 literal **9.0071992547409931234567890123456789e15** 未失真 |
| L04 | 普通 API PATCH 準備 **2026-12-31T10:30:00.123456Z**（沒有 SQL），獨立 GET 核對微秒；UI 重載後僅改 title 的 PATCH 不含 deadline，GET 原 ticks 相同；UI 台北 2027-01-01 08:09:10→UTC 00:09:10Z，清除→null |
| 真實 Auth | 清 Cookie 後 dirty PATCH 回 401 AUTH_REQUIRED；關閉 Dialog、取消離頁，保留本地 title 且保存 disabled。invalid／expired／disabled 真實分支沒有據此宣稱 PASS |

前兩個 live run **整體 FAIL**：第一個在 L02 的 Header SPA 導航未等待完成就填舊頁欄位；改為等待 new URL，沒有改業務預期。第二個已跑完實質 L01～L04／Auth 斷言，但 console 檢查漏列註冊前匿名 GET me 的正式 401；僅允許與實際 response URL／status 配對的 bootstrap 與清 Cookie 401 診斷，其餘 error／Vue warning 仍拒絕。第三個整體 PASS。三次帳號、**五份 Draft 全保留**；[保留 id 索引](evidence/F6_20261013/retained-live-runs.json) 與前兩次去敏 wire 都提交，沒有刪失敗資料或改保存預期求 PASS。

Browser 歷史為 3 PASS／10 FAIL → 8／5 → 11／2 → 20／1 → 21／0，最終加 scope／focus／scroll／new disabled bootstrap 等案例 23／0。產品修正包含 label 指向重複容器 id、loading 反應性與 pending 資源切換；測試同步修正包含取消 beforeunload 等待 dialog、等待 Modal 動畫、拖曳目標確實位於 viewport、以實際 Header button 與 HTTP status 集合核對。原始 FAIL logs／contexts 在本輪 history 目錄，去敏原因／hash 見 checks。沒有改契約、數值預期、舊 F5 固定 Body 或刪歷史。

## 6. 未解除缺口、交付與停止點

| 狀態 | 未解除項目／影響 |
| --- | --- |
| BLOCKED／NOT RUN | 未提供實機與軟鍵盤／觸控前置：手機手柄、100 星誤觸、鍵盤壓縮 Preview、實機 safe-area 待驗；viewport／鍵盤自動化不能解除這些項目 |
| BLOCKED／NOT RUN | 真實 invalid／expired／disabled Token／帳號受控安排未具備；真實換帳號、非 Owner／Published／Closed／刪除中的 conflict 特殊狀態未安排。本輪 unit／Browser fixture 分開 PASS，真實 Auth 僅清 Cookie AUTH_REQUIRED |
| UNCONFIRMED | DB identity／migration 未獨立核對；Readiness／普通保存可用與上述 API PASS 不代表所有資料庫前置驗收已完成 |
| NOT RUN | Firefox／WebKit、正式 AI／Owner 人工驗收、F7 管理與 F8 提交；不是本輪已完成能力 |

必要可獨立工程與真實 Create／Draft PATCH／GET 已完成；未新增產品／API 契約衝突。交付計畫同步、產品／自測、去敏證據、README／總計畫進度及**單一目的本機提交**。完整提交 SHA 依 Git log 與本次交付訊息（本報告在該提交內）；提交後核對工作樹乾淨。**停於 F6 開發完成、待集中 review**；未自行進行集中 review／正式驗收、未變更 accepted、未推送或展開 F7。
