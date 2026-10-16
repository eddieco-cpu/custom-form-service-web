# 前端 V1 獨立驗收計畫（F1～F9，於 F10 執行）

版本 **1.1**／2026-10-16（Asia/Taipei）。**Owner 已通過整體計畫，授權補正後鎖定提交／hash並直接執行F10 AI驗收**，包含必要驗證工具、正常API新Run測資與四份白名單soft delete；無需再停於review。本次局部補正只補E03命令／變數階段／固定URL、E03／M03引用與固定統計10題文字，未改產品預期。鎖定版CSV仍保留全部NOT RUN空表，實際結果另交執行報告；缺特殊前置或設備逐案BLOCKED並繼續，產品缺陷先回報，不代填人工／accepted，不推送部署。

## 1. 交付與授權邊界

目標是獨立驗證本機 Email／Password 前端的完整交付。案例先從正式需求推導，再對照現有測試；不以實作、測試通過數或報告中的 PASS 反推需求。核准本計畫與明確 F10 執行指令到齊後，才依本版做正式驗收。單純 review 通過不當成執行指令。產品修正依另行／既有明確修正授權處理，不能藉驗收準備改產品。

| 文件 | 責任／閱讀順序 |
| --- | --- |
| 本文件 | 版本、方法、執行次序、證據與判準 |
| [覆蓋矩陣](v1-acceptance/Coverage_Matrix.md) | 正式需求／Round → 案例 → 方法 → 前置 → 步驟 → 預期 → 證據；含逐格子案例 |
| [測資與獨立統計預期](v1-acceptance/Data_and_Oracle.md) | 未建立的資料藍圖、固定輸入、完整計算、專用 Delete 白名單策略 |
| [前置、缺口與歷史承接](v1-acceptance/Prerequisites_and_History.md) | 六項特殊前置、實機、DB、安裝／audit 等逐項處置及適用版本 |
| [逐案結果空表](v1-acceptance/Case_Results.csv) | AI 與人工分欄、首次結果／重驗；目前全部 NOT RUN |
| [唯讀盤點](v1-acceptance/Read_Only_Inventory.md) | 本次實際查得版本、來源、命令結果及限制，並非正式案例執行 |
| [E03五組命令](v1-acceptance/E03_Commands.md) | 每組啟動命令、process變數注入階段、固定預期URL與產物恢復 |

沿用 [AGENTS v1.1](../../AGENTS.md)、[驗收 skill](../../.agents/skills/v1-frontend-acceptance-testing/SKILL.md)、[總計畫 v1.3](../implementation/V1_Frontend_Implementation_Plan.md) §5 F1～F10、§6、§7／§7.1、§8。不要求原 F1～F9 逐輪先改 accepted 才執行本版；Owner 已指定集中於 F10 驗收。各輪原計畫／開發／修正／review 紀錄保持原貌。

## 2. 鎖定來源與版本

前端 `C:\Users\user\Desktop\custom-form-service-web`，master，產品接手HEAD **`0e5a6dcadb4a52c184cef5fe46aff39eab6d40c6`**。1.0初次交付前乾淨；本次接手為前次八份規劃文件及使用者新增`docs/test-plan.zip`未提交，後者保留、不納提交。產品開發提交 `20381116101824aeccca405eaaf4336f6fea9784` → 此HEAD僅review／證據，無產品變更。本次先以單一目的提交鎖定1.1計畫與相關進度；執行報告記該commit及各計畫檔SHA256／實際產品SHA，避免在文件中自填自身提交SHA循環。

