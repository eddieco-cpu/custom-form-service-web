# Git Repository Hygiene 與敏感資訊檢查

> 後續狀態（2026-10-17）：Owner 已決定採 private GitHub、保留歷史與作者 metadata，並核准 S01 八檔「本機保留原件＋原追蹤路徑保存去敏副本」；去敏及 Docker 準備已由[後續交付報告](../deployment/Docker_Deployment_Preparation_Report_20261017.md)承接。以下保留 2026-10-16 初查的當時結果與停止點，不將其待辦敘述當作後續未執行。

日期：2026-10-16（Asia/Taipei）。範圍：GitHub 推送／Railway 部署前的本機整理與唯讀檢查。**安全 ignore 規則已完成；發現已追蹤的可重建合成帳號密碼，敏感內容與歷史處理待 Owner 決定。本報告不表示已可直接公開或已通過部署驗證。**

## 1. 基準、授權與實際變更

- 接手：`master`，HEAD `975ef8b2e78221a18956972dc762fda4005aae2f`；工作樹乾淨，無 staged／未追蹤檔案。
- 本次是獨立 repository hygiene 工作，沒有開始或修改 F0～F10 Round、accepted、產品行為、API 契約、DB 或既有測試判定。
- 實際修改 `.gitignore`，新增 `.dockerignore`、本報告與去敏盤點伴檔。所有既有文件、Evidence、Skills、測試及 Fixtures 原件保留；未取消追蹤任何檔案。
- 未修改敏感來源、未提交、未設定 remote、未 push／部署／改寫歷史。交付時 HEAD 維持接手基準。
- 來源：`AGENTS.md` v1.1、前端 specs 00～07（02／06 v1.1，其餘 v1.0）、總實作計畫 v1.3 §7／§7.1 及 F10、現行 Nuxt／npm 設定與 F10 證據。本次保留既有驗收事實，沒有重跑正式驗收。
- 前端實際版本：上述 HEAD，Node `24.21.0`、npm `11.19.0`，套件版本以現有 lockfile 為準。後端只引用唯讀 `backend-ref/SNAPSHOT.md` 的 `7591633137c5a6f57c1fce8e1ba19ab394015880`；未修改快照，未確認 live backend 版本或呼叫 API／DB。

## 2. Git 檔案盤點

| 接手項目 | 數量／結果 |
| --- | --- |
| 已追蹤檔案 | 1,101；23,479,148 bytes |
| `docs/` | 918；完整保留 |
| `tests/` | 61；完整保留 |
| `.agents/` | 4；完整保留 |
| `app/` | 90；未修改 |
| 未追蹤、未忽略 | 0 |
| Git 提交 | 46；無 configured remote |
| 本機 ignored 補充檢查 | 5,723 個檔案；含私密測資、原始執行輸出與工作副本 |

完整已追蹤清單見 [Tracked_Files.csv](evidence/git-hygiene-20261016/Tracked_Files.csv)；接手時未追蹤清單及 ignored 目錄見 [Baseline_Inventory.json](evidence/git-hygiene-20261016/Baseline_Inventory.json)。完整本機補充路徑盤點留在 ignored `output/hygiene-audit-20261016/inventory.json`，沒有複製私密檔案內容進報告。

排除耗量大且不屬於提交面的依賴／生成目錄：根目錄 `node_modules/`、`.nuxt/`、`.output/`、`dist/`、唯讀 `backend-ref/` 及巢狀 `node_modules/`。這些不是本次 Git 內容安全結論的範圍。

## 3. `.gitignore` 調整

