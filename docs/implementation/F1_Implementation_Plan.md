# F1 Implementation Plan — Nuxt CSR 與工程基礎

| 項目 | 本次紀錄 |
| --- | --- |
| 版本／日期／狀態 | 1.1／2026-10-11（Asia/Taipei）；Owner 已通過 review，依本次指示局部補明後直接開發 |
| 授權 | 已授權 F1 初始化、安裝、骨架與必要開發自測／提交；未授權正式驗收或 F2，不設定 F1 accepted、不推送 |
| 前置 | F0 已獲 Owner accepted；工程方向確認，版本僅候選，F2 精確數值 gate 保留 |
| 前端基準 | `master`／`54ac4482dba6442408864971a2ef11a871c441f3`（F0 收尾提交）；提交後乾淨，仍只有文件，沒有 package.json／lockfile／應用 |
| F1 開發接手基準 | `b485d3e9c3c20457d1373a0fd6fd054a51891595`（v1.0 計畫提交）；接手時乾淨，v1.1 修訂與實作同一目的提交 |
| 後端來源 | 2026-10-11 唯讀快照／`7591633137c5a6f57c1fce8e1ba19ab394015880`；R10 accepted、R11 結果待 Owner 確認是來源時間點狀態，本次未重跑或取得更新確認 |

## 1. 目標與來源

建立可重現的 Nuxt 4 CSR 工程骨架、最小 Layout／Feedback 容器及可執行的驗證工具。完成後只證明工程基礎可用；API client／adapter 在 F2，Auth／Header／產品首頁在 F3。

本計畫依 [AGENTS v1.1](../../AGENTS.md)、[development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫 v1.3](V1_Frontend_Implementation_Plan.md) 的 §5 F1、§7／§7.1 項目 7／9、§8；受影響規格為 [06 v1.1 §1～3／§11～12](../specs/06-technical-architecture.md) 及 [05 v1.0 §1～2／§7／§10](../specs/05-ui-and-interaction.md)。候選版本及已確認方向引用 [F0 §6～8／§11](F0_Alignment_Report.md)，不將其 metadata 當成安裝證據。

## 2. 初始化範圍與檔案

獲明確開發授權後，在現有 repo 直接建立必要檔案，保留 docs、AGENTS、skills 與 Git 歷史，不另執行 git init 或覆蓋整個目錄。

| 預計檔案 | 具體方案／界線 |
| --- | --- |
| package.json、package-lock.json、.nvmrc | 私有工程；Node 固定 `24.21.0`、npm 基準 `11.19.0`，記 engines／packageManager；直接依賴明確 pin，實際安裝才產生 lockfile |
| nuxt.config.ts、tsconfig.json | `ssr: false`、TypeScript strict；使用 Nuxt 4 生成的 tsconfig references，不以自行放寬檢查求通過；註冊 UI／ESLint module；不建 server routes、BFF 或 Nitro API proxy |
| nuxt.config.ts、.env.example | `runtimeConfig.public.apiBaseUrl` 預設 `http://localhost:5000/api/v1`，由 `NUXT_PUBLIC_API_BASE_URL` 覆寫；範例僅公開 URL，不含 Token／DB／Google／簽章設定 |
| app/app.vue、app/layouts/default.vue | `UApp` 包住 Layout／NuxtPage，提供 Toast／Dialog 基礎；不加 KeepAlive、Auth plugin 或 session middleware |
| app/assets/css/main.css | import Tailwind 與 Nuxt UI；固定亮色、藍色主操作、system font；外層最大 1280px、手機左右 16px；不配置外部字體／遠端 icon 載入 |
| app/pages/index.vue、必要 feedback 元件 | 最小工程就緒頁，提供可辨識的本地 Toast／Dialog smoke 控制；文案不冒充登入／保存成功，沒有業務 API。若控制需 icon，採本地 SVG；產品 Header／首頁留 F3 |
| eslint.config.mjs、vitest.config.ts、playwright.config.ts | Nuxt ESLint flat config；Vitest node environment 僅收 tests/unit；Playwright 僅收 tests/e2e，先配 Chromium，baseURL 固定 localhost:3000 |
| tests/unit/tooling-smoke.spec.ts、tests/e2e/foundation-smoke.spec.ts | 一個小型 Zod fixture 驗證 valid／invalid 與 issue path，確認 unit runner；Browser 驗證 CSR、UI／CSS、Feedback。只做工具基礎 smoke，不建立未實作功能的空測試 |
| .gitignore、README.md、F1_Development_Report.md | 保留 backend-ref 排除規則；補安裝／啟動／驗證指令與產物排除（node_modules、.nuxt、.output、本機 env、測試原始輸出），保留 .env.example；開發報告只記實際結果 |

只建立本輪用到的目錄。F2 的精確數值／datetime／Unicode／API timeout 與錯誤策略沿 F0，F1 不建立替代實作；Google、部署及資料持久化仍延期／排除。