| 正式輸入 | 本版採用 |
| --- | --- |
| 前端 [00](../specs/00-v1-frontend-overview.md)、[01](../specs/01-pages-routing-and-access.md)、[03](../specs/03-response-and-statistics.md)、[04](../specs/04-auth-state-and-error-handling.md)、[05](../specs/05-ui-and-interaction.md)、[07](../specs/07-api-integration-map.md) | v1.0／2026-10-10；Scope、全部 URL、流程、UI、錯誤、API 對照 |
| 前端 [02](../specs/02-form-editor-and-lifecycle.md)、[06](../specs/06-technical-architecture.md) | v1.1／2026-10-10；含既有省略 variant、Email 相容、精度等 |
| 後端八份正式規格 | [SNAPSHOT](../../backend-ref/SNAPSHOT.md) 指定 SHA **`7591633137c5a6f57c1fce8e1ba19ab394015880`**；00／01／03c／05 v1.1，02／03a／03b／04 v1.0；原件於 `backend-ref/docs/specs/` 唯讀 |
| 實際後端 checkout | 已確認 `C:\Users\user\Desktop\custom-form-service`，HEAD 同上述 SHA；八份正式規格 bytes 與 snapshot 一致；既存 untracked `SNAPSHOT.md` 未動 |
| 後端 runtime | PID34068 綁該 checkout Debug/net10.0 DLL，ProductVersion `1.0.0+7591633137c5a6f57c1fce8e1ba19ab394015880`；DLL SHA256／本次觀察時點見盤點；F10 再核 |

正式後端連結：[00](../../backend-ref/docs/specs/00-v1-overview.md)、[01](../../backend-ref/docs/specs/01-v1-domain-specification.md)、[02](../../backend-ref/docs/specs/02-v1-database-specification.md)、[03a](../../backend-ref/docs/specs/03a-v1-api-contract-common.md)、[03b](../../backend-ref/docs/specs/03b-v1-api-contract-auth-user-form.md)、[03c](../../backend-ref/docs/specs/03c-v1-api-contract-submission-statistics.md)、[04](../../backend-ref/docs/specs/04-v1-error-catalog.md)、[05](../../backend-ref/docs/specs/05-v1-system-constraints.md)。矩陣以 FE-編號／BE-編號引用這些檔案章節。業務、DTO、錯誤與順序以後端原件為準；07 僅為摘要。

舊前端文件的「初版待 review」「R10 未實作」保留歷史語境：總計畫已記 Owner 規格核准，目前 snapshot／checkout 有 R10，metadata 也列 Statistics，但不因此代填本版真實統計 PASS。未發現阻擋本計畫的契約衝突；若 F10 發現衝突，列檔名、章節、差異、受影響案例，只暫停該部分，送 Owner／後端決議，不自行改預期。

## 3. 環境、啟動與建置

Node **24.21.0**、npm **11.19.0**，按 `.nvmrc`／engines／packageManager；不得自行換版。15 項直接依賴宣告、lock、installed 本次相符，完整表見盤點。lockfile SHA256 `514545e78546b99dacd0b3b8c49e89d0f7dab5b26acb3da725d58c8551dbb1a2`。主版本：Nuxt4.6.1、UI4.11.3、Tailwind4.3.3、Zod4.6.5、TypeScript5.9.3、Playwright1.64.0、Vitest5.0.3、lossless-json4.3.1。

| 項目 | 必要基準 |
| --- | --- |
| Frontend／API | `http://localhost:3000` → `http://localhost:5000/api/v1`；Browser hostname 固定 localhost，兩者 HTTP；listener 可綁 loopback，不把 Browser URL 換成127.0.0.1 |
| 公開設定 | `NUXT_PUBLIC_API_BASE_URL`；`.env.example` 無秘密。CSR `ssr=false`、TS strict、無 BFF／API proxy；client credentials include、30000ms timeout、retry=0 |
| Browser | Chromium 為完整 AI 基準；Chrome／Edge 各跑 B01／B02 真實代表流程。歷史 binary 156.0.8078.4／156.0.8078.12／155.0.4283.45，本次未啟 Browser；F10 記錄實際 executable／version，不固定假造已安裝或已跑 |
| Viewport／人工 | AI 1440×900、390×844、320×740；1024 邊界檢查。實機 Android Chrome 一台為 touch／軟鍵盤／safe-area 必要前置；iOS 若 Owner 要納入，另列裝置／Browser，不以 Chromium emulation 宣稱 Safari 支援 |
| 後端 | net10.0、SDK10.0.400（global.json latestPatch）、EF10.0.11、Npgsql EF10.0.3；Development、CORS只明列3000且允許credentials、Cookie Secure=false；其餘 HttpOnly／Lax／Host-only／Path=/／Expires無Max-Age |
| DB | 既有 PostgreSQL17.11／postgres:17.11-alpine，container `custom-form-service-postgres-1`、volume `custom-form-service-postgres-data`、127.0.0.1:5432。2026-10-15補驗曾只讀確認 DB／user `custom_form_service`、migration `20260928122537_InitialV1Schema`；本次未查 SQL，runtime DI來源仍未確認 |

