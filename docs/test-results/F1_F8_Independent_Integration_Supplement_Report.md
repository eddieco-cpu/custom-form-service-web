# F1～F8 獨立整合補驗報告

2026-10-15（Asia/Taipei），方案 v1.0。**核心真實 API／UI／路由補驗完成，未發現可重現的產品缺陷；待 Owner 確認。** 本次與既有 code review、開發自測、正式 AI／人工驗收分列；accepted 不變。

依 Owner 本次「制定精簡補驗方案並直接執行」授權，先建立[覆蓋表／前置／預期](../test-plan/F1_F8_Independent_Integration_Supplement.md)，再執行。沒有中途計畫核准關卡、產品修改、放寬既有斷言、推送或 F9 開發。採用 repo [驗收 Skill](../../.agents/skills/v1-frontend-acceptance-testing/SKILL.md) 的證據流程；本次特別授權優先，並非正式驗收執行。

## 版本、環境與來源

- 前端 `C:\Users\user\Desktop\custom-form-service-web`，master／接手 **`2f6dc4929e310c7e0ac1ef825dd1aefe63c97ab9`**，起始工作樹乾淨。Node **24.21.0**／npm **11.19.0**；全部 15 項直接套件 installed／lock 相符（Nuxt 4.6.1、UI 4.11.3、Tailwind 4.3.3、Playwright 1.64.0）。Chromium **156.0.8078.4**。
- 本次 `npm run build` 成功後，所有核心 Browser 使用該產物的 `npm run preview`，`reuseExistingServer=false`，`http://localhost:3000` → `http://localhost:5000/api/v1`，**沒有業務 API 攔截**。建置檔 hash 與 144 份既有產品／測試／組態的來源核對見 [audit](evidence/F1_F8_Integration_20261015/evidence-audit.json)。新增的驗證腳本不影響已建置產品。
- 實際後端 `C:\Users\user\Desktop\custom-form-service`，master／**`7591633137c5a6f57c1fce8e1ba19ab394015880`**；既存 `?? SNAPSHOT.md` 保留。PID **34068** 的 command line 綁定該 checkout 的 Debug/net10.0 DLL，ProductVersion 同 SHA，SHA256 `06e2a62db9c4376701e75b0ce3e7283d34b129d378c884e33fb1cb764a0af180`，SDK 10.0.400。服務已存在，本次沒有另啟、重建或停止後端。
- 19:19:37 前後 health／readiness／OpenAPI **200**，OpenAPI 3.1.1／info.version 1.0.0；[環境／PID／DLL／容器證據](evidence/F1_F8_Integration_20261015/environment.json)。核心執行程序由各次 reporter／webServer log 記錄；另對同一未改產物做 [preview PID／入口 hash／HTTP 200 核對](evidence/F1_F8_Integration_20261015/frontend-process.json)，這是事後來源核對，未冒稱原核心 PID。
- 現有容器 `custom-form-service-postgres-1`，postgres:17.11-alpine、既有 `custom-form-service-postgres-data` volume、127.0.0.1:5432。只讀交易確認 database／user `custom_form_service`、server 17.11、migration `20260928122537_InitialV1Schema`，並對上本輪 39 份 API 建立的 Form；見[測資索引](evidence/F1_F8_Integration_20261015/resource-index.json)。沒有 DB 重建、清空、migration 執行或 SQL 寫入。沒有另外檢查 runtime DI provider 的內部來源。
- 來源：前端 00～07（02／06 v1.1，其餘 v1.0）、總計畫 v1.3 F1～F8／§7／§7.1、各輪核准計畫及開發／修正／review。後端權威為上述 SHA 的八份正式規格；`backend-ref` manifest **108／108** 相符、唯讀未改。未發現影響本次核心的契約衝突。

## 逐案結果

以下皆為本次獨立補驗的 AI 執行結果；**人工欄一律 NOT RUN**，E01～E03 純工程／模型的人工項不適用。完整 UI 步驟與首次 FAIL 見 [case-steps](evidence/F1_F8_Integration_20261015/case-steps.json)；API method／URL／status／合成 Body／獨立 GET／導航見各原件。表內 PASS 只指列明的已執行範圍。

