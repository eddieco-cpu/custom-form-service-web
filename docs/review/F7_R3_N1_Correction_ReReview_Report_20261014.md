# F7-R3-N1 局部獨立複核與 F7 最終 review 結論

日期：2026-10-14（Asia/Taipei）。**No findings. N1 CLOSED、R3 CLOSED；R1／R2／R4 維持 CLOSED，F7 code review 通過、待 Owner 確認。** 此結論彙整原整輪 review、R1～R4 局部複核及本次 N1 獨立驗證；正式驗收延後，accepted 與既有缺口不變。本次沒有修改產品或既有 tests。

## 1. N1 結案與原兩案、Closed 補驗

原 [N1／P2](F7_R1_R4_Correction_ReReview_Report_20261014.md) 的缺陷是 logout 204 已清 Session，但清理 Form data 增加 revision、撤銷舊 permit，Header 未 replace login。本次直接核對 [AppHeader](../../app/components/AppHeader.vue) 第 32～55 行、[DirtyScope](../../app/domain/dirty-scope.ts) 第 8～43 行及 [useDirtyScope](../../app/composables/useDirtyScope.ts) 第 28～42 行；自身成功清理改由完成操作的 callback 銜接單次導航，原 permit 先消耗，新 permit 依清理後 revision 綁定 `/login`，仍驗 Form revision 與新的 Header RequestTicket。

在本次 fresh built 上，獨立使用原 reviewer 合成資料與 Published clean／Close unknown 觸發，另補 Closed clean／Visibility unknown。Closed 不提供 Close，所以其合法 unknown 由 Visibility PATCH 中斷建立，不虛構 Closed Close 行為。四案均為 API 攔截，沒有真實登出／寫入。

| 獨立 Browser 情境 | 結果 | 必要斷言 |
| --- | --- | --- |
| 原 Published clean | **PASS** | 原生確認 0 次；POST logout 無 body／204 一次；清 Header User，replace `/login` |
| 原 Published Close unknown | **PASS** | Close POST 中斷、保留 unknown 至接受登出；原生確認 1 次；logout 204 後 replace `/login`，不重問 |
| Closed clean | **PASS** | 原生確認 0 次；logout 204 後清 Session、replace `/login` |
| Closed Visibility unknown | **PASS** | 政策 PATCH 中斷；原生確認 1 次；logout 204 後清 Session、replace `/login`，不重問 |

四案均驗登入 Email 控制可見、Header「未登入」／舊選單消失、Form 核對入口消失、history.length 不增加、同一 App GET me 只有一次、零未預期請求／pageerror；預期中斷依 method／完整 URL／reason／次數與 diagnostic 精確配對。見 [四案原件](evidence/F7_R3_N1_ReReview_20261014/original-logout.json)／[Published unknown 畫面](evidence/F7_R3_N1_ReReview_20261014/logout-published-unknown.png)／[Closed unknown 畫面](evidence/F7_R3_N1_ReReview_20261014/logout-closed-unknown.png)。四張空登入畫面 byte-identical，已目視代表原件，沒有登入資料。

**N1 CLOSED。** 原 R3 的 SPA／beforeunload、可靠採用與 Delete 等回歸通過，且無新增 finding，故 **R3 CLOSED**；沒有以新增 repo 測試的 PASS 直接代替結案。

## 2. permit、外部變更與 finally 的獨立判讀

[17 項獨立隔離診斷](evidence/F7_R3_N1_ReReview_20261014/header-isolation.json) 編譯未改動的 AppHeader script setup，保留實際 imports 與控制流程，使用實際 Vue Memory Router／AuthSession／useDirtyScope／RequestScope／OperationState／FormRead／ActiveDirtyScope。只有 render、Nuxt globals 與 fetch 是合成注入；不把此層代稱實際 Browser，Browser 另見前節。