F10 由前端根目錄依序執行並分開存 log；以下命令現在 **NOT RUN**：

```powershell
node --version
npm --version
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run preview
```

`npm run dev` 是開發重現入口，正式核心流程固定 fresh build＋preview；generate／dev 五組組態只用 E03 隔離工程驗證。`npm run preview` 預設 host localhost／port3000；若同已知歷史環境需 IPv4 listener，僅在本次 child process 設 `HOST=127.0.0.1`／`PORT=3000`，確認實際程序及 Browser 仍用 localhost。前端測試 runner與手動preview擇一管理3000，不互相啟動；不停止未知服務。必要 Browser bundle 缺失時，執行授權下可用 `npx playwright install chromium` 取得鎖定runner相容binary，失敗列 BLOCKED。

`npm ci` 會更換 node_modules，先關閉本次已知前端程序；遇 native EPERM 保留首敗，不刪未核明 remnants、不停其他使用者程序。可在本 repo ignored 專用工程副本以相同lock重現；副本PASS不解除原工作目錄EPERM。`npm audit --json` 作 G09 風險盤點，不執行 audit fix／升級；網路或權限不足列 BLOCKED。

後端沿用既有服務；先核 PID→DLL→版本／hash、health／ready／OpenAPI，不重啟既有程序。若沒有服務，由具後端操作權的人在已確認 checkout／Secrets／DB 下依 [README](../../backend-ref/README.md) 執行：

```powershell
dotnet run --project src/CustomFormService.Api/CustomFormService.Api.csproj --launch-profile http --no-build
```

這是 F10 的啟動說明，非本次啟動授權；`--no-build` 須已有對應SHA產物，否則由後端維護者建立並提供來源綁定。不從 backend-ref 啟動 API，不讀出／重設 User Secrets，不照抄 README 的 migration／全套後端 tests。DB 若未啟動，由操作人確認既有volume後按既有Compose啟動，禁止 down -v、重建／清空、EnsureDeleted／SQL修改業務資料或未審migration。DB來源前置依G01，不以readiness代替。

## 4. 方法與執行順序

| 代號 | 方法／證明邊界 |
| --- | --- |
| ENG | install、lint、strict typecheck、build、產物／組態；證明工程可重現，不證明業務正確 |
| UNIT | 純模型／轉換／競態：exact、Unicode／time、Delta、Answer、Auth／scope。使用既有suite但對本矩陣逐項核斷言；缺的要求依固定預期補驗證工具，不改產品 |
| LIVE | 真實 Browser頁面＋真實 API，禁止業務route攔截。UI觸發寫入，對method／URL／JSON wire／status／回應／導航／獨立GET逐份核對。大量前置可正常API建立並標 setup，不能算UI建立PASS |
| FAULT | 隔離built／薄harness＋明列route攔截／deferred，用於500、timeout、異常Body、競態；只證明前端處理，不能替代P01～P06或交易fault證據 |
| HUMAN | 真人持實機操作／體驗，裝置／OS／Browser／結果獨立記錄。AI screenshot或viewport不能代填 |

先核准／環境 E01～E05 → 純規則 U01～U06 → 註冊／登入／Profile → 新建／編輯／保存／預覽 → 列表／路由 → 發布／Visibility／Count → single／multiple／Latest → 關閉／Statistics → 專用Delete → 故障／特殊前置／多Browser／人工 → 證據與交接。不同資源可分組；每次重新執行採新attempt，沿用專用帳號時先證明基準與事件順序，不能把多輪拼成單次全通過。

