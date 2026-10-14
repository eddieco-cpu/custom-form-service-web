# F7-R1～R4 局部獨立複核

日期：2026-10-14（Asia/Taipei）。**R1、R2、R4 CLOSED；R3 原兩個失敗情境已修正，但新增一項 P2，暫不結案。F7 code review 尚未通過。** 本次以 reviewer 原七個情境獨立重跑，七案均 PASS；另外在 fresh built 產品重現兩次成功登出未導航，支持同一項新 finding。產品與既有測試維持唯讀。

## 1. 新 finding

### F7-R3-N1／P2：保留成功登出清理後的單次導航資格

**變更位置：** [FormReadPage.vue](../../app/components/forms/FormReadPage.vue) 第 7～9 行；關聯呼叫 [AppHeader.vue](../../app/components/AppHeader.vue) 第 32～43 行、[useFormRead.ts](../../app/composables/useFormRead.ts) 第 14 行及 [DirtyScope](../../app/domain/dirty-scope.ts) 第 8～20 行。

本次新增唯讀 Form 的 DirtyScope／ActiveDirtyScope 登記後，Header 登出也改走 `navigateWithPermit`。但 POST logout 204 後，Header 先 `session.logout()`；同步 Session watch 清除 Form data，頁面的 content revision 隨之增加，DirtyScope.update 清除原 permit。接著 navigateWithPermit 綁定導航失敗，Header 沒有執行 replace，停在原 Form URL。這也發生在沒有 unknown 的乾淨 Published 頁；修正前該頁未登記 ActiveDirtyScope，成功登出走直接 router.replace。

**獨立重現（全部為合成攔截）：**

| fresh built 情境 | 實際結果 | 應有結果 |
| --- | --- | --- |
| Published Close POST 中斷造成 unknown，關閉錯誤後用 Header 登出並接受確認 | 確認 1 次、logout 204 request 1 次、Header 未登入；仍在 `/forms/00000000-0000-4000-8000-000000000050`，顯示「需要有效登入身分」，login Email 控制不存在 | 清 Session 並 replace `/login`，不重問 |
| 乾淨 Published 頁 Header 登出 | 確認 0 次、logout 204 request 1 次、Header 未登入；同樣停在原 Form URL | 清 Session 並 replace `/login` |

見 [unknown 登出原件](evidence/F7_R1_R4_ReReview_20261014/supplemental-browser.json)、[乾淨頁原件](evidence/F7_R1_R4_ReReview_20261014/supplemental-controls.json) 及 [畫面](evidence/F7_R1_R4_ReReview_20261014/accepted-logout-unknown.png)。兩案 browser errors／未宣告 diagnostic 均為零；補驗腳本完成蒐證並按失敗結果退出，兩個行為結果均明列 **FAIL**，沒有改寫為 PASS。

**影響與修正方向：** 前端 [04 §6／§8](../specs/04-auth-state-and-error-handling.md) 與 [01 §10](../specs/01-pages-routing-and-access.md) 要求成功登出 replace login 且不再詢問。當前使用者已登出，卻停在保護資源空頁；不宣稱仍持有後端權限。應處理「本次已授權登出所造成的 Session／內容清理」與後續單次成功導航的銜接，同時保留外部 Session／content 變更、RequestScope 與寫入 revision 的失效隔離，不能用永久繞過 guard 修正。Published 的 unknown／clean 兩種實測成立；Closed 共用同一元件，靜態可適用，但未追加 Closed 成功登出 Browser。

## 2. 原 findings 的逐項結案判斷

原 [集中 review](F7_Independent_Code_Review_Report_20261014.md)、首次 FAIL、[修正報告](../implementation/F7_R1_R4_Correction_Report.md) 與所有歷史證據保留。以下結論來自實際 diff、call sites、原七案獨立診斷與必要回歸，不由開發報告的 PASS 直接推定。

