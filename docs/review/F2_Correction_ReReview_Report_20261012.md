# F2 R1～R3 獨立局部複核

日期：2026-10-12（Asia/Taipei）。修正提交 `73348ab233c9dcdafa9ee04429e7c7e9088a03e3`，基準 `e0d06e589d5eb3b65f0057bdd7fb8b1694625d76`。

**R1／R2／R3 均結案；沒有新增阻擋 finding，新增一項非阻擋 P3 文件引用錯誤。F1／F2 保持未 accepted，正式驗收延後，F3 未開始。** 此為局部 code review 與開發自測，沒有設計或執行正式驗收，也沒有修改產品／測試。

依 [原獨立 review](F2_Code_Review_Report_20261011.md)、[修正報告](../implementation/F2_Review_Correction_Report.md) 及實際 13 檔 diff 複核。重讀 AGENTS v1.1／development skill review 邊界、核准 F2 計畫 v1.0 §4.3／§5、總計畫 v1.3 F2／§7／§7.1；受影響規格為前端 02 v1.1 §10、03 v1.0 §4、04 v1.0 §9～12，後端 Part A **v1.0** §9。後端沿唯讀快照 `7591633137c5a6f57c1fce8e1ba19ab394015880`（2026-10-11 匯出）；未確認 live 版本或重跑後端驗收。

## 三項結案證據