1. 保留本機後端參考、依賴、Nuxt／fixture 建置產物及 `.env` 的排除；保留 `.env.example`。
2. 增加 `.cache/`、`.vite/`、`.npm/`、增量編譯資訊、根目錄 `output/`、Playwright／blob report、coverage 及暫存檔。
3. 增加本機秘密目錄與檔案：`.envrc`、`.npmrc.local`、`.netrc`、根目錄 `.secrets/`、`secrets/`、`.ssh/`、`.aws/`、`.certs/`。
4. 增加明確敏感原件／登入狀態命名：`.auth/`、`storageState*.json`、`storage-state*.json`、`*-private-credentials.json`、`private-state.json`、`*.sensitive.*`。
5. 將執行輸出排除錨定根目錄。沒有使用 `docs/`、`tests/`、`review/`、`evidence/`、`raw/`、`*.log` 或 `*.zip` 的全域排除規則；歷史 log／去敏 evidence 仍可追蹤。

`git ls-files -ci --exclude-standard` 為空：**新規則沒有命中任何既有追蹤檔案**。規則只防止未來意外加入，不會移除 index 或舊提交的內容。新 Evidence 應先去敏，再放入可追蹤的 `docs/`；raw 原件留在 `output/` 或明確的敏感命名位置。

## 4. 敏感資訊檢查結果

### S01 — 已確認：F10 工具副本可重建兩個保留合成帳號的密碼

**待 Owner 決定，尚未修改。** 已追蹤的八份 F10 工具副本含決定性密碼產生片段。以 TypeScript AST 僅解讀常數、分支及字串操作，在記憶體內與本機私密狀態比對，確認 EC1、EC2 的產生結果與保留密碼相同。**本報告不提供密碼、產生公式或密碼 hash。**

EC1 的完整合成帳號 email 另出現在 12 份已追蹤證據中；EC2 的完整 email 未被本次逐字搜尋找到。兩個帳號的密碼本身均可由工具片段重建，因此不能僅以「沒有直接記錄密碼值」認定安全。未嘗試登入；帳號目前是否可登入、是否停用或後端是否仍提供存取，均未驗證。這是本機合成測資風險，沒有證據顯示它們是正式環境或真實使用者帳號。

共同目錄：`docs/test-results/evidence/F10_v1-f10-20261016-01/`。

| 已追蹤相對檔案 | 行 | 建議 |
| --- | --- | --- |
| `raw/canonical-a4-tools.mjs.txt` | 359 | 去敏後保留；原件留本機 |
| `raw/canonical-a5-tools.mjs.txt` | 359 | 同上 |
| `raw/canonical-a6-tools.mjs.txt` | 359 | 同上 |
| `raw/canonical-a7-tools.mjs.txt` | 359 | 同上 |
| `raw/canonical-a8-tools.mjs.txt` | 359 | 同上 |
| `raw/canonical-a9-tools.mjs.txt` | 359 | 同上 |
| `raw/canonical-a10-tools.mjs.txt` | 359 | 同上 |
| `tools/canonical.spec.mjs.txt` | 360 | 同上 |

完整路徑／待辦見 [Owner_Review_Files.csv](evidence/git-hygiene-20261016/Owner_Review_Files.csv)。這些是歷史工具文字副本；現行產品程式未發現同類憑證。現階段**沒有建議整批取消追蹤文件**。

供 Owner 確認的具體安全方案：

1. 先將這八份原件連同 Git blob 身分、原始路徑與時間備份至 ignored `output/hygiene-private-originals-20261016/S01/`。本次尚未執行備份或改寫原件。
2. 優先在原追蹤路徑保存明確標為「去敏歷史副本」的內容，只遮蔽能重建現存憑證的片段；保留案例、流程、密碼邊界驗證目的及原測試結果。副本註明去敏日期、範圍與原始 blob，以免被誤認為原始執行版本。
3. 不修改 Case Results、PASS／FAIL／BLOCKED、原失敗、重驗鏈、測試預期或 Plan Lock。若有文件完整性索引受影響，追加去敏對照，不偽造原始 hash 或回寫歷史結論。
4. 若 Owner 選擇取消追蹤原件，僅針對上述八檔，保留本機原件並提供去敏副本與連結對照；不擴大到整個 raw／tools／evidence 目錄。
5. 在公開前，由 Owner 決定合成帳號的隔離／失效安排與歷史揭露處置；本次不操作帳號或 DB。**只去敏 HEAD 或新增 ignore，不能消除舊提交中的可重建資訊。**