| Finding | 結論 | 獨立核對 |
| --- | --- | --- |
| **R4 保存資格** | **CLOSED** | management 404／Lifecycle 409 透過 deny bridge 同步撤銷 Editor permission；UI readonly／保存 disabled 及 controller permission gate 一致。原 404 dirty 取消後零 Draft PATCH、原 Publish 409＋候選／current GET 500 後零 PATCH。候選 GET 不採用／不恢復資格；可靠 current 採用才依當前身分／status 重建。受影響 unit／F7 Browser 覆蓋可靠 Draft／Published 採用、取消／失敗重讀及普通驗證後可修正保存；共用 coordinator denial 仍約束 403／Session，移除重複閉包未放寬該 gate。 |
| **R3 唯讀 unknown** | **原缺陷修正；NOT CLOSED** | 原 SPA 取消與 beforeunload 取消各一次確認，URL／unknown／鎖保留，重新整理取消後 me 仍只有一次。F7 Browser 覆蓋 Header 登出取消零 request、Delete 失敗撤 permit、204 清理 replace 不重問，以及 Published／Closed unknown 可靠採用。合法 GET 採用引起 revision 更新的七項隔離診斷全通過。**但成功 Header logout 有新 F7-R3-N1，故不能結案。** |
| **R2 Clipboard** | **CLOSED** | 原離頁後 resolve 無舊 toast／fallback；原 403 撤資格後 reject 無 fallback。controller 捕捉 ID／status／resource／Session／URL／文案與 copy generation，完成時重驗 canManage；watch 與 dispose／reset 使舊 resolve／reject 失效。unit／built 回歸包含換 ID／Session、status／資格、新 copy、正常成功及 Closed 完整 URL fallback／選取／手動複製；三 browser channel smoke 通過。 |
| **R1 本地定位** | **CLOSED** | 原 saved Rating `{max:5}` 缺 min，首次／第二次均聚焦 min，min 保持空白、summary 1、零保存／Publish request。額外診斷用無控制結構錯誤＋readonly min，兩次均跳到可編輯 max，完整三筆摘要無重複。明確修正值後 fixture 保存清除摘要，再次 Publish 只剩一筆結構錯誤、無舊 bounds，零 Publish request。此 fixture 保存是補驗 stale errors 的明確操作，未代替本地發布驗證。 |

[原七案獨立原件](evidence/F7_R1_R4_ReReview_20261014/original-seven-rerun.json)：R1 1 案、R2 2 案、R3 2 案、R4 2 案，**7／7 PASS**。使用原 reviewer 的合成資料與觸發流程，預期改為缺陷消失所需行為；一次性腳本另存 ignored output，未修改或僅重用新增 repo 測試的結論。

[實際 composable 的七項隔離診斷](evidence/F7_R1_R4_ReReview_20261014/adoption-isolation.json) 使用 Vue scoped renderer、實際 useFormDetail／useFormRead／RequestScope／AuthSession／WriteCoordinator／DirtyScope，只有 Nuxt globals 與 fetch 為合成注入：自身 current 採用使 revision 更新仍可完成核對；外部 content、跨寫入 revision、取代的 RequestScope、第二段 GET 前後外部 Session，以及 GET me 開始後外部寫入都拒絕舊結果；明確 me 身分採用後開新 Form ticket，non-owner 可靠現況只解除待核對，不恢復 Owner 資格。**7／7 PASS**；這些結果不涵蓋 logout 成功導航。

## 3. 範圍、依據與版本

- repo `C:\Users\user\Desktop\custom-form-service-web`／master；接手乾淨。修正基準 **`0af30dc877fca68b1cd74fb5741c06e6456d89bd`**，修正交付／全部產品驗證來源 **`daaa5dd13d4bac756c35943351b1ae04933a3b12`**。局部 diff 共 54 檔，含七個產品 source、兩個 tests 與報告／證據／進度；完整 diff 及周邊 Auth／dirty／GET／管理／Editor call sites 已核對。
- 依最新 [AGENTS v1.1](../../AGENTS.md)、[review skill](C:/Users/user/.codex/skills/.system/review-agent/SKILL.md) 與 repo development skill 的 review 階段界線。review skill 要求 defect-first、完整 diff、禁止委派；其「Do not modify files, create commits」由 Owner 本次明確要求保存報告／證據及本機提交優先。本次沒有代理委派、產品／測試／依賴修改。
- 核准 [F7 計畫 v1.1](../implementation/F7_Implementation_Plan.md) §2～4／§6／§8、[總計畫 v1.3](../implementation/V1_Frontend_Implementation_Plan.md) F7／§7／§7.1／§8；前端 00～07 的既有閱讀保留，本次重讀受影響 04 §4～12、05 §5／7、01 路由／登出及 02 Editor／保存行為。UForm setErrors 的實際 library 行為與 domain issues 合併另核對。
- 正式後端依唯讀 [SNAPSHOT](../../backend-ref/SNAPSHOT.md)，SHA **`7591633137c5a6f57c1fce8e1ba19ab394015880`**；本次重核 03b §8 Lifecycle，Auth／Form／錯誤與交易契約沿用原 review 的正式 00／01／02／03a／03b／03c／04／05 核對。backend-ref manifest **108／108**；另置 checkout 同 SHA、既存 untracked SNAPSHOT.md 未動。沒有來源衝突，沒有新增 API 或產品規則。
- Node **24.21.0**／npm **11.19.0**；Nuxt **4.6.1**／Nuxt UI **4.11.3**／Vue **3.5.43**／Nitro **2.13.4**／Vite **8.3.4**／TypeScript **5.9.3**／Vitest **5.0.3**／Playwright **1.64.0**。實際 Chromium **156.0.8078.4**、Chrome **156.0.8078.12**、Edge **155.0.4283.45**。本次 runtime assembly／health／Cookie／DB 未重查，checkout SHA 不代表 fresh live integration。

