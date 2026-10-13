# F6 獨立集中 Code Review

日期：2026-10-13（Asia/Taipei）。**F6 集中 review 完成、待 Owner 確認；本版有兩項 P2，尚不能宣告 code review 通過。** 必要工程檢查、345 個 unit、fresh built Browser 20 案及補跑 fixture 3 案通過，但新增診斷重現 Stars 錯題操作與 console 寬鬆放行。正式驗收維持延後，accepted 不變，不推送、不展開 F7。

## 1. 範圍、來源與版本

- 指定基準：`510b6ee7d03935d553303e5ed745a81b23e59944`；指定目標及本次所有產品檢查的 HEAD：`d86479d3c6f7b2690181b0beba6092ea5eb6e979`。repo：`C:\Users\user\Desktop\custom-form-service-web`，branch `master`，接手工作樹乾淨。
- 核對實際 44 檔 diff；閱讀 Editor controller／composable／service、UI／Renderer／Preview／Rating、既有 F2 operation／RequestScope／dirty guard、F3 Auth 與 F5 builder／baseline／decoder，以及 F6 unit、Browser／live 測試的實際斷言、[開發報告](../implementation/F6_Development_Report.md)及去敏證據。未只採報告中的 PASS 結論。
- 依 [AGENTS](../../AGENTS.md) v1.1、[repo development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)的「僅要求 review 時交付發現」邊界、[F6 計畫 v1.1](../implementation/F6_Implementation_Plan.md) §3～8、[總計畫 v1.3](../implementation/V1_Frontend_Implementation_Plan.md) F6／§7／§7.1／§8.1。首次接手閱讀前端 00～07；重點為 01 §7～10、02 §6.1／§8～11、03 §5～7、04 §4～12、05 §3～7／§10、06 §4～11、07 §3／§5／§9～10。
- 正式後端來源為唯讀 [SNAPSHOT](../../backend-ref/SNAPSHOT.md)，commit `7591633137c5a6f57c1fce8e1ba19ab394015880`。核對 00／01／02／03a／03b／03c／04／05 的相關契約，特別是 01 FORM-02／04～07／QST／SUB-02～03、03a §2～6、03b §6.1／§7.1～7.2、03c §3.2、04 §5～8、05 §10～13。manifest **108／108 相符**；未修改快照。
- 本次實測 Node **24.21.0**／npm **11.19.0**；沿用既有 lockfile／安裝版本。fresh build 輸出 Nuxt **4.6.1**／Nitro **2.13.4**／Vite **8.3.4**／Vue **3.5.43**，unit Vitest **5.0.3**，Browser Playwright **1.64.0**／Chromium **156.0.8078.4**。
- 已定位的後端 checkout `C:\Users\user\Desktop\custom-form-service` 本次唯讀 HEAD 與快照 SHA 相同；DLL ProductVersion **1.0.0+7591633137c5a6f57c1fce8e1ba19ab394015880**，SHA256 **06E2A62DB9C4376701E75B0CE3E7283D34B129D378C884E33FB1CB764A0AF180**，與歷史 [runtime 證據](../implementation/evidence/F6_20261013/backend-runtime.json)一致。這是本次檔案核對，不代表本次重新確認執行程序、Cookie、DB identity 或 migration。

## 2. 需修正的發現

### F6-R1／P2：Stars 以題目標題建立 DOM id／radio name，重複標題操作到錯題

**位置：** [RatingStars.vue](../../app/components/questions/RatingStars.vue) 第 10 行；呼叫來源 [FormRenderer.vue](../../app/components/forms/FormRenderer.vue) 第 38 行。

Renderer 傳入 `q.title` 作 `name`，Stars 再用 `${name}-zero` 作 input id／label for，並把同一 `name` 作原生 radio group。正式契約只要求 Question title 有效，沒有同 Form 題目標題必須唯一的規則，故兩道相同標題、Stars min=0 的題目是合法案例。

**重現：** fresh built app，以攔截合成 GET 提供兩道不同 Question ID、同標題 `Same rating title`、min=0／max=5 的 Rating 題。開啟 Preview，點第二題「0 分」文字 label。第二題 label 的 `control` 指向第一題 input；實際第一題變 `0 分`，第二題仍 `尚未作答`。再直接點第二題 radio，兩題 model 都顯示 `0 分`，但同名原生 radio group 把第一題 input 取消，畫面控制與答案 model 不一致。診斷全程只發 bootstrap／Form GET，沒有寫入或 Response API。

