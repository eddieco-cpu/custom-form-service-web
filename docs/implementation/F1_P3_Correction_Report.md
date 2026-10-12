# F1 P3 Dialog 圖示斷言補正報告

日期：2026-10-11（Asia/Taipei）。狀態：**F1 P3 補正完成，待局部複核**；F1 未 accepted。

## 1. 授權、來源與變更

Owner 確認獨立 review 沒有阻擋缺陷，授權局部修正 P3、必要開發自測與單一目的提交。接手為 `master`／`613ced62008f459c5e74afc7489c6f843968cae2`，工作樹乾淨；F1 開發提交為 `317b25f55549b30673a02e15254358b86da4652d`。

依 [AGENTS v1.1](../../AGENTS.md)、[development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫 v1.3 §5 F1／§7／§7.1](V1_Frontend_Implementation_Plan.md)、[F1 計畫 v1.1 §4.1～4.2](F1_Implementation_Plan.md)、[05 v1.0 §7](../specs/05-ui-and-interaction.md)、[06 v1.1 §11](../specs/06-technical-architecture.md) 與 [獨立 review §2 P3](../review/F1_Code_Review_Report_20261011.md) 執行。沒有改產品規格、API 契約、app、組態或套件。

只修改 `tests/e2e/foundation-smoke.spec.ts`：Dialog 開啟後，從關閉按鈕內的 Lucide icon 取得 computed `maskImage` 和 bounding rectangle，保留可見斷言，新增 mask 包含 `data:image/svg+xml`、寬與高皆大於 0 的斷言；將實測值以 `dialogCloseIconStyle` 加入既有 Browser attachment。這會拒絕 review 指出的「元素可見但 mask 為 none」情況。

既有 CSR／URL、Toast SVG mask、network／console／pageerror、開關操作、Dialog 關閉後焦點回復與桌機／手機寬度斷言均保留；仍是原單一 case、原五組執行條件，沒有擴大產品測試矩陣。

## 2. 版本與必要自測

本次實際使用 Node `24.21.0`／npm `11.19.0`、Nuxt `4.6.1`／Nuxt UI `4.11.3`、Vite `8.3.4`／Vue `3.5.43`／Nitro `2.13.4`、Playwright `1.64.0`／Chromium `156.0.8078.4`。依賴與 lockfile 未變；lockfile SHA256：`245333FCDDFEF57088AE2F13D909A89E06235BD5A93102021C0DBE15FBFF3432`。其他版本沿用 [F1 版本證據](evidence/F1/versions.json)；本次檢查另見 [補正摘要](evidence/F1_P3_20261011/verification-summary.json)。

| 命令／檢查 | 本次實際結果 |
| --- | --- |
| `npm run lint` | PASS，退出 0 |
| `npm run typecheck` | PASS，退出 0；實際執行 Nuxt app checker 與 strict tools tsc，涵蓋 app、tests、工具組態 |
| 無 URL 覆寫 `npm run build` | PASS，退出 0；供兩組 built preview 使用同一產物 |
| `NUXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/f1-smoke` → `npm run generate` | PASS，退出 0；CSR static 產物，四個 route |
| 五組 `npm run test:e2e` | 各 PASS，1 case／1 Chromium worker；新斷言與原操作／焦點／網路斷言均實際執行 |
| static smoke 後無覆寫 `npm run build` | PASS，退出 0；恢復本機預設 node-server CSR 產物 |
| evidence JSON、文件連結／控制字元、`git diff --check`、diff scope／歷史證據 | PASS；僅 P3 測試補正、新證據與進度紀錄 |
| backend-ref manifest | PASS，108 筆 SHA256 相符；唯讀完整性檢查，未重跑後端驗收 |
| `npm ci`／install／unit | NOT RUN；本次只改 Browser 斷言，未影響純資料轉換或 unit fixture，沿用依賴，無須重跑安裝 |
| 真實 API／Cookie／CORS、後端 health／tests／DB、正式 AI／人工驗收、F2／部署／push | NOT RUN；不屬本次授權 |

SSR 仍關閉、無 BFF；Google Auth／部署延期。後端只引用唯讀快照 2026-10-11／`7591633137c5a6f57c1fce8e1ba19ab394015880`：R10 accepted、R11 結果待 Owner 確認。沒有新後端 Owner 確認來源或 live 版本驗證。

## 3. 五組模式、操作與新證據

每組使用新 PowerShell process，未設定的變數不從上一組延續。共同在執行前設定 `PLAYWRIGHT_JSON_OUTPUT_FILE` 為該組的絕對 `output/playwright/f1-p3/<case>/results.json`，以 `npm run test:e2e -- --output=output/playwright/f1-p3/<case>/artifacts` 執行；只將輸出隔離，不改 runner config。Playwright 管理自身啟動的 localhost:3000 server，未重用其他服務。

