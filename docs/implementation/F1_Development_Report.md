# F1 Development Report — Nuxt CSR 與工程基礎

| 項目 | 本次紀錄 |
| --- | --- |
| 版本／日期／狀態 | 1.0／2026-10-11（Asia/Taipei）；**F1 開發完成，待 code review**；未 accepted |
| 授權 | Owner 通過 F1 review，授權局部補明兩項後直接初始化／安裝／開發／必要自測及單一目的提交；不需再次計畫 review |
| 前端接手基準 | `master`／`b485d3e9c3c20457d1373a0fd6fd054a51891595`；起始工作樹乾淨，只有文件 |
| 本輪版本 | 本報告、修訂計畫、骨架、lockfile、自測與進度同一 F1 commit；實際完整 SHA 由交付訊息／`git log -1` 記錄，無額外回填提交 |
| 後端來源 | 2026-10-11 匯出唯讀快照／`7591633137c5a6f57c1fce8e1ba19ab394015880`；本次沒有 live Git／DLL／DB 版本核對或較新 Owner 確認 |

## 1. 範圍與來源

依 [AGENTS v1.1](../../AGENTS.md)、[development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫 v1.3 §5 F1／§7／§7.1／§8](V1_Frontend_Implementation_Plan.md)、[06 v1.1 §1～3／§11～12](../specs/06-technical-architecture.md)、[05 v1.0 §1～2／§7／§10](../specs/05-ui-and-interaction.md) 與 Owner 已核准的 [F1 計畫 v1.1](F1_Implementation_Plan.md) 執行。v1.1 先補 §4.1 URL 覆寫模式／階段與 §4.2 Toast／Dialog 內建本地圖示，再開始開發。

完成 Nuxt CSR 最小工程、可重現 npm 安裝、公開組態、UI／CSS／Feedback、strict 型別與自測基礎。没有 API client、Auth／Header／產品首頁、表單、數值 adapter、後端功能、部署或正式驗收。F0 accepted 維持；F2 精確數值可行性 gate 未開始，不以套件安裝或本輪自測代稱精度已證明。

## 2. 實際變更與工程理由

| 檔案／能力 | 結果／用途 |
| --- | --- |
| package.json／package-lock.json／.nvmrc | Node 24.21.0、npm 11.19.0；直接依賴精確 pin，lockfile v3；install 後以 npm ci 真正重現 |
| nuxt.config.ts／.env.example | `ssr=false`、TypeScript strict、public.apiBaseUrl；無 server routes／BFF／API proxy；關閉 devtools／外部 fonts／color-mode 切換，固定亮色 |
| app/app.vue／layouts/default.vue／app.config.ts／CSS | UApp 承接 Toast／Dialog、繁中 UI locale；最大 1280px／手機 padding 16px，主操作藍色、system font；NuxtPage 不使用 KeepAlive |
| index.vue／feedback/FoundationFeedback.vue／favicon.svg | 工程就緒頁與本地提示／對話框；只顯示公開 URL、不發 API、不偽裝業務成功；favicon 本地 SVG |
| icon 組態／Lucide collection | provider=`none`、fallbackToApi=false、serverBundle=false；UI hook 與明確列表共 43 個 client bundle icons（10.40KB uncompressed），含 Toast 狀態／關閉與 Dialog 關閉；Browser 確認 SVG data mask 渲染且沒有圖示 API 請求 |
| ESLint／Nuxt tsconfig references／tsconfig.tools.json | app 由 Nuxt generated projects 檢查；tools 保留 nuxt.node.d.ts module augmentation，strict＋allowJs／checkJs 實際涵蓋 tests、TS／MJS config 與靜態 probe；没有 skip app 或放寬 strict |
| Vitest／Playwright config 及 tests | 1 個 Zod tooling fixture；1 個 Browser foundation case，可切換 preview／dev／static，固定 localhost:3000、不重用不明服務、retry=0；首次 CSR 載入等候最多 30 秒以涵蓋 dev 冷編譯 |
| scripts/static-smoke-server.mjs | 本機唯讀提供 generate 產物，不注入 runtime config、不代理 API；未作部署用途 |
| README／.gitignore／進度／證據 | 可重現指令及模式限制；排除本機 env、依賴、生成產物、原始 trace；保留 .env.example 及 backend-ref 排除規則 |

最終 scripts：postinstall、dev、lint、typecheck、build、generate、preview、test:unit、test:e2e，命令見 package.json／README。generate 為本次純靜態語意 smoke 所需；目前本機產物已恢復無覆寫的預設 **build**，不是殘留測試 URL 的靜態產物。

## 3. 實際版本與相容性證據

Node `24.21.0`／npm `11.19.0`。F0 候選直接版本皆可安裝，沒有更換指定 Node、使用 force／legacy-peer-deps 或忽略 engines。