| 優先核對 | 判讀與證據 |
| --- | --- |
| 舊 permit／限定 transition | completeNavigation 先確認原 permit，再 clear 消耗，才同步清理並建立新 revision permit；舊 permit 無法第二次清理或導航。新授權只供 Header 此次 resolved `/login`，其他 route 仍需正常確認；原 permit 不對外換成可重用通行證。domain 補驗確認 cleanup 一次、其他 route 不借用授權。 |
| 自身成功清理 | Session revision 預期只增加 1，anonymous／null User／原 path 相符才開始新 Header RequestTicket。clean／unknown 實際 Header 各取得兩個 tickets，原 ticket 失效、新 ticket 供導航；成功後 busy／scope loading 都結束，Page 卸載移除 active bridge。 |
| pending 外部變更 | content、Session、RequestScope、Form write revision、SPA 離頁、卸載六種安排均使 late 204 不清新 Session／不導航 login。外部寫入明確核對 lease 確實推進 revision，避免把被 unknown 擋住的命令當成隔離證據。 |
| 清理後、guard 前外部變更 | content、Session、RequestScope、Form write revision 四種安排均拒絕 reserved login，沒有第二次詢問以放行舊操作。update 保留失效的 completed transition 到 finally，避免轉回普通確認復活舊導航；Header 後續清授權，下一次普通 dirty 導航仍詢問。 |
| 完成／拒絕／錯誤／卸載 | navigateWithPermit 的 finally、router afterEach／onError、onUnmounted 都清授權。實際 Router 的成功、拒絕、拋錯、未使用 permit 卸載及完成清理後卸載均核對；拒絕／錯誤後下一次 dirty route 重新詢問。 |
| 新 ticket／finally | Header finally 結束 busy 並 finish 目前持有 ticket；自身新 ticket 不留下 loading。若外部另啟新 request，舊 finally 不清掉該新 request loading；由它自己的 finish 結束。這是保護新請求，沒有以「全部設 false」掩蓋競態。 |
| F3 與原 R3 | fresh built F3 保留 dirty 登出取消零 request、單次成功 permit、disabled 登出、Logout 500 unknown／手動重試、pending 離頁隔離。F7 原 SPA／beforeunload 取消、可靠 current 採用、Delete 失敗撤 permit、Delete 204 replace 不重問等一併通過。 |

未發現 Session、RequestScope、content permit 或共用 Form write revision 被放寬。一般 DirtyScope 導航／Delete 仍走既有 bindNavigation；cleanup 參數只由 Header 成功登出使用。Editor／FormReadPage 只增加同 Form captureRead，未改 baseline、unknown 解除規則或 R1／R2／R4 修正。

## 3. 差異、來源與證據版本

- repo `C:\Users\user\Desktop\custom-form-service-web`／master，接手乾淨。指定修正基準 **`6d9c843a012cb0a24e194f1de2020ab294554f1b`**；產品修正 **`bfae7a7e767dff8762732535fb1f87bb09fb6b8c`**；最新交付／全部本次產品驗證 source **`313d87a4fc9696348808ec28dc5d55f86b716d0c`**。完整局部 diff 共40檔，包括五個產品檔、兩個 tests、報告／進度及證據；相關 call sites 與斷言皆核對。
- 依最新 [AGENTS v1.1](../../AGENTS.md)、[review skill](C:/Users/user/.codex/skills/.system/review-agent/SKILL.md) 的 defect-first／完整 diff／禁止委派，以及 repo [development skill](../../.agents/skills/v1-frontend-round-development/SKILL.md) 的 review 界線。review skill 的「Do not modify files, create commits」由 Owner 明確要求保存報告／證據與本機提交優先；產品／tests 仍唯讀，沒有代理委派。
- 核准 [F7 計畫 v1.1](../implementation/F7_Implementation_Plan.md) §2～3／§6／§8、[總計畫 v1.3](../implementation/V1_Frontend_Implementation_Plan.md) F7／§7／§7.1／§8；保留前次完整 00～07 閱讀，本次重讀前端 04 §4～12、01 §10、05 §7～10。正式後端依唯讀 [SNAPSHOT](../../backend-ref/SNAPSHOT.md) SHA **`7591633137c5a6f57c1fce8e1ba19ab394015880`**，重核 03b §4.3 Logout 無 body／204／缺少或過期 Cookie 仍允許的契約；其他正式來源與歷史界線沿用原 review，沒有契約衝突。
- 第二次提交 **只補證據格式與說明**：產品／tests／scripts／依賴／規格 Git diff 為零，七份 final source 在兩個提交及工作樹一致；既有 log 去除行尾空白／EOF 空行後內容一致，補保存最初格式 FAIL 與 commit／staged check logs。collect／closeout 只更新 log 正規化及說明，summary／manifest／digest metadata 重產；build digest 的檔案清單與 hashes 完全不變，沒有重建產品／重跑測試結果冒稱新 run。
- [獨立原件稽核](evidence/F7_R3_N1_ReReview_20261014/correction-evidence-audit.json)：修正 manifest **29／29**、raw 比對 **26／26**，七個 source hashes 與兩個 commits／工作樹一致；本次重建前修正 `.output` **157／157** 相符。歷史原 review **51／51**、開發 **70／70**、R1～R4 修正 **41／41**、局部複核 **41／41**、backend **108／108** 相符。缺於第一個提交的後補 log 查詢屬預期不存在，稽核 script 記錄後由第二提交／raw 原件核對，未假定第一提交已有那些檔案。
- 修正開發 F7 實際是完整 **50／50**，追加 reviewer Close unknown 後只跑 **1／1**，本次獨立則對 final test source 一次完整 **51／51**。未放寬原38案或新增斷言；第二提交沒有改 reporter／case 結果。首個產品提交的 whitespace check **FAIL** 與後續格式補正 **PASS** 均保留，不改寫歷史。
- 實測 Node **24.21.0**／npm **11.19.0**，Nuxt **4.6.1**／Nuxt UI **4.11.3**／Vue **3.5.43**／Nitro **2.13.4**／Vite **8.3.4**／TypeScript **5.9.3**／Vitest **5.0.3**／Playwright **1.64.0**／Chromium **156.0.8078.4**。後端 checkout 同快照 SHA、既存 `?? SNAPSHOT.md` 未動；本次 runtime／health／Cookie／DB 未重查，不以 checkout 冒稱 fresh backend integration。