| 項目 | 局部結論、位置與實際證據 |
| --- | --- |
| **R1 CLOSED** | [operation-state.ts:29](../../app/domain/operation-state.ts#L29) 將 Delta 待核對旗標保存在同 Form coordinator，獨立於 pending lease，涵蓋另一保存／lifecycle；[第 62 行](../../app/domain/operation-state.ts#L62) 在採用前後驗 current，且 pending 不採用。unit 驗 timeout／500／malformed unknown、跨 operation／跨 Form、取消及採用前後 stale，均不誤解鎖；允許的 Visibility 成功不清 Delta gate。Browser 在取消及 read 500 後保存／發布仍 disabled，接受採用後 enabled 並實際送出一次發布。fixture [第 67 行](../../tests/fixtures/f2/browser/app/pages/scope/[id].vue#L67) 先確認 scope current 與 GET success，再經 dirty 丟棄確認採用；失敗不呼叫解除。獨立診斷補查 dispose／重建同 Form 仍阻擋發布（send 次數 0）、同 Form 其他寫入 pending 時不呼叫 adopt、adopt 拋錯仍鎖定、成功採用後解除。 |
| **R2 CLOSED** | [error-presentation.ts:8](../../app/domain/error-presentation.ts#L8) 完整 context policy 表明定 Latest 為 read＋Dialog；[operation-state.ts:36](../../app/domain/operation-state.ts#L36) 的 unknown 判定要求 write 語意。unit 驗 Latest network／timeout／500／malformed 都是 read-failure，真正 action 仍 unknown-result；Auth／disabled 分流不變。Browser 驗 network／500／malformed 保留答案、無自動 retry、手動第二次 GET 成功，Auth／RESPONSE_NOT_FOUND 仍保留輸入與適當 Dialog。原真實 30000ms write timeout／network case 維持 PASS。 |
| **R3 CLOSED** | [f2-common.spec.ts:5](../../tests/e2e/f2-common.spec.ts#L5) 先等待 dialog 的 accept／dismiss Promise，再等完成計數與 adopted／not-adopted outcome；下一個 handler／操作在此後開始。read-failure 亦等待專屬完成 outcome，沒有固定 sleep。第 62／73 行取消／接受保留輸入及解鎖斷言，第 60／81 行保留「關閉」及 ×（Close）兩路徑與 close-count 1／2；Escape／backdrop 不關閉也保留。完整 Browser 首次獨立重跑 10／10、0 flaky／skipped，未再出現重複處理 dialog。 |

可靠 read、完整資料採用及 current predicate 仍是 caller 的責任；F2 的 domain callback 與合成 harness 已驗證約定邊界，不代表後續真實 Form／Answer mapper 或 Auth 已完成。composable 換 key／卸載使用 dispose 解除訂閱、舊寫入 revision 防護保留；create／multiple 的重複風險與這兩個 unit 檔中的既有回歸均通過。本次檢查範圍內沒有新增產品回歸。

## 新增 findings

- **阻擋：無。**
- **F2-R4 [P3，非阻擋]**：[修正報告第 9 行](../implementation/F2_Review_Correction_Report.md#L9) 記為「後端 Part A v1.1 §9」，但實際 [03a 文件第 5 行](../../backend-ref/docs/specs/03a-v1-api-contract-common.md#L5) 為 **v1.0**，核准 F2 計畫也引用 v1.0。§9 的 GET 無業務寫入副作用規則一致；只影響來源版本記錄，建議將報告引用改為 v1.0。此次未直接修正原報告。

## 獨立執行與證據

環境：Node 24.21.0／npm 11.19.0、Nuxt 4.6.1／UI 4.11.3、TypeScript 5.9.3、Vitest 5.0.3、Playwright 1.64.0／Chromium 156.0.8078.4、lossless-json 4.3.1；package／lockfile 沒有差異。沿既有安裝，沒有 npm ci／install。

| 本次命令／檢查 | 結果 |
| --- | --- |
| `npm run test:unit -- tests/unit/scoped-state.spec.ts tests/unit/api-client.spec.ts`（JSON reporter） | **PASS 46／46**，2 files（13＋33），0 failed |
| `npm run test:e2e -- --config=playwright.f2.config.ts`（list／JSON reporter） | **PASS 完整 F2 10／10**，0 skipped／flaky；保留數值、dirty／redirect／unload、scope／session／loading 與真正 30000ms write timeout 回歸 |
| `npm run lint`／`npm run typecheck`／`npm run build` | **PASS**，各 exit 0；Nuxt＋tools strict 保留 |
| `node node_modules/nuxt/bin/nuxt.mjs typecheck tests/fixtures/f2/browser` | **PASS**，exit 0 |
| 一次性 Vite source 診斷（ignored output） | **PASS**，實際共用模組＋合成結果；未改測試 |
| 產品 `.output` 搜尋 6 個 fixture markers；harness 的 `@f2` alias／import 靜態核對 | **PASS**，產品 markers 0；harness 載入實際共用程式 |
| 修正命令／raw JSON／歷史 review 原件 hash、diff check、來源變更與端口檢查 | **PASS**，所列 hash 全符合；無產品／測試工作樹差異，3000 無殘留 listener |

去敏結果、完整命令／exit／版本／各 Browser case／SHA256 見 [獨立證據摘要](evidence/F2_Correction_Independent_Verification_20261012.json)。本次 raw log／JSON／診斷在 ignored `output/playwright/f2-rereview-20261012/`；沒有覆寫原 review 或修正自測證據。build 的既有 DEP0155 與 Browser 的 NO_COLOR／FORCE_COLOR 提示仍存在，未造成測試失敗。

## 未驗證與停止點

- 真實 API／Cookie／CORS／DB 保存讀回、Auth 導航／session 完整串接、真實 Form／Answer mapper 與基準採用 **NOT RUN**；Browser 是 native fetch＋合成 raw JSON／攔截，不能稱後端整合 PASS。
- Latest 的 native 30000ms timeout Browser **NOT RUN**（本次 timeout 分類由 unit 驗證）；未受影響的其他 unit、F1 smoke／generate 沒有重跑，不代填此次 PASS。正式 AI／人工驗收未設計／未執行。
- npm ci／install／audit **NOT RUN**；無依賴差異，不為本次修改重裝。原目錄 unlink EPERM 尚未解除；原 review 的 audit 風險及受影響依賴仍沿原記錄，本次 PASS 不代表這些事項已解決。

依「剛剛的 commit 先幫我做」，已先將上次兩份 review 文件提交為 `8e07df5cd53f7a1345014b1d632d89f89efe65f6`，沒有推送。獨立測試 HEAD 為該提交，相對審查目標 `73348ab` 只多上次 review 文件，產品／測試相同。本次只新增這份局部複核報告與證據，未提交；其餘工作樹乾淨，未改進度或 accepted。

**停止於 R1～R3 局部複核完成；新增 P3 文件事項待後續處理。F1／F2 均未 accepted，正式驗收延後，不開始 F3。**
