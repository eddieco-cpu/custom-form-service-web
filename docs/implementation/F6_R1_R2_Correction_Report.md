# F6-R1／F6-R2 局部修正報告

版本：1.0／2026-10-13（Asia/Taipei）。**F6 兩項 P2 修正完成、待局部獨立複核。** Owner 確認兩項 finding 成立並直接授權局部修正、必要自測與本機提交；沒有另設修正計畫或測試計畫核准關卡。本報告是修正與自測交付，未自行宣告 code review 通過。正式驗收延後、accepted 不變，不推送、不展開 F7。

## 1. 基準、來源與範圍

接手 `C:\Users\user\Desktop\custom-form-service-web`，master／`0aff8bb754f077d5df90209a123e024e5b5a83a3`，工作樹乾淨。此提交保留對產品 `d86479d3c6f7b2690181b0beba6092ea5eb6e979` 的 [F6 獨立 review](../review/F6_Independent_Code_Review_Report_20261013.md)與原證據。本次依 [AGENTS](../../AGENTS.md) v1.1、[development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[核准 F6 計畫 v1.1](F6_Implementation_Plan.md) §3.2／§4／§8、[總計畫](V1_Frontend_Implementation_Plan.md) F6／§7／§7.1／§8.1 執行。

受影響語意核對前端 [03](../specs/03-response-and-statistics.md) §5～7、[05](../specs/05-ui-and-interaction.md) §3／§5／§10、[06](../specs/06-technical-architecture.md) §7／§11，以及 [02](../specs/02-form-editor-and-lifecycle.md) §11；正式 Question title／sortOrder 規則依唯讀 [後端 01](../../backend-ref/docs/specs/01-v1-domain-specification.md) §4～6。沒有新增題目標題唯一限制、改 API／資料語意或依賴版本。快照 SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`；本次 manifest 完整性核對見證據。

## 2. 逐項修正與先失敗後修正

| Finding | 修正前重現／回歸 | 局部修正與修正後驗證 |
| --- | --- | --- |
| **F6-R1／P2** | 在未修正 built app 新增同標題、不同 Question ID、min=0 的兩題。首輪 role 操作因重複 label 造成 accessible name 錯誤而 FAIL；改用原生 radio locator 收齊觀察後，仍於「第二 label 指向第二 Question」斷言 FAIL。實際兩個 label 都指向第一題，點第二 label 更新第一題；再直接選兩個 0，model 文字均 0，但第一 radio 被原生同名 group 取消。兩輪 FAIL 均保留。 | [Renderer](../../app/components/forms/FormRenderer.vue) 每次掛載取得 `useId()` instance 前綴，與穩定 `q.key` 組合；[Stars](../../app/components/questions/RatingStars.vue) 的 `id`／zero label for／radio name 使用此識別，另以 `label` 顯示題目標題。Renderer 的 text／number id 與 Choice group 同樣使用 instance 前綴，防止相同 key 在多 instance 的識別衝突。built 回歸通過第二 label 只改第二題、各自為 0、radio／答案一致、第一題選 3 分不改第二題。雙 Renderer harness 通過相同 key 跨 instance、四個 0 各自選取、直接 model 核對，且改同名標題／交換順序後 id／name 與答案仍穩定。 |
| **F6-R2／P2** | 未修改 helper 前，合成無關圖片 GET 404 與 GET requestfailed `net::ERR_FAILED` 都被原 `clean()` 放行；兩個「應拒絕」負向回歸實際 FAIL（沒有 throw），保留 response／診斷與錯誤 reporter。 | 新增 [純配對 helper](../../tests/helpers/f6-network-diagnostics.ts)，[Browser](../../tests/e2e/f6-browser.spec.ts) 每案例在觸發前明列 method、完整 URL、HTTP status 或 requestfailed reason、request 次數與診斷文字／次數；觀察只供核對，不產生 allowances。所有未列 outcome／診斷、次數不符、沒有匹配 request 的診斷均拒絕。刻意 400／401／403／404／409／500、未知 PATCH ERR_FAILED 依精確條件 PASS；離頁晚回 PATCH／換資源舊 GET 的 ERR_ABORTED 各明列 1 次且 0 console。負向 Browser 明確斷言拒絕該 URL 的 outcome 與診斷，再核對 `clean()` 拋錯；正常案例保持嚴格 clean。 |

修正前 [三案 reporter](evidence/F6_R1_R2_Correction_20261013/before-results.json)、[完整 R1 重現](evidence/F6_R1_R2_Correction_20261013/before-r1-results.json)、[修正前圖片](evidence/F6_R1_R2_Correction_20261013/stars-before.png)與[修正後圖片](evidence/F6_R1_R2_Correction_20261013/stars-after.png)一併交付。R1 首輪改 locator 是補齊重現觀察，第二輪仍在相同產品版本 FAIL，沒有把失敗改成 PASS。

## 3. 必要檢查與證據界線

本次實測 Node **24.21.0**／npm **11.19.0**、Nuxt **4.6.1**／Vue **3.5.43**、Vitest **5.0.3**、Playwright **1.64.0**／Chromium **156.0.8078.4**，沿用現有安裝／lockfile。後端執行版本本次 **NOT RUN**，未重新探測程序／Cookie／DB；歷史版本與 live 保存依 [原開發報告](F6_Development_Report.md)／[原 runtime 證據](evidence/F6_20261013/backend-runtime.json)，不冒稱本次 live 可用性檢查。

| 實際命令／方法 | 結果與選用理由 |
| --- | --- |
| `npm run lint` | **PASS**，最終 0 error／warning；首輪 attribute order 1 warning 保留後修正。 |
| `npm run typecheck` | **PASS**，Nuxt app＋tools strict，涵蓋 helper 與 Browser／unit tests。 |
| `npm run build` | **PASS**，本次新 production build；保留套件 DEP0155 deprecation 診斷。 |
| `npm run test:unit -- tests/unit/f6-editor-page.spec.ts tests/unit/f6-network-diagnostics.spec.ts` | **27／27 PASS、2 files**；原 F6 controller／rating 16 案＋新 helper 11 案。涵蓋 method／URL／status／reason 不符、無關 404／非預期 failure、缺／多 request、診斷重複／缺少／無對應 request、明列重複次數、明列無 console cancellation、Vue warning 拒絕。Stars DOM 事件用 Browser，未新增鏡像 unit。 |
| `F6_MODE=built; npm run test:e2e -- --config=playwright.f6.config.ts --reporter=list,json --output=.../built-first-artifacts` | **23／23 PASS＋4 skipped**，fresh production UI＋明列模擬 API；原 20 案＋R1 同名兩題＋R2 兩個負向案例。4 skipped 是測試專用 routes，另由 fixture 補驗，不能代稱 true API。 |
| `F6_MODE=fixture; 同上 --grep 'Renderer readonly\|same-component ID update\|pending old GET\|Renderer instances\|F6-R2'` | **6／6 PASS**：readonly、兩個 scope、雙 Renderer、兩個負向案例；afterEach 去敏 attachment 保存案例預期／實際 outcome／診斷／核對差異。負向案的差異是有斷言的預期拒絕，其餘案例須無差異。 |
| `F6_MODE=fixture; 同上 --grep 'Renderer instances'` | **1／1 PASS**，新增「改名／重排實際生效、model 與星分保留」斷言後，僅補跑受影響一案。 |
| `npx vue-tsc --noEmit -p tests/fixtures/f6/browser/tsconfig.json` | **PASS**；harness 新增兩個 Renderer，必須另驗 strict。最初唯讀 title／Array mutation 型別 FAIL 與後續 runtime FAIL 都保留；harness 改為替換 immutable AnswerDefinition，不修改 F5 frozen 定義。 |
| diff／歷史保護／文件連結／去敏／snapshot manifest | 實際結果見 [verification summary](evidence/F6_R1_R2_Correction_20261013/verification-summary.json)。 |
| 本次 live／真實寫入、正式 AI／人工驗收、Chrome／Edge／Firefox／WebKit、npm ci／audit | **NOT RUN**；本次只做授權局部回歸，不改依賴，沒有新增 Cookie／API 保存行為。 |

原始 FAIL／PASS logs、reporter、contexts 與腳本保留於 ignored `output/f6/correction-20261013/`，SHA256／exit code／結果及原因記在 verification summary，未覆寫原 review 或開發輸出。雙 Renderer harness 首輪沒有等 client 掛載，得到 0 controls 而 FAIL；補掛載等待後，strict 與 runtime 揭露 frozen 定義 mutation 而 FAIL；改用同 key 的新 immutable 定義後 PASS，保留原預期。產品修正未在這些 harness 修訂後再變更。

## 4. 歷史 live、未解除缺口與交付

沿用 [F6 真實 L01～L04／九次獨立 GET](evidence/F6_20261013/live-f6-1791895220225-sanitized.json)與 [F6 獨立 review 的歷史核對](../review/F6_Independent_Code_Review_Report_20261013.md) §5。本次 live spec／三份原 wire／reporter／保留 ID 索引未變；沒有重新註冊、真實 POST／PATCH、SQL 操作、刪除資料或重建 DB／volume，原三個合成帳號與五份 Draft 維持保留。fixture PASS 與歷史 live PASS 分開。

既有 **BLOCKED／NOT RUN**：實機觸控／100 星誤觸／軟鍵盤／safe-area、受控真實 invalid／expired／disabled 與换帳號／非 Owner／Published／Closed／刪除等特殊資源狀態；**UNCONFIRMED**：DB identity／migration。本次桌機 Browser 與 fixture 未解除這些缺口。正式驗收維持延後，accepted 不變。

交付本報告、去敏重現／回歸證據、原開發報告的後續指引與 README／總計畫進度；保留原 review、失敗歷史、核准計畫與所有歷史證據。完整本機提交 SHA 由 Git log／交付訊息記錄（本報告在該提交內）；提交後核對 Git 狀態。**停於「F6 兩項 P2 修正完成、待局部獨立複核」**，不自行宣告 code review 通過，不推送、不展開 F7。
