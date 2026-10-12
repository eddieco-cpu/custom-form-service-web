# F2 R1～R3 局部修正報告

日期：2026-10-12（Asia/Taipei）。接手／parent：`e0d06e589d5eb3b65f0057bdd7fb8b1694625d76`（master）。依 Owner 明確授權修正 [獨立 review](../review/F2_Code_Review_Report_20261011.md) 的 F2-R1／R2／R3，沒有重寫原 review 或將其 FAIL 改成 PASS。

**修正完成、待局部複核。F1 P3 局部複核通過；F1／F2 仍未 accepted，正式驗收延後，不開始 F3。**

## 1. 修正範圍

來源：AGENTS v1.1／development skill、核准 F2 計畫 v1.0／總計畫 v1.3 的 F2、§7／§7.1；前端 02 v1.1 §10、03 v1.0 §4、04 v1.0 §9～12；後端 Part A v1.0 §9（GET 無業務寫入副作用）。唯讀後端快照沿 2026-10-11／`7591633137c5a6f57c1fce8e1ba19ab394015880`，manifest 108／108 相符；本次未查 live API／SHA，未改規格／契約／套件。

| Finding | 實際修正與回歸 |
| --- | --- |
| R1 | WriteCoordinator 按 resource key 保存待核對政策，獨立於 pending lease；Delta 未知會阻擋同 Form 的各保存／lifecycle operation。通知相關 state 更新按鈕；只有可靠 current read 後的成功 adoption callback 才清共用限制。失敗、取消、stale 採用、其他操作成功不解鎖；不同 Form、允許的 Visibility、核對與離頁仍可用。composable 換 key／卸載解除訂閱。unit 驗 timeout／500／contract 三種 unknown、另一個保存與發布、跨 Form／其他政策；Browser 驗保存／發布禁用、失敗／取消保留、成功採用後可發布及離頁取消 |
| R2 | isUnknownWrite 必須收到明確 read／write 語意；presentation 用完整情境政策表，Latest 為 read＋Dialog。network／timeout／500／malformed Latest 保持 read-failure，答案與手動 retry 保留，Auth／disabled／RESPONSE_NOT_FOUND 分流不變；真正 write 仍 unknown。unit 覆蓋四種故障及 Auth；Browser 覆蓋 network／500／malformed 的保留與成功手動重試、Auth／404 |
| R3 | 先 await dialog 的 dismiss／accept Promise，再 await fixture 的該次核對完成計數與 outcome；上一流程完成後才安裝下一個 handler／click。取消、讀取失敗、採用分別可觀察。沒有固定 sleep，沒有以原本成立的 disabled／輸入值斷言代替同步；原預期與 ×／關閉兩條路徑保留 |

可靠讀取／adoption 的 domain API 仍由 caller 提供 current predicate 與採用 callback；真實 Form／Answer mapper、Auth session 與端點流程留既定輪次。本次 Browser 只驗隔離 harness 的實際共用程式＋合成 raw JSON，不能稱真實 API／DB 整合通過。

## 2. 必要開發自測

環境：Node 24.21.0／npm 11.19.0、Nuxt 4.6.1／UI 4.11.3、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0／Chromium 156.0.8078.4；lossless-json 4.3.1。沿用現有安裝，版本／lockfile 未改。

| 命令／案例 | 本次實際結果 |
| --- | --- |
| `npm run test:unit -- tests/unit/scoped-state.spec.ts tests/unit/api-client.spec.ts --reporter=json --outputFile=…/unit-first.json` | **PASS 46／46**：受影響 2 files，含新增 R1 4／R2 6 個回歸；其餘未受影響 unit 不重跑、不代填本次 PASS |
| `npm run test:e2e -- --config=playwright.f2.config.ts --reporter=list,json --output=…/browser-first-artifacts` | **PASS 完整 F2 10／10**，0 skipped／flaky；JSON reporter 指向本輪獨立目錄。保留原 6 cases（含精確數值 11 合法／4 拒絕 token、真實 30000ms timeout），新增 4 個 Latest cases；R1／R3 加入原 pending／核對 case |
| `npm run lint`／`npm run typecheck`／`npm run build` | **PASS**，退出 0；Nuxt strict＋tools tsc 未放寬。產品產物無 fixture markers |
| `node node_modules/nuxt/bin/nuxt.mjs typecheck tests/fixtures/f2/browser` | **PASS**，fixture 自身 strict 檢查 |
| diff／原件 hash／backend manifest／去敏檢查 | **PASS**；原 review 兩檔及原 F2 evidence hash 未變，backend 108 筆相符；不提交 raw trace／Cookie／Token／storageState／產物 |
| npm ci／install／audit／generate、F1 smoke 重跑、真實 API／Cookie／DB、正式 AI／人工驗收 | **NOT RUN**；無套件或 F1 case 變更。本機既有 npm ci unlink EPERM 未解除；audit 追蹤仍依原 review，不擅自 fix／升級 |

本輪上述首輪執行即 PASS，沒有新增測試失敗。原開發首次失敗、獨立 review 的完整 Browser **5 PASS／1 FAIL** 與 R3 單案例 **0 PASS／1 FAIL**、R1／R2 診斷均保留；它們是歷史重現，不是本次產品正確性 PASS。原 log／trace 不覆寫；本次原件在 ignored `output/playwright/f2-correction-20261012/`，命令／案例及 SHA256 見 [去敏摘要](evidence/F2_R1_R3_20261012/verification-summary.json)。既有 DEP0155、Playwright NO_COLOR／FORCE_COLOR 提示保留。

## 3. Git 與停止點

單一目的提交：`fix: address F2 cross-operation gates and read error review`。本報告納入該提交，實際 SHA 見 Git log／交付訊息；parent 如首頁。只提交 R1～R3 程式／回歸、精簡報告／新證據及必要進度追加。接手已有的 `docs/review/F2_Code_Review_Report_20261011.md`、`docs/review/evidence/F2_Independent_Verification_20261011.json` 兩份未追蹤檔維持原樣、不納入修正提交；提交後保留它們為剩餘 Git 狀態。

F1 P3 局部複核通過依 Owner 本次指示及原獨立 review 記錄，沒有代填正式驗收。**修正完成、待局部複核；F1／F2 均未 accepted，正式驗收延後，F3 未開始。** 未推送／PR／部署。

## 4. Owner 結案與引用更正（2026-10-12）

Owner 已確認 [R1～R3 獨立局部複核](../review/F2_Correction_ReReview_Report_20261012.md) 通過並同意結案。依非阻擋 F2-R4 將上文 Part A 版本更正為 v1.0；只有文件引用更正，不為此重跑測試。原修正時的停止點及歷史證據保留。接續 [F2 補充測試計畫](../test-plan/F2_Supplemental_Test_Plan.md) 依本次授權直接執行；F1／F2 仍未 accepted，正式驗收延後。
