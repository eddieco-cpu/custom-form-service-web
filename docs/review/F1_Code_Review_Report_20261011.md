# F1 Independent Code Review Report

日期：2026-10-11（Asia/Taipei）。本次僅獨立 code review 與必要工程驗證；沒有修改產品／既有測試、準備或執行正式驗收、設定 F1 accepted 或開始 F2。

## 1. 結論與版本

未發現阻擋目前 F1 工程骨架使用的功能缺陷；有 **1 項 P3 測試斷言缺口**，詳見 §2。現有 Dialog 圖示實際正常，但既有 smoke 對它的驗證不足。這個結論限指定提交及本輪工程範圍，不代表產品／人工驗收或 Round accepted。

| 項目 | 實際基準 |
| --- | --- |
| 審查區間 | `b485d3e9c3c20457d1373a0fd6fd054a51891595` → `317b25f55549b30673a02e15254358b86da4652d` |
| 原工作目錄 | `C:\Users\user\Desktop\custom-form-service-web`；master，接手時乾淨，HEAD 等於審查 head |
| 最新協作規範 | AGENTS.md v1.1；repo-local development skill 的 review 階段界線 |
| 前端來源 | 完整閱讀 00～07；02／06 v1.1，其餘 v1.0；總計畫 v1.3（含 F1、§7／§7.1）；核准 F1 計畫 v1.1；開發報告 v1.0 |
| 後端參考 | `backend-ref/SNAPSHOT.md`；唯讀快照 SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`；108 筆 manifest hash 全部相符 |
| Runtime | 實際 Node `24.21.0`／npm `11.19.0`；Chromium `156.0.8078.4` |
| lockfile | v3；SHA256 `245333FCDDFEF57088AE2F13D909A89E06235BD5A93102021C0DBE15FBFF3432`，與原版本證據一致 |

審查涵蓋實際 32 檔 diff、全部新增產品／工具／測試原始碼、package.json／lockfile、README／排除規則，以及 `docs/implementation/evidence/F1/` 五組 JSON、版本 JSON 與手機截圖。沒有只依開發報告採信 PASS。

## 2. Finding

### [P3] Dialog 關閉圖示只有元素可見斷言，空白圖示仍可通過

- **位置**：[tests/e2e/foundation-smoke.spec.ts:53](../../tests/e2e/foundation-smoke.spec.ts#L53)；相關證據收集位於同檔 37～45 行。
- **原因**：`iconStyles` 在 Dialog 開啟前收集，只涵蓋頁面按鈕、Toast 狀態及 Toast 關閉圖示。Dialog 開啟後只對圖示呼叫 `toBeVisible()`，沒有檢查實際 SVG mask；有尺寸的空白 span 也符合該斷言。五組原 evidence 均只有這三個 mask，不能單靠它們證明 Dialog 關閉圖示實際渲染。
- **具體影響**：未來 Dialog 圖示的 mask／樣式損壞時，這個 smoke 仍可能 PASS，無法完整保障核准 F1 計畫 §4.2 的「不能靠空圖示求 PASS」。**目前沒有發現圖示缺失**；本次另行讀取 Dialog 的 computed style，確實得到本地 SVG data mask。
- **獨立驗證**：在正常静態產物的 Browser runtime 暫時將 Dialog 圖示設為 `mask-image:none`、透明背景，保留元素尺寸。原第 53 行同等可見斷言仍 PASS，關閉與焦點回復仍 PASS。這是記憶體中的診斷，沒有修改產品或測試檔案，也不是宣稱整個 suite 在故障注入下重跑。
- **修正建議**：在 Dialog 開啟後，對其 close icon 增加本地 SVG mask 與非零尺寸斷言，將這筆結果附入 Browser evidence；保留現有 network／focus 斷言即可，無需擴大產品測試矩陣。
- **證據**：[獨立驗證 JSON 的 dialogRuntimeDiagnostic](evidence/F1_Independent_Verification_20261011.json)。嚴重度為低：影響回歸偵測與證據完整性，現行 F1 UI 正常。

## 3. 五項重點核對

| 重點 | 已核對結果與依據 |
| --- | --- |
| F1 scope／CSR／Layout／Feedback | `ssr:false`；UApp＋繁中 locale＋NuxtLayout／NuxtPage，沒有 KeepAlive。外層 1280px、16px padding、system font、亮色及藍色主操作均符合本輪。唯一頁面是工程就緒頁；Toast 文案明示本地測試。沒有 F2 client／adapter／dirty／錯誤分流，也沒有 F3 Auth plugin／middleware／產品 Header／登入／Profile。F1 本地 UModal 不承擔未實作的產品 Dialog 規則。 |
| scripts／lockfile／strict／收集範圍 | 乾淨指定提交副本 `npm ci` 成功，postinstall 確實生成型別及 43 個圖示。lint、Nuxt references 型別檢查及 tools tsc 全部成功。app generated config 的 strict 及 Vue／app include 生效；CLI 使用 vue-tsc build references。tools `--listFilesOnly` 實際列入三份 TS config、ESLint MJS、unit／E2E specs、static MJS；strict／checkJs 均開啟。Vitest 只收 1 個 unit fixture，Playwright `--list` 只收 1 個 E2E case，沒有交叉收集。 |
| Browser smoke／URL／圖示 | 五組既有 smoke 均獨立 PASS。初始 HTML 無工程頁 heading、JS 載入後出現；Layout computed CSS、Toast／Dialog 操作、Dialog 關閉後焦點、1280／390px overflow、console error／pageerror、外部及本地 icon API request 斷言有效。沒有 request 攔截或模擬 API 成功。Dialog mask 缺口如 §2，已額外證明當前實際正常。 |
| 靜態 server／產物／排除 | server 只 readFile `.output/public`，bind localhost；沒有 fetch、proxy、runtime config 注入或 API handlers。獨立探測 `/api/v1/users/me` 為本地 404，編碼的 Windows traversal 為 403，favicon 200。build 產物只有 client assets／favicon 加 Nitro renderer；generate 才有入口 HTML。provider=none 不註冊 Nuxt Icon server handler，生成 server collection 為空。Git 排除依賴、生成產物、trace／report、本機 env 及 backend-ref，保留 `.env.example`；tracked 檔案沒有排除項產物或憑證。 |
| 歷史修正與警告 | 最終原碼沒有錯誤 aria-label prop、type cast 或 strict 放寬；Nuxt UI 繁中 locale 提供關閉 label；tools module augmentation 確實載入。dev 冷載入 30 秒等待只作用於首個 heading，保留其他斷言；本次 dev 為 8.3／11.0 秒，均在期限內。警告與限制見 §5。 |

43 個 client bundle 圖示是從本次生成 module 的 callback 實際枚舉；info、x、circle-check、loader-circle 均存在。loading 圖示本次確認 bundle 收入，未另觸發 loading Toast；不能把它寫成獨立 Browser 動畫驗證。

## 4. 獨立執行紀錄

原工作目錄的 `npm ci --no-audit --no-fund` 在 unlink `@unrs/resolver-binding-win32-x64-msvc` native module 時 **FAIL（EPERM）**；提升工具權限後仍相同。未停止其他 Node／Codex process。原因未確定，不能把原目錄安裝記成 PASS，也不能據此斷言 lockfile 壞掉。

為隔離環境因素，以 `git archive 317b25f` 在 ignored `output/playwright/review/workspace/` 展開完整 tracked 原件，沒有 patch 原碼或測試，以下主要驗證在該乾淨副本執行。其 `npm ci` 成功，因此 lockfile 的乾淨安裝可重現。原工作目錄以 `npm install --no-audit --no-fund --ignore-scripts` 補回部分移除的既有依賴；lockfile hash／tracked 原件不變，恢復後 lint、typecheck、unit 亦均 PASS。原目錄仍有 npm 無法清除的 ignored native module 暫存，沒有冒稱已解決 OS 的 unlink 問題。

| 命令／檢查 | 本次結果 |
| --- | --- |
| 乾淨副本 `npm ci --no-audit --no-fund` | PASS，982 packages；postinstall nuxt prepare；無 engine／peer resolution failure |
| `npm run lint` | PASS（乾淨副本及原目錄恢復後） |
| `npm run typecheck` | PASS（乾淨副本及原目錄恢復後）；Nuxt checker＋tools tsc 退出 0 |
| tools `tsc --listFilesOnly`／app `tsc --showConfig`／checker 原碼核對 | PASS；範圍與 strict 如 §3。未再植入原報告的負向 probe，以遵守不改產品／測試的授權 |
| `npm run test:unit` | PASS，1 file／1 test（乾淨副本及原目錄恢復後）；工具 fixture，非產品 schema |
| `npm run test:e2e -- --list` | PASS，Chromium 1 test／1 file |
| `npm run build` | PASS，Nuxt 4.6.1／Vite 8.3.4／Vue 3.5.43／Nitro 2.13.4，node-server CSR renderer |
| URL 注入 `npm run generate` | PASS，static preset；/、index.html、200.html、404.html 四個 route；沒有 server-render 工程正文 |
| 既有 `npm run test:e2e` 的五組條件 | 全部 PASS，各 1 test；下表記 Browser 讀值 |
| Dialog runtime 圖示／空白圖示斷言診斷、靜態 server read-only 探測 | PASS（診斷有效）；結果及其意義見 §2／§3 |
| lockfile hash、backend-ref manifest、Git 排除與指定區間 `git diff --check` | PASS |

Browser 執行以 CLI reporter／output 選項另存 review 原始輸出，沒有覆蓋原始 `output/playwright/results.json` 或已提交的 F1 證據。所有套件選型、直接版本與原證據一致，沒有新增業務依賴。

| 模式與注入 | Browser 實際 URL | Requests／errors／unexpected |
| --- | --- | --- |
| 預設 build → preview 預設 | `http://localhost:5000/api/v1` | 18／0／0 |
| 沿用同一預設 build，僅 preview process 注入 | `http://localhost:5000/api/f1-smoke` | 18／0／0 |
| dev 預設新 process | `http://localhost:5000/api/v1` | 882／0／0 |
| dev 啟動前注入，新 process | `http://localhost:5000/api/f1-smoke` | 882／0／0 |
| generate 注入 f1-smoke；static server 啟動另注入 static-start-only | `http://localhost:5000/api/f1-smoke` | 18／0／0 |