## 3. 必要依賴與安裝條件

沿用 F0 2026-10-11 官方 metadata 候選，不在本次重新安裝或宣稱相容；最終直接版本、Vue／router／Vite 等解析版本與 Windows native module 結果須記於 F1 lockfile／開發報告。

| 用途 | 候選直接依賴 |
| --- | --- |
| App／UI／表單／排序 | nuxt `4.6.1`、@nuxt/ui `4.11.3`、tailwindcss `4.3.3`、zod `4.6.5`、vue-draggable-plus `0.6.1` |
| 型別 | typescript `5.9.3`、vue-tsc `3.3.13`、@types/node `24.19.2`、@types/sortablejs `1.15.9` |
| lint | eslint `10.12.0`、@nuxt/eslint `1.17.0` |
| 自測 | vitest `5.0.3`、@playwright/test `1.64.0`；Chromium bundle 於獲授權後安裝並記實際版本 |
| 本地圖示（v1.1） | @iconify-json/lucide `1.2.142`，F1 以 npm 官方 metadata 核對並安裝；UI 內建圖示及明確指定圖示納入 client bundle，provider=none／fallback=false／serverBundle=false |
| F2 留用候選 | lossless-json `4.3.1` 在 F2 加入並驗證；F1 不需要數值傳輸套件來完成工程 smoke |

UI 使用其 Nuxt／Tailwind 整合，不疊舊 Tailwind module；不新增 Pinia、日期庫、HTTP wrapper 或 Nuxt test-utils。若實際安裝要求明確 Vue／router peer，由 Nuxt 相容範圍選定並記錄，不預先虛構解析值。

授權後依序檢查 Node／npm → `npm install` 建 lockfile → `npm ci` 證明可重現 → 後述必要檢查。先確認 registry／Browser bundle 網路與 localhost:3000 可用；port 占用時回報，不改用 127.0.0.1、替代 port 或停止他人服務。不使用 force／legacy-peer-deps／忽略 engines，也不更換指定 Node。候選若失敗，記實際套件、錯誤及影響；同 major 相容 patch 的例行調整留證據，改主要選型或產品限制時回報受影響決議。

## 4. npm scripts 與本機流程

下列是預計交付的 scripts，CLI 選項及 Windows 執行結果在 F1 實測；沒有本次執行結果。

| Script | 預計命令／用途 |
| --- | --- |
| postinstall | `nuxt prepare`；安裝後生成 Nuxt 型別與工具組態，需手動重生時直接執行同命令 |
| dev | `nuxt dev --host localhost --port 3000`；本機開發 |
| lint | `eslint .`；涵蓋 app、config、tests，排除生成產物 |
| typecheck | `nuxt typecheck`；strict 檢查，包含測試／工具組態（未被 Nuxt 納入者以專用 tsconfig 接入） |
| build | `nuxt build`；CSR production build |
| generate（v1.1） | `nuxt generate`；純靜態 smoke 所需 HTML／client 產物，不作部署授權 |
| preview | `nuxt preview --host localhost --port 3000`；僅提供 build 產物，沒有 BFF |
| test:unit | `vitest run`；一次執行，後續輪次沿用 |
| test:e2e | `playwright test`；built preview 上的 foundation smoke |

README 記 `npm ci`、`npm run dev` 及各驗證 script。`npm run test:e2e` 前完成 build；Playwright webServer 啟動 `npm run preview`、`reuseExistingServer: false`，避免拿不明既有服務當結果。API Base URL 使用 public config；F1 沒有 API client，credentials／retry／30s timeout 在 F2 實作，真實 Cookie／CORS 在 F3 證明。

### 4.1 API Base URL 覆寫 smoke（Owner 局部補明）

使用公開測試 URL `http://localhost:5000/api/f1-smoke`，僅讀取瀏覽器 public config，不對它發請求。每組依序啟停本輪建立的前端 process，不操作既有後端；清除本輪 process 環境覆寫後恢復預設產物。記錄命令、注入階段、模式、Browser 讀得的 URL 與結果。

| 執行模式 | 注入階段／操作步驟與判準 |
| --- | --- |
| dev | 先在啟動 process 的環境設定 `NUXT_PUBLIC_API_BASE_URL`，再 `npm run dev`；Browser 完整載入讀 config。預設與覆寫各啟動一次，覆寫應生效；不是對已啟動 process 改環境 |
| built preview | 先以預設環境 `npm run build`，再只在 preview process 啟動前注入測試 URL、`npm run preview`。實測是否由本版 CSR 產物／Nitro 提供 runtime 覆寫，記錄實際值；若 prerender HTML 仍保留 build 值，明列限制，改在 build 階段注入後重建，再 preview 證明覆寫。不得把 preview 的 .env 載入或靜態快取混當 runtime 證據 |
| 純靜態 .output/public | 在 build／generate 階段注入 URL，再由無 Nuxt runtime 的本地靜態 server 提供產物；Browser 應讀到建置值。只在靜態 server 啟動階段改環境不應改已建置 config，需重新建置；此 smoke 僅驗產物語意，不授權部署 |