## 4. 本次必要檢查與首次診斷歷史

依實際共用 Header／dirty 改動選擇 F3、F6 回歸；不另設計畫核准關卡。built 一律使用本次 fresh production `.output`，同元件 scope 兩案使用專用 fixture dev harness；全部 Browser 業務 API 攔截合成資料。沒有真實寫入或 Delete。

| 檢查／方法 | 獨立結果 | 原件 |
| --- | --- | --- |
| `npm run lint`／`npm run typecheck` | **PASS**；Nuxt＋tools strict | [lint](evidence/F7_R3_N1_ReReview_20261014/logs/lint.log)／[typecheck](evidence/F7_R3_N1_ReReview_20261014/logs/typecheck.log) |
| `npm run build` | **PASS**；DEP0155 warning 保留 | [build](evidence/F7_R3_N1_ReReview_20261014/logs/build.log) |
| scoped-state／F3 Auth／F6 Editor／F7 Management／F4 Read unit | **167／167 PASS，5 files** | [unit](evidence/F7_R3_N1_ReReview_20261014/logs/unit.log) |
| 完整 final source F7 built | **51／51 PASS** | [reporter](evidence/F7_R3_N1_ReReview_20261014/browser/built-n1-independent-rereview-results.json) |
| F3 built B06／B08／B10／B14 | **4／4 PASS** | [reporter](evidence/F7_R3_N1_ReReview_20261014/browser/n1-independent-f3-built-results.json) |
| F6 built B06～B09 | **11 PASS／2 harness-only skipped** | [reporter](evidence/F7_R3_N1_ReReview_20261014/browser/n1-independent-f6-built-results.json) |
| F6 fixture 同元件換 ID／pending old GET | **2／2 PASS** | [reporter](evidence/F7_R3_N1_ReReview_20261014/browser/n1-independent-f6-scope-results.json) |
| `npx vue-tsc --noEmit -p tests/fixtures/f6/browser/tsconfig.json` | **PASS**（無 stdout） | [log](evidence/F7_R3_N1_ReReview_20261014/logs/harness-typecheck.log) |
| 原 N1 兩案＋Closed兩案獨立 Browser | **4／4 PASS** | [原件](evidence/F7_R3_N1_ReReview_20261014/original-logout.json) |
| 實際 Header／Router／scope 隔離補驗 | **17／17 PASS** | [原件](evidence/F7_R3_N1_ReReview_20261014/header-isolation.json) |

全部命令、case 與版本見 [verification summary](evidence/F7_R3_N1_ReReview_20261014/verification-summary.json)。一次性診斷首輪有以下失敗，均保留原 script／log／JSON，不改產品或 tests 求 PASS：