所有 Browser requests 的 origin 均為 `http://localhost:3000`。dev 的 882 與原證據 881 筆差異是本機模組載入數，沒有新增外部 origin／業務 API；不以數量完全相同作 PASS 條件。重建的 client assets 名稱與原 preview/static 證據一致。純靜態啟動不能覆寫建置 URL 的結論已獨立重現。

本次去敏證據：[F1_Independent_Verification_20261011.json](evidence/F1_Independent_Verification_20261011.json)，保留五組 Browser attachment 摘要、圖示 mask、runtime 診斷及版本／hash。完整 runner JSON 與截圖留在 ignored review 副本的 `output/playwright/`，各路徑見該 JSON；沒有 Cookie、Token、storageState 或敏感測資。

## 5. 警告、驗證限制與停止點

- **重現的既有警告**：transitive glob deprecated、六筆 install scripts 未納入 allowScripts、build 的 @vue/shared DEP0155、generate 的 cache-driver external resolution。未強制允許 scripts／忽略 engines；本次 prepare、unit、CSR build、generate 與 Browser 均成功，沒有發現 F1 runtime 缺陷。這只能支持本輪已使用的功能，不能證明排序／後续產品路徑也已通過。
- **本次額外警告**：generate 的 plugin callback timings，以及 Playwright webServer 的 NO_COLOR／FORCE_COLOR；屬工具效能／顏色提示。webServer 把顏色 warning 前綴標成 ERROR，但 process 退出與 Browser error 陣列均正常，未當成產品錯誤或靜默忽略測試失敗。
- **未獨立重現的歷史事項**：原開發首次 Vite spawn EPERM、最初 5 秒 dev timeout、最初錯誤 close prop／module augmentation 的失败版本，以及型別負向植入 probe，均只保留歷史紀錄；本次驗證最終原碼與最終工具鏈，不把歷史紀錄改寫成此次執行證據。
- **NOT RUN／範圍外**：後端 live Git／DLL／健康檢查、真實 API、Cookie／CORS、DB、產品帳號／表單流程、F2 exact number gate、實機多瀏覽器及正式 AI／人工驗收。Backend R10 accepted／R11 待確認仍只引用快照來源狀態。本輪無相關業務實作，沒有擴大驗收矩陣。

本次啟動的 smoke／診斷 server 已結束，localhost:3000 無本次殘留 listener；沒有操作既有後端。原工作目錄 `.output` 仍是原預設 node-server build；generate 只在 ignored review 副本執行。

沒有建立 commit／push。交付後 HEAD 仍為 `317b25f55549b30673a02e15254358b86da4652d`；Git 只新增本審查報告及去敏 evidence，產品、既有測試、規格、進度及原 F1 evidence 均不變。停止於 **獨立 review 已交付，待 Owner 後續指示**；F1 未 accepted。