| 模式／環境變數注入階段與步驟 | Browser URL／新 close icon／結果與證據 |
| --- | --- |
| 預設 build → preview；無 URL／mode 覆寫 | `http://localhost:5000/api/v1`；SVG data mask，19.4412 × 19.4413 px；PASS，[preview-default](evidence/F1_P3_20261011/preview-default.json) |
| 沿用同一預設 build，preview 啟動前設 `NUXT_PUBLIC_API_BASE_URL`、`F1_EXPECT_API_BASE_URL` 為 f1-smoke，`F1_INJECTION_STAGE=preview-process-start (default build)`；不重建 | `http://localhost:5000/api/f1-smoke`；SVG data mask，19.5773 × 19.5772 px；PASS，[preview-runtime-override](evidence/F1_P3_20261011/preview-runtime-override.json) |
| `F1_SMOKE_MODE=dev` → smoke；無 URL 覆寫 | `http://localhost:5000/api/v1`；SVG data mask，19.4415 × 19.4416 px；PASS，[dev-default](evidence/F1_P3_20261011/dev-default.json) |
| dev 啟動前設 mode=dev、上述兩個 URL 變數為 f1-smoke、`F1_INJECTION_STAGE=dev-process-start` → smoke | `http://localhost:5000/api/f1-smoke`；SVG data mask，19.4414 × 19.4414 px；PASS，[dev-start-override](evidence/F1_P3_20261011/dev-start-override.json) |
| generate 建置前 URL=f1-smoke；static server 啟動前另設 URL=`http://localhost:5000/api/static-start-only`、expected URL=f1-smoke、mode=static、`F1_INJECTION_STAGE=generate-build-then-static-server-start` → smoke | `http://localhost:5000/api/f1-smoke`；SVG data mask，19.4415 × 19.4415 px；PASS，[static-build-value-retained](evidence/F1_P3_20261011/static-build-value-retained.json) |

f1-smoke 的完整值為 `http://localhost:5000/api/f1-smoke`。built preview 可以在 process 啟動時注入 public config；純靜態產物保留 generate 建置值，啟動靜態 server 的環境變數不能覆寫已生成 HTML。本次沒有把 preview 的 runtime 行為套用到純靜態產物。

五組 close icon 均有本地 SVG data mask、非零寬與高；Dialog 關閉後焦點回到 trigger。尺寸在 Dialog 開啟動畫期間讀取，數值略有差異，只要求非零。dev 各 882 requests，preview／static 各 18；所有 request origins 均為 `http://localhost:3000`，errors／unexpectedRequests 均為空，沒有圖示 API endpoint 或非必要外部請求。URL 只顯示／核對，沒有向後端發業務請求，不宣稱真實 API 整合 PASS。

新 JSON 保留 mask 原值、尺寸、操作所屬已通過 case、Browser／起始時間／duration／request 統計與原始 runner SHA256。大量 dev 本地模組 URL 摘為 origin／樣本；完整 attachment、runner report 與截圖另存 ignored `output/playwright/f1-p3/`，未收集 Cookie／Token／storageState。

## 4. 歷史、警告、Git 與停止點

原 [F1 開發證據](evidence/F1/versions.json)、[review 報告](../review/F1_Code_Review_Report_20261011.md) 與 [review evidence](../review/evidence/F1_Independent_Verification_20261011.json) 未改寫。原開發 case 只對 Dialog close icon 斷言可見；其 mask／尺寸缺口是本次新增檢查，不能將舊證據改稱已證明此新斷言。原始 `output/playwright/results.json` 在補正前後 SHA256 同為 `CDB5058CA287B7EAE24BCFA3B6D56830F6710ABC35F83AF83D479480C7F4393C`；原 review output 也未作本次 runner 目標。

**原目錄 npm ci 的 EPERM 仍保留**：review §4 記錄原目錄 unlink `@unrs/resolver-binding-win32-x64-msvc` 失敗、乾淨副本 npm ci 成功及原目錄依賴恢復。本次未重跑 npm ci、清理 native remnants、停止其他 process 或將該歷史 FAIL 改為 PASS。

本次仍觀察到 build 的 `@vue/shared DEP0155`、generate 的 cache-driver external resolution、編譯 callback timing 提示及 Playwright `NO_COLOR`／`FORCE_COLOR` 警告。安裝期 glob／allowScripts 提示僅保留歷史，本次沒有安裝。未升級套件或擴大處理警告；命令退出 0 與 Browser errors 為空不代表沒有工具警告。

本次 smoke 管理的 server 已結束，3000 無殘留 listener；沒有啟停既有後端、修改其設定或 DB。單一目的提交包含測試斷言、新補正報告／證據及必要進度；原開發報告只追加補正章節，歷史章節保留。提交前後核對 Git，實際 SHA 與剩餘狀態見交付訊息／Git log；不推送。

**停止於「F1 P3 補正完成，待局部複核」。補正自測 PASS 不代填局部複核、正式驗收或 F1 accepted；不展開 F2。**

## 5. 局部複核通過紀錄（2026-10-12）

以上保留 P3 補正交付時的停止點。後續 [獨立 review §5](../review/F2_Code_Review_Report_20261011.md#5-f1-p3-局部複核) 記錄 P3 局部複核通過；Owner 本次明確指示沿此結果記錄。**F1 P3 局部複核通過，F1 仍未 accepted，正式驗收延後。** 本次未重跑 F1 自測或改寫既有證據。
