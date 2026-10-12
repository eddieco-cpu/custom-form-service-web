# F5 開發報告 — Editor／Answer Domain 與 Delta

版本：1.0／2026-10-12（Asia/Taipei）。**F5 開發完成、待集中 review。** Owner 已核准 [F5 精簡實作計畫 v1.0](F5_Implementation_Plan.md)，授權整輪開發、必要自測與範圍內修正，另指定 Choice 往返的固定預期案例。本次沒有新增測試計畫核准關卡。正式驗收維持延後；F1～F5 均未 accepted。

## 1. 實際範圍與接點

交付 F5 純資料模組，沒有頁面／UI 接入或保存／提交 API 呼叫。

| 檔案 | 實際變更與用途 |
| --- | --- |
| `app/domain/models.ts`、`editor.ts` | 五題型 Editor controls、readonly key／Server ID、原始數值字串、metadata、Deadline source／visible input；新建初值、完整 DTO 投影、獨立快照／凍結 baseline、dirty、題型確認／切換、variant、Question／Option 增刪與排序 |
| `app/domain/definition-validation.ts` | Zod strict config／結構與 F2 Unicode／ExactNumber／datetime adapter；保留原始輸入、建立正規化候選；Draft 與注入時間的 Publish 驗證分離 |
| `app/domain/api/form.ts`、`definition-request.ts` | Create／Draft Delta DTO 與白名單 builders，回 `invalid`／`noop`／`ready`；ready 的 Body／map 為獨立凍結快照，缺可靠 ID／跨 Parent ID 直接拒絕 |
| `app/domain/answer.ts` | 獨立題目投影、五題型空答案／基準、number raw＋精確候選、答案 dirty／required／optional 驗證、正式 Answer builder；Preview 可用本地 key，正式 Body 必須使用 Server Question／Option ID |
| `app/domain/error-path.ts`、`error-presentation.ts` | Delta／完整 saved Publish／省略後 Answer 三種 map；漏答 Question ID、欄位 suffix。F2 locator 增選用的 exact match／suffixes，原 prefix 行為保持；未知或已刪控制留摘要 |
| `tests/fixtures/f5/payloads.ts`、三份 `f5-*.spec.ts` | 經 F2 lossless decoder 的合成 DTO、固定 Body／wire／定位與資料語意測試，直接 import 產品模組 |

載入保留原始 config 的省略 keys、原 sortOrder 與 deadline 七位小數；effective variant 不回寫，Rating 缺 bounds 不補值。文字採 White_Space trim／Code Point；Number 使用 ExactNumber，不以浮點轉換比較／送出。整數 controls 沿 F2 有界整數與快照後端的 Int32 表示能力拒絕不可處理值，沒有新增數字題精度／小數位限制。

排序以最終成員／順序比較：實際改集合才產生 0..n-1；新增後本地刪除或排序還原回到原稀疏基準。未改項目不送 id-only；description 清除用 null，未改 deadline 省略。Config 出現即整份替換，保留其他設定及未改的省略 variant；type 變更送完整目標 config。Choice 最終切成非 Choice 時不送非空 Option Delta。

`loadEditor(decodedCompleteFormDetail)` 是純基準重建入口，不用 label／index 猜 Server 新 IDs；candidate／失敗本身不更新 baseline。F6 才接保存／loading／同 Form 互斥／unknown 後可靠重讀採用；F7 接 Lifecycle／Visibility，F8 接提交／Latest／knownSubmitted。本輪未擴增這些流程。

## 2. Owner 指定的固定預期案例與證據

單元案例位於 [f5-definition-request.spec.ts](../../tests/unit/f5-definition-request.spec.ts)：既有 single_choice → 確認 text → single_choice，原兩個 Options 不復原，新 Options 無 Server ID。以固定物件與固定字面 wire 核對實際 builder 結果，並依 id-only／新增契約核對候選效果；**PASS**。

