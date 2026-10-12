# F5-R1 局部修正交付報告

日期：2026-10-12（Asia/Taipei）。**F5-R1 補正完成、待局部複核**。Owner 已確認 F5-R1 並授權局部修正、必要回歸與交付，不另提修正計畫。本文件為開發自測交付，不宣告 F5 review 通過或正式驗收 PASS。

## 1. 問題與實際修正

依 [原 F5 review](../review/F5_Code_Review_Report_20261012.md) 的 P2／F5-R1：合法可選 config key 的 own undefined 已被 validator candidate 省略，Delta 為 noop，但 dirty 比較仍保留 key，造成無法恢復 clean。

只修改 [editor.ts](../../app/domain/editor.ts) 的 config 比較投影：按五題型合法可選 key 省略 undefined；未知 key 保留原值，不套用空數字／空 placeholder 正規化；variant 只有省略時取得有效預設值，明確 null 保留差異。共用 `semanticEqual`、validator、Delta builder、DTO、API、UI、依賴與 lockfile 均未改。

validator／builder 原有候選省略及完整 config replacement 經回歸核對，三條路徑現在一致。raw own undefined 保留在控制 model，比較／驗證／建置不改 raw 或 immutable baseline；Rating bounds 不套 variant fallback，非法非空輸入仍 dirty 且被拒絕。

先新增 [58 案回歸](../../tests/unit/f5-config-omission.spec.ts)，在產品修正前執行，再局部修改產品。涵蓋全部 12 個合法可選欄位（text 四欄、number 三欄、兩種 Choice 各一欄、rating 三欄），另驗 12 組清除、12 組 null、9 組未知／錯題型 key、12 組非法非空值及共用比較未放寬。

## 2. 固定預期與實際結果

[實際 candidate／Body](evidence/F5_R1_Correction_20261012/config-omission-cases.json) 由本輪獨立純 Domain probe 擷取；全部為合成契約 fixture，沒有呼叫 API。Body 以精確 JSON 字串保存，不將長小數轉成 JS number。

| 原 review 四組案例 | Draft | Delta | dirty |
| --- | --- | --- | --- |
| text `{}` → minLength=undefined | valid | noop | false |
| text `{}` → maxLength=undefined | valid | noop | false |
| text `{}` → placeholder=undefined | valid | noop | false |
| number 原 min／max → placeholder=undefined | valid，原精確 bounds 保留 | noop | false |

既有設定清除 **12／12 PASS**：candidate 移除該 key、dirty=true、Delta ready，只送既有 Question ID 與完整剩餘 config，未送 type。代表實際 Body：

- text 原 `{minLength:2,maxLength:8,placeholder:"提示"}` 清除 minLength，replacement 為 `{placeholder:"提示",maxLength:8}`，其餘設定保留。
- number 清除 placeholder，replacement 保留 `min:0` 與 `max:9007199254740993.1234567890123456789`；unit 另核對固定 literal wire。
- single_choice 原 variant=select 清除，replacement 為 `{}`，回到有效 radio，原 Option IDs／values 不變。

variant 清除使用非預設值，以驗實際呈現變更；省略／明確預設的既有語意仍依 02 §6.1。null、未知 undefined／空字串／錯題型欄位及非法非空值全部保持 dirty=true、Draft invalid、Delta invalid。原 Choice→text→Choice 的明確舊 Option IDs delete＋新 Options 固定 Body 案仍 PASS。

## 3. 來源與實際版本

