# V1 Frontend — Project Instructions

文件版本：1.0／2026-10-10。此版協作規範為初版，待 Owner review；前端規格與總實作計畫已通過 Owner review。文件核准不代表 F0～F10 已獲整批執行授權。

## Source of truth

首次接手先讀以下文件；後續當輪至少重讀總計畫的當輪內容、§7／§7.1，以及受影響的規格章節：

1. `docs/specs/00-v1-frontend-overview.md`
2. `docs/specs/01-pages-routing-and-access.md`
3. `docs/specs/02-form-editor-and-lifecycle.md`
4. `docs/specs/03-response-and-statistics.md`
5. `docs/specs/04-auth-state-and-error-handling.md`
6. `docs/specs/05-ui-and-interaction.md`
7. `docs/specs/06-technical-architecture.md`
8. `docs/specs/07-api-integration-map.md`
9. `docs/implementation/V1_Frontend_Implementation_Plan.md`

前端規格負責頁面、互動、資料呈現與工程限制；總實作計畫負責 F0～F10 的範圍、依賴與進度。本文件負責共用協作流程；Skills 負責各階段的具體交付。不要將工作流程文件當成新增產品規則的來源。

業務、API DTO、錯誤、授權、驗證順序與交易規則，以另置後端 repo 的正式規格 00、01、02、03a、03b、03c、04、05 為準。前端 07 是對接摘要。記錄實際可讀位置與版本／commit，不假定後端位於 `../backend`，也不根據歷史文件推定 Endpoint 已實作。

若來源衝突，列明檔名、章節、差異與受影響工作；只暫停有衝突的部分。不得默默修改 API 契約或既定產品行為。一般元件拆分、命名與例行修正依已核准當輪方案決定，不為每個工程選擇另設核准關卡。

## Round 與階段邊界

沿用 Owner 已授權的範圍與階段；不重複索取已有的授權。預設流程如下：

| 階段 | 交付與停止點 |
| --- | --- |
| 當輪計畫 | 產出 `docs/implementation/Fn_Implementation_Plan.md`；等待當輪方案核准與明確開發指令。F0 改交付 `F0_Alignment_Report.md` 與工程決議 |
| 開發 | 完成當輪實作、必要自測、diff 核對與 `Fn_Development_Report.md`；交付後等待 code review／後續指令 |
| Code review／修正 | 僅 review 時交付發現；要求修正時完成授權修正並重跑受影響檢查，不自動展開正式驗收 |
| 正式驗收計畫 | Owner 要求時準備 `docs/test-plan/Fn_Acceptance_Test.md` 與需要的伴檔；交付後等待本版 review／執行授權 |
| 正式驗收執行 | 依目前核准計畫執行，產出 `docs/test-results/Fn_Acceptance_Execution_Report.md`；結果等待人工驗收與 Owner 確認 |
| Round accepted | 僅在 Owner 明確確認本版結果與同意的待處理事項後更新 accepted；下一輪由 Owner 指定 |

Owner 可明確授權多個階段；保留已約定的 review／驗收 gate。核准計畫且指令清楚表示開始執行時，可以直接執行；不要將單純「計畫沒問題」一律解讀為開發或驗收指令。

開發 build、unit、必要 Browser 自測不需要先核准正式驗收計畫。自測 PASS、code review 通過與正式驗收結果分開記錄；不得代填 AI／人工 PASS。F0 是規劃成果，不要求為純文件工作新增 Browser 驗收。

當輪修正若使既有驗收計畫或結果不再適用，標明失效範圍、保留歷史結果，依該階段授權更新與重跑。不自行開始下一階段或下一輪。

## Repo-local Skills

- 當輪計畫、F0 Alignment、授權開發與當輪修正：`.agents/skills/v1-frontend-round-development/SKILL.md`。
- 正式驗收計畫準備／修訂與核准後的執行：`.agents/skills/v1-frontend-acceptance-testing/SKILL.md`。
- Skill 安裝位置不是業務 repo。使用安裝版時，從使用者指定的前端工作目錄，或已確認含本文件與前端規格的 repo 讀取來源。無法定位時指出所缺位置，不在 Skill 目錄初始化 Nuxt，也不猜測另一個 repo。
- Skill 與本文件的階段邊界若衝突，先回報受影響階段；Owner 當次與既有明確授權優先。

## 工程與交付範圍

當輪計畫必須回答總計畫 §7.1 的相關工程提醒，包含具體方案、代表性案例與驗證時點；不要僅列「處理精度／錯誤」。資料語意引用規格，避免複製成另一套契約。

採已核准的 Nuxt CSR、TypeScript strict、Nuxt UI／Tailwind、Node `24.21.0` 與 npm。確切套件版本及相容性在 F0 核對、F1 以 lockfile 與實際安裝驗證；不得臆造版本已可取得或擅自更換指定 Node 值。

本次是本機 Email／Password 前端。Google 按鈕隱藏，Google 整合與遠端正式服務延期；其他排除項以 00 為準。前端不擴增後端 Endpoint、BFF 或資料持久化機制。

後端 R10 的最新狀態在實際接手核對。不可用時仍可做已授權的 Statistics fixture／UI 工作，但真實統計串接與依賴它的整合驗收記為 BLOCKED。

## 驗證、測資與證據

- 採 F1 最終 npm scripts，完成當輪必要 lint／typecheck／build 及有意義的受影響測試；不為單純樣式建立鏡像測試，不在通過後無理由反覆擴大測試。
- Cookie／CORS、登入狀態與需要真實保存／讀回的案例使用實際瀏覽器與 API。fixture／攔截結果明列模擬，不能代稱後端整合 PASS。
- 自測、正式 AI 驗收、人工驗收分開。命令與案例只記實際 PASS／FAIL／BLOCKED／NOT RUN，附版本與必要證據。
- 普通驗證使用本機既有資料庫與保留的合成測資。不重建 DB、不刪開發 volume、不直接 SQL 修改業務資料；需要停用／時間／特殊狀態時採已同意的受控安排。
- 不提交密碼、Cookie、Token、簽章金鑰或敏感個資。Playwright storageState、trace、截圖使用合成資料並檢查實際內容；保護可能含秘密的原件，交付不含秘密的證據。
- 準備驗收文件可列未具備的前置；不能因此虛構測資、環境可用或已執行結果。

## Git 與回報

編輯前檢查 Git 狀態，保留使用者未提交變更。不存在 repo 時記錄不適用，不假造 HEAD 或為文件階段自行建立業務 repo。

授權開發／修正後，以單一目的提交已驗證且屬本輪的變更；遵守使用者對提交的既有指示。不 force push、destructive reset、改寫歷史或提交不相關變更。推送／PR／部署依既有明確授權處理。

交付報告包含：範圍與實際變更、引用來源版本、前後端實際版本、命令／案例結果、fixture 或真實 API、缺口、commit SHA／剩餘 Git 狀態及停止點。沒有測試、提交或可用 API 時明列 NOT RUN／不適用，不能將計畫或靜態閱讀寫成執行證據。