### S02 — 個人 Git metadata 的公開範圍

46 個提交的 author／committer metadata 共含 92 處個人 email；沒有在報告重印地址或姓名。這是歷史隱私揭露面，與測試用 `example.test` 信箱分開處理。Owner 應確認是否接受其隨 GitHub 歷史公開；若希望未來使用隱私信箱，可另行設定。修改未來 Git 身分不會變更舊提交；本次沒有改 Git 身分或歷史。

### L01 — 本機秘密原件已在 ignored 區域

找到 10 份本機私密檔案：F7 兩份、F8 三份、F9 四份 `*-private-credentials.json`，以及 F10 一份 `private-state.json`。共讀到 18 個不同秘密值，全部只在記憶體中逐字比對。

- 與 1,101 個追蹤檔案及 1,166 個歷史文字 blob 比對：**沒有完整秘密字串的直接命中**。S01 的風險是可由程式重建，另行確認，不能用此零命中覆蓋。
- 這十份檔案已由既有 `output/playwright/` 與本次 `/output/` 規則排除；保留本機原件，無需取消追蹤。完整原件路徑列在 Owner Review CSV 的 L01 各列，沒有內容。
- 未解壓並逐一認證所有 ignored trace／影片；它們繼續留本機，不能直接複製到可提交 evidence。

### 其他檢查與誤報處理

| 類別 | 本次結果 |
| --- | --- |
| 雲端／服務 API Key、私鑰、具形狀的 JWT | 在已掃描文字與歷史 archive 中未發現；未向任何 provider 驗證憑證 |
| 已發行 Cookie／Session／Authorization 值 | 未確認有實際值提交；Cookie/CORS 屬性、測試程式及標題保留 |
| DB connection string 憑證 | 未確認有實際憑證提交；`password = ...` 程式碼被初掃模式命中的項目已分流 |
| 真實使用者個資 | 未確認有業務使用者個資；測資為合成 email／姓名／回答。S02 的作者 metadata 仍需 Owner 確認 |
| Fixture 密碼／無效輸入 | F3／F9 fixture 固定輸入、短字串、填寫流程及其錯誤堆疊屬模擬；未因出現 password 字樣而刪除 |
| 執行期隨機密碼 | F3／F4／F6 的 randomBytes、F7／F8／F9 與整合測試的 randomUUID 產生程式本身不是已洩漏的密碼值；保留測試與歷史副本 |
| email 初掃 | tracked 的非保留網域命中是 dependency maintainer 資訊及 npm 安裝訊息，未視為應用使用者個資 |
| 台灣手機形狀初掃 | tracked 的兩處是 Playwright `spec.id` 字串片段，非手機資料 |
| 70 個 tracked PNG | 六張本機 contact sheet 初查、部分原尺寸檢視，所見為合成 UI／測資；沒有 PNG text／EXIF chunk。長圖小字未做完整 OCR，不宣稱逐像素去敏認證 |

## 5. Git History 檢查

以 `git rev-list --objects --all --reflog` 盤點 refs 與 reflog 可達內容，檢查 **46 個 commit、1,224 個不同 blob**：1,166 文字、57 PNG、1 ZIP。

