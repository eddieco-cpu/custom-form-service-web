# F4-R1 局部獨立複核

日期：2026-10-12（Asia/Taipei）。目標與執行 HEAD 均為 `5bcd6ec5c4d3551689f9064a368f592d5a258c7b`，父提交 `ddccaccf358a54fb44ba72bd3c241c7727912f30`；接手工作樹乾淨，完整修正 diff 為 10 檔，產品只有 `useFormsList.ts`／`form-read.ts` 兩檔變更。

**F4-R1 結案，F4 code review 通過；未發現新增阻擋問題。** 依 Owner 本次明確指示，在無阻擋問題時記錄結案並同步進度。本次僅複核、必要驗證與文件交付，未修改產品／測試；正式 AI／人工驗收仍延後，不代表 F4 accepted。

## 四項複核結論

| 項目 | 結論與依據 |
| --- | --- |
| 起點政策與資料／請求隔離 | `captureAuthPresentation()` 只回傳 `dialog`／`redirect`；`load()` 的預設參數每次入口重新擷取，只對同一刷新中的一次遞迴對齊傳入原值。沒有全域政策或舊 DTO cache。query／session 的同步 watcher 仍清 snapshot；每支 GET 都 `scope.begin()`，採用前檢查 current，finally 只結束自己的 ticket。首次自動讀取、無資料 manual retry 仍 redirect，外部新 query 不沿用舊政策。新增 12 案與原 controller／service 回歸通過。 |
| 第二支 GET 的三種 Auth 401 | fresh built 的 REQUIRED／INVALID／EXPIRED 均通過：第二支 GET 回應前資料已清、User 尚在、loading 持續；回 401 後清 User／私有資料、結束 loading，但 Dialog 與原 `/forms` URL 保留。REQUIRED 用頁尾關閉、INVALID 用 ×，各一次，之後才 replace；保留完整 path＋query＋hash，history 長度不增加、登入標題取得焦點。EXPIRED 用 Browser Back 驗 Dialog 後外部路由撤銷，登入返回目標為新 `/`。 |
| 外部 query／route／session／卸載 | 新 unit 在不可取消的 deferred 401 回來前、Dialog 建立後，分別切 query／route／session／dispose；舊結果／晚 close 不清新 User、不導舊 URL、不結束新 loading。built B11 驗第二支 GET pending 時切 filter、離頁、實際產品登出（API 合成），舊流程不產生 Dialog／誤導航；filter 只採新結果。Browser 可能取消舊 request，因此不可取消晚回的證明以 deferred unit 為準，沒有把 Abort 當成唯一 guard。 |
| 修正前後與歷史證據 | 修正前兩份產品 hash 與父提交 Git blob **2／2** 相符；原件呈現三種 code 都在 Dialog visible 斷言 FAIL、實際已跳登入，並非 locator 故障。修正後 source／raw hash 相符，本次又用目標 HEAD fresh build 獨立重驗。原 review、重現 probe、歷史失敗、原 F4 與 F2／F3 證據未覆寫，見下節核對數量。 |

原問題為 [F4-R1／P2](F4_Code_Review_Report_20261012.md)，修正範圍與開發自測見 [修正報告](../implementation/F4_R1_Correction_Report.md)。未改 API、Auth session、request scope、Dialog／焦點元件、FormDetail 路由或定義／答案資料生命期；沒有新增 Form 寫入、Latest／Count／Statistics、持久化或 F5 功能。

## 本次獨立執行與證據適用性

環境：Node **24.21.0**、npm **11.19.0**、Nuxt **4.6.1**、UI **4.11.3**、TypeScript **5.9.3**、Vitest **5.0.3**、Playwright **1.64.0**／Chromium **156.0.8078.4**。依賴／lockfile 未改，未重新安裝。Browser 以 `http://localhost:3000` 的 **fresh built 產品**執行，API 全為合成攔截，不代表真實後端整合 PASS。

