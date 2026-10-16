# 前置、風險與未驗結果

本檔為 F10 v1.1 的**執行結果**，不改寫鎖定計畫或歷史報告。逐子案見 [Case_Results.csv](Case_Results.csv) 與 [Result_Summary.json](Result_Summary.json)。本次沒有取得延期／風險豁免，以下未結項阻擋「無缺口完整通過」，但不阻擋交付已驗結果。

| 項目 | 本次實際狀態／證據 | 未完成部分、解除方案與權限 |
| --- | --- | --- |
| G01／E05 | checkout／PID34068／DLL version+SHA、health/ready/OpenAPI通過；只讀 PostgreSQL17.11、DB/user、InitialV1Schema migration及本Run UUID／四筆soft delete相關性已取得 | **BLOCKED**：尚無 effective config provider／runtime DbContext非秘密診斷，保留既有來源缺口。由後端維護者提供有效host/port/database/user與來源provider及DI target診斷；不讀出User Secrets或密碼。LIVE PASS限已觀察Browser/API，不能據此宣稱整項環境歸屬完成 |
| G02／P01 六子案 | **PASS**：Owner核准整體計畫後，採其明列方案，在隔離context放不可驗證的合成壞Cookie。me／一般Form／private401 `AUTH_TOKEN_INVALID`、public200、Draft/Published Stats404、logout204；另操作中dirty保留。無有效JWT偽造、無簽章key或Server簽發Cookie值交付，工具僅有合成無效literal | 本Run前置已取得，未覆寫F3～F9原BLOCKED。證據在a4／a6，不以missing-cookie或fixture代稱 |
| G03／P02 七子案 | **BLOCKED**，均未發真正expired credential案例 | 需Server正常簽發、真正到期、仍被Browser送達的受控安排。未改OS時鐘／共享服務lifetime，未保存或解碼JWT。若後續採短lifetime child process／保留原credential重送，須Owner與後端操作人確認專用scope及時間證據；不能拿Cookie自動消失的AUTH_REQUIRED替代 |
| G04／P03 九子案 | **BLOCKED**，缺disabled Caller前置 | 維護者提供本Run Active→disabled安排、既有Cookie、正確／錯誤密碼與初始／既有User對照。V1沒有停用API；本次未SQL寫入、未停用任何User。需要Owner及有權資料維護者安排 |
| G05／P04 七子案 | **BLOCKED**，缺另一disabled Creator及六政策／身分表對照 | 先正常API建專用Owner/B/X對照，再由維護者依核准安排停用Creator；Active Viewer不變。不能拿Caller disabled或一般ACCESS_DENIED替代 |
| G06a／P05 八子案 | **BLOCKED**，缺真Server read／precommit／postcommit hooks與交易證據 | 後端操作人提出單request、單Run、可恢復故障方案，另獲Owner授權。沒有停止共享服務／DB、沒有改後端。33格unknown攔截PASS只證前端；一般validation400不證rollback |
| G06b／P06 四子案 | **BLOCKED**，缺真Server超30秒及完成點安排 | 需GET／Delta／single/multiple各受控延遲與Server完成／未完成證明，恢復後獨立正常GET。模擬TIME已使用產品真30000ms timeout，但不能作真Server／transaction PASS |
| G07／U05 | Answer／Latest全份mapping／0／path的前端unit與真實操作已通過；後端同SHA R11歷史保留為背景 | **整案BLOCKED**：相同timestamp依Response id DESC取Latest沒有新受控前置或可新核原artifact；單份Latest不能證明tie-break，也不為此重建DB／重跑R11。由後端Owner提供可追溯既有原件或受控等時戳案例。此案部分通過不沖銷缺項 |
| G08／E01 | 原目錄npm ci兩次EPERM；同lock乾淨git archive工程副本ci PASS；原目錄ignore-scripts恢復install PASS、lock不變 | **FAIL／ENV-01**：原目錄可重現性未解除。未知native鎖檔／remnants未強刪，未停止他人程序。由本機維護者確認鎖定來源並解除，再原目錄ci與受影響工程重驗；副本不能替它PASS |
| G09／E06 | audit實跑exit1，風險盤點如下；E03五組當前版本皆新跑PASS | **BLOCKED於Owner處置**：未收到風險延期或修復決議，未audit fix／升降依賴。新增依賴變更屬另行修正授權及回歸 |
| G10／H01～04 | AI viewport／鍵盤／桌面與手機尺寸／長內容新跑；Chrome/Edge真實核心已跑 | **四案BLOCKED，人工全NOT RUN**：缺Android實機、真人操作者與localhost兩port安全連線。Owner安排裝置／OS／Chrome／受控port forwarding或等價環境，再驗觸控排序、軟鍵盤、safe-area、Rating與完整可讀性。沒有宣稱Safari／iOS／Firefox支援 |
| G11 正常測資／Delete | 權限已由Owner此次明確提供；11帳號、45 Form、34 Response；四份白名單各一次204，均保留soft-deleted row | 其餘全保留，無cleanup。相較藍圖38 Form多7份有原因的補驗／smoke，見資源索引。禁止直接SQL改狀態或把多餘Form納刪除白名單 |
| G12 版本／安全證據 | 前後端SHA、plan lock、source/build hash、wire/readback、逐案結果分欄及去敏manifest交付 | raw credential留ignored；沒有trace/video/storageState交付。交付版本有效範圍以manifest為準，未宣稱Production完成 |
| RUN-ORDER-01／M07-DELETE | **BLOCKED**：四份白名單先完成Owner刪除，漏排刪除前非Owner403 | 這是本次執行次序缺口，不是產品缺陷。不得改預期為404、重複刪除或擴白名單。後續如要解除，由Owner明確核准一份新的專用白名單與先負向、再Owner刪除順序；本次不再等待／不請求擴權 |