- 接手：`C:\Users\user\Desktop\custom-form-service-web`，master／完整 SHA `e4da993470bf89388b899e046e22ccea3a652a93`；僅兩份原有未提交 review 文件，見 §5。
- 重讀 AGENTS v1.1、[development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[F5 v1.0](F5_Implementation_Plan.md)、[總計畫](V1_Frontend_Implementation_Plan.md) v1.3 F5／§7／§7.1。受影響：02 v1.1 §6／§6.1／§7／§9～10、06 v1.1 §4／§8～9、04 v1.0 dirty／未保存離頁規則。沒有新增產品或 API 規則。
- 唯讀後端 [SNAPSHOT](../../backend-ref/SNAPSHOT.md)：2026-10-11／master／SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`。Domain v1.1、Part B v1.0、Constraints v1.1 的 config 語意沿用；manifest 本次 **108／108 相符**，未修改快照。live SHA／DB／readiness **UNCONFIRMED**，快照 R10／R11 歷史結果不代稱本次整合 PASS。
- 實測 Node **24.21.0**／npm **11.19.0**；已安裝 Nuxt 4.6.1、Nuxt UI 4.11.3、Tailwind 4.3.3、TypeScript 5.9.3、Zod 4.6.5、Vitest 5.0.3、lossless-json 4.3.1、Playwright 1.64.0。build 為 Vue 3.5.43／Vite 8.3.4／Nitro 2.13.4；未安裝或升級依賴。

## 4. 實際命令、結果與失敗歷史

[去敏摘要](evidence/F5_R1_Correction_20261012/verification-summary.json) 保存逐案前後結果、命令、raw hash、版本與歷史檔核對。raw 原件位於 ignored `output/playwright/f5-r1-correction-20261012/`；不覆寫原 review probe。

| 命令／檢查 | 實際結果 |
| --- | --- |
| 修正前 `npm run test:unit -- tests/unit/f5-config-omission.spec.ts`（JSON reporter） | **FAIL：43／58 PASS、15 FAIL**；14 為 dirty 缺陷（8 組 undefined、4 組 variant=null、2 組錯題型空值），1 為測試錯把 JSON key 順序當契約。首份 JSON／log／當時測試源檔保留；只修案例名稱後，產品未改，再重現相同結果 |
| 第一輪產品修正後受影響 unit | **FAIL：224／225 PASS、1 FAIL**，只剩 key 順序斷言；產品規則符合固定預期 |
| 調整 wire 斷言的中間執行 | **FAIL：219／225 PASS、6 FAIL**，測試錯把 parser 的 ExactNumber 與 DTO 整數直接比較；改為固定 DTO Body 核對及長小數 literal wire 檢查，失敗檔全部保留 |
| 最終受影響 unit（下列命令） | **PASS：7 files、225／225**，新增 58／58；F5 Editor／Delta／Answer＋F2 exact number／common adapters／API client 相容回歸 |
| `npm run lint` | **PASS**，exit 0 |
| `npm run typecheck` | **PASS**，exit 0；Nuxt＋tools strict |
| `npm run build` | **PASS**，exit 0；DEP0155 dependency exports mapping warning 保留，無 application error；其後只修測試斷言及文件，產品未再變更 |
| `node output/playwright/f5-r1-correction-20261012/domain-probe.mjs` | **PASS：7／7**，四組 undefined＋三組 candidate／固定 replacement Body |
| diff／staged diff／交付範圍核對 | **PASS**；僅局部 config 比較、回歸與交付／進度，沒有共用比較改寫或 API 契約修改 |
| 原 review／probe／F5 報告與兩份證據／lockfile | **PASS：8／8 bytes 不變**；backend manifest **108／108 PASS** |

```powershell
npm run test:unit -- tests/unit/f5-config-omission.spec.ts tests/unit/f5-editor.spec.ts tests/unit/f5-definition-request.spec.ts tests/unit/f5-answer.spec.ts tests/unit/exact-number-gate.spec.ts tests/unit/common-adapters.spec.ts tests/unit/api-client.spec.ts
```

Browser／真實 API／DB／正式 AI／人工驗收 **NOT RUN**：本次只修純 config 比較，沒有 Cookie／CORS、導航／beforeunload 或 UI 接入變更，以必要 unit 驗轉換與拒絕語意；歷史 Browser 結果未重跑、不列成本次 PASS。既有真實 ≥11／21 筆清單／filter／分頁 Auth、角色／狀態／隱藏／已刪除／截止 Form、disabled／受控故障／晚回前置維持 **BLOCKED**；npm ci／audit 與 live 版本缺口保留。沒有 API／DB 寫入或測資變動。

## 5. Git、歷史保留與停止點

原 [review 報告](../review/F5_Code_Review_Report_20261012.md) 與 [獨立證據](../review/evidence/F5_Independent_Verification_20261012.json) 保持原 bytes、原未提交狀態，不納入修正 commit；其首次 probe 失敗結果保留。原 [F5 開發報告](F5_Development_Report.md)／證據未修改；本報告追加最新修正狀態，不覆寫原審查結論。

本次僅局部產品修改、新 unit、本報告／兩份去敏證據與 README／總計畫必要進度作單一目的本機 commit。完整 SHA 見交付訊息／`git log -1`，避免同一 commit 報告自指 SHA；父 SHA 已列 §3。提交後 `git status --short` 只保留上述兩份原 review `??`，沒有其他未提交變更。

**停於「F5-R1 補正完成、待局部複核」。不自行宣告 F5 review 通過；正式驗收維持延後，不代填 accepted，不推送、不展開 F6；既有真實測資缺口保留。**