## 4. 本次獨立執行

依實際改動選擇工程檢查、管理／Editor／精度／scope unit、完整 F7 built 及受影響 F6 built／fixture；沒有另設測試計畫 gate。所有 Browser API 均攔截合成 fixture，使用真實本機 browser binary；built 都使用本次 npm build 的 `.output`，兩個 F6 scope 案使用專用 dev harness。沒有真實 API 寫入／Delete。

| 命令／方法 | 結果 | 原件 |
| --- | --- | --- |
| `npm run lint` | PASS | [lint](evidence/F7_R1_R4_ReReview_20261014/logs/lint.log) |
| `npm run typecheck`（Nuxt＋tools strict） | PASS | [typecheck](evidence/F7_R1_R4_ReReview_20261014/logs/typecheck.log) |
| `npm run build` | PASS；DEP0155 warning 保留 | [build](evidence/F7_R1_R4_ReReview_20261014/logs/build.log) |
| `npm run test:unit --` 10 個受影響檔案，完整命令見 summary | **304／304 PASS** | [unit](evidence/F7_R1_R4_ReReview_20261014/logs/unit.log) |
| `F7_MODE=built F7_RUN_LABEL=r1-r4-independent-rereview npm run test:e2e -- --config=playwright.f7.config.ts` | **38／38 PASS** | [reporter](evidence/F7_R1_R4_ReReview_20261014/browser/built-r1-r4-independent-rereview-results.json) |
| F6 built B01／B02-B03／B05～B09 | **15 PASS／2 harness-only skipped** | [reporter](evidence/F7_R1_R4_ReReview_20261014/browser/rereview-f6-built-results.json) |
| F6 fixture same-component ID／pending old GET | **2／2 PASS** | [reporter](evidence/F7_R1_R4_ReReview_20261014/browser/rereview-f6-scope-results.json) |
| `npx vue-tsc --noEmit -p tests/fixtures/f6/browser/tsconfig.json` | PASS（成功無 stdout） | [log](evidence/F7_R1_R4_ReReview_20261014/logs/harness-typecheck.log) |
| Chrome／Edge built：R1、R2 resolve／status 三案 | 各 **3／3 PASS** | [Chrome](evidence/F7_R1_R4_ReReview_20261014/browser/built-chrome-r1-r4-independent-smoke-results.json)／[Edge](evidence/F7_R1_R4_ReReview_20261014/browser/built-msedge-r1-r4-independent-smoke-results.json) |
| reviewer 原七案＋額外摘要一案＋登出兩案 | **8 PASS／2 FAIL**；兩 FAIL 支持 N1 | [七案](evidence/F7_R1_R4_ReReview_20261014/original-seven-rerun.json)／[unknown 登出](evidence/F7_R1_R4_ReReview_20261014/supplemental-browser.json)／[補驗](evidence/F7_R1_R4_ReReview_20261014/supplemental-controls.json) |
| 實際 composable 採用／隔離七案 | **7／7 PASS** | [原件](evidence/F7_R1_R4_ReReview_20261014/adoption-isolation.json) |