| ID／輪次 | 實際確認 | 結果／證據 |
| --- | --- | --- |
| E01 F1 | 指定 runtime、lock、lint、strict typecheck、fresh build；CSR 實際頁面與直接 API origin | PASS；[工程 log](evidence/F1_F8_Integration_20261015/execution/build.log)、audit／各 Browser 原件 |
| E02 F2 | client 33、adapters 5、exact gate 36、scope 20 案；涵蓋精度、文字／時間、204／錯誤、dirty／互斥／世代 | PASS；[逐檔逐案名稱](evidence/F1_F8_Integration_20261015/evidence-audit.json)；Browser 接入另由下列真實流程與 H01 覆蓋 |
| E03 F5 | Answer 33、variant omission 58、Definition Request 43、Editor 17 案：空／0、config、no-op、id-only、排序、穩定 value／path | PASS；同 audit。純模型不另設獨立 UI／API；保存／填答接入由 D／R 案證明 |
| A01 F3 | UI 註冊 201 不設 Cookie／不登入、回登入 Tab／密碼清空；登入 200 返回完整 query／hash；HttpOnly／Lax／Host-only／Path／Expires、無 Max-Age／Development Secure | PASS；[最終 Auth 原件](evidence/F1_F8_Integration_20261015/supplement/supp-1792063342540-a9c591.json) |
| A02 F3 | Profile UI PATCH 200→Header 同步；另發 GET me 200 姓名相符；SPA 首頁／Profile 不加 me | PASS；[獨立讀回](evidence/F1_F8_Integration_20261015/execution/supp-1792063342540-a9c591-profile-readback.json) |
| A03 F3 | dirty 登出取消零 POST／保留姓名；確認才 POST logout 204→無 redirect 的 /login；重新登入返回、未保存姓名不恢復 | PASS；最終 Auth 原件／dialogs／routes |
| A04 F3 | 完整刷新與新分頁各一次 me，正常 SPA 共用結果 | PASS；最終 Auth 原件 |
| D01 F6 | new 不提前建資源；UI Create 五題型→edit；正式 Form／Question／Option IDs、精確 number config | PASS；[F6 live](evidence/F1_F8_Integration_20261015/live/live-f6-1792063190988-sanitized.json)，共9次獨立 Form GET，8次含精確 max |
| D02 F6 | UI新增／更新／刪除、第二次 Delta 用新 Server IDs、Option value 穩定、choice 往返；另測 UI 排序保存／獨立 GET，no-op 保存停用 | PASS；F6 live＋[最終互動原件](evidence/F1_F8_Integration_20261015/supplement/supp-1792063402459-5e93d2.json) |
| D03 F6 | Preview 試填不發 Response、不污染 dirty、重開空白；Editor dirty SPA 取消保留／確認離開，再進讀保存基準 | PASS；最終互動原件；完整尺寸／焦點矩陣沿 H01 歷史模擬，實機未跑 |
| M01 F7 | dirty 禁 Publish、先保存而不暗中連送；UI確認發布200→Form、無定義保存入口、獨立 GET published | PASS；[F7 main](evidence/F1_F8_Integration_20261015/live/f7-1792063196451-sanitized.json)；Publish取消沿H01，非新真實PASS |
| M02 F7 | Draft／Published／Closed × owner_only／respondents／public，9組 UI PATCH200與獨立 GET 成對；Draft dirty定義保留 | PASS；[9組政策讀回](evidence/F1_F8_Integration_20261015/live/f7-matrix-1792063216783-sanitized.json)、main |
| M03 F7 | UI主動 Count 0→1→1→2，multiple同人兩次仍1；再次點才查 | PASS；main（Response由正常API準備） |
| M04 F7 | UI正常Close200留Form；自然到期仍Published，UI可Close；Closed入口與不可提交 | PASS；main／F8 live；非改時間／SQL造狀態 |
| M05 F7 | 預列三態專用UUID才UI Delete204→/forms；Draft dirty無第二次native確認；獨立GET404／列表排除 | PASS；main／resource-index。取消零DELETE沿H01模擬，未冒稱本次真實取消 |
| M06 F7 | 非Owner管理隱藏；真實403 FORM_ACCESS_DENIED；Cookie與快取Owner不一致時撤權，SPA不恢復，明確核對才恢復 | PASS；main＋[真實權限補案](evidence/F1_F8_Integration_20261015/live/f7-role-1792063219643-sanitized.json) |
| M07 F7 | 真實 Clipboard 讀回完整填答／統計URL；Closed查看統計實際導航到 /forms/{id}/statistics | PASS；最終互動原件。只驗入口，不驗F9內容；Clipboard失敗分支沿H01模擬 |
| R01 F8 | Owner／Respondent各五型single UI提交201、Receipt與獨立Latest；數字長小數／大整數、正式Option IDs、0；single成功撤提交 | PASS；[F8 live](evidence/F1_F8_Integration_20261015/live/f8-1792063222888-integration-20261015-sanitized.json) |
| R02 F8 | multiple相同內容再次201、新Response ID、Latest完整份取最新 | PASS；F8 live |
| R03 F8 | optional omission／alloptional[]、Number／Stars／Range的0；Range只focus／Tab不產生答案；六型值清空後送[]／獨立Latest[] | PASS；F8 live＋最終互動原件（五種題型，Rating兩種呈現） |
| R04 F8 | single刷新空白、再次提交409後撤提交；multiple刷新空白且不自動Latest | PASS；F8 live＋最終互動原件 |
| R05 F8 | 本人兩帳號Latest各自匹配；dirty Latest成功後取消保留、確認才整份取代／清空舊optional | PASS；F8 live＋最終互動原件 |
| R06 F8 | 真實AUTH_REQUIRED，Dialog後dirty取消保留／確認導login；重新登入返回空白、不重送；切Cookie後資格核對不借舊帳號答案 | PASS；F8 live |
| L01 F4 | 同一新Owner正常API建立21份，三態各7；真實UI三頁10／10／1、順序與API一致 | PASS；[F4原件](evidence/F1_F8_Integration_20261015/supplement/supp-1792063259103-8ae966.json)／[第3頁](evidence/F1_F8_Integration_20261015/execution/supp-1792063259103-8ae966-page3.png) |
| L02 F4 | UI三status篩選各7筆、回page1、固定10、全部省略status、條件內刷新、三態row link實際點入 | PASS；F4原件／[桌機](evidence/F1_F8_Integration_20261015/execution/supp-1792063259103-8ae966-desktop-list.png) |
| L03 F4 | 預列list-shrink唯一UUID正常DELETE後，page3刷新200空items→只補page2一次200、20筆／2頁，無循環 | PASS；F4原件／[對齊後](evidence/F1_F8_Integration_20261015/execution/supp-1792063259103-8ae966-aligned-page2.png) |
| L04 F4 | Owner／非Owner×三態×Form／edit共12入口；Owner Draft→edit、非Owner Draft404原URL、Published／Closed兩角色edit→Form | PASS；F4原件routes／GET status，未用PATCH試探 |
| L05 F4 | 已刪／不存在404、無效UUID400原URL；390px卡片10筆／欄位完整、無水平溢位 | PASS；F4原件／[手機](evidence/F1_F8_Integration_20261015/execution/supp-1792063259103-8ae966-mobile-list.png) |

