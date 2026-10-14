# F6-R1／F6-R2 局部獨立複核

日期：2026-10-14（Asia/Taipei）。**F6-R1／F6-R2 結案，F6 code review 通過；無新增 findings。** 此結論由本次局部複核與沿用的其餘 F6 review 結論共同支持。正式驗收延後、accepted 不變；無真實 API 寫入、不推送、不展開 F7。

## 1. 基準、範圍與來源

- Owner 指定修正基準 `0aff8bb754f077d5df90209a123e024e5b5a83a3`；目標及本次所有產品／測試檢查的 HEAD 為 `8e858455b6ce191b6a1607d3c03eda0dd2cea5f4`。repo `C:\Users\user\Desktop\custom-form-service-web`、branch `master`，接手乾淨。
- 實際 diff 共 20 檔：兩個產品元件、五個測試／harness／helper 檔，以及報告／進度／去敏證據。產品差異限於 [FormRenderer](../../app/components/forms/FormRenderer.vue) 的 instance＋Question key 識別及 [RatingStars](../../app/components/questions/RatingStars.vue) 的識別／顯示 label 分離。保存／Auth／Delta controller、API service、正式契約、依賴與後端未變。
- 依 [AGENTS](../../AGENTS.md) v1.1、[development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[核准 F6 計畫 v1.1](../implementation/F6_Implementation_Plan.md) §3.2／§4／§8、[總計畫 v1.3](../implementation/V1_Frontend_Implementation_Plan.md) F6／§7／§7.1／§8.1。重讀前端 02 §11、03 §5～7、05 §5／§10、06 §7／§11；Question title／排序依唯讀後端 01 FORM-02／FORM-06／QST，沒有增加 title 唯一規則。
- 閱讀 [原 review](F6_Independent_Code_Review_Report_20261013.md)、[局部修正報告](../implementation/F6_R1_R2_Correction_Report.md)、實際斷言、修正前後 reporter／attachment／圖片。保留原 review、失敗與歷史 live，不把歷史結果寫成本次執行。
- 本次實測 Node **24.21.0**／npm **11.19.0**；既有安裝 Nuxt **4.6.1**／Vue **3.5.43**／Nuxt UI **4.11.3**／Tailwind **4.3.3**／TypeScript **5.9.3**／Vitest **5.0.3**／Playwright **1.64.0**，Chromium **156.0.8078.4**。未重裝或升級依賴。
- 後端快照 SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`，本次 manifest **108／108 相符**。後端執行版本本次 **NOT RUN**；沿用歷史 DLL `1.0.0+7591633137c5a6f57c1fce8e1ba19ab394015880` 證據，不宣稱本次重新確認程序／DB。

## 2. 逐項結案判定

| Finding | 本次核對與實際結果 | 判定 |
| --- | --- | --- |
| **F6-R1／P2** | Renderer 第 8～9 行每次掛載取得 `useId()`，與穩定 `q.key` 組合；text／number／textarea 的 id／label for、Choice 分組與 Stars 均使用此識別。Stars 第 10～11 行的 zero id／label for／name 與可讀 `label` 分開，不使用 title 或 Array index。fresh built 同名兩題與 fixture 雙 instance、改名／重排／直接 model 斷言通過；一併修改的其他題型另作本次識別抽查通過。 | **CLOSED**；原錯題與跨 instance 干擾已消除。 |
| **F6-R2／P2** | [helper](../../tests/helpers/f6-network-diagnostics.ts) 第 8～24 行按事前宣告的 method／完整 URL／kind／status 或 reason 取出 actual，再核對 request／diagnostic 次數。配對消耗觀察，剩餘 outcome／diagnostic 一律 issue；觀察不寫入 expected。Browser 所有故意失敗 expectation 位於觸發前；兩次 403 明列 count=2，舊請求取消明列 ERR_ABORTED count=1、diagnosticCount=0。unit／fresh Browser／attachment 重新配對均通過。 | **CLOSED**；全量實際失敗容許集合已移除。 |

**無新增阻擋或非阻擋 findings。** 兩個 R2 負向案例 PASS 表示 helper 確實拒絕該錯誤。其餘 F6 保存、Auth 資格、unknown 鎖、Preview／readonly／Range／排序與定位結論沿用；本次 fresh built F6 自測亦未見回歸，因此 **F6 code review 通過**。這不是正式驗收、人工 PASS 或 Round accepted。

## 3. 斷言與前後證據

### R1：控制、答案與穩定識別

[Browser](../../tests/e2e/f6-browser.spec.ts) 第 235～250 行檢查每個 `label.control` 所屬題目、文字與 checked：第二 label 後為 `[尚未作答, 0 分]`／`[false, true]`；兩個 0 後均 checked；第一題改 3，第二題保持 0。並非只檢查 id 字串不同。

第 267～289 行雙 instance 案核對相同 Question keys 的四個唯一 id／name、四個 zero checked、各 instance 的 JSON model；左側一題改 3 不影響其他三題。改名與交換順序確實生效後，id／name／答案仍保留。harness 掛載原產品 Renderer，沒有另一套呈現實作。

text／number／Choice 額外抽查使用相同七個 keys 的兩個 Renderer，涵蓋 input／textarea／number／radio／checkbox／select／multi_select。六個 text／number／textarea id 唯一，所有 label 都指向本 instance／本 Question；radio 不跨 instance 取消，checkbox／select／multi_select 與 model 分開；改名／重排後 id／name 保留。結果見 [獨立 JSON](evidence/F6_R1_R2_Independent_Verification_20261014.json)的 `rendererSpotcheck`／[合成畫面](evidence/F6_R1_R2_Renderer_Spotcheck_20261014.png)。只修改 Browser 內既有 harness 的合成定義，沒有編輯產品或 tests。

### R2：拒絕能力與精確配對

第 252～265 行的兩個負向案製造未宣告的合成圖片 GET 404／GET ERR_FAILED。先確認 pageerror／unexpected API route 為空，再斷言 helper issue 同時包含該 URL 的 `Unexpected request outcome` 與 `Unexpected diagnostic`，最後要求 `clean()` 拋錯。PASS 必須來自 helper 拒絕，不能靠任意其他例外取得。

11 個 helper unit 覆蓋精確通過、無關 404、未預期 network failure、method／URL／status／reason 不符、缺／多 request、缺／重複 diagnostic、無對應 request、明列重複次數、無 console cancellation 與 Vue warning 拒絕。本次 F6 controller／rating 16 案、F5 Answer 33 案亦通過。

重新讀取本次 Browser 的 `declared-network-diagnostics` attachments，以實際 helper 再配對一次：正常案 issue 均空；兩個負向案保留被斷言的拒絕 issue。刻意 400／401／403／404／409／500、PATCH ERR_FAILED、舊 PATCH／GET ERR_ABORTED 的 method／URL／status 或 reason／次數相符，沒有按觀察反向補 allowances。

### 修正前後歷史

本次核對五份已提交 correction reporter 的 SHA256 與修正 summary 相符：

- `before-results.json`：三個回歸 FAIL；R1 accessible name 操作失敗，兩個 R2 案的失敗原因均為 helper **did not throw**。
- `before-r1-results.json`：完整 R1 重現 FAIL，attachment 記錄兩個 label 均指向第一題，與 [before 圖片](../implementation/evidence/F6_R1_R2_Correction_20261013/stars-before.png)一致。
- `built-first-results.json`：歷史 23 PASS＋4 skipped；各題 label target 正確、兩個 zero 均 checked，與 [after 圖片](../implementation/evidence/F6_R1_R2_Correction_20261013/stars-after.png)一致。
- `harness-delivery-results.json`：歷史 6 PASS；`harness-identity-final-results.json`：補強改名／重排後歷史 1 PASS，四個唯一識別 initial／final 相符。

原 FAIL 未被替換；實際 diff／當前斷言／前後 attachment 共同支持修復，沒有用修正報告文字代替執行證據。

## 4. 本次實際驗證

原件另存 `output/f6/r1-r2-rereview-20261014/`，reporter／artifact 使用 CLI override，未覆寫歷史輸出。完整命令、exit code、log SHA256、cases 與 attachments 見獨立 JSON。

| 命令／方法 | 本次結果 |
| --- | --- |
| `npm run lint` | **PASS**，exit 0，無 lint error／warning。 |
| `npm run typecheck` | **PASS**，exit 0，Nuxt app＋tools strict。 |
| `npm run build` | **PASS**，exit 0，fresh production build，保留 DEP0155 deprecation。 |
| `npm run test:unit -- tests/unit/f6-network-diagnostics.spec.ts tests/unit/f6-editor-page.spec.ts tests/unit/f5-answer.spec.ts` | **60／60 PASS、3 files**。選 helper、F6 controller／rating 與 F5 Answer，未擴成全 unit。因上輪已知 sandbox spawn EPERM，本次直接授權本機執行，沒有新增啟動失敗。 |
| `npx vue-tsc --noEmit -p tests/fixtures/f6/browser/tsconfig.json` | **PASS**，exit 0，受影響 harness strict。 |
| `F6_MODE=built`；既有 F6 config、另存 reporter／artifacts | **23／23 PASS＋4 skipped**，fresh production UI，API 合成攔截。skipped 為 readonly、兩個 scope、雙 instance harness。 |
| `F6_MODE=fixture`；grep `Renderer readonly\|same-component ID update\|pending old GET\|Renderer instances\|F6-R2` | **6／6 PASS**，補四個 harness 案與兩個負向案，API 模擬。 |
| 其他題型識別抽查 | **6 項核對 PASS**，既有 dev harness／實際 Renderer，合成記憶體定義與答案。 |
| correction evidence／本次 network attachments 稽核 | **PASS**，五份歷史 reporter hashes、前後狀態與本次精確配對一致。 |
| snapshot／歷史保護／交付檢查 | manifest **108／108**；基準→目標的原 review／live spec／wire／依賴／規格零差異；本次產品／tests／歷史證據對目標零差異。文件／去敏／diff 結果載獨立 JSON。 |

一次性抽查診斷失敗另保留：初次對 `sr-only` label 作 pointer click 失敗，改用 `getByLabel` 解析控制；將 Stars 專用 harness 擴成 Number 後，其 native `JSON.stringify(model.values)` 不支援 ExactNumber BigInt，造成展示失敗、擷取舊值，診斷原生 JSON 輸出亦失敗。這是診斷超出該 harness 展示假設，沒有改 harness／產品求 PASS。最終 Number 身分抽查使用 UI 可保留的未完成 raw 字串，只驗 id／label／model 隔離；合法精確 Number 功能由 fresh built B10 與 F5 Answer unit 支持。限制、失敗 log 與 hash 全部列入證據。

只管理本次啟動的前端／harness，均已結束。無 backend／DB／Cookie／SQL／註冊／保存操作，無 storageState／trace。歷史 L01～L04／九次獨立 GET 沿用原 review §5，修正沒有改保存路徑。**本次 live／真實寫入 NOT RUN，數量 0**。

## 5. 缺口、交付與停止點

實機觸控／100 星誤觸／軟鍵盤／safe-area、受控真實 invalid／expired／disabled／換帳號及非 Owner／Published／Closed／刪除等特殊資源狀態仍 **BLOCKED／NOT RUN**；DB identity／migration 仍 **UNCONFIRMED**。Browser 模擬不解除。Chrome／Edge／Firefox／WebKit、本次 live、npm ci／audit、正式 AI／Owner 人工驗收均 **NOT RUN**。

本次只新增本報告／去敏獨立證據，追加 README／總計畫進度；原 review、修正／開發報告、規格、歷史證據與產品／tests 維持原樣。本機文件提交完整 SHA 見交付訊息／Git log（避免文件在自身提交內自指 SHA），檢查目標 SHA 已固定於 §1；提交後再核對工作樹與範圍。

**停於「F6-R1／F6-R2 局部獨立複核通過、F6 code review 通過，待 Owner 確認後續階段」。** 正式驗收延後、accepted 不變，不推送、不展開 F7。