**影響／阻擋性：** Preview 正常題型試填與每題未作答／0 的隔離失效；共用 Renderer 接入 F8 時也會繼承。P2，**阻擋本版 F6 code review 通過**。應以穩定 Question key（必要時加 Renderer instance 範圍）建立唯一識別，顯示名稱與 DOM／group 識別分開；加入同標題多題、label 操作與各題 0／星分互斥的斷言。現有 B11 只有一個 Rating 題，未覆蓋此案例。

去敏重現資料見 [獨立驗證](evidence/F6_Independent_Verification_20261013.json)的 `browserProbe`；[截圖](evidence/F6_Independent_Duplicate_Rating_20261013.png)顯示兩題文字均為 0 分、第一題 radio 未選的矛盾。

### F6-R2／P2：Browser console helper 從所有實際失敗請求建立容許集合

**位置：** [f6-browser.spec.ts](../../tests/e2e/f6-browser.spec.ts) 第 18～19、41～46 行，核心為第 45 行。

`http` 收集所有 URL 的 HTTP ≥400，`failed` 收集所有 requestfailed。`clean()` 只要 console 的 URL／數字狀態與上述實際觀察相符，就排除該錯誤；沒有要求它是該案例明列的預期 method／URL／status／失敗原因。這是在核對「錯誤確實發生」，不能核對「這是測試預期的錯誤」。

**重現：** 在相同 fresh built 診斷頁另外攔截普通合成資源 `/review-unexpected-resource.png` 回 404，插入 img 觸發 Browser console。收集到精確 `Failed to load resource: the server responded with a status of 404 (Not Found)` 與該資源 URL。逐字採用現有 `clean()` predicate 後，`rejectedByCurrentClean=[]`、`unexpectedDiagnosticWasAllowed=true`。它既非 F6 預期 API 錯誤，也不進 API mock 的 `unexpected` 陣列，仍被放行；類似未預期 `ERR_FAILED` 也會落入目前全量 failed 容許集合。

**影響／阻擋性：** 未預期資源載入／網路錯誤可能不使 Browser 測試失敗，不能以現有 PASS 宣稱 console 僅存在案例預期診斷。P2，**阻擋本次明確要求的 console 驗證結論及 F6 code review 通過**。應由案例提供明確預期請求與狀態／失敗原因，再對實際 response 與診斷配對；未列明的錯誤仍須失敗。加一個無關資源 404／非預期 API failure 的負向驗證，避免回歸。

本 finding 針對 fixture／built 共用 helper。live spec 第 93～95 行另限精確 401 字串、bootstrap me／清 Cookie 後該 Form URL，並比對歷史 response；沒有因此把 live 保存證據一併判為無效。

## 3. 五項重點的獨立判讀

| 重點 | 本次判讀與證據界線 |
| --- | --- |
| 完整 Server DTO、IDs／baseline、第二次 Delta／no-op | controller 只在成功、current、Owner／Draft 可信時採 `loadEditor(dto)`；service 必須解碼完整 DTO，PATCH 另核對 Form ID。F5 loader 由每項 Server ID 重建 key／serverId 與 immutable baseline。unit／built B01／歷史 L02 支持；新增 Domain 診斷使 Create 導航故意 reject，正式 id／clean baseline 仍保留，no-op 不送，下一次修改只 PATCH 正式 id，POST 總數維持 1。 |
| Auth 失效／換帳號／明確資格核對 | Auth 401 更新共用 revision，舊 grant 撤銷而 session 輸入保留。取消離頁不恢復 grant；一般 login 也不能恢復。new 明確 me＋換帳號確認；edit 先丟棄授權、me、再 Owner Draft GET／完整採用才 grant。built 三種 401 × new／edit 六案與 unit 通過；新增晚回 me／Session 變更診斷不能恢復舊 grant。GET me 位於初始化／手動重試與明確資格核對；一般 SPA 導覽未新增查詢。AUTH_USER_DISABLED action 保留 Header／輸入／登出，不自行套全域 disabled 封鎖，built 對應案通過。 |
| Delta unknown 共享鎖與重讀／晚回 | dirty 接 needsReconciliation，改回舊值仍鎖；取消不 GET，失敗不替換／不 reconcile，current 成功 DTO 採用才解除共享 coordinator。B08／unit 通過；新增另一個同 key OperationState 診斷確認 Session 變更後晚回 GET 不替換本地輸入、兩個 delta 都仍 blocked。換 ID 的 generation／ticket 與 finally 已於 unit、fixture scope 兩案重跑；離頁晚回不出舊 toast／route 已於 built B09 重跑。 |
| Preview／readonly／Range／Stars／排序與定位 | Preview 使用 clone snapshot、獨立空答案；關閉與重新開啟、scroll／focus／尺寸、Number raw 均有實際 Browser 斷言。readonly harness 重跑無 textbox／slider／clear。Range focus 未作答、點 min=0／3 與方向鍵有斷言；Stars 100／十列／min>1／0／clear 有斷言。題目手柄拖曳、上下移動與邊界焦點、Option 上下移動／還原、稀疏 Delta 第三題第二 Option／Create 新 Option 定位通過。**Stars 多題隔離因 F6-R1 FAIL**；實機／軟鍵盤仍未驗。 |
| 測試品質與 live 保存證據 | 345 unit／20 built＋3 fixture 實際 PASS，不等同涵蓋所有情境。原有測試沒有導航 reject 與晚回 Session／共享 peer 的直接斷言，本次以額外 Domain 診斷補查，未修改既有 tests。**console 嚴格拒絕非預期錯誤因 F6-R2 FAIL**。歷史 L01～L04 wire／GET 六組獨立核對通過，詳見下一節；不冒稱本次重新 live 執行。 |

