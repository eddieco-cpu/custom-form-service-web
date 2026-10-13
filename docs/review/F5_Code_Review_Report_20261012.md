# F5 集中獨立 Code Review

日期：2026-10-12（Asia/Taipei）。審查目標與實際 HEAD：`e4da993470bf89388b899e046e22ccea3a652a93`；開發基準及目標父提交：`2fb15fb4461eb56a727715da463c084958d20a37`。接手工作樹乾淨。已閱讀全部 17 檔實際 diff、產品模組、三份 F5 unit／fixture、直接相關 F2 adapters／decoder／locator 回歸，對照核准 F5 v1.0 與正式後端契約；開發報告只用於核對交付及證據。

**一項 P2 阻擋 finding：F5-R1，dirty 與合法 no-op 候選不一致。F5 code review 尚不能判定通過。** 非阻擋 findings：未發現另外需要提出的確定缺陷；工具 warning 與未驗證範圍另列。本次不修改產品或既有測試，不設計／執行正式驗收，不代填 accepted。

## 阻擋 finding：F5-R1／P2 — 可選 config 的 undefined 省略值製造永久 dirty

程式位置：[editor.ts:158](../../app/domain/editor.ts#L158)～159、172、186～187。相關處理：[definition-validation.ts:31](../../app/domain/definition-validation.ts#L31)～43、[definition-request.ts:105](../../app/domain/definition-request.ts#L105)。模型欄位為 [models.ts:18](../../app/domain/models.ts#L18)～23 的可選屬性。

載入既有 text `config={}` 後，將 `config.minLength` 設為 `undefined`（例如可選欄位編輯後回到未設定），就會出現：

```ts
const { definition, baseline } = loadEditor(dto) // 第一題是 text，config={}
const question = definition.questions[0]!
if (question.type !== 'text') throw new Error('此重現需 text 題')
question.config.minLength = undefined
validateDraft(definition, baseline).kind // valid
buildDraftDelta(definition, baseline).kind // noop
editorDirty(definition, baseline) // true；預期 false
```

原因是 `comparableConfig()` 將所有非 string 值直接保留為 entry，連 `undefined` 也保留；`semanticEqual()` 因 object key 數量不同判定差異。另一方面，config schema 的 `.optional()` 接受 `undefined`，candidate 明確過濾它，因此沒有可保存的變更。這不是非法非空輸入：它是目前模型可表達、validator 接受、builder 視為省略的狀態。

一次性 review probe 在審查目標實際產品上重現 text 的 `minLength`／`maxLength`／`placeholder` 及 number 的 `placeholder` 四組：**Draft valid、Delta noop、dirty true**。刪掉該 property 後立即恢復 clean；既有空字串路徑仍 clean。原測試 [f5-definition-request.spec.ts:56](../../tests/unit/f5-definition-request.spec.ts#L56) 驗了空字串，未覆蓋明確 `undefined` 的省略表示。

具體影響：F6 消費此 model 時，如果可選欄位初始化／清除使用 `undefined`，畫面可能一直提示未保存、觸發離頁確認並依 dirty 規則阻擋發布；按保存只能得到 noop，無法透過成功 PATCH 更新基準來解除。F5 尚未接 UI，因此本次證明的是 Domain 缺陷與後續接入風險，沒有宣稱已在 Browser 發生。

依據：核准 F5 計畫 §2「基準與 dirty」、§3 no-op／改回清 dirty；前端 02 §6／§6.1 的未設定省略與 no-op、04 §7 的改回基準清 dirty。建議讓 dirty 投影與 validator 對合法省略值採相同語意，同時保留 null、未知 key、非法非空數值等差異；補同一 model 的 dirty／candidate／builder 一致性檢查。**本次只回報，未修正。**

## 四項重點審查結果

| 重點 | 核對結果與證明範圍 |
| --- | --- |
| baseline／DTO／快照、dirty／no-op、稀疏排序 | DTO 投影、baseline／Preview／Request 獨立，凍結快照與 ExactNumber 不被編輯污染；metadata／既有 Visibility 不進定義 dirty。fallback variant 不回寫，微秒 deadline 保留；原稀疏排序在最終成員／順序還原後恢復。新增後刪除、排序還原及字串數值等值通過。合法 undefined config 省略值有 R1。 |
| Create／Delta、刪除、config／題型切換 | Body 使用白名單；新增不帶 id／tmp key，既有 ID 與父層 baseline 歸屬檢查；未改項目不送 id-only，刪題只送題目 id，空集合不代替清空。config 修改完整替換、保持未改的其他設定與省略 variant；type 變更明確送完整目標 config，Choice→非 Choice 不送非空 Option Delta。指定 single_choice→確認 text→single_choice 的 Body／wire／map 與已提交證據完全相符，舊 Option IDs 明確 id-only 刪除。獨立另驗兩種 Choice × 三種非 Choice × 兩種最終 Choice，共 12 組，按正式刪除／新增契約核對最終選項；沒有依賴 Server type cleanup 或復原舊 Options。 |
| 五題型答案、精確數值與 ID | required 空題阻擋；optional 空文字／多選省略、全部 optional 可 answers=[]；非法非空 optional 仍阻擋。Number／Rating 的 0 有效、未操作／清除分離，Number raw 為判定來源，stale cached exact 不覆寫 raw。長小數、safe integer 外整數、科學記號、最後一位 bounds 與 1／1.0／1e0 等值通過 F2 serializer／parser。Choice 以同題 key 找 Server Option ID，跨題／value／label／重複選項拒絕；正式提交拒絕缺 ID／未知 model 題目。Question／Option 真實歸屬仍須由完整可靠 FormDetail 與後端判定，本輪沒有 API 提交。 |
| Delta／Publish／Answer map 與 F2 相容性 | Delta 使用實際送出順序與刪除空位；畫面第三題的巢狀 Option 正確定位。Publish 以完整 saved baseline 順序建立獨立 map，Answer 依省略後索引及 questions.<questionId> 定位；未知／已刪控制仍保留完整 detail。map／Body 不受後續編輯影響。原無 match／suffixes 的 longest-prefix、dot／bracket 邊界保持；新 exact 拒絕額外 suffix，指定 suffixes 正確回欄位。受影響 F2 unit 與額外 probe 通過。 |

## 獨立驗證、版本與證據

本次實測 Node **24.21.0**、npm **11.19.0**；讀取 installed 套件為 Nuxt 4.6.1、Nuxt UI 4.11.3、Tailwind 4.3.3、TypeScript 5.9.3、Zod 4.6.5、Vitest 5.0.3、Playwright 1.64.0、lossless-json 4.3.1。fresh build 為 Vue 3.5.43／Vite 8.3.4／Nitro 2.13.4；沒有安裝或升級依賴。

| 實際執行 | 結果／選用理由 |
| --- | --- |
| `npm run test:unit -- tests/unit/f5-editor.spec.ts tests/unit/f5-definition-request.spec.ts tests/unit/f5-answer.spec.ts tests/unit/exact-number-gate.spec.ts tests/unit/common-adapters.spec.ts tests/unit/api-client.spec.ts` | **PASS：6 files、167／167**，22:59:36 台北時間。涵蓋本輪純轉換及直接受影響的 F2 數值、時間、文字、locator；不全面重跑 F1～F4。首次 sandbox 啟動 spawn EPERM、0 案執行；自動核准後同命令在 sandbox 外通過。 |
| `npm run lint` | **PASS**，exit 0。 |
| `npm run typecheck` | **PASS**，Nuxt＋tools strict，exit 0。 |
| `npm run build` | **PASS**，fresh build，exit 0；沿用 dependency DEP0155 exports mapping warning。 |
| `node output/playwright/f5-independent-review/domain-probe.mjs` | 診斷腳本 exit 0；**R1 的四組規格檢查 FAIL／缺陷已重現**。Choice 12 組、提交證據一致性、稀疏 Option 還原、Int32 上界、Answer／Publish paths、legacy／exact locator 正向斷言 PASS。腳本成功重現缺陷不計為產品全數 PASS。 |
| `git diff --check 2fb15fb4461eb56a727715da463c084958d20a37 e4da993470bf89388b899e046e22ccea3a652a93` | **PASS**。 |
| 原交付與來源完整性 | 開發摘要的 **12／12 source hashes**、lockfile、Choice evidence hash 相符；backend manifest **108／108** 相符。目標父 SHA 與指定基準一致；產品／測試 bytes 未改。 |

去敏摘要及 probe hashes 見 [F5_Independent_Verification_20261012.json](evidence/F5_Independent_Verification_20261012.json)。一次性 probe／結果保留於 ignored `output/playwright/f5-independent-review/`，直接 import 目標產品，不新增或修改 tracked unit。lint／typecheck／build／unit 的輸出在本次工具紀錄，沒有宣稱另外保存完整命令 log。原開發證據 bytes 保留。

規範來源：repo 最新 AGENTS v1.1、repo round-development Skill、核准 F5 v1.0、總計畫 v1.3 F5／§7／§7.1／§8.1；首次接手已讀前端 00～07（02／06 v1.1，其餘 v1.0，2026-10-10）。正式後端來源為唯讀 `backend-ref/`，2026-10-11 快照、master／`7591633137c5a6f57c1fce8e1ba19ab394015880`；審查 Domain v1.1 FORM-04～06／QST／SUB-02～03、Part B v1.0 §6.1／§7.2、Part C v1.1 §4.1～4.4、Part A v1.0 §2／§4、Errors v1.0 §2.4、Constraints v1.1 §10～12。並閱讀快照 candidate source path／Publish 排序／Answer validator 作實作查證，沒有執行後端。未發現需要改契約的 F5 來源衝突。

## 未驗證事項與停止點

- Browser／真實 API 保存讀回／提交／Cookie／CORS／導航／beforeunload／人工實機：**NOT RUN**。本輪沒有接入這些行為，純資料與 locator 可直接用 unit／probe 驗；不為 F5 建立 Browser harness。fixture 結果不代表整合 PASS。F6／F8 必須依該輪授權驗證保存後新 IDs、頁面 dirty 及真實提交。
- live 後端 checkout／Git SHA／DB 版本／readiness：**UNCONFIRMED**，本次無新 live probe。backend 快照與歷史 R10／R11 狀態不能代稱目前 live。
- 既有真實非空 ≥11／21 筆清單／filter／縮頁第二支 GET Auth、Owner Draft／Published／Closed 跨角色、隱藏／已刪除／截止 Form、特殊 Auth／disabled／受控故障／晚回：**BLOCKED，沿用既有前置缺口**，沒有以本輪 fixture 解除。
- 正式 AI／人工驗收、npm ci／audit／generate：**NOT RUN**；保留歷史 native binding EPERM／audit 缺口。未建立帳號或業務資料、未操作 DB／volume／SQL。

本次僅新增本 review 報告與去敏證據；產品、測試、計畫／進度與原交付證據不變。沒有新 commit／push，HEAD 仍為審查目標；兩份交付文件未提交，ignored probe 留存。**停止於「F5 review 結果待 Owner 確認」。正式驗收維持延後，不代填 accepted、不推送、不展開 F6。**
