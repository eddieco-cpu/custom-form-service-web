# F7-R3-N1 局部修正報告

版本：1.0／2026-10-14（Asia/Taipei）。**F7-R3-N1 修正完成、待局部獨立複核。** Owner 採納 N1／P2，直接授權局部修正、必要自測與本機提交，不另設修正計畫核准關卡。R1／R2／R4 維持 CLOSED；本報告不代填 N1 獨立複核或 F7 code review PASS。

## 1. 基準、來源與版本

接手 master／HEAD **`6d9c843a012cb0a24e194f1de2020ab294554f1b`**，工作樹乾淨；為指定 [reviewer 文件提交](../review/F7_R1_R4_Correction_ReReview_Report_20261014.md)。其產品來源為 `daaa5dd13d4bac756c35943351b1ae04933a3b12`。原 review、R1～R4 修正／複核報告、N1 兩個 FAIL、歷史真實證據與測資全部保留。

依 [AGENTS v1.1](../../AGENTS.md)、[round development Skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[F7 核准計畫 v1.1](F7_Implementation_Plan.md) §2～3／§6／§8、[總計畫 v1.3](V1_Frontend_Implementation_Plan.md) F7／§7／§7.1／§8 執行；前次完整來源閱讀保留，本次重讀前端 04 §4～8／§11～12、01 §10、05 §7，後端唯讀 03b §4.3 Logout。沒有新增 API／產品規則或資料恢復機制。

本次 Node **24.21.0**／npm **11.19.0**；Nuxt **4.6.1**／Nuxt UI **4.11.3**／Vue **3.5.43**／Nitro **2.13.4**／Vite **8.3.4**／TypeScript **5.9.3**／Vitest **5.0.3**／Playwright **1.64.0**／Chromium **156.0.8078.4**。依賴、lockfile 未變。後端 [SNAPSHOT](../../backend-ref/SNAPSHOT.md) 與本次唯讀 checkout HEAD 均為 `7591633137c5a6f57c1fce8e1ba19ab394015880`，既存 untracked `SNAPSHOT.md` 未動；manifest **108／108**。本次 runtime assembly／health／Cookie／DB **NOT RUN**，不以 checkout SHA 當成執行版本證明；歷史 F7 runtime／R10／R11 狀態限制沿用。

## 2. 局部修正與隔離界線

- [Header](../../app/components/AppHeader.vue) 採用 logout 結果前，同時核對原 RequestTicket、dirty permit 與當頁捕捉的 Form write revision。外部 content／Session／scope／寫入變更使舊結果失效，不能清新 Session 或執行舊導航。
- [DirtyScope](../../app/domain/dirty-scope.ts) 新增完成操作的單次導航銜接：先確認並消耗原 permit，再執行同步的成功清理，依清理後 revision 建立僅綁定該次 `/login` transition 的 permit。原 permit 不能重用，失敗不產生新 permit。
- [useDirtyScope](../../app/composables/useDirtyScope.ts) 讓 Header 在受控同步 callback 中 `session.logout()`；清理後核對預期 Session revision＋1、anonymous／null User、原 path，再開始新的 Header RequestTicket。新的導航 guard 仍核對 Form write revision 與新 ticket；外部 content 更新會取消新 permit，原 transition 被拒絕，不重新詢問以放行舊操作。導航結束、拒絕、錯誤或卸載都清授權；一般 guard／Delete 流程維持既有語意。
- [唯讀 Form](../../app/components/forms/FormReadPage.vue) 與 [Editor](../../app/composables/useFormEditor.ts) 的 dirty bridge 只補同 Form `captureRead()`，不解除 unknown、不改 baseline。Session 引起的自身 Form data 清理可以完成這次導航；取消登出、失敗或 pending 外部變更不執行成功清理。

共修改五個產品檔、[scope unit](../../tests/unit/scoped-state.spec.ts) 與 [F7 Browser](../../tests/e2e/f7-browser.spec.ts)。沒有修改 R1／R2／R4 的產品修正、原 F3／F6 測試、業務契約或正式驗收文件。

## 3. 修正前後與必要回歸

修正前沿用 [unknown 登出 FAIL](../review/evidence/F7_R1_R4_ReReview_20261014/supplemental-browser.json)／[clean Published FAIL](../review/evidence/F7_R1_R4_ReReview_20261014/supplemental-controls.json)：logout 204 已清 Header Session，但仍停原 Form URL，沒有登入 Email 控制。Closed 修正前未追加 Browser，保留 **NOT RUN**，不將靜態共用推論寫成實測。

| 必要行為 | 本次結果與斷言 |
| --- | --- |
| Published／Closed clean logout | **各 PASS**：0 次確認、1 次無 body logout／204；未登入 Header、Email 可見，exact `/login`、history.length 不增加，me 仍僅 1 次 |
| Published／Closed Visibility unknown 接受登出 | **各 PASS**：一次原生確認，204 後清理並 replace `/login`，不重問，unknown 管理入口消失 |
| Reviewer 原始 Published Close unknown 登出 | **PASS**：POST Close 中斷後接受一次確認，1 次 logout，replace `/login`，無額外 me；單案追加，原預期保留 |
| Published／Closed unknown 取消登出 | **各 PASS**：0 次 logout request，原 URL／登入 Header／unknown 鎖與核對入口保留 |
| logout 明確 fixture HTTP 400／network 失敗 | **各 PASS**：保留 Session／unknown／URL，錯誤關閉後下一次普通離頁仍需確認，沒有殘留丟棄授權；F3 補驗另涵蓋 HTTP 500 unknown／手動重試 |
| pending logout 的外部 content／write／Session／SPA 離頁 | **各 PASS**：可靠 Form 重讀改 content、未更動 DTO 的政策 400 寫入推進 revision、Count 401 改 Session、離頁四種安排，使 late 204 不清當前 Session／不跳 `/login`／不抹掉新 Dialog |
| RequestScope 與導航授權邊界 | **unit PASS**：舊 request／finally 不覆蓋新 scope；自身清理可銜接，外部 content／Session／RequestScope／write revision 使導航失效，失效不再次確認放行；原 permit 不能用第二次，完成清授權後下一次 dirty 導航仍詢問 |
| 原 R3 | **PASS**：SPA／beforeunload 取消仍保留 unknown；可靠 current GET 採用／正式 404 才解除；Delete 失敗撤 permit、204 清理後單次 replace 不重問 |

完整案例、診斷配對與前後結果見 [verification summary](evidence/F7_R3_N1_Correction_20261014/verification-summary.json)。所有本次 Browser 業務 API **攔截合成 fixture**；HTTP／network 情境證明前端處理，不能代稱正式後端故障、Cookie 清除或 DB 整合 PASS。

## 4. 命令、證據與適用範圍

| 實際命令／方法 | 結果／選用理由 |
| --- | --- |
| `npm run lint`／`npm run typecheck`／`npm run build` | **PASS**；Nuxt＋tools strict、fresh production build。沿用 DEP0155／NO_COLOR 工具 warning |
| `npm run test:unit -- tests/unit/scoped-state.spec.ts tests/unit/f3-auth.spec.ts tests/unit/f6-editor-page.spec.ts tests/unit/f7-form-management.spec.ts tests/unit/f4-form-read.spec.ts` | **167／167 PASS，5 files**；新增 7 個授權／隔離案例，非全部 unit suite |
| `F7_MODE=built F7_RUN_LABEL=n1-correction-first npm run test:e2e -- --config=playwright.f7.config.ts` | **50／50 PASS**；原 38 案＋12 N1 案，原 R3／已 CLOSED 三項一併保持回歸 |
| 同一 build，`F7_RUN_LABEL=n1-reviewer-close`，grep `F7-R3-N1 reviewer Close` | **1／1 PASS**；追加 reviewer 原 Close unknown 情境後只跑此案，不無理由重跑其餘 50 案。最終測試檔包含追加；產品／build 在全部 runs 之間未變，不稱一次完整 51 案 run |
| `npm run test:e2e -- --config=output/f7/n1-correction-20261014/playwright.f3-built.config.ts --grep 'F3-B06\|F3-B08\|F3-B10\|F3-B14'` | **4／4 PASS**：Profile dirty 登出取消／一次 permit、停用、Logout 500 unknown／重試、pending 晚回。使用 fresh built，原 F3 tests 未改；一次性 config 副本隨證據保存 |
| `F6_MODE=built`，F6 config grep `F6-B06\|F6-B07\|F6-B08\|F6-B09`，另名 reporter／output | **11 PASS／2 harness-only skipped**：dirty、Auth、unknown、衝突／late response |
| `F6_MODE=fixture`，F6 config grep `same-component ID update\|pending old GET` | **2／2 PASS**，補上述 skip；明列 dev harness，不冒稱 built |
| `npx vue-tsc --noEmit -p tests/fixtures/f6/browser/tsconfig.json` | **PASS**，受影響 harness strict |
| diff／來源／歷史／去敏核對 | **PASS**：七份 final source hash／Git blob、fresh build digest、原 review 51／51、開發 70／70、R1～R4 修正 41／41、複核 41／41、backend-ref 108／108 相符 |

本次產品測試首次執行均 PASS；沒有將計畫當成執行或修改既有失敗預期。evidence 收集器首輪誤以 repo root 解讀另置 F3 config 的 reporter 相對路徑而 ENOENT；改讀實際已完成原件後核對 PASS，原收集失敗／成功 log 保留，未重跑或變更產品。原 N1 FAIL 與各歷史首次 FAIL 均未覆寫。去敏 [證據索引](evidence/F7_R3_N1_Correction_20261014/artifact-manifest.json) 包含 reporter／logs／一次性 config／收集器／source／build digest；raw 在 ignored `output/f7/n1-correction-20261014/`、另名 Playwright 目錄。登入頁圖片已目視，欄位為空；無實際密碼／Cookie／Token、storageState／trace。

產品提交 `bfae7a7e767dff8762732535fb1f87bb09fb6b8c` 的 staged diff check 曾指出新 log 的行尾空白／EOF 空行，但命令未中止而繼續提交；此格式檢查 **FAIL** 保留在 `logs/commit-whitespace-first.log`。後續只正規化交付 log 的 LF／行尾空白／EOF 空行、更新收集器／manifest 與本說明，raw 原件與原提交不改寫；重新核對後追加文件提交。產品、測試、build 未變，無須重跑產品測試；最後 staged diff check **PASS** 另留原件。

## 5. 歷史整合、缺口、Git 與停止點

按本次授權沿用適用的歷史 F3／F6／F7 正常整合證據及 [原 F7 開發報告](F7_Development_Report.md)／[review 適用界線](../review/F7_R1_R4_Correction_ReReview_Report_20261014.md)。本次真實業務 API／寫入／Delete／新帳號／Form／Response／SQL／DB reset／volume 操作均 **NOT RUN**；既存專用測資保留，沒有再次業務讀回。

既有真實 invalid／expired／disabled 與 Server commit 故障維持 **BLOCKED**；DB identity／migration **UNCONFIRMED**。fresh 真實整合、實機觸控／100 星／軟鍵盤／safe-area、完整歷史列表／特殊狀態、額外 Chrome／Edge／Firefox／WebKit、npm ci／audit、不受影響完整 suite、F8／F9、正式 AI／人工驗收 **NOT RUN**。本次 scope／Browser fixture 不解除既有缺口；R1／R2／R4 CLOSED 保持，R3 不代宣告結案。

交付七個受影響產品／測試、新報告／去敏證據、README／總計畫追加進度；原報告／review／失敗／契約／依賴／backend-ref／正式驗收文件保留。檢查 diff、文件與去敏 hash 後作單一目的本機提交 `fix: preserve authorized logout navigation after cleanup`；本報告在該提交內，完整 SHA／剩餘 Git 狀態見 Git log／提交後訊息，避免自引用。測試自行結束 preview／harness，既有後端不動。

**停於「F7-R3-N1 修正完成、待局部獨立複核」。** 正式驗收延後、accepted 與既有缺口不變；不推送、不展開 F8。