獨立讀回：寫入回應驗完，先結束該段 request事件範圍，再另送一次同帳號credentialed GET（可由 Browser context request 或獨立頁）；記為 `readback`，不能讀前端model／攔截fixture／同一receipt快取。Profile用GET me、Form用GET detail、Submit用主動Latest、Visibility／Publish／Close用GET detail、Delete用GET404＋list排除。Statistics以固定測資先算預期，再比首次GET完整Body、UI及另一GET；不得只比較UI與同一API數字。

每次寫入不自動retry；準備、正式操作、獨立讀回的request分段記錄（用request發送時間／ID，等待該段完成），預先宣告預期錯誤，不把觀察到的額外錯誤事後加白名單。API存在／GET200也不等同已證明真實保存。沒有足以證明DB內部交易／並行的資料時保留G07，F10不重建後端R11驗收。

## 5. 測資與操作權限

本版所有alias、RunId、UUID欄位都是**未建立的藍圖**。新Run建議 `v1-f10-<台北日期時間>-<隨機碼>`；不得把歷史UUID填成新建成功。預計普通9個合成帳號、38份Form、固定31份Response，詳伴檔；擴充重驗／特殊／Browser smoke需新alias先列索引，不能無限產生或清理資料。

F10正常API的Register／Login／PATCH本人Profile、Create／Draft PATCH／Publish／Close／Visibility／Submit，以及白名單4份soft delete，均是本計畫待核准的操作範圍；執行指令核准本範圍後不另為每個例行操作設gate。六項特殊安排、後端受控故障／停用及既有資料更動另依伴檔權限；沒有該權限即BLOCKED。歷史資源只作證據／唯讀定位，不用來改姓名／政策、提交或刪除。保留所有Run（包含失敗）的帳號、Form、Response；沒有User刪除／Response修改刪除／reset權限。

Delete只准新Run的DEL-D、DEL-P、DEL-C、LIST-SHRINK；先正常Create取得真UUID並記角色、目前status、用途、允許DELETE=true，再比對目前User與Owner及Run。title或UUID格式不是授權證明。未知UUID一律零DELETE。測試Close／Delete不使用主統計資料；soft delete後原資料保留，不作永久清除。

## 6. 覆蓋、必要性與不適用

全量案例、可逐案展開的格子、步驟與初始結果見矩陣及CSV：**83個需求案例群，展開為248個執行記錄，另18列父項彙總**；合計266列都未執行。這是計畫粒度，不是歷史測試數／PASS數。矩陣列出的檢查點需全符合才能使該案例PASS。多政策／狀態／故障操作一律用子ID，禁止以一列總PASS掩蓋漏跑格子。矩陣最末有F1～F9、8頁URL及17業務endpoint／延期Google的反向索引。

總計畫§7.1九項提醒的驗收落點：1→U01～03、A02、D02／D05、R12、S01；2→U04、D03～05；3→A04～06、L05／L07、S02／S06；4→D09、M03／M08、R06／R10～11、F01～04、P05～06；5→本文件§1／§7～8；6→A07、D01／D07、R01／R06、S01；7→§3～5、前置伴檔；8→D07、R08～09、S07、H01～04；9→E01～04。

不安排負載／容量SLA、完整後端schema／交易／並行重新驗收、Google、production HTTPS／部署／遠端服務、Firefox／WebKit全矩陣，理由是前端00§4與總計畫F10邊界。相關歷史缺口仍保留，不能改寫為PASS。必要但缺前置的真實Auth、fault、實機、DB來源、ci不屬不適用，逐案BLOCKED／NOT RUN。純樣式不新增鏡像unit；UI尺寸／操作直接Browser與人工驗。

## 7. 結果、證據與缺陷重驗

