# F7-R1～R4 局部修正報告

版本：1.0／2026-10-14（Asia/Taipei）。**F7-R1～R4 修正完成、待局部獨立複核。** Owner 採納四項 P2，直接授權局部修正、自測、受影響回歸與本機提交，不另設修正計畫核准關卡。以下是開發自測，不代填獨立複核／正式驗收 PASS。

## 1. 基準、來源與實際版本

接手 master／HEAD `0af30dc877fca68b1cd74fb5741c06e6456d89bd`，工作樹乾淨；該提交是 [F7 獨立 review](../review/F7_Independent_Code_Review_Report_20261014.md)，review 的產品基準為 `084020ae3c8a2f0db1e818cd8b555d5800de5099`。原 review、歷史報告、首次失敗、真實測資／證據原件均保留。

依 [AGENTS v1.1](../../AGENTS.md)、[round development Skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[核准 F7 計畫 v1.1](F7_Implementation_Plan.md) §2～4／§6／§8、[總計畫 v1.3](V1_Frontend_Implementation_Plan.md) F7／§7／§7.1／§8 執行。首次接手閱讀前端 00～07；主要受影響章節為 01 §7～10、02 v1.1 §1／4／7／10／12、03 §9、04 §4／7～12、05 §5／7、06 v1.1 §4／5／9～11、07 §6／9～10。後端語意依唯讀 [SNAPSHOT](../../backend-ref/SNAPSHOT.md)／01 FORM-03／04／08～10、03b §7～8、04 §7～8；沒有契約差異或規格修改。

本次實測 Node **24.21.0**／npm **11.19.0**；Nuxt **4.6.1**／Nuxt UI **4.11.3**／Vue **3.5.43**／Nitro **2.13.4**／Vite **8.3.4**／TypeScript **5.9.3**／Vitest **5.0.3**／Playwright **1.64.0**。Chromium **156.0.8078.4**、Chrome **156.0.8078.12**、Edge **155.0.4283.45**；依賴與 lockfile 未變。

後端快照與本次唯讀 checkout HEAD 均為 `7591633137c5a6f57c1fce8e1ba19ab394015880`，既存 untracked `SNAPSHOT.md` 未動；backend-ref manifest **108／108** 相符。歷史 F7 runtime 原件記錄 PID 29108／DLL ProductVersion `1.0.0+7591633137c5a6f57c1fce8e1ba19ab394015880`／assembly 綁定；**本次 runtime／health／Cookie／DB 未重查**，checkout SHA 不是本次執行版本證明。R10 accepted／R11 待 Owner 確認僅沿用快照狀態。

## 2. 四項修正與七個原失敗情境

| Finding | 實際修正 |
| --- | --- |
| **R4** | 管理 404／Lifecycle 衝突／`FORM_NOT_EDITABLE` 同步透過既有 bridge 撤銷 Editor permission，F6 controller 與 UI 都拒絕保存。取消取代／current GET 失敗保留 dirty 與基準；可靠 current GET 採用後才依身份／status 重建，背景候選不恢復資格。普通欄位驗證不撤銷保存。403 仍受共用 coordinator 的 Session denial 約束；移除重複且造成初始化循環的 management 閉包讀取，沒有放寬共用 gate。 |
| **R3** | FormReadPage 的同 Form `anyUnknown` 接入 DirtyScope／ActiveDirtyScope，涵蓋 SPA、beforeunload、Header 登出前確認。reload／資格核對取得當次 content permit，採用前重驗 permit／RequestScope／Session／write revision；合法採用本身造成的 revision 更新不反向否定採用。可靠採用、正式 current 404 或確認 204 清理才解除 unknown；Delete 失敗撤銷 permit，204 導航不重問。未新增跨頁恢復。 |
| **R2** | Clipboard controller 捕捉 URL、成功文案、Form ID、status、resource、Session 與 copy generation。完成前重驗頁面存活／資格／context；離頁、換 Form／Session、status／資格改變、新 copy 均使舊命令失效，舊 resolve／reject 無 toast／fallback。正常成功、完整 Closed URL 選取／手動複製及取消保留。 |
| **R1** | 本地 Publish issues 套入後沿用 focusField helper，逐筆尋找存在、可見且可編輯控制，略過 disabled／readonly／不存在位置；相同錯誤再次觸發仍聚焦。UForm `setErrors` 會略過未註冊控制，因此摘要合併完整 domain issues 與 UForm errors，保留結構錯誤。完整 saved baseline 驗證未變，不自動保存、零 Publish request。 |

修正前直接引用保留的 [review 五案 FAIL](../review/evidence/F7_20261014/browser-probes.json)／[R4 首次兩案 FAIL](../review/evidence/F7_20261014/browser-extra-probes-first.json)，未改寫舊結果。七案轉為 [固定 Browser 回歸](../../tests/e2e/f7-browser.spec.ts)，原預期保留；[verification summary](evidence/F7_R1_R4_Correction_20261014/verification-summary.json) 包含七案前後對照、實際版本與來源 hash。

| Reviewer 情境 | 修正前 | final 修正後 |
| --- | --- | --- |
| R1 saved Rating `{max:5}` 缺 min | **FAIL**：焦點留發布 BUTTON | **PASS**：重複兩次均聚焦 min、摘要完整、不補 min、零 POST／PATCH |
| R2 pending→SPA 首頁→resolve | **FAIL**：首頁舊 toast | **PASS**：無舊 toast／fallback |
| R2 pending→fixture 403 撤資格→reject | **FAIL**：出現舊 URL fallback | **PASS**：分享撤下後無晚回 fallback／toast |
| R3 Close unknown→SPA 離頁取消 | **FAIL**：0 次確認、直接離開 | **PASS**：1 次確認，取消保留 URL／unknown／核對入口 |
| R3 Close unknown→重新整理取消 | **FAIL**：0 次 beforeunload、重啟解鎖 | **PASS**：1 次 beforeunload，unknown 保留，me 仍僅 1 次 |
| R4 Visibility 404→取消丟棄→保存 | **FAIL**：仍送 Draft PATCH | **PASS**：dirty 保留、保存／定義編輯停用、零非法 PATCH；取消重讀無 GET、失敗不解鎖，可靠 Draft GET 後才可新修改／保存 |
| R4 Publish 409→候選／current GET 均 500 | **FAIL**：仍可編輯／PATCH | **PASS**：保存／定義編輯停用、零 PATCH；可靠 Published GET 採用後導唯讀頁 |

追加回歸：無控制首錯仍留完整三筆摘要並定位下一個可編輯控制；七種 Clipboard context／世代失效的 resolve／reject；Published／Closed Visibility unknown 取消／失敗／可靠採用；Close unknown 下 Delete 失敗撤 permit／204 清理；Closed Delete unknown→current 404；ActiveDirtyScope 登出取消零 request。未放寬斷言求 PASS。

## 3. 檢查與首次失敗證據

選 unit 驗資格／context／分流，真實瀏覽器驗焦點、Clipboard Promise、router／DirtyScope／beforeunload。本次 Browser **API 全部攔截合成 fixture**；F7／F6 built、Chrome／Edge 使用 final fresh production build，F6 scope 兩案使用專用 dev harness，不能稱後端整合。

| 實際命令／方法 | 結果 |
| --- | --- |
| `npm run lint`／`npm run typecheck`／`npm run build` | **PASS**；Nuxt＋tools strict。保留原 DEP0155／NO_COLOR 工具診斷 |
| `npm run test:unit -- tests/unit/f7-form-management.spec.ts tests/unit/f6-editor-page.spec.ts tests/unit/f5-definition-request.spec.ts tests/unit/f5-config-omission.spec.ts tests/unit/scoped-state.spec.ts tests/unit/f4-form-read.spec.ts tests/unit/api-client.spec.ts tests/unit/f5-editor.spec.ts tests/unit/exact-number-gate.spec.ts tests/unit/common-adapters.spec.ts` | **304／304 PASS，10 files**；289 原案＋15 必要修正案，非完整 suite |
| `F7_MODE=built`／`F7_RUN_LABEL=r1-r4-correction-final`；`npm run test:e2e -- --config=playwright.f7.config.ts` | **38／38 PASS**；原 24 案＋14 局部回歸，含 reviewer 七案；final 16:28:28～16:29:02 台北時間 |
| `F6_MODE=built`；F6 config grep `F6-B01\|F6-B02/B03\|F6-B05\|F6-B06\|F6-B07\|F6-B08\|F6-B09`，另名 reporter／output | **15 PASS／2 skipped**：保存、dirty、Auth、unknown、晚回；兩個測試路由為 harness-only |
| `F6_MODE=fixture`；F6 config grep `same-component ID update\|pending old GET` | **2／2 PASS**，補上述 skip；歷史輸出未覆寫 |
| `npx vue-tsc --noEmit -p tests/fixtures/f6/browser/tsconfig.json` | **PASS**，harness strict |
| F7 built `F7_CHANNEL=chrome`／`msedge`，grep `F7-R1 reviewer\|F7-R2 reviewer Clipboard resolve\|F7-R2 status change` | 各 **3／3 PASS**，代表性 smoke，非完整矩陣 |
| diff／文件／hash／去敏／歷史保護 | **PASS**；歷史 review manifest **51／51**、開發 **70／70**、backend-ref **108／108** 相符 |

完整命令、逐案結果與 diagnostics attachments 見 [final reporter](evidence/F7_R1_R4_Correction_20261014/browser/final-results.json)／[證據索引](evidence/F7_R1_R4_Correction_20261014/artifact-manifest.json)。final 9 份產品／測試 source hash、build digest 可核對。沿用精確 request／diagnostics 配對，沒有新增 allowances 放行無關失敗；三張圖片均為合成資料、已目視，不含秘密。沒有 storageState／trace、Cookie／Token 或實際密碼。

本次新增失敗也保留：unit 首次 sandbox `spawn EPERM` 是 startup failure、0 案執行，本機重跑才 PASS；lint 的 void generic、strict 的 readonly fixture／discriminated config 型別錯誤已修正，日誌保留。首輪 built **19 PASS／19 FAIL** 揭露本次 watcher 讀取未初始化 management 的產品問題及三個導航同步問題；改用共用 coordinator gate、等待原生 Dialog 事件後，第二輪 **37 PASS／1 FAIL**。剩餘三筆摘要變兩筆是 UForm 略過未註冊控制，已修正產品，三筆斷言未改，final **38／38 PASS**。evidence 收集器首輪未處理葉節點 suites，修正後核對 PASS，不算產品測試結果。全部原件另名保留在 ignored `output/f7/correction-20261014/`／`output/playwright/f7/` 及去敏交付；首輪 build digest 保留，但無完整不可變中間 source snapshot，不把中間 PASS 當 final 覆蓋。

## 4. 真實證據、未驗項目、Git 與停止點

按本次授權沿用適用的 [歷史 F7 真實 L01～L06／政策矩陣／角色證據](F7_Development_Report.md) §3～4／[原件索引](evidence/F7_20261014/artifact-manifest.json)，承接 [review §5](../review/F7_Independent_Code_Review_Report_20261014.md) 的適用界線。保存／發布分離、政策持久化、Close、三態 Delete／204／404、Count 去重僅支持當時已執行情境；**本次 fresh 真實整合 NOT RUN**，無新帳號／Form／Response、真實寫入／Delete／SQL／DB reset／volume 操作。歷史 15 份 F7 專用 Form／6 次 soft-delete／9 份保留與 F6 測資未動，未作再次業務讀回。

既有 **BLOCKED**：受控真實 invalid／expired／disabled Auth、Server commit 故障；**UNCONFIRMED**：DB identity／migration；**NOT RUN**：實機 touch／100 星／軟鍵盤／safe-area、完整歷史 ≥11／21 列表／特殊狀態、Firefox／WebKit、npm ci／audit、不受影響完整 suite、F8 Submit／Latest UI、F9 Statistics 內容／真實權限矩陣、正式 AI／人工驗收。fixture／局部 smoke 不解除這些缺口，R10／R11 歷史限制保留。

交付僅 9 份受影響產品／tests、本報告／新證據、README／總計畫追加進度。原 review／歷史報告／首次 FAIL／正式規格／AGENTS／Skills／依賴／backend-ref／正式驗收文件保留。核對完整局部 diff、文件與證據後，作單一目的本機提交：`fix: resolve F7 management review findings R1-R4`。本報告隨該提交交付，完整 SHA／剩餘 Git 狀態見 Git log 與提交後訊息，避免自引用 SHA；測試 preview／harness 已關閉，既有後端不動。

**停於「F7-R1～R4 修正完成、待局部獨立複核」。** 正式驗收延後、accepted 不變、既有缺口保留；不宣告 code review 通過，不推送、不展開 F8。