以上未發現需變更 API／正式規格的衝突。兩個問題可以在原核准 F6 範圍內修正；本次僅 review，未自行修正產品或 tests。

## 4. 本次實際重跑與追加診斷

所有新輸出存 `output/f6/review-20261013/`，reporter／artifact 使用 CLI override，沒有覆寫既有 fixture／built／live reporter 或已提交歷史證據。原始命令、exit code、log hash、Browser case 結果與去敏診斷集中在 [獨立驗證 JSON](evidence/F6_Independent_Verification_20261013.json)。

| 命令／方法 | 本次結果 |
| --- | --- |
| `npm run lint` | PASS，exit 0，無 lint error／warning。 |
| `npm run typecheck` | PASS，exit 0，Nuxt app＋tools strict。 |
| `npm run build` | PASS，exit 0，fresh production build。保留 Node DEP0155 套件 exports deprecation 診斷，不冒稱零建置 warning。 |
| `npx vue-tsc --noEmit -p tests/fixtures/f6/browser/tsconfig.json` | PASS，exit 0，readonly／scope harness strict。 |
| `npm run test:unit` | **345／345 PASS、12 files**，含 F6 16 案與 F2／F3／F4／F5 受影響回歸。sandbox 首次啟動 FAIL（Vite externalize-deps spawn EPERM，尚未執行案例）；經本機授權重跑完成，兩份 log 都保留。 |
| `F6_MODE=built`；既有 F6 config、`--reporter=list,json --output=output/f6/review-20261013/built-artifacts` | **20／20 PASS＋3 skipped**，production UI、API 攔截模擬，exit 0。不是 live API 結果。 |
| `F6_MODE=fixture`；同 config，grep `Renderer readonly\|same-component ID update\|pending old GET`，另存 fixture-scope artifacts | **3／3 PASS**，補 built 不存在的三個 harness routes，exit 0。其餘 fixture 20 案本次 NOT RUN（相同斷言已在 built 執行）。 |
| fresh built Browser 追加診斷 | **F6-R1 重現 FAIL；F6-R2 負向拒絕能力 FAIL**。診斷腳本成功完成 exit 0，表示捕獲失敗，不能把它誤列產品 PASS。僅合成 GET 攔截／合成圖片 404，無真實寫入。 |
| 實際 Domain controller＋合成 effects 的追加診斷 | **3／3 PASS**：Create 導航 reject 後不用 POST；晚回資格 me 拒絕；Session 變更後晚回 GET 保留輸入及共享 unknown 鎖。沒有新增／修改 repo tests；單次診斷原件在 ignored output。 |
| 既有 live wire／GET 稽核 | **6／6 證據核對 PASS**，不是本次 live 執行，沒有追加後端寫入。 |
| manifest／保護範圍／diff／文件／去敏核對 | manifest 108／108；產品、tests、規格、歷史證據與依賴對目標 SHA 零差異。交付前文件連結、去敏及 diff check 結果另載獨立驗證 JSON。 |

只管理本輪啟動的前端程序，診斷 preview 已結束；沒有停止既有後端或 DB、SQL、重建 DB／volume、storageState 或 trace。未安裝／升級依賴；npm ci／audit 本次 NOT RUN。Windows Chrome／Edge smoke 本次 NOT RUN，開發歷史結果維持原紀錄；Firefox／WebKit／實機亦未追加。

## 5. 歷史 live L01～L04 的 wire／獨立 GET 核對