| 實際命令／檢查 | 結果 |
| --- | --- |
| `npm run lint`、`npm run typecheck`、`npm run build` | **PASS**，exit 0；Nuxt＋tools strict，fresh build 完成後才跑 Browser |
| `npm run test:unit -- tests/unit/f4-form-read.spec.ts tests/unit/api-client.spec.ts tests/unit/scoped-state.spec.ts tests/unit/f3-auth.spec.ts` | **136／136 PASS**，4 檔；F4 42 案包含新增 12 案，共用 94 案。直接 import 實際產品 controller／service／client，未以測試替身實作政策 |
| built `--grep 'F4-R1\|F4-B01\|F4-B02\|F4-B05\|F4-B06\|F4-B08'` | **12／12 PASS**，一次 fresh 執行、0 skipped／flaky／retry；新增 6 案＋受影響既有 6 案。B01 刷新保留／filter、B02 對齊一次／再次縮頁停止／空清單不重查、B05 兩種既有 Auth close、B06 stale filter、B08 初次／unknown／卸載均涵蓋 |
| `git diff --check 5bcd6ec^ 5bcd6ec` | **PASS**；完整修正 diff 核對完成 |
| 來源／歷史核對 | **PASS**：修正交付來源 11／11（複核開始、進度文件更新前）、修正 raw 21／21；原 review 2／2、reviewer probe 2／2、原 raw 含失敗 28／28、F2／F3 證據 5／5、原交付證據 4／4、未受影響產品／測試來源 26／26、原 F4 摘要 1／1、修正代表截圖 1／1、backend manifest 108／108 |

Browser 使用既有 `npm run test:e2e -- --config=playwright.f4.config.ts`，設定 `F4_MODE=built`、獨立 `PLAYWRIGHT_JSON_OUTPUT_NAME`、`--reporter=list,json` 與 `--output=output/playwright/f4-r1-independent-review/built-artifacts`。本次完整命令、逐案結果、三種 code 的前後觀察／最終導航、來源與原件 hash 見 [去敏驗證摘要](evidence/F4_R1_Independent_Verification_20261012.json)，raw／log 留 ignored `output/playwright/f4-r1-independent-review/`。三張新 Dialog 截圖均實際檢視，只含合成 UI，私有列表與舊 User 沒有留在畫面。

修正前 fresh built **3／3 FAIL** 與修正後 **11／11 PASS** 是開發修正階段的歷史執行；本次核對其 JSON／log／source snapshot／hash，不在產品工作樹倒退重跑舊版，也不將其列為本次執行。修正前 Browser 測試檔屬先加入 B10 的中間測試版本，不能冒稱父提交原有測試；產品兩檔與父提交 bytes 相符，失敗位置與觀察對應 B10。修正後完整測試來源與目標相符，本次 fresh built 12 案再直接覆蓋目前程式。

未受影響的 F4 角色／狀態／根資訊與 dev session harness，沿用原獨立 review 的有效 dev 14／built 10 證據；此次只追加起點政策與對齊 Auth 回歸。F2 原生 timeout／精度、F3 Cookie／CORS／焦點等機制未改，沿用已核對的有效歷史證據，不全面重跑 F1～F3。build DEP0155、Browser NO_COLOR／FORCE_COLOR 為既有工具診斷；所跑案例的非預期 console／page error 與 API 斷言均通過。

來源 audit 最初在 sandbox 啟動 git 子程序受阻，經自動核准以唯讀方式完成；unit／Browser 依先前已知的子程序限制直接使用自動核准的本機測試執行，沒有自動審核拒絕或產品測試 FAIL。

## 未驗證與交付停止點

- 真實非空 ≥11／21 筆清單、filter／縮頁／對齊第二支 GET 三種 Auth 401、三狀態跨角色、隱藏 Draft／已刪除／截止表單及受控故障／晚回：**BLOCKED**，測資／受控前置仍缺，合成結果不解除。
- 原 F4-L01 真實空清單／Cookie reload／CORS／無效及不存在 ID／AUTH_REQUIRED 歷史結果保留；本次真實 API／後端／DB 操作 **NOT RUN**。未建立帳號或表單。
- 後端契約為唯讀 `backend-ref/` 2026-10-11 快照，SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`；live Git SHA／process checkout／DB 版本仍 **UNCONFIRMED**，不以快照代稱 live。
- 正式 AI／人工驗收、其他 Browser／人工實機、npm ci／audit／generate **NOT RUN**；既有安裝／audit 缺口保留。**F4 code review 通過，但未 accepted；F1／F2／F3 正式驗收仍延後。**

引用核准 F4 v1.0 §3／§4、總計畫 v1.3 F4／§7／§7.1、AGENTS v1.1 與 Round Development Skill；前端 01 §5、04 §4／§5.2、05 §7／§9、06 §10（06 v1.1，其餘 v1.0）。契約與已核准產品行為未變，未發現來源衝突。

依 Owner 本次指示，僅新增本報告／去敏摘要，更新 README、總計畫與 F4 開發報告的最新進度；舊章節與修正報告／原 review／歷史證據保留。以單一目的本機文件提交交付，完整 SHA 與提交後 Git 狀態見 Git log／交付訊息，不自指 SHA。**停止於 F4-R1 結案與 F4 code review 通過，不推送、不展開 F5 或正式驗收。**