- S01 八份工具副本已在 `975ef8b2e78221a18956972dc762fda4005aae2f` 提交，不能只改未追蹤規則處理。
- S02 個人 email 保存在 commit metadata，並非單純工作樹檔案。
- 歷史 `docs/test-plan.zip`（blob `642ef7e318ded5240fbc4c18be41d8d6f894a74b`）已另讀 ZIP entries，檢查八份文字文件；未命中具形狀的 token／私鑰／email 或 literal credential assignment。42 個 Auth／password 關鍵字命中為規劃脈絡，沒有列為實際憑證。
- 57 個歷史 PNG blob 均仍有目前追蹤圖片對應；目前 70 個路徑含重複圖片。
- 沒有 configured remote；未查 GitHub、遠端 refs、伺服器快取、其他 clone 或超出 refs／reflog 的不可達物件。因此沒有對遠端歷史或所有可能備份作無敏感資訊保證。
- **未執行 filter-repo、rebase、reset、GC、force push 或任何歷史改寫。** 若要在完整保留歷史下繼續，需先決定 S01 帳號風險與 S02 隱私接受範圍；若要求精準歷史去敏，另案由 Owner 授權，須保留本機完整備份。

## 6. `.dockerignore` 與 Railway 相容性

接手時沒有 `.dockerignore`、Dockerfile、Railway 專用設定或 `start` script。新增的 `.dockerignore` 針對**未來從原始碼進行的正式 Docker build**：

- 排除 `.git`、本機工具設定、後端快照、依賴／生成物、快取、秘密、執行輸出、docs／tests 及測試 runner 設定。
- 保留 `app/`、`public/`、`scripts/`、`package.json`／`package-lock.json`、`.nvmrc`、`nuxt.config.ts`、`tsconfig*.json` 及 `eslint.config.mjs`。靜態規則檢查保留全部 **99 個必要建置檔案**。
- 以接手 tracked 檔案估算，context 保留 100 檔／排除 1,001 檔。這是本次正向 glob 規則的本機靜態檢查，**不是 Docker engine 實際產生的 context 或成功 build**。
- docs／tests 僅在 Docker context 排除，仍完整保留於 Git。`.env.example` 也不進 image；公開 API base URL 應由部署組態明確提供。