完整命令、case 結果、版本、診斷配對及 source hashes 見 [verification summary](evidence/F7_R1_R4_ReReview_20261014/verification-summary.json)。預期 403／404／409／500／requestfailed 按實際 method／URL／status 或 reason／次數配對，未宣告錯誤零；Node experimental transform-types 診斷 warning 保留。必要子程序使用授權本機執行，沒有以 sandbox 執行失敗冒稱產品 FAIL。

## 5. 修正斷言、原件與 source／build 對應

[獨立稽核](evidence/F7_R1_R4_ReReview_20261014/correction-evidence-audit.json)：修正九個來源 normalized-LF hash 全部對應交付 commit／工作樹；修正 manifest **41／41**，可取得本機 raw 原件 **36／36** 相符；原 review **51／51**、開發 **70／70**、backend **108／108** 保持一致。本次 build 前，修正最終 `.output` **157／157** 與交付 digest 相符。

修正第一次 Browser **19 PASS／19 FAIL**、第二次 **37 PASS／1 FAIL**、最終 **38 PASS** 的 reporter／log 均保留。首輪包含初始化 TDZ 與 native Dialog 同步問題；第二輪結構摘要實際 2、應為 3 的失敗沒有把預期降為 2，而由產品合併完整 domain issues 修復。原 B11 只追加應有 dirty 確認接受，沒有刪除必要斷言；原 reviewer 七案與14個補驗保留，沒有放寬 core expectations 求 PASS。中間版本沒有完整不可變 source 快照，故只將其結果記為歷史修正過程，不宣稱在最終 source 全量執行；first build digest 與 final source／build 證據則存在。

本次重新 npm build 後不改產品、不再 build，所有 built Browser／reviewer probes 使用該產物。交付九個來源仍與 commit 相符；[fresh build digest](evidence/F7_R1_R4_ReReview_20261014/fresh-build-digest.json) 記錄 157 個檔案。與開發最終 build 的 51 個 public 檔案相比，49 個 content assets 相符，兩個差異是 fresh build 的 latest.json 與 build-ID meta：舊 `1c0ddf68-aa55-48c0-9e99-750f835c98a1` 更新為 `118cf849-6d39-4621-82f1-cdf240a8c706`。沒有冒稱兩次完整 build byte-identical。

新證據存本報告旁 `evidence/F7_R1_R4_ReReview_20261014/`，一次性腳本以 `.mjs.txt` 保存；本機 raw 在 ignored `output/f7/re-review-20261014/`／另名 Playwright output，未覆寫歷史。log 交付僅正規化 LF／行尾空白／EOF 空行，原件保留。修正39個文字檔及本次交付已與兩份私有合成密碼原值比對，無匹配、無 JWT／秘密值欄位、無 storageState／trace。PNG 已檢視為合成畫面；[artifact manifest](evidence/F7_R1_R4_ReReview_20261014/artifact-manifest.json) 記錄 normalized-LF text／PNG bytes hash。[交付檢查](evidence/F7_R1_R4_ReReview_20261014/closeout-check.json) 另驗證來源／build、文件連結、去敏及去除新增進度後歷史 README／總計畫完全相符。

## 6. 未驗證事項與交付停止點

真實整合僅沿用適用的歷史 F7 Lifecycle／Visibility／Count／Delete／Cookie 與資格原件及原 review 稽核；本次沒有真實業務 API、寫入／Delete／新帳號／新測資／DB 操作，不將歷史結果當成修正最終版 fresh live PASS。原專用15個 Form／六份授權 soft-delete／九份保留與歷史 F6 資料記錄不變。

真實 invalid／expired／disabled Token 與 Server commit 故障維持 **BLOCKED**；DB identity／migration **UNCONFIRMED**；實機觸控／軟鍵盤、正式 AI／人工驗收 **NOT RUN**。npm ci／audit 等既有未執行項目保留。其他原集中 review 結論沿用，沒有擴張為 F8／F9 驗收；N1 尚未修正。

本次只新增此報告／去敏證據、README 最新進度與總計畫 §9.28，單一目的本機文件提交；完整 SHA／提交後 Git 狀態見交付訊息與 Git log（不為自我引用再改寫 commit）。產品、tests、契約、依賴、backend-ref、原 review／報告／首次 FAIL 均不動。

**停於「F7-R1～R4 局部獨立複核完成、待 Owner 確認」。** 正式驗收延後、accepted 與既有缺口不變，不推送、不展開 F8。