## Audit 與工具警告

[實際audit JSON](raw/E06-audit.json) 共15 affected package nodes：critical2、high12、low1；是依賴圖節點，**不是15個獨立漏洞**。獨立advisory共7個：

| 套件／鏈 | Advisory與已觀察風險邊界 |
| --- | --- |
| `nuxt → @nuxt/devtools → simple-git → @simple-git/argv-parser` | [VISUAL guard omission](https://github.com/advisories/GHSA-v5rq-49vh-5v5c)、[trailer command config](https://github.com/advisories/GHSA-x6jw-m9v5-85vh)、[config includes](https://github.com/advisories/GHSA-g4wm-2vf7-vfgr)、[long-option abbreviation](https://github.com/advisories/GHSA-858h-whjf-mvg5)。安裝圖仍有套件；產品`devtools.enabled=false`、未提供使用者Git操作入口限制了本次正常路徑，**不證明套件所有觸發面不可達**，尤其本機工具執行風險仍需處置 |
| `nuxt / nitropack → listhen → node-forge` | [RSA signature verification](https://github.com/advisories/GHSA-86w9-cpqp-85rv)。本次是HTTP loopback preview、CSR、無Nuxt業務BFF，未測HTTPS／forge簽章使用路徑；不能把「本次未走」寫成漏洞不存在。後端JWT是另個.NET服務，不把此audit直接等同後端JWT缺陷 |
| `globby / fast-glob → micromatch → braces` | [deep pattern stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)。本次建置使用受控repo／fixture，沒有將表單內容當glob；未做攻擊輸入證明，保留工具供應鏈風險 |
| `esbuild` | [Windows dev-server arbitrary file read](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)。Windows開發模式屬相關環境；本次只bind loopback並不等同漏洞已關。不要把dev/build工具風險與CSR API功能結果互相抵銷 |

`fixAvailable`僅是registry建議，部分Nuxt鏈回報4.1.3；未據此自動降版或升級。Owner需逐advisory決定修正／延期的版本、限制與解除條件，才可更新風險狀態。

build的DEP0155、runner的NO_COLOR/FORCE_COLOR、安裝locked temporary cleanup等原log保留。generate log中的實際NUL／ESC在交付文字副本可視化，原bytes hash另存；沒有將工具警告改成產品FAIL，也沒有隱藏它們。真實Browser各attempt的Vue warning／pageerror為0，CORS metadata不符為0；a2兩筆404未列工具事前診斷清單另保留於首敗鏈，a7已明確事前宣告重驗。