重新讀取三份已提交去敏原件及 reporter／[保留索引](../implementation/evidence/F6_20261013/retained-live-runs.json)，以實際 ExactNumber／datetime adapter 解析，避免稽核過程浮點化。三份原件 SHA256 及各 GET label／status 皆記於獨立驗證 JSON 的 `historicalLiveAudit`。

- `f6-1791895080750`：整體 FAIL、止於 L02，1 次獨立 GET／1 次 Form 寫入；未被改成 PASS。
- `f6-1791895169561`：整體 FAIL、止於 Auth diagnostic 檢查，9 次 GET／10 次 Form 寫入；保留實質結果與 console 失敗。
- `f6-1791895220225`：完整歷史 PASS、9 次獨立 GET／10 次 Form 寫入，保留最小 Draft `d75d0097-dc10-446f-bb34-ab7cb3e58562` 及五題型 Draft `3f261da1-840a-4456-8a6c-2ad236cc7596`。10 次為 2 POST、7 成功 PATCH（包含普通 API 微秒準備）及 1 次清 Cookie 後 401 PATCH；沒有 no-op 寫入。

| 案例 | 本次重新核對的內容 |
| --- | --- |
| L01 | 最小 Create request `questions=[]` 與獨立 GET 的正式 id／title 一致；live spec 斷言實際 HttpOnly Cookie、列表重進／完整刷新、SPA me 不增加而刷新增加一次，歷史 reporter 1／1 PASS 支持該斷言已跑完。去敏 wire 不含 Cookie 值，沒有把它當成 Cookie 原件。 |
| L02 | 五題型順序 0..4、精確 Number max；新增 Question／Option 後 GET 的新 id 隨後出現在第二次 Delta，新增題刪除為 id-only、新 Option 更新為正式 id，GET 有更新 label、description=null，原 Option value 保留。保存回應與後續獨立 GET 的責任明確分開。 |
| L03 | Choice 往返後 GET 不含原 Option IDs／values；Number 完整 replacement 移除 min、保留精確 max。request literal `9.0071992547409931234567890123456789e15` 與 GET `9007199254740993.1234567890123456789` 精確等值。 |
| L04 | 正式 API 準備的 `2026-12-31T10:30:00.123456Z` 在 GET 可核對；title-only request 僅 title、沒有 deadline，後續 GET ticks 相同；台北 `2027-01-01 08:09:10` 修改後 GET 為 UTC `00:09:10Z`，清除後 GET 為 null。 |
| 真實 Auth／CORS | wire 記 bootstrap GET me 401、清 Cookie 後該 Form PATCH 401，以及記錄的回應 origin=`http://localhost:3000`／credentials=`true`；歷史 spec／reporter 支持 AUTH_REQUIRED dirty 取消保留與 disabled 保存按鈕。沒有據此外推 invalid／expired／disabled 真實分支。 |

**結論：** 這些歷史去敏 wire／獨立 GET 足以支持報告中的真實保存結論，本次沒有發現需要追加真實寫入的具體疑點。未重跑 live、不重新註冊帳號、不修改或清理保留 Forms；歷史 PASS 與本次模擬重跑分欄記錄。

## 6. 未驗證事項與交付停止點

| 狀態 | 保留的缺口 |
| --- | --- |
| BLOCKED／NOT RUN | 手機實機觸控手柄／100 星辨識誤觸／軟鍵盤 Preview／safe-area；本次 viewport 不解除。 |
| BLOCKED／NOT RUN | 受控真實 invalid／expired／disabled、真實換帳號、非 Owner／Published／Closed／刪除或特殊故障安排；unit／Browser 模擬與歷史清 Cookie AUTH_REQUIRED 分開。 |
| UNCONFIRMED | DB identity／migration；本次 DLL／checkout 一致性與歷史保存讀回不等同資料庫前置確認。 |
| NOT RUN | 本次 live 重新執行、Chrome／Edge 重新 smoke、Firefox／WebKit、正式 AI／Owner 人工驗收、F7／F8 流程。 |

本次僅新增本報告與獨立去敏 review 證據，追加 README／總計畫最新進度；原開發報告、核准 F6 計畫、正式規格、歷史證據、產品與 tests 保持原樣。兩項 P2 需 Owner 決定後續修正／複核，不把現有自測 PASS 當作 review 通過、正式驗收或 accepted。

本機文件提交完整 SHA 由交付訊息與 Git log 記錄（避免文件在自身提交內自指 SHA）；本次檢查目標 SHA 已在 §1 固定。交付後工作樹狀態由獨立驗證及提交後核對記錄。**停於「F6 集中 review 完成、待 Owner 確認」**；正式驗收維持延後、accepted 不變、不推送、不展開 F7。