| 狀態 | 事前定義 |
| --- | --- |
| PASS | 列出的全部檢查點已實際執行且符合預期，證據可追溯到該attempt／版本／角色／資源；只有測試exit0不足 |
| FAIL | 已執行且可觀察結果違反預期，或測試工具無法完成已開始的檢查；標產品／工具／環境分類，保留首敗 |
| BLOCKED | 必要環境、資料、操作權、裝置或契約決議缺失，無法有效執行；寫明阻擋點、影響子案、解除人／證據 |
| NOT RUN | 尚未執行／未排到／尚未授權；不能當PASS或不適用。計畫交付時全部案例如此，已知前置BLOCKED放獨立欄 |

人工不適用的案例仍保留 `human_result=NOT RUN`、`human_applicability=N/A:原因`，不虛造人工PASS。H01～H04的AI不替真人實機操作；記AI NOT RUN、AI applicability為輔助整理／無實機操作者。工程與腳本讀回的人工欄不要求真人重跑全部機器檢查；只執行矩陣列有意義的人機項。

執行報告使用 `docs/test-results/F10_Acceptance_Execution_Report.md`，去敏證據於 `docs/test-results/evidence/F10_<RunId>/`；raw限ignored `output/playwright/v1-acceptance/<RunId>/`。CSV每案記 planVersion、code/backend SHA、method、role、form alias／UUID、attempt、AI結果、人工結果、首敗／重驗鏈、缺陷／阻塞、證據path。附source/build／lock／artifact manifest hash、命令exit／時間、Browserbinary、前置與資料索引。結果檔不得覆蓋同名歷史Run。

LIVE證據最少：去敏network摘要method／完整URL／status／error.code（Auth body不落檔）、Form／Answer wire原JSON數值、201／200完整資源、分離的readback、URL轉移／Dialog／代表畫面、console／pageerror與未預期request。Cookie只存存在性／flags／scope／expiry是否合約一致，不存值／Set-Cookie原文。預設trace／video／storageState關閉；既有config有retain-on-failure時，正式runner必須明確覆寫trace=off或將敏感原件留ignored不提交，截圖不得拍密碼。合成email／姓名可入測資索引，真實個資不得入repo。去敏前後hash分列，避免宣稱去敏副本bytes等於原件。

發現缺陷先記預期來源、操作、實際、影響案例、首敗證據；不自動降預期或改產品。獲修正授權後保留first attempt，新的SHA／build／attempt重跑失敗案及受影響共同路徑；Auth／dirty／client變更需重驗其跨輪消費者，統計或資料規則變更重算固定預期。純定位／工具修正也留首敗與差異，產品預期不變。版本／來源無法對上時舊結果標適用性失效，不能覆寫原PASS；若改產品語意／計畫則需本版差異review及相應執行授權。

## 8. 整體通過與停止點

完整通過須同時滿足：所有必要ENG／UNIT／LIVE／FAULT／特殊真實案例通過；必要HUMAN項有真人結果；每一展開子案可追溯且無FAIL／BLOCKED／NOT RUN；沒有未處理產品缺陷或契約衝突；固定統計、隱私、真實保存／讀回與Cookie／CORS均有證據；版本／DB／來源／操作權已核明，交接與保留索引完整。P0／P1與資料錯誤、隱私／權限、保存／讀回、dirty遺失問題阻擋完整通過。其他缺陷也先列未解決，不靠嚴重度低自動豁免。

若Owner接受延期／殘餘風險，逐ID、版本、原因、限制與解除條件另列「Owner同意的待處理事項」，報告只稱已驗範圍結果／附例外的交付決議，不能寫無缺口完整PASS。**六項特殊前置及實機缺失不阻擋本計畫交付，會阻擋未附例外的完整正式驗收通過**；DB／ci等判定逐項見伴檔。不以其他PASS抵銷，不以歷史review通過取代驗收。

AI交付實際報告後停於 **「正式驗收結果待人工驗收／Owner確認」**；人工執行者填自己的結果，Owner明確確認本版與待處理事項後才可更新accepted。1.0的「計畫待Owner review」停止點已由本次核准及明確執行授權取代；不更新accepted、不推送、不部署。