### 4.2 所有內建圖示均本地化（Owner 局部補明）

本地 SVG／client bundle 要求同時涵蓋 Toast 的狀態／關閉／loading 圖示與 Dialog 關閉圖示，不只頁面按鈕。若用 Nuxt Icon，將實際使用圖示明確納入 client bundle、停用 server icon bundle／API fallback；必要本地 icon collection 版本在安裝時 pin 並記 lockfile。Browser 從首次載入監聽到 Toast／Dialog 開關結束，斷言沒有外部請求，也沒有同 origin 的圖示 API endpoint 請求；檢查圖示實際渲染，不能靠阻擋請求後顯示空圖示求 PASS。

## 5. 必要自測、案例與證據

本節供授權開發後自測，不是正式驗收計畫。所有下列執行目前 **NOT RUN**；F1 不依賴後端帳號、DB 或業務 Endpoint。

| 方法／時點 | 目標、代表案例與預期證據 |
| --- | --- |
| install／npm ci，初始化後 | Node 24.21.0／npm 版本、直接與解析依賴、無未解決 peer／engine 錯誤；lockfile 與完整退出結果。先 install 再 ci，不能只交付版本表 |
| lint／typecheck／build，骨架完成後 | 三項必要命令成功；strict 沒有被關閉；CSR／UI／CSS 產物確實生成，記版本與摘要 |
| Vitest 工具 smoke | 小型合成 Zod fixture 的有效／無效值及預期 issue path；只確認 runner／依賴可用，不宣稱產品 validation 或數值精度已通過 |
| Chromium Browser smoke，build 後 | 初始 HTML 未 server-render 工程頁內容，啟用 JS 後出現內容；UI／Tailwind 正常載入，Toast／Dialog 開關與焦點回復可操作，沒有 console／hydration 錯誤；桌面與 390px viewport 無整頁水平溢位。記 Playwright／Chromium 版本、case 結果及必要去敏截圖 |
| Browser 組態／請求檢查，同次 smoke | public API URL 使用預設值；再用公開測試 URL 覆寫啟動一次，確認 runtime config 被替換且無秘密。F1 載入及操作不發 localhost:5000 業務請求、不發非必要外部字體／icon 請求；只證明前端組態，不代稱 API／Cookie／CORS PASS |
| diff／文件／Git，交付前 | README 可重現步驟、秘密與產物排除、backend-ref 保持唯讀、本輪變更範圍、實際 SHA 與剩餘狀態 |

F1 Browser 使用本地工程 fixture，無 API 攔截假成功、Cookie／storageState 或 DB 寫入；後端不需重啟。Chrome／Edge／Safari／Firefox 實機矩陣及產品人工體驗不列本輪必要層級，因本輪只建立工具骨架；未執行者不宣稱 PASS。沒有純業務 adapter 可測，故不提前建立 F2 unit suite。必要檢查缺網路／bundle／port 等前置時記 BLOCKED／NOT RUN，不能改成不適用。

## 6. 交付、缺口與停止點

目前沒有阻擋 F1 計畫交付的契約疑問。實際安裝相容性尚待驗證；F2 精確數值 gate 仍需 parse／serialize／比較證據，禁止依賴 LosslessNumber 隱式轉換或一般 JS number 保存精度。後端 live 版本、Cookie／CORS、特殊測資屬後續整合前置，不阻擋 F1 工程 smoke。

獲授權開發後交付工程骨架、lockfile、可重現 scripts、必要自測證據、`F1_Development_Report.md` 與單一目的提交；完成判準是上述必要檢查實際成功，缺口如實列出。開發交付後停於待 code review／後續指令，不自動展開正式驗收、F2 或設定 F1 accepted。

### 6.1 v1.0 規劃交付紀錄（歷史）

v1.0 交付僅本計畫與進度紀錄；當時應用初始化、套件安裝、lint／typecheck／build／unit／Browser、正式 AI／人工驗收均 **NOT RUN**。F0 收尾 commit 為 `54ac4482dba6442408864971a2ef11a871c441f3`；F1 v1.0 規劃 commit 為 `b485d3e9c3c20457d1373a0fd6fd054a51891595`；未推送。

本次文件自查：相對檔案連結、控制字元、最終換行及 `git diff --check` **PASS**；backend-ref manifest 108 筆唯讀 hash 核對 **PASS**。這些不是產品／後端驗收或相容性執行證據。

v1.0 規劃與文件檢查紀錄如上，當時尚未授權開發。v1.1 依 Owner 本次指示補 §4.1／§4.2 後直接開發；實際安裝、自測與提交結果另見 [F1 Development Report](F1_Development_Report.md)。

**本次開發停止點：F1 開發完成，待 code review。**