另外以本機 Vite 載入相同產品純函式執行窄範圍 probe，產出 [實際 Body／固定預期／wire／map](evidence/F5_20261012/choice-roundtrip-body.json)，`bodyEqualsFixedExpected=true`。這是合成契約 fixture，不是後端 PATCH 執行證據。

最終 type 與基準相同，實際 Body 不送 type；選項 Delta 明確如下（IDs／value 均為合成資料）：

```json
{
  "questions": [{
    "id": "00000000-0000-4000-8000-000000000003",
    "options": [
      { "id": "00000000-0000-4000-8000-000000000011" },
      { "id": "00000000-0000-4000-8000-000000000012" },
      { "label": "選項 1", "value": "opt_00000000-0000-4000-8000-000000000100", "sortOrder": 0 },
      { "label": "選項 2", "value": "opt_00000000-0000-4000-8000-000000000102", "sortOrder": 1 }
    ]
  }]
}
```

因此刪除由明確 Option id-only Delta 表達，不依賴 Server type-change 自動清除。刪除項的錯誤留摘要；Request `options[2].label` 映到第一個新 Option key，沒有沿用畫面 index。

## 3. 引用來源與實際版本

- 前端工作目錄：`C:\Users\user\Desktop\custom-form-service-web`；起點 **master／`2fb15fb4461eb56a727715da463c084958d20a37`，Git 工作樹乾淨**。
- 已讀 [AGENTS](../../AGENTS.md) v1.1、[round-development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫](V1_Frontend_Implementation_Plan.md) v1.3 F5／§7／§7.1／§8.1／§9.8，及前端 00～07。受影響：02 v1.1 §2／§5～10、06 v1.1 §4／§6～9／§11；03 v1.0 §4～7、04 v1.0 §7／§9／§11～12、05 v1.0 §4～6、07 v1.0 §5／§7／§10（2026-10-10）。F5 計畫 v1.0 的歷史停止點保留，以本次 Owner 授權及本報告為目前狀態。
- 正式後端來源：本機唯讀 [backend-ref/SNAPSHOT.md](../../backend-ref/SNAPSHOT.md)，匯出 2026-10-11／master／完整 SHA **`7591633137c5a6f57c1fce8e1ba19ab394015880`**。核對 Domain v1.1 FORM-04～06／QST／SUB-02～03、Part B v1.0 §6.1／§7.2、Part C v1.1 §4.1～4.4、Part A v1.0 §2／§4、Errors v1.0 §2.4／§6、Constraints v1.1 §10～12；未觀察到影響 F5 的契約衝突。manifest **108／108 hash 相符**，未修改快照。
- 實測 Node **24.21.0**／npm **11.19.0**；已安裝 Nuxt 4.6.1、Nuxt UI 4.11.3、Tailwind 4.3.3、TypeScript 5.9.3、Zod 4.6.5、Vitest 5.0.3、Playwright 1.64.0、lossless-json 4.3.1。Build 輸出 Vue 3.5.43／Vite 8.3.4／Nitro 2.13.4。`package.json`／lockfile 未變，未安裝或升級依賴。
- live 後端 checkout／SHA／DB 版本、readiness 仍 **UNCONFIRMED**。本輪未 probe 業務 API；快照 R10 的歷史 accepted／R11 結果待確認不能當成本次 live 整合 PASS。

## 4. 實際檢查／自測結果

[去敏摘要](evidence/F5_20261012/verification-summary.json) 記錄命令、執行歷史、版本、來源 hash、lockfile hash 與缺口。全部是開發自測，沒有正式 AI／人工驗收 PASS。