1. Header 首輪 **15 PASS／1 FAIL**，另有 renderer 非同步 TypeError：外部寫入安排用了已被 Visibility unknown 鎖住的 Visibility policy，未推進 revision；Memory Router 的新 render hook 也需要 getRootNode。改用仍可取得 lease 的 Delete policy並明確要求命令不是 blocked、captureRead 失效，補 renderer 根介面。第二次 **16／16 PASS**；再補完成清理後卸載及 active bridge 移除，最終 **17／17 PASS**。這些是 fixture／renderer 修訂，不是產品修正或產品 finding。
2. 獨立 Browser 首輪 **4 FAIL**：兩個 clean 案已通過 URL `/login` 斷言，但 exact textbox 名稱漏了 Email required marker；兩個 unknown 案的關閉按鈕定位同時命中 × 與文字按鈕，未進到登出。改用實際 Email label 與文字關閉按鈕後 **4／4 PASS**；導航、Session、確認次數、history、request body／次數等斷言保持。見 [首輪原件](evidence/F7_R3_N1_ReReview_20261014/original-logout-first.json)。

本次 npm／repo Browser 首次執行均 PASS；上述 reviewer 診斷失敗不能當成 N1 回歸 FAIL，亦未從交付中刪除。Node experimental transform-types warning 保留。產品與 build 在上述診斷修訂／全部 built runs 之間未變。

## 5. F7 最終 code review 結論

| Finding | 最終狀態 | 依據 |
| --- | --- | --- |
| F7-R1 本地 Publish 首個可編輯控制／完整摘要 | **CLOSED** | 前次獨立複核及本次完整 F7 回歸；定位／摘要產品沒有再改 |
| F7-R2 Clipboard 晚回隔離 | **CLOSED** | 前次獨立複核及本次完整 F7 回歸；Clipboard 修正保持 |
| F7-R4 管理失效約束 Editor UI／保存 controller | **CLOSED** | 前次獨立複核及本次 F7／F6 回歸；deny bridge／controller gate 保持 |
| F7-R3 唯讀 unknown／丟棄 guard | **CLOSED** | 原 SPA／beforeunload／採用／Delete 回歸正常，N1 本次結案 |
| F7-R3-N1 成功登出未 replace login | **CLOSED** | 原兩案與 Closed 補驗、單次 permit／外部變更／finally 17項獨立診斷及必要回歸 |

**F7 code review 通過。** 此結論由 [原整輪審查](F7_Independent_Code_Review_Report_20261014.md) 的完整範圍與既有證據稽核、[R1～R4 局部複核](F7_R1_R4_Correction_ReReview_Report_20261014.md) 及本次 N1 範圍共同支持；不把未重跑的真實整合稱為最終版本 fresh live PASS，也不代填正式 AI／人工驗收或 Round accepted。

## 6. 交付、去敏與未驗證事項

新證據存 `evidence/F7_R3_N1_ReReview_20261014/`，raw 在 ignored `output/f7/n1-rereview-20261014/`／另名 Playwright output，未覆寫任何歷史。一次性腳本／F3 built config 以 `.txt` 保存；log 僅正規化 LF／行尾空白／EOF 空行。七份 source 與交付 commit 相符，[fresh build digest](evidence/F7_R3_N1_ReReview_20261014/fresh-build-digest.json) 記錄157檔；來源與產物之間所有 built runs 沒有重建。證據／文件與兩份 ignored 私有合成密碼原值比對零匹配，JWT／秘密欄位零匹配，沒有 storageState／trace；[manifest](evidence/F7_R3_N1_ReReview_20261014/artifact-manifest.json) 記錄 normalized-LF text／PNG binary hash。[交付檢查](evidence/F7_R3_N1_ReReview_20261014/closeout-check.json) 另記來源／build、文件連結、去敏及歷史進度保留結果。

真實 F3／F6／F7 整合沿用適用歷史證據；本次真實業務 API／Cookie 登出／寫入／Delete／新測資／SQL／DB reset／volume 操作均 **NOT RUN**。原15個 F7專用 Form、六份授權 soft-delete／九份保留與 F6 資料不動。真實 invalid／expired／disabled Token、Server commit 故障 **BLOCKED**；DB identity／migration **UNCONFIRMED**；實機、fresh live、額外 Chrome／Edge／Firefox／WebKit、npm ci／audit、不受影響完整 suite、正式 AI／人工驗收 **NOT RUN**。此局部複核不解除既有缺口。

本次只新增此報告／去敏證據、README最新進度及總計畫 §9.30，單一目的本機文件提交；完整 SHA／提交後 Git 狀態見交付訊息與 Git log，避免 commit 自引用。產品、tests、契約、依賴、backend-ref、所有原 review／修正報告／首次失敗證據保持不變。

**停於「F7-R3-N1 局部獨立複核完成、F7 code review 通過，待 Owner 確認」。** 正式驗收延後、accepted 與既有缺口不變，不推送、不展開 F8。