Docker 會在傳送 build context 前套用 `.dockerignore`；它不會修正 Git history。未來若增加 Dockerfile 專用 ignore 檔，需重新核對其優先序與例外。[Docker 官方文件](https://docs.docker.com/build/concepts/context/)

部署前仍需另行完成：

1. 選擇 Railway 的實際建置方式。Railway 可自動使用根目錄 Dockerfile，但本次沒有建立 Dockerfile；若採 Railpack，不能將這次 `.dockerignore` 檢查代稱為 Railpack 的 context 驗證。[Railway Dockerfiles](https://docs.railway.com/builds/dockerfiles)
2. 維持指定 Node `24.21.0` 與 npm `11.19.0`。現有 builder 應依 lockfile 安裝建置依賴；Nuxt 設定載入 `@nuxt/eslint`，不能未驗證就只安裝 production dependencies。遠端 runtime／image 的指定版本可用性本次 NOT RUN，未擅改版本。
3. 決定 build／generate 與正式啟動方式。現有 `dev`／`preview` 綁定 localhost:3000，`scripts/static-smoke-server.mjs` 明列為本機 artifact probe，不能直接當正式啟動設定。現有產物有 `.output/server/index.mjs`，可在後續計畫評估正式 Nitro 啟動而維持 CSR；本次未變更啟動命令。[Railway 啟動指引](https://docs.railway.com/deployments/troubleshooting/no-start-command-could-be-found)
4. 正式服務應依 Railway 提供的 PORT 及可對外監聽位址設定，不能延用 localhost 綁定。[Railway 網路故障排查](https://docs.railway.com/networking/troubleshooting/application-failed-to-respond)
5. 設定正式 `NUXT_PUBLIC_API_BASE_URL`；public runtime config 會提供給瀏覽器，只能放公開組態。若選 Docker 並需要 build-time 公開變數，需在對應 stage 宣告；不將 DB／JWT／Google／私密 token 塞入前端或 build ARG。[Railway build-time variables](https://docs.railway.com/builds/dockerfiles)
6. 依實際前後端 Domain／HTTPS 拓樸重新核對 Cookie／CORS、深層 SPA URL、登入返回與安全組態；保留既有契約，由後續授權部署階段處理，不以本機歷史 PASS 代填。

Docker CLI `28.5.1` 存在，但本次連線 Docker daemon 回 Access denied；**Docker build／遠端 Railway build／部署皆 NOT RUN**。沒有為此啟動 daemon、變更權限或部署服務。

## 7. 驗證、證據與限制

| 檢查 | 實際結果 |
| --- | --- |
| 接手 Git status／追蹤／未追蹤盤點 | PASS；基準與清單已記錄 |
| 內容／歷史 pattern scan | COMPLETED；S01／S02 待 Owner，不標為整庫安全 PASS |
| 18 個本機秘密值逐字比對 | PASS（直接相同字串 0 命中）；不涵蓋可重建公式風險 |
| S01 AST 常數計算與私密狀態比對 | CONFIRMED；兩帳號／八檔，不輸出值、不登入 |
| Git ignore probes | PASS；30 個排除＋17 個保留，0 失敗 |
| 既有 tracked 命中新 ignore | PASS；0 檔 |
| Docker 正向規則靜態檢查 | PASS；99 個必要建置檔案全保留，docs／tests 排除 |
| `git diff --check` | PASS |
| 新增交付檔再比對本機 18 個秘密值 | PASS；12 個新檔（`.dockerignore`＋11 個報告／伴檔）直接秘密字串命中 0 |
| 產品 lint／typecheck／build／unit／Browser | NOT RUN；本次只有 ignore 與新盤點文件，沒有產品執行路徑變更 |
| API／DB／帳號登入與寫入 | NOT RUN；沒有新增或刪除測資 |
| 正式 AI／人工驗收 | NOT RUN；不變更既有 F10 結論 |
| Docker engine／Railway 驗證 | NOT RUN；daemon 存取受限，且尚無正式部署設定 |

去敏機器摘要見 [Scan_Summary.json](evidence/git-hygiene-20261016/Scan_Summary.json)，圖片索引見 [Screenshot_Index.json](evidence/git-hygiene-20261016/Screenshot_Index.json)。本次沒有安裝 gitleaks／trufflehog；使用本機 purpose-built pattern scan、逐字比對與手動分流。這不構成任意編碼／拆分秘密均不存在的證明，也不包含依賴弱點稽核。

為保留檢查方式，伴檔保留 `scan.mjs.txt`、`known-secrets.mjs.txt`、`boundary-check.mjs.txt`、`archive-check.mjs.txt`、`validate.mjs.txt` 的本次工具原文。它們是獨立盤點工具，不是產品測試或已部署程式；執行基準會隨新提交改變。原始掃描結果及 contact sheets 留在 ignored `output/hygiene-audit-20261016/`。工具不輸出秘密值，私密狀態比對需要原本機測資檔，不應將這些前置複製到 Git。

## 8. 交付 Git 狀態與 Owner 待辦

本次交付為未提交的 `.gitignore` 修改、`.dockerignore` 新檔、`docs/security/` 的 11 個新報告／伴檔。原有 tracked 內容只有 `.gitignore` 被修改；staging area 為空，沒有取消追蹤、原始證據內容修改、產品修改或新提交。HEAD 仍為 `975ef8b2e78221a18956972dc762fda4005aae2f`。

待 Owner：

- 確認 S01 的八檔「本機保留原件＋追蹤去敏副本」方案，並決定合成帳號隔離／失效與既有 Git history 揭露的處理；尚不執行敏感內容修改或取消追蹤。
- 確認 S02 個人 Git metadata 是否接受公開；任何歷史處理另行明確授權。
- 後續另行授權 GitHub 推送與 Railway 部署方案／實作。安全 ignore 調整已完成，未將其當作推送或部署授權。

停止點：安全整理完成、風險與清單交付；敏感原件、資料與歷史維持原狀，等待 Owner 決定。