| 組別 | 已安裝精確版本 |
| --- | --- |
| App | nuxt 4.6.1、@nuxt/ui 4.11.3、tailwindcss 4.3.3、zod 4.6.5、vue-draggable-plus 0.6.1 |
| 型別／lint | typescript 5.9.3、vue-tsc 3.3.13、@types/node 24.19.2、@types/sortablejs 1.15.9、eslint 10.12.0、@nuxt/eslint 1.17.0 |
| 自測／本地 icon | vitest 5.0.3、@playwright/test 1.64.0、@iconify-json/lucide 1.2.142 |
| lockfile 解析 | Vue 3.5.43、vue-router 5.4.0、Vite 8.3.4、Nitro 2.13.4、@nuxt/icon 2.5.1 |
| Browser | Playwright Chromium 156.0.8078.4（bundle v1248），headless；沒有冒稱實機 Chrome／Edge／Safari／Firefox 已執行 |

[版本證據 JSON](evidence/F1/versions.json) 由實際 lockfile／命令產生；lockfile SHA256：`245333FCDDFEF57088AE2F13D909A89E06235BD5A93102021C0DBE15FBFF3432`。Lucide 版本另以 npm 官方 metadata 查得並精確安裝。相容性結論限本輪已執行的安裝、型別、建置及工程 smoke；Editor／排序等後續產品行為尚未測試。

## 4. 必要自測與實際結果

均為本輪開發自測；合成工具 fixture／本地頁面，沒有真實 API／Cookie／CORS 整合。PASS 不代表 code review、正式 AI／人工驗收或 F1 accepted。

| 命令／案例 | 實際結果／證據 |
| --- | --- |
| git status／rev-parse、Node／npm | PASS：基準如表，起始乾淨，指定 runtime 可執行 |
| npm install --no-audit --no-fund；加入本地 Lucide collection | PASS：建立 lockfile／Nuxt prepare；沒有 engine／peer resolution 錯誤 |
| npm ci --no-audit --no-fund | PASS：982 packages；postinstall 生成 Nuxt 型別與 client icon bundle |
| npm run lint | PASS，退出 0；涵蓋 app、tests、組態／script |
| npm run typecheck | 最終 PASS，退出 0；Nuxt app＋獨立 strict tools tsc 皆執行 |
| 型別涵蓋負向 probe | PASS（預期拒絕）：app Vue、tests/unit、root config 各植入 number→string 型別錯誤，app checker／tools tsc 實際各報 TS2322。probe 隨後移除，最終 typecheck PASS |
| tools tsc --listFilesOnly | PASS：列入 nuxt.config.ts、playwright.config.ts、vitest.config.ts、eslint.config.mjs、unit／E2E specs、static-smoke-server.mjs；不是只靠 tsconfig 宣稱涵蓋 |
| npm run test:unit | 最終 PASS：1 file／1 test；有效 fixture 與非法 enabled 的 issue path。沒有宣稱產品驗證或精度通過 |
| npm run build | 最終 PASS：Nuxt 4.6.1／Vite 8.3.4，CSR client 與前端 Nitro renderer 產物生成；沒有 server 業務 Endpoint |
| npm run generate（build 階段注入測試 URL） | PASS：static preset，生成 /、index.html、200.html、404.html；ssr=false，HTML 不含 server-render 的工程頁正文 |
| npm run test:e2e；5 組模式條件 | 最終各 PASS，見 §5；同一 case 檢查 CSR、UI／CSS、Toast／Dialog 開關／焦點、內建本地圖示、1280／390px 無水平溢位、console／pageerror 空、非預期請求空 |
| 手機截圖核對 | PASS：工程頁完整可讀、藍色主操作、本地圖示；[最終 390px 截圖](evidence/F1/foundation-mobile.png)，不代填正式人工驗收 |
| backend-ref manifest | PASS：108 筆唯讀 SHA256 相符；沒有修改或刪除快照 |
| 文件連結／JSON／git diff --check／diff scope | PASS：四份本輪文件連結／控制字元／最終換行、證據 JSON 與 diff check；範圍限 F1 |
| API health／業務請求／Cookie／CORS／後端 build／tests／DB | NOT RUN；沿用快照來源狀態，本輪不重跑後端驗收、操作 DB 或啟停／改設定 |
| 正式 AI／人工驗收、F2、部署／push | NOT RUN；本次未授權 |

## 5. URL 覆寫與圖示證據

每組啟動全新前端 process，Playwright 執行後關閉它；未停止既有後端。測試 URL 只顯示／讀取，沒有向 localhost:5000 發請求。

