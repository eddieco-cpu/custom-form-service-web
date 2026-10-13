# F5-R1 局部獨立複核

日期：2026-10-13（Asia/Taipei）。**F5-R1 結案、F5 code review 通過。** 本次局部複核沒有新增阻擋或非阻擋 finding；原 [F5 集中 review](F5_Code_Review_Report_20261012.md) 的唯一阻擋 F5-R1／P2 已修正。本結論追加於新文件，原 review 內容與失敗證據保留。依 Owner 本次「若通過，同步進度」指令更新 README／總計畫；正式驗收延後，F1～F5 accepted 不變，不推送、不展開 F6。

## 1. 版本、範圍與依據

- 複核目標與執行檢查時的 HEAD：`75860ac18f731ffa566dfed09c3f3c60cb65cbb5`；修正基準與目標直接父提交：`e4da993470bf89388b899e046e22ccea3a652a93`。工作目錄 `C:\Users\user\Desktop\custom-form-service-web`，branch `master`。接手時僅原 review 報告／獨立證據兩檔 untracked，沒有產品或測試的未提交變更。
- 讀取實際七檔修正 diff；唯一產品修改是 [editor.ts:156](../../app/domain/editor.ts#L156) 的 config 比較投影。閱讀新增 [58 案回歸](../../tests/unit/f5-config-omission.spec.ts)、既有 validator／Delta／共用比較、[補正報告](../implementation/F5_R1_Correction_Report.md)、候選／Body 證據及原始回歸失敗紀錄。核對證據的來源版本，沒有只採開發報告結論。本次不修改產品、測試或依賴。
- 工作規範：[AGENTS](../../AGENTS.md) v1.1、[round development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫](../implementation/V1_Frontend_Implementation_Plan.md) v1.3 F5／§7／§7.1／§8.1，以及已核准 [F5 計畫](../implementation/F5_Implementation_Plan.md) v1.0 §2～3。相關前端：02 v1.1 §6／§6.1／§7、04 v1.0 §7、06 v1.1 §8～9。
- 正式契約來自唯讀 [backend-ref](../../backend-ref/SNAPSHOT.md)，2026-10-11／`7591633137c5a6f57c1fce8e1ba19ab394015880`：Domain v1.1 FORM-05／QST（config 完整替換、允許 key、非法 null、Draft 的 Rating 可不完整）；Part B v1.0 §7.2。manifest **108／108 hash 相符**。live 後端 Git SHA／DB 版本與 readiness 本次未重新核對，維持 UNCONFIRMED。
- 實測 Node **24.21.0**／npm **11.19.0**；Vitest **5.0.3**。build 顯示 Nuxt **4.6.1**／Vite **8.3.4**／Vue **3.5.43**／Nitro **2.13.4**；package／lockfile 未修改，其餘版本沿用原 F5 證據。

## 2. 複核結論與程式位置

| 目標 | 實際核對與獨立結果 |
| --- | --- |
| 合法 undefined／省略一致 | [editor.ts:156](../../app/domain/editor.ts#L156)～179 先依題型白名單判定合法 key，只有合法可選 key 的 undefined 被省略，再以缺少 variant 表示套用呈現預設。新增 unit 的 **12／12** 皆 Draft valid、Delta noop、dirty=false，candidate 不含該 key；raw own undefined 與 baseline 維持獨立。原 review 四組另用獨立 probe 核對，均恢復 clean／noop。 |
| 清除既有設定 | [回歸:59](../../tests/unit/f5-config-omission.spec.ts#L59)～77 的 **12／12** 皆 dirty=true、Delta ready；固定完整 Body `{questions:[{id,config:expected}]}` 保留其他設定，只移除清除的 key，沒有附加 type。非預設 variant 清除回預設也產生真實差異；省略／明確相同預設的既有相容規則維持 02 §6.1。獨立 probe 另核 text minLength、number placeholder、Choice variant 三種 replacement，candidate／Body 與補正證據相符。 |
| 精確數值與完整 replacement | number placeholder 清除保留 `min:0` 與 `max:9007199254740993.1234567890123456789`；[回歸:73](../../tests/unit/f5-config-omission.spec.ts#L73) 與獨立 probe 均對完整 literal wire 斷言，沒有轉為浮點或遺失 bounds。 |
| null、未知 key、非法非空值 | [editor.ts:164](../../app/domain/editor.ts#L164) 保留未知／錯題型 key；[179](../../app/domain/editor.ts#L179) 只對省略 variant 加預設，明確 null 不再被呈現 fallback 掩蓋。新增 **12 null＋9 未知／錯題型＋12 非法非空** 案皆 dirty=true、Draft／Delta invalid；原始輸入保留。validator 的 strict schema／拒絕規則未改。 |
| 共用比較未放寬 | [semanticEqual:148](../../app/domain/editor.ts#L148)～154 在兩 SHA 間無 diff；仍比較 own key 數量／歸屬。新增 unit 與獨立 probe 均確認 `{unknown:undefined}`／`{value:null}` 對 `{}` 不相等。省略語意只在 config 投影處理。 |

**阻擋 findings：無。非阻擋 findings：無。** 原 finding 的具體影響（合法 noop 卻持續 dirty、後續 UI 無法解除未保存狀態）已由目前產品與固定預期的獨立檢查解除；本次仍是 Domain review，沒有宣稱已驗證 Browser 離頁體驗。

## 3. 中間斷言與補正證據

逐項核對 ignored `regression-before.spec.ts` 與最終測試的實際 diff，以及五次原始 JSON：修正前 **43／58 PASS、15 FAIL**（命名補正前後相同），產品修正後 **224／225 PASS、1 FAIL**，中間 wire 比較試調 **219／225 PASS、6 FAIL**，最後 **225／225 PASS**。全部保留為歷史，不把中間失敗改寫成 PASS。

原測試要求序列化後 object key 順序完全一致；text replacement 實際 `{placeholder,maxLength}` 與固定預期 `{maxLength,placeholder}` 同義。最終仍保留 [71](../../tests/unit/f5-config-omission.spec.ts#L71) 的固定完整 DTO Body 比對及 candidate、dirty、ready、無 type、baseline／raw 檢查，只移除非契約的通用 key 順序要求，另保留長小數完整 literal wire。中間 `parseExactJson` 試調把解析後的 `ExactNumber` 整數與 DTO 的 native integer 比較，對六個 text／rating 案失敗；獨立 probe 重現這項型別差異及 object key 順序同義，沒有降低數值或 replacement 的契約預期。

中間 raw JSON 可核對案例、數量與失敗斷言位置，但不含完整 expected／received diff，且沒有該試調的完整來源快照。本次因此以修正前來源快照→最終實際 diff、最終固定預期及獨立重現共同確認；不宣稱已還原每個中間檔案版本。

本次獨立核對：補正摘要記錄的 **sourceFiles 5／5、preservedFiles 8／8、rawArtifacts 24／24 hash 相符**；七組候選／Body 證據也以精確 JSON 解析後比對本次實際結果及固定預期。詳見 [新獨立證據](evidence/F5_R1_Independent_Verification_20261013.json)。原 review 兩檔 bytes 未改：報告 SHA-256 `d3880da0b7fd1506930c88aa74a2c105ab5f1244e0b1bda465299fe1d6c5146f`；獨立證據 `4d67e6c71eca7635c293484ed948529bdb6049f0552ee4e20a8760863e0b9ddd`。

## 4. 本次實際獨立驗證

選用受影響 F5 純資料 unit、直接相依 F2 精確數值／adapter／decoder／locator 回歸及一次必要工程檢查。沒有共用機制或 Browser 接入變更，不擴大重跑 F1～F4 Browser／業務流程。

| 命令／核對 | 本次結果 |
| --- | --- |
| 下列 F5／F2 unit 命令 | **PASS，7 檔 225／225，exit 0**；2026-10-13 19:15:58 台北時間起，含新增 58 案。tool stdout／exit code 為本次執行依據，原補正 JSON 另列歷史。 |
| `npm run lint` | **PASS，exit 0** |
| `npm run typecheck` | **PASS，exit 0**；Nuxt＋tools strict |
| `npm run build` | **PASS，exit 0**；DEP0155 dependency exports mapping 及 PLUGIN_TIMINGS warning，沒有 application error |
| `node output/playwright/f5-r1-independent-review-20261013/domain-probe.mjs` | **PASS，exit 0**；7 組合法／replacement、6 組非法、共用比較及斷言調整核對。純 Domain 合成 fixture，沒有 API。 |
| `git diff --check e4da993470bf89388b899e046e22ccea3a652a93 75860ac18f731ffa566dfed09c3f3c60cb65cbb5` | **PASS，exit 0** |
| `git diff --exit-code 75860ac18f731ffa566dfed09c3f3c60cb65cbb5 -- app tests package.json package-lock.json` | **PASS，exit 0**；本次產品／測試／依賴不變 |
| 文件連結／去敏內容／提交範圍與 staged diff | **PASS**；六檔、102 個相對連結、JSON／控制字元／末尾換行核對通過，沒有秘密或真實個資。只暫存六份授權文件，staged diff check 通過；原兩檔 raw blob 與 index blob 完全相同。 |

```powershell
npm run test:unit -- tests/unit/f5-config-omission.spec.ts tests/unit/f5-editor.spec.ts tests/unit/f5-definition-request.spec.ts tests/unit/f5-answer.spec.ts tests/unit/exact-number-gate.spec.ts tests/unit/common-adapters.spec.ts tests/unit/api-client.spec.ts
```

unit／probe 在自動審核允許後於沙箱外執行，沿用既知 Vite 子程序 spawn EPERM 的環境限制；本次未先製造一次沙箱失敗。獨立 probe 首次把含 undefined 的內部 baseline 當 wire JSON 序列化而 **FAIL，exit 1**，屬 probe 錯誤；保留首次 script／紀錄，改用獨立快照比較後上述 PASS，產品／測試沒有變更。

## 5. 未驗證範圍、提交與停止點

Browser／真實 API／DB／正式 AI／人工驗收 **NOT RUN**。本次只處理 config 比較投影，沒有 Cookie／CORS、導航、beforeunload、UI 或保存讀回接入；unit／probe 不代稱後端整合 PASS。既有真實非空 ≥11／21 筆清單／filter／分頁 Auth、Owner Draft／Published／Closed 與跨角色、隱藏／已刪除／截止 Form、disabled／受控故障／晚回測資維持 **BLOCKED**；live 版本／readiness、npm ci native binding EPERM／audit、其他 Browser／人工實機缺口保留。

本機單一目的文件提交納入原 `F5_Code_Review_Report_20261012.md`／原獨立證據、新複核報告／新獨立證據及 README／總計畫必要進度。原報告、原失敗、補正文件與 F5 開發證據保留；ignored 原始資料維持本機，不提交生成產物。完整 commit SHA／實際最終 Git 狀態由交付訊息與 `git log -1` 記錄，避免同一文件自指提交 SHA。

**停止於「F5-R1 結案、F5 code review 通過」；後續由 Owner 指定。正式驗收維持延後、accepted 不變、不推送、不展開 F6。**