F8另獨立核對 **7份Receipt對送出wire、8次Latest200對完整Receipt（id／formId／submittedAt／全部answers）相符**，2次Latest404；70個CORS response均為正確Origin／credentials。F6精確config值 `9007199254740993.1234567890123456789` 與科學記號等值；F8數字 `9007199254740993.12345678901234567890123456789` 全程未經浮點失真。這些是逐份內容核對，並非只從測試總數推論覆蓋。

## 沿用、BLOCKED 與未執行

| ID | 處置與理由 |
| --- | --- |
| H01 | **沿用有效歷史模擬，非本次新PASS／真實整合**：F8最終review的F8 built 29案、F7完整built 51案、F6 built／fixture及獨立probe，用於受控錯誤、結果不明／stale、互斥、取消與beforeunload、Preview尺寸／焦點等。本次核對該review產物manifest56／56、相容既有來源144份相符；另外F7最終複核manifest44／44只作保存核對，不據此推定全部舊source均適用。原review結論、首次FAIL與歷史結果保留。 |
| B01 | **BLOCKED**：真實invalid／expired／disabled Auth缺受控帳號／Cookie前置；無Cookie AUTH_REQUIRED已新跑，不能代替另外三種真實身分。未製造Token或SQL停用。 |
| B02 | **BLOCKED**：Server交易回滾、提交後fault／timeout／500／競態注入缺受控安排；沿用模擬只證明前端分流，未解除真實故障缺口。 |
| N01 | **NOT RUN**：npm ci／audit／F1五種組態全重現；依賴無變更，本次沿現有安裝。歷史npm ci原目錄EPERM／audit風險保留，F1原工程頁已被產品頁取代，不沿用其頁面smoke為當前PASS。 |
| N02 | **NOT RUN**：人工實機touch、軟鍵盤、safe-area、手柄拖曳與完整體驗；Browser桌機／390px觀察不代填人工PASS。 |
| X01 | **本次不適用**：F9統計內容／權限、Google、部署；F7只驗統計入口。正式AI／人工驗收未執行、accepted未更新。 |

