# F4-R1 局部修正報告

版本：1.0／2026-10-12（Asia/Taipei）。**F4-R1 修正完成，待局部複核**。本報告為開發修正與自測，未宣告 review 通過或 accepted。

## 授權、問題與實際修正

Owner 確認 [F4-R1／P2 finding](../review/F4_Code_Review_Report_20261012.md)，直接授權局部修正、必要回歸及本機提交，不另設修正／測試計畫核准。原先已載入第 3 頁後手動刷新，第一支 GET 將總頁數縮至 2，query 改變清資料後，第二支 GET 重新以空資料判斷 Auth 政策，導致 401 直接導航而跳過 Dialog。

- `FormReadController.captureAuthPresentation()` 只擷取操作起點的 `dialog`／`redirect` 值；`read()` 新增可選的呈現參數，未提供時維持原本「manual 且已有資料才 Dialog」的行為。
- `useFormsList.load()` 在入口擷取政策，僅傳給這次最多一次的自動對齊 GET。未保存前條件 items／snapshot，也未建立全域政策或把全部 manual request 改成 Dialog。對齊仍先清舊清單，每支 GET 各自使用最新 key／session ticket。
- 正式 Auth 401 採用後清 User／私有資料、保留 Dialog；關閉／× 才 replace 到登入並攜帶完整返回 URL。自己的 Auth revision 與外部 query／session／route／卸載的撤銷流程沿用既有機制；沒有改 API、scope、Auth session、router 或 Dialog 元件。

產品變更只有 `app/domain/form-read.ts`、`app/composables/useFormsList.ts`。回歸補在既有 `tests/unit/f4-form-read.spec.ts`、`tests/e2e/f4-browser.spec.ts`；未新增依賴或測試 harness，未展開 F5～F10。

## 引用來源與版本