| 命令／案例 | 實際結果 |
| --- | --- |
| `npm run test:unit -- tests/unit/f5-editor.spec.ts tests/unit/f5-definition-request.spec.ts tests/unit/f5-answer.spec.ts tests/unit/exact-number-gate.spec.ts tests/unit/common-adapters.spec.ts tests/unit/api-client.spec.ts` | **PASS：6 files、167／167**；最後執行 22:33:16 台北時間。前五份為計畫必要範圍；額外 api-client 回歸本輪擴充的 F2 locator 預設相容性 |
| `npm run lint` | **PASS**，exit 0 |
| `npm run typecheck` | **PASS**，exit 0；Nuxt 與 tools strict 皆執行 |
| `npm run build` | **PASS**，exit 0；dependency DEP0155 exports mapping warning 保留，沒有 application build error |
| `git diff --check` | **PASS**；交付前另核對 staged diff、範圍與文件／證據 |
| `node output/playwright/f5-development-20261012/domain-probe.mjs` | **PASS**，exit 0；actual Body 與固定 expected deep equal，已交付去敏 JSON；本機 probe 原件位於 ignored output |
| backend manifest、依賴／F2 adapters／API services／頁面變更範圍核對 | **PASS**；108／108、package／lockfile／adapters／services／頁面無變更 |

有意義的 unit 覆蓋：new／載入 clean、DTO／baseline／Preview 獨立、五題型初值／切換／取消、stable value、fallback／config replacement、稀疏排序／還原、id-only／noop、nullable／deadline；非法已提供 config（null／Array／未知 key／不合法數字／整數／bounds）、Unicode、Draft／Publish 不完整；三種 path／未知／刪除摘要、Body／map 不受後續編輯影響、成功 DTO 新 IDs 基準；五種答案 required／optional／空／0／清除、跨題／重複 Choice 拒絕、Option ID 非 value、長小數／9007199254740993／科學記號經 builder→F2 serializer／parser 往返、1／1.0／1e0 等值及精確 bounds。

首次 Vitest 在 sandbox 啟動時 **BLOCKED**（`spawn EPERM`，未執行案例），同 script 在 sandbox 外執行後 **166／166 PASS**；初次 lint **FAIL**（type import／test helper void union），strict typecheck 兩次 **FAIL**（Option identity 型別、readonly accumulator／推斷與 test callback 回傳），皆在範圍內修正後複驗通過。Diff 核對補強「沒有 comparison baseline 時驗 saved 原排序，不以 dense 投影遮蔽重複值」並加入回歸，最後 **167／167 PASS**。原失敗／修正歷史保留，沒有修改預期求 PASS。

Browser／Cookie／CORS／導航／beforeunload／人工實機 **NOT RUN，本輪不適用**：沒有新 UI／保存讀回或瀏覽器機制；F2 修改只有純 locator 的 opt-in 行為，已以受影響 unit 驗證。沒有新 Browser harness，歷史 F2～F4 Browser 結果未重跑、未寫成本次 PASS。真實保存／讀回留 F6／F8。

## 5. 缺口、Git 與停止點

既有真實非空 ≥11／21 筆清單／filter／縮頁第二支 GET Auth、Owner Draft／Published／Closed 跨角色、隱藏／已刪除／截止 Form，以及特殊 Auth／disabled／受控故障／晚回仍 **BLOCKED**；本輪純 Domain fixture 沒有解除這些缺口。live readiness／版本未確認，其他 Browser／人工實機、歷史 npm ci native binding EPERM／audit 缺口保留。install／npm ci／audit、真實業務 API／DB 操作均 **NOT RUN**；未重建 DB、刪 volume 或 SQL 改資料。

僅本輪產品模組、三份 unit／合成 fixture、報告／去敏證據及必要 README／總計畫進度納入一個目的的本機提交。完整交付 SHA 與提交後實際 Git 狀態見交付訊息／Git log，避免在同一 commit 的報告寫入自指 SHA。基準 SHA 已列 §3；提交後工作樹以 `git status --short` 核對，不推送。

**停止於「F5 開發完成、待集中 review」。正式驗收延後，不代填 accepted，不推送、不展開 F6。**