| 模式／命令步驟 | 注入階段／Browser 實際值／結果 |
| --- | --- |
| dev 預設：F1_SMOKE_MODE=dev → npm run test:e2e | 無 URL 覆寫；`http://localhost:5000/api/v1`，PASS；[證據](evidence/F1/dev-default.json) |
| dev 覆寫：先設 NUXT_PUBLIC_API_BASE_URL 與 F1_EXPECT_API_BASE_URL → F1_SMOKE_MODE=dev → test:e2e | dev process 啟動前；`http://localhost:5000/api/f1-smoke`，PASS；[證據](evidence/F1/dev-start-override.json) |
| built preview 預設：無覆寫 build → test:e2e | 無覆寫；`http://localhost:5000/api/v1`，最終 build PASS；[證據](evidence/F1/preview-default.json) |
| built preview 覆寫：沿用無覆寫 build，先設上述 URL 變數 → test:e2e | **只在 preview process 啟動前注入，沒有重建**；`http://localhost:5000/api/f1-smoke`，PASS；[證據](evidence/F1/preview-runtime-override.json) |
| 純靜態：URL=f1-smoke → generate；再以 URL=static-start-only、F1_EXPECT_API_BASE_URL=f1-smoke、F1_SMOKE_MODE=static → test:e2e | generate 建置值被保存；靜態 server 啟動變數無效，Browser 仍為 `http://localhost:5000/api/f1-smoke`，PASS；[證據](evidence/F1/static-build-value-retained.json) |

本版 `nuxt build` 的 `.output/public` 只有 client assets／favicon，沒有入口 HTML；built preview 的 renderer 在 runtime 注入 public config，**不代表 SSR 產品頁或 BFF**。純靜態 HTML 則需 generate，config 固定於建置時；改環境需要重新建置。未把 preview 的 runtime 行為套用到純靜態站。

每組 Browser 記錄包含實際 icon SVG data mask、非零尺寸、request／error 陣列或統計；Toast 狀態／關閉與 Dialog 關閉圖示可見，Dialog 關閉後焦點回到 trigger。非預期請求均為空，沒有遠端 Iconify／字體請求，也沒有同 origin 的 `/api/_nuxt_icon`。dev evidence 將大量本地模組 URL 摘為 requestCount／origin／樣本，保留原斷言與渲染結果；原始 report／trace 在 ignored output/playwright，未提交敏感 state 或憑證。

## 6. 已解決的失敗與保留限制

- 初次 unit 在 sandbox 的 Vite Windows 子程序得到 spawn EPERM；以工具權限流程允許已授權的本地自測後 PASS，沒有修改測試預期。
- 初次 typecheck 拒絕 close prop 內未定義的 aria-label，改用 Nuxt UI 繁中 locale 的內建可讀 label；tools tsc 起初缺 module augmentation，加入生成的 nuxt.node.d.ts 後 PASS。沒有 type cast／strict 放寬。
- dev 初次 CSR 等待 5 秒超時（FAIL）；trace 顯示 Vite 已連線、沒有 Browser error，後續冷編譯 case 約 10.2 秒完成。只將首次 CSR 載入可觀察等待改 30 秒，保留原 CSR／network／UI 斷言；dev 預設與覆寫均重跑 PASS。
- npm 有 transitive glob deprecated 與 6 筆未列 allowScripts 的提示；Nuxt prepare、Vitest、build、Browser 已成功，沒有使用強制安裝／全域允許 scripts。build 出現 @vue/shared DEP0155；generate 出現 cache-driver external resolution 警告但全部四個 route／static smoke 通過。保留警告，不將退出 0 寫成「完全無警告」。
- Google／部署延期。真實 Cookie／CORS 留 F3；F2 exact number 可行性 gate 未執行，不能用 LosslessNumber 隱式轉換或一般 JS number 保存精度。後端 R10 accepted、R11 結果待 Owner 確認仍只是快照來源時間點狀態。

## 7. Git 與停止點

本次單一目的提交包含 F1 骨架、lockfile、修訂計畫、本報告與自測證據、README／總計畫進度；生成目錄、node_modules、env 與原始 trace 排除，backend-ref 保持唯讀。提交前核對 staged diff，提交後核對 HEAD／工作樹；實際 SHA 與剩餘狀態由本次交付訊息確認，不推送。

**停止於「F1 開發完成，待 code review」。F1 未 accepted；不展開正式驗收或 F2。**

## 8. P3 補正追加紀錄（2026-10-11）

§1～7 與 `evidence/F1/` 保留原開發交付時的紀錄；[獨立 review](../review/F1_Code_Review_Report_20261011.md) 與其證據保持原樣。Owner 確認沒有阻擋缺陷，並授權局部補正 Dialog close icon 斷言。原 case 的 Dialog 圖示只檢查可見，未取得其 SVG mask／非零尺寸；這項缺口沒有由歷史 PASS 證明。

本次新增 Dialog 開啟後 close icon 的本地 SVG data mask 與寬、高大於 0 斷言，加入新 Browser attachment；保留原 network／操作／焦點與其餘檢查。lint／涵蓋 app、tests、工具組態的 typecheck／build／generate 與原五組 smoke 均 PASS，新證據另存，見 [F1 P3 補正報告](F1_P3_Correction_Report.md)。原目錄 npm ci EPERM 仍如 review 記錄，本次沒有重跑安裝、停止其他 process 或升級套件。

目前停止於 **F1 P3 補正完成，待局部複核**；F1 未 accepted，未開始正式驗收或 F2，未推送。