沿 AGENTS v1.1、[Round Development Skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、核准 F4 計畫 v1.0 §3／§4、總計畫 v1.3 F4／§7／§7.1；受影響前端 01 §5、04 §5.2、05 §7／讀取互動、06 §10（01／04／05 v1.0、06 v1.1）。Playwright Skill 沿用；本次 Owner 明確要求正式回歸測試，故使用既有 Playwright Test 檔案。未發現契約衝突。

前端起點／master：`ddccaccf358a54fb44ba72bd3c241c7727912f30`，工作樹乾淨；原產品提交為 `85cfd19fc0c96231c9ae083ed407789a67b693a3`。實際 Node **24.21.0**／npm **11.19.0**，Nuxt **4.6.1**、UI **4.11.3**、TypeScript **5.9.3**、Vitest **5.0.3**、Playwright **1.64.0**／Chromium **156.0.8078.4**，package／lockfile 不變。

後端契約來源仍為本 repo 唯讀 `backend-ref/`，2026-10-11 快照 SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`；Part A／B／Errors v1.0、Domain v1.1。manifest **108／108** 相符。本次真實 API／後端／DB 操作 **NOT RUN**，live Git SHA／DB 版本仍 **UNCONFIRMED**；快照不能代稱 live。

## 正式回歸與必要工程檢查

命令、時間、逐案結果、修正前後觀察、來源與原件 SHA256 見 [去敏摘要](../test-results/evidence/F4_R1_Correction_20261012/verification-summary.json)。下列均為開發自測，Browser 使用 **fresh built 產品＋合成 API 攔截**，不是正式 AI／人工驗收或真實整合 PASS。

| 實際執行 | 結果／證明範圍 |
| --- | --- |
| 修正前 `npm run build`；built `--grep F4-R1-B10` | build **PASS**，Browser **3／3 FAIL**。三種 code 都在 Dialog visible 斷言失敗：兩支 GET 後清 User／私有資料，未關閉即到 login、Dialog=0。不是測試 locator 故障；原 log／JSON／error context 保留 |
| `npm run test:unit -- tests/unit/f4-form-read.spec.ts tests/unit/api-client.spec.ts tests/unit/scoped-state.spec.ts tests/unit/f3-auth.spec.ts` | 最終 **136／136 PASS**（4 檔，F4 42＋共用 94）。新增 12 案：政策跨清資料延續、首次對齊／無資料 manual retry 維持 redirect、政策不滲入新 query；不可取消的晚 401 及晚 close 在外部 query／route／session／dispose 後不採 Auth、不誤導航、不結束新 loading |
| `npm run lint`、`npm run typecheck`、修正後 `npm run build` | **PASS**。strict 涵蓋 Nuxt 與 tools／新測試；重新 build 完成後才執行下列 Browser |
| built `--grep 'F4-R1\|F4-B02\|F4-B05\|F4-B06\|F4-B08'` | 同一 fresh 執行 **11／11 PASS**，0 skipped／flaky／retry。新增 6 案＋受影響既有 5 案，詳細分工如下 |
| `git diff --check`／diff 與去敏核對 | **PASS**；僅本次修正、必要測試、報告／進度／去敏證據，原 review／歷史證據未改 |

B10 三種 code 皆驗第二支 GET 回應前：舊 query 資料已清、User 尚在、loading 持續、URL 不變、沒有 Dialog；回 401 後 User／桌面與手機私有清單清除、loading 結束、Dialog 留在 `/forms`、Escape 不關閉。`AUTH_REQUIRED` 使用頁尾關閉、`AUTH_TOKEN_INVALID` 使用 ×，各一次，驗完整 query／hash 返回 URL、history 長度不增加及登入標題焦點；`AUTH_TOKEN_EXPIRED` 用 Browser Back 驗 Dialog 後外部路由撤銷，返回 login 的目標為新的 `/`，不誤用舊 `/forms`。

B11 三個代表案例驗自動對齊第二支 GET 尚未回來時外部 filter／route／session 變動。filter 保留新 loading／User／URL 並只採用新 draft；route 離頁後舊 401 不影響首頁；session 以實際產品登出操作＋合成 logout 204 改變共享身分，舊 401 不產生 Dialog 或舊返回 URL。Browser 的取消行為不能單獨證明不可取消晚回，因此 unit 另外等待真實 deferred 結果處理完成，分別驗 session 與 route 在 Dialog 前／後撤銷。

既有 B02 一案重跑正常對齊（恰好兩支 GET）、再次縮頁停止、空清單回 1 不重查；B06 重跑 stale filter；B05 兩種原單次刷新 Dialog、B08 初次 Auth／unknown bootstrap／卸載回歸。未重跑不受影響的角色／狀態全組合、dev session harness、fixture strict、F2 原生 timeout／精度、F3 Cookie／焦點全矩陣；沿用 reviewer 與原交付的有效證據，不計入本次新 PASS。

## 證據保存與未驗證事項

原兩份 review 文件在接手 HEAD 的 `ddccaccf` 已保存，並非本次仍未提交；本次保持原 bytes 與歷史文字，不重寫該提交。報告 SHA256 `5773db4c6d441c41a38c2be4e34fb85d5c0801c5b6f77d5c819c4db07da84986`、review 摘要 `15023a55dc48165a85ef5b89151175f3f03ef96a4d22b4166711046c7fadabed` 相符。另核對 reviewer probe **2／2**、原 raw（含失敗）**28／28**、F2／F3 沿用證據 **5／5**、原交付影像／live 去敏證據 **4／4**、未受影響產品／測試來源 **26／26**；原 F4 摘要與歷史證據目錄沒有 diff。

本次 raw 使用獨立 ignored `output/playwright/f4-r1-20261012/`，保留修正前 FAIL、修正後 PASS 與兩次 unit PASS，未覆寫既有目錄。三張 Dialog 截圖均實際檢視，交付一張 [代表截圖](../test-results/evidence/F4_R1_Correction_20261012/alignment-auth-dialog.png)，另外兩張留 raw 並列 hash。證據只含合成 UI、必要 URL／請求路徑、觀察與 hash；沒有輸入／產生登入憑證、Cookie／Token、storageState 或 trace，沒有提交 generated Nuxt 秘密或原始 request headers／bodies。

- 本次真實「≥21 筆載入後縮頁、第二支 GET 三種 Auth 401」為 **BLOCKED**：非空測資與受控 Auth 前置未具備，合成 PASS 不解除真實缺口。
- 原非空 ≥11 筆／filter、Owner Draft、Published／Closed 跨角色、隱藏／已刪除／過期表單、INVALID／EXPIRED／disabled 與受控故障／晚回缺口維持 **BLOCKED**。原 F4-L01 真實空清單／Cookie／CORS 等結果保留，本次 **NOT RUN**，沒有再註冊帳號或建立 Form。
- 正式 AI／Owner 人工驗收、其他 Browser／人工實機、npm ci／audit／generate **NOT RUN**；live 版本未確認與既有安裝／audit 風險保留。

## 提交與停止點

單一目的本機提交：`fix: preserve F4 refresh Auth policy through alignment`。本報告與必要程式／測試、去敏證據及進度更新納入同一提交；完整 SHA 與提交後 Git 狀態見 Git log／交付訊息，避免自指 SHA。原 review 文件已在父提交，保持原樣；不提交不相關變更或 raw 產物。

**F4-R1 修正完成，待局部複核。不推送、不展開 F5～F10、不代填 review 通過或 accepted；F1／F2／F3 正式驗收仍延後。**