## 命令、首次失敗與證據

| 實際命令／批次 | 結果 |
| --- | --- |
| `npm run lint`、`npm run typecheck`、`npm run build` | PASS；新增腳本完成後lint／strict typecheck再PASS；產品未變，未為測試檔重建產品 |
| `npm run test:unit` | 首輪沙箱暫存ENOENT：13份import失敗、12案通過，屬工具環境失敗；正常本機權限重跑15份／462案PASS |
| `npm run test:unit -- --reporter=json --outputFile=output/playwright/integration-supplement/unit-cases.json` | 相同範圍462／462 PASS，為交付逐案名稱另存結果；未擴大測試，audit保留逐案狀態 |
| `F7_RUN_LABEL=integration-20261015`、`F8_RUN_LABEL=integration-20261015`，`npm run test:e2e -- --config=playwright.integration-supplement.config.ts` | 首批7分組：6PASS／1FAIL；F6、F7三組、F8、F4全部PASS；Profile新增腳本選單定位FAIL，原[log／reporter](evidence/F1_F8_Integration_20261015/execution/browser-first.log)保留 |
| `SUPPLEMENT_LABEL=targeted-second`，同命令加 `--grep 'Supplement A\|Supplement D'` | Auth分組PASS；新互動案rating清除定位FAIL；[原log](evidence/F1_F8_Integration_20261015/execution/targeted-second.log)保留 |
| `SUPPLEMENT_LABEL=interactive-final`，同命令加 `--grep 'Supplement D'` | 互動分組PASS；[原log](evidence/F1_F8_Integration_20261015/execution/interactive-final.log)。最終8個不同分組均有PASS，不冒稱一次全批8／8 |
| collector／manifest／source／去敏／diff | [audit](evidence/F1_F8_Integration_20261015/evidence-audit.json)及交付closeout；本機單一目的提交SHA見交付訊息／Git log |

Profile失敗是取消登出後選單仍開啟，新增腳本卻再切換將其關閉；只改為依aria-expanded決定是否開啟，原零POST／204／返回斷言不變。Rating失敗是畫面標題含「5.」而腳本尋找完全相同文字；只改依正式Question UUID定位清除控制，原空答案／0／Latest斷言不變。首次[error-context](evidence/F1_F8_Integration_20261015/execution/first-profile-error-context.md)／[rating失敗圖](evidence/F1_F8_Integration_20261015/execution/supp-1792063345458-e2ba36-first-failure.png)及兩個失敗Run測資均保留，沒有產品finding。

其他工具首次失敗亦分列：[first-failures](evidence/F1_F8_Integration_20261015/first-failures.json)。包括只讀SQL的引號語法錯誤、collector兼容manifest的`path`／`file`鍵差異、事後preview provenance首次HTTP timeout；修正工具後成功。首次frontend JSON內`status=0`是失敗診斷建構值，**不是HTTP結果**，最終檔改明確記結果並核對200。沒有自動核准拒絕，亦未改產品／斷言求PASS。交付文字僅正規化UTF-8／LF、BOM／尾端空白與多餘空行以通過staged diff檢查；ignored原件不改，manifest另留正規化前hash，PNG保留原bytes。

## 測資、Git 與停止點

[索引](evidence/F1_F8_Integration_20261015/resource-index.json)列出本輪 **11個合成帳號、39份Form、15份Response** 的UUID／用途／Run／狀態；包含工具失敗Run。只有預列三態Delete的3份及list-shrink的1份被soft delete，其餘**35份Form與全部Response保留**，歷史測資未寫入或刪除。完整Response UUID索引用限定本輪UUID的READ ONLY查詢補錄；案例的保存／讀回PASS仍以真實HTTP為證。沒有密碼／Cookie／Token／storageState／trace提交；兩份本輪臨時credential檔在去敏掃描後移除，歷史原件不動。

新增內容限本方案、報告、去敏證據、一份獨立Playwright組態及補驗spec。既有產品、tests、依賴、正式規格、AGENTS／skills、backend-ref、既有review／驗收報告均未修改。僅作本機單一目的提交；交付SHA與提交後工作樹另列，避免報告自我SHA循環。前端測試／事後核對自建程序結束，既有後端／DB保留。

**停止於「獨立整合補驗完成、待 Owner 確認」。**
