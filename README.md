# 自建表單設計服務 — V1 前端規格與實作計畫

最新結果（2026-10-16）：**F10 AI驗收結果已交付，正式驗收結果待人工驗收／Owner確認。** Owner核准後的[計畫v1.1](docs/test-plan/F10_Acceptance_Test.md)先鎖定於`bc98f85309ef55ee1015e5727157e8d5fb9ba5ae`再執行；[執行報告](docs/test-results/F10_Acceptance_Execution_Report.md)／[逐案CSV](docs/test-results/evidence/F10_v1-f10-20261016-01/Case_Results.csv)記248筆：204 PASS／1 FAIL／43 BLOCKED，18父項不重複計數、人工全NOT RUN。完整真Browser＋真API核心、固定10題獨立oracle、五模式組態及Chrome/Edge已新跑；原目錄ci EPERM、特殊前置／實機、DI provider、audit決議、同timestamp及非Owner DELETE排程缺口保留，**整體未通過**。11帳號／45 Form／34 Response全保留，只有四份白名單soft delete各一次；原報告／首敗與重驗鏈保留，產品未修改、accepted不變、不推送部署。以下保留歷史授權與進度。

最新授權（2026-10-16）：**Owner 通過完整F10驗收計畫，授權局部補正後直接執行AI驗收。** 現行[計畫v1.1](docs/test-plan/F10_Acceptance_Test.md)已補E03五組命令／注入階段／固定URL、E03／M03引用及固定統計10題；[Plan Lock](docs/test-plan/v1-acceptance/Plan_Lock.json)鎖定計畫檔SHA256。先本機提交計畫，再按資料狀態順序執行；缺特殊前置／設備逐案BLOCKED並繼續。產品缺陷先回報、首敗與重驗保留、人工不代填，accepted不變、不推送部署。先前規劃交付及未提交敘述保留下列歷史。

最新進度（2026-10-16）：**Owner 採納 F9 集中 review，確認 F9 code review 通過；完整前端驗收計畫待 Owner review。** 以指定 `0e5a6dcadb4a52c184cef5fe46aff39eab6d40c6` 接手，交付 [前端 V1 獨立驗收計畫 v1.0](docs/test-plan/F10_Acceptance_Test.md)，涵蓋 F1～F9，供審查後於 F10 執行；附需求覆蓋矩陣、固定測資與獨立統計預期、六項特殊前置／實機與其他缺口、歷史證據適用範圍、AI／人工分欄結果空表及唯讀盤點。

本次只準備文件與唯讀盤點，沒有正式驗收、業務 API、Browser、DB 或測資變更；原報告、首次失敗與既有缺口保留，accepted 不變。文件留工作樹供 review、未提交，不推送、不部署；HEAD 維持接手基準。以下保留歷史交付與當時停止點。

最新開發進度（2026-10-15）：**F9 開發完成、待集中 review。** Owner 通過 [F9 精簡實作計畫 v1.0](docs/implementation/F9_Implementation_Plan.md)，以指定 `e25fe36ce887ce9a74fcbc66ee14e9edb4b7adf0` 授權整輪開發、自測、範圍內修正、受影響回歸、正常 API 測資準備與單一目的本機提交；原三份規劃文件一併核准。已完成獨立 Statistics GET／Header me 並行、九欄位 Root、五題型與完整分布／合法名單、精確 Number／Deadline、獨立錯誤／登入返回與舊回應隔離；Auth 僅補 App 私有的 bootstrap／credential-change 通知。

見 [F9 開發報告](docs/implementation/F9_Development_Report.md)／[逐案結果](docs/implementation/evidence/F9_20261015/case-results.json)／[測資索引](docs/implementation/evidence/F9_20261015/resource-index.json)。lint／strict typecheck／fresh build／harness strict PASS；unit **185／185**、F9 Chromium Browser **31**、受影響跨輪 **24**、Chrome／Edge smoke 各 **2** 最終 PASS。L01 24 格真實權限矩陣、L02 固定輸入／完整統計 Body／UI／獨立 GET、L03 零資料與狀態優先序共 **42 分案 PASS**，六個特殊 Cookie／停用／故障前置各 **BLOCKED**。三 Run 去重後 **3 個帳號／13 份 Form／14 份 Response 全保留**；首敗、修正及重測分列，未刪歷史資料、未改 SQL／DB／volume。

Owner 先前採納 F1～F8 獨立整合補驗的核心真實 API／UI／路由結果，含 F4 非空分頁／越界／三態路由／手機等補驗，見 [原報告](docs/test-results/F1_F8_Independent_Integration_Supplement_Report.md)；既有 review／特殊 Auth／交易故障與其他未驗證事項保留。沿用「計畫確認 → 整輪開發、自測與範圍內修正 → 集中 review」；完整前端驗收計畫於 F9 收尾後另行交付審查，再於 F10 執行。本次集中 review／正式 AI／人工驗收 NOT RUN，accepted 不變；只作本機單一目的提交，不推送、不展開 F10。以下保留歷史進度。

最新開發進度（2026-10-14）：**F8 開發完成、待集中 review。** Owner 通過 [F8 精簡實作計畫 v1.0](docs/implementation/F8_Implementation_Plan.md)，授權整輪開發、自測、範圍內修正、受影響回歸與單一目的本機提交；原三份規劃文件一併核准。以指定 `134629a8ce9d2b276ec7a3a10a6843977814f41b` 接手，已接正式 Submit／201 Receipt／主動 Latest／knownSubmitted，整份五型答案 mapping、填答資格／dirty／互斥／跨寫入舊 GET 隔離與 multiple duplicateRisk；沿 F5～F7 共用模型及機制，Preview 維持獨立。

見 [F8 開發報告](docs/implementation/F8_Development_Report.md)／[去敏證據](docs/implementation/evidence/F8_20261014/verification-summary.json)。lint／strict typecheck／build／F6 harness strict PASS，受影響 unit **201／201**、F8 fresh built **29／29**、F7 回歸 **34／34**、F6 fixture 回歸 **5／5**、Chrome／Edge smoke 各 **2／2**。真實 API L01～L05 最新分組測試 PASS，正常保存／獨立 Latest／Cookie CORS；三個專用 Run 共 **6 個合成帳號／18 份 Form／21 份 Response 全保留**，無歷史資料寫入、真實 Delete／PATCH／SQL。首次 FAIL／修正／重跑與 fixture／真實結果分列；runtime assembly 綁定已重查，DB identity／migration仍 UNCONFIRMED，受控特殊 Auth／Server 提交故障 BLOCKED、實機與正式驗收 NOT RUN。F7 Owner 確認 R1／R2／R3／R4／R3-N1 全 CLOSED、code review 通過的紀錄保留；正式驗收延後、accepted／其他既有缺口不變。本輪僅本機提交，不推送、不展開 F9。以下保留歷史交付。

最新 Owner 確認與規劃進度（2026-10-14）：**Owner 採納 F7 最終獨立複核，R1／R2／R3／R4／R3-N1 全部 CLOSED，F7 code review 通過；F8 計畫待 Owner review，尚不開發。** 確認來源見 [F7 最終報告](docs/review/F7_R3_N1_Correction_ReReview_Report_20261014.md) 與 [總計畫 §9.31](docs/implementation/V1_Frontend_Implementation_Plan.md#931-f7-owner-結案確認與-f8-規劃交付2026-10-14)；原報告、失敗證據與既有缺口保留，正式驗收仍延後、accepted 不變。

以乾淨 master／`134629a8ce9d2b276ec7a3a10a6843977814f41b` 接手，交付 [F8 精簡實作計畫 v1.0](docs/implementation/F8_Implementation_Plan.md)：Submit／Receipt／主動 Latest／knownSubmitted、五題型答案、收件資格、dirty、同 Form 互斥、結果不明核對與必要自測，沿用 F5～F7 共用模型、Renderer 與機制，Preview 保持獨立。沿用「計畫確認 → 整輪開發、自測與範圍內修正 → 集中 review」，不新增中途測試計畫核准關卡。本次只做文件與唯讀核對，health／readiness／OpenAPI 200 不代稱業務整合 PASS；runtime 本次未重查、DB identity／migration 及受控 Auth／交易故障／實機等缺口保留。文件留工作樹供 review，HEAD 不變；未開發、未執行業務 API 寫入、未提交／推送、不展開 F9。以下保留歷史交付。

最新 N1 複核進度（2026-10-14）：**F7-R3-N1 CLOSED、R3 CLOSED；R1／R2／R4 維持 CLOSED，F7 code review 通過、待 Owner 確認。** 獨立核對 `6d9c843`→`bfae7a7`→`313d87a` diff／原件，第二提交僅補正證據格式、產品／tests／build 不變。原 Published clean／Close unknown 與 Closed clean／Visibility unknown 四案獨立 PASS：204 清 Session、replace `/login`，clean 零確認、unknown 一次；17項實際 Header／Router 隔離補驗確認 permit 不重用、外部 content／Session／scope／write 拒絕舊清理／導航，finally／拒絕／錯誤／卸載清授權。見 [N1 複核及 F7 最終報告](docs/review/F7_R3_N1_Correction_ReReview_Report_20261014.md)／[獨立證據](docs/review/evidence/F7_R3_N1_ReReview_20261014/verification-summary.json)。工程／harness strict PASS、unit167／167、fresh built F7完整51／51、F3登出4／4、F6 built11 PASS＋2 skipped／scope2／2；reviewer 診斷首輪定位／fixture／renderer 失敗與歷史原 FAIL 均保留。產品／tests 唯讀、無真實寫入或 Delete，正式驗收延後、accepted 與既有缺口不變，僅本機文件提交，不推送、不展開 F8。以下保留歷史交付。

最新局部修正（2026-10-14）：**F7-R3-N1 修正完成、待局部獨立複核；R1／R2／R4 維持 CLOSED。** 接手 reviewer 提交 `6d9c843`、工作樹乾淨；讓本次已授權 logout 204 的 Session／Form 清理銜接單次 replace `/login`，外部 Session／content／scope／write revision 仍使舊結果失效。見 [N1 修正報告](docs/implementation/F7_R3_N1_Correction_Report.md)／[去敏證據](docs/implementation/evidence/F7_R3_N1_Correction_20261014/verification-summary.json)。工程／harness strict PASS，unit 167／167、fresh built F7 50／50＋原 Close unknown 補驗 1／1、F3 登出 4／4、F6 dirty built 11 PASS＋2 skipped／harness 補驗 2／2。原報告與 FAIL 保留，無真實寫入或 Delete；正式驗收延後、accepted／缺口不變，不推送、不展開 F8。以下保留歷史進度。

最新局部複核進度（2026-10-14）：**F7-R1～R4 局部獨立複核完成、待 Owner 確認；R1／R2／R4 CLOSED，R3 暫不結案。** reviewer 原七個失敗情境獨立重跑 7／7 PASS，另發現 P2：唯讀 Form 成功 Header 登出 204 清 Session 後 permit 失效，未 replace `/login`；unknown 與乾淨 Published 兩案均重現。見 [局部複核報告](docs/review/F7_R1_R4_Correction_ReReview_Report_20261014.md)／[獨立證據](docs/review/evidence/F7_R1_R4_ReReview_20261014/verification-summary.json)。lint／strict typecheck／fresh build／harness strict PASS，unit 304／304、F7 built 38／38、F6 built 15 PASS＋2 skipped／scope fixture 2／2、Chrome／Edge 各 3／3；追加採用隔離七案 PASS，新增登出兩次 FAIL 保留，尚不能宣告 F7 code review 通過。產品與 tests 唯讀、原 review／歷史證據保留，無真實寫入或 Delete；正式驗收延後、accepted 與既有缺口不變，僅本機文件提交，不推送、不展開 F8。以下保留歷史交付。

最新修正進度（2026-10-14）：**F7-R1～R4 修正完成、待局部獨立複核。** Owner 採納四項 P2 並直接授權局部修正／自測／回歸／提交。管理 404／Lifecycle 衝突同步撤銷 F6 保存資格，唯讀 unknown 接入 DirtyScope／ActiveDirtyScope，Clipboard 晚回核對 context／世代，Publish 本地錯誤定位首個可編輯控制並保留完整摘要。見 [局部修正報告](docs/implementation/F7_R1_R4_Correction_Report.md)／[去敏證據](docs/implementation/evidence/F7_R1_R4_Correction_20261014/verification-summary.json)。工程／harness strict PASS，unit 304／304、fresh built F7 38／38（原 reviewer 七案均 PASS）、F6 built 15 PASS＋2 skipped／harness 補跑 2／2、Chrome／Edge smoke 各 3／3。原 review／歷史報告／首次失敗／真實測資證據保留，本次無真實寫入或 Delete；正式驗收延後、accepted 不變、既有缺口保留，不推送、不展開 F8。以下保留歷史交付。

最新 review 進度（2026-10-14）：**F7 集中 review 完成、待 Owner 確認；有四項 P2，尚不能宣告 code review 通過。** 獨立核對 `47dbce5`→`084020a` 實際 diff、核准計畫、正式契約、報告與證據原件；追加 fresh built 診斷重現管理 404／409 未撤銷 Draft 保存資格、唯讀 Form unknown 未接 dirty／beforeunload、分享 Promise 晚回、發布本地驗證未聚焦首錯。見 [獨立 review 報告](docs/review/F7_Independent_Code_Review_Report_20261014.md)／[獨立證據](docs/review/evidence/F7_20261014/verification-summary.json)。lint／strict typecheck／fresh build／harness strict PASS；受影響 unit 289／289、F7 built 24／24、F6 built 15 PASS＋2 skipped及fixture補跑2／2、Chrome／Edge smoke各2／2，另Domain六案及確認×三案PASS。來源／artifact／原件及專用Delete inventory核對一致，真實整合只稽核既有證據，未新增真實寫入或Delete。產品與既有tests未修改，原FAIL／歷史資料保留；正式驗收延後、accepted不變、既有缺口保留，僅本機文件提交，不推送、不展開F8。以下保留歷史交付。

最新開發進度（2026-10-14）：**F7 開發完成、待集中 review。** Owner 通過 F7 計畫 v1.0 並授權整輪開發、自測與範圍內修正；Lifecycle／Visibility／Delete／Count／分享已接入，跨寫入舊 Form／資格 GET 永久隔離、政策白名單合併保留未保存定義、資格否定跨 SPA 返回維持。見 [F7 開發報告](docs/implementation/F7_Development_Report.md)／[去敏證據](docs/implementation/evidence/F7_20261014/verification-summary.json)。lint／strict typecheck／fresh build PASS、受影響 unit 231／231；fixture Browser 完整 24 案為 23 PASS／1 FAIL，導航同步修正後局部 2 PASS，逐案最新 24 個不同案例均 PASS；Chrome／Edge smoke 各 2 PASS。真實 API L01～L06、九格政策矩陣與資格補驗各 PASS；4 個專用合成帳號／15 份 Form，僅 6 份明列 delete-* soft-delete，9 份保留；歷史資料不動。首次 FAIL／重測與 fixture／真實結果分列；受控特殊 Auth／交易故障、DB identity／migration、實機及其他既有缺口保留。正式驗收延後、accepted 不變，僅本機提交，不推送、不展開 F8。以下保留歷史交付。

最新規劃進度（2026-10-14）：**F7 計畫待 Owner review，尚不開發。** Owner 確認 F6-R1／F6-R2 結案、F6 code review 通過；以乾淨的 master／`47dbce558bc628d250911f56af621ba8da2e8093` 接手，交付 [F7 精簡實作計畫 v1.0](docs/implementation/F7_Implementation_Plan.md)。計畫涵蓋 Lifecycle／Visibility／Delete／Count／分享的角色與狀態、確認及成功導航、dirty 與保存／發布分離、同 Form 寫入互斥／未知核對、Visibility 局部合併與必要 unit／Browser／真實 API 測資前置。沿用「計畫確認 → 整輪開發、自測與範圍內修正 → 集中 review」，不新增中途測試計畫核准關卡。本次僅文件及唯讀核對，health／readiness／OpenAPI 200 不代稱業務整合 PASS；runtime 程序綁定／DB identity／migration 及其他既有缺口保留。正式驗收延後、accepted 不變；文件留工作樹供 review，不推送、不展開 F8。以下保留歷史交付。

最新複核進度（2026-10-14）：**F6-R1／F6-R2 結案，F6 code review 通過；無新增 findings。** 以 `0aff8bb`→`8e85845` 局部獨立核對 diff／斷言／前後證據：同名 Stars 與跨 Renderer 的 label／0／星分／model 隔離、改名重排穩定性及 text／number／Choice 抽查通過；network helper 依操作前宣告精確配對，未知錯誤／次數不符拒絕，兩個負向 Browser 案確實驗證拒絕。見 [局部複核報告](docs/review/F6_R1_R2_Correction_ReReview_Report_20261014.md)／[獨立證據](docs/review/evidence/F6_R1_R2_Independent_Verification_20261014.json)。本次 lint／strict typecheck／fresh build／harness strict PASS、受影響 unit 60／60、fresh built Browser 23／23＋4 skipped、受影響 harness 6／6 PASS；一次性診斷失敗／限制保留。其餘 F6 review 結論與歷史 live 沿用，無真實寫入；產品與 tests 原樣、原 review／失敗歷史保留，正式驗收延後、accepted 不變，不推送、不展開 F7。待 Owner 確認後續階段，文件提交 SHA 見 Git log。以下保留歷史交付。

最新修正進度（2026-10-13）：**F6 兩項 P2 修正完成、待局部獨立複核。** Owner 確認 F6-R1／F6-R2 並直接授權局部修正；Stars 使用穩定 Question key＋Renderer instance 識別，標題另作顯示；Browser console 由各案例事先宣告 method／URL／status 或 failure reason／次數，再與實際事件及診斷配對。修正前回歸 FAIL、harness 過程 FAIL 與原 review／合成資料均保留。lint／strict typecheck／fresh build／harness strict PASS，受影響 unit 27／27、fresh built F6 Browser 23／23＋4 harness-only skipped、fixture 補驗 6／6 與新增斷言後單案 1／1 PASS。見 [局部修正報告](docs/implementation/F6_R1_R2_Correction_Report.md)／[去敏證據](docs/implementation/evidence/F6_R1_R2_Correction_20261013/verification-summary.json)。沿用歷史 live 保存，本次無新增真實寫入；實機／受控 Auth 與特殊資源／DB identity／migration 缺口不變。未自行宣告 code review 通過，正式驗收延後、accepted 不變；單一目的本機提交，不推送、不展開 F7。以下保留原 review 與開發歷史。

最新 review 進度（2026-10-13）：**F6 集中 review 完成、待 Owner 確認。** 獨立審查 `510b6ee`→`d86479d`，有兩項 P2：同標題 Stars 的 0 分 label／radio 跨題干擾，以及 Browser console helper 放行非預期失敗請求，尚不能宣告 code review 通過。見 [獨立 review 報告](docs/review/F6_Independent_Code_Review_Report_20261013.md)／[驗證證據](docs/review/evidence/F6_Independent_Verification_20261013.json)。本次 lint／strict typecheck／fresh build／harness strict PASS，unit 345／345、fresh built Browser 20／20＋3 skipped，補跑三個 fixture routes 3／3 PASS；追加診斷重現兩項問題。歷史 L01～L04 wire／九次獨立 GET 核對支持保存結論，本次無真實寫入。產品、tests、規格、歷史證據及後端資料未改；既有實機／受控 Auth／資源狀態／DB identity／migration 缺口保留。正式驗收延後、accepted 不變，不推送、不展開 F7；本機文件提交 SHA 見 Git log。以下保留歷史交付。

最新開發進度（2026-10-13）：**F6 開發完成、待集中 review。** Owner 通過 F6 計畫 v1.0 並授權整輪開發，已同步產品文案及本地輸入／Session 寫入資格分離至 [計畫 v1.1](docs/implementation/F6_Implementation_Plan.md)，完成 Editor／共用 Renderer／Preview 與 Create／Draft PATCH 接入。必要 lint／strict typecheck／build、unit 345／345、fixture Browser 23／23、built 20／20（3 個測試專用 route skipped）、Chrome／Edge 各 2／2 smoke、真實 L01～L04 保存與獨立 GET／Cookie CORS 自測通過；失敗原件與三次合成帳號／五份 Draft 均保留。見 [開發報告](docs/implementation/F6_Development_Report.md)／[去敏證據](docs/implementation/evidence/F6_20261013/checks.json)。實機觸控／軟鍵盤、受控真實 invalid／expired／disabled 與特殊狀態、DB identity／migration 前置仍未解除；fixture 不代稱真實整合 PASS。正式驗收維持延後、accepted 不變，不推送、不展開 F7；本機提交 SHA 見 Git log。下列段落保留歷史交付。

最新規劃進度（2026-10-13）：**F6 計畫待 Owner review。** Owner 確認 F5-R1 結案、F5 code review 通過，指定本次僅準備 [F6 實作計畫 v1.0](docs/implementation/F6_Implementation_Plan.md)、同步必要進度並本機提交。計畫承接 F5 Domain，涵蓋 Editor／Renderer／Preview、Create／Draft 保存後 IDs／基準重建、dirty／離頁與結果不明核對，列桌機／手機配置及 Browser／真實 API 保存讀回的必要驗證與前置缺口。沿用「計畫確認 → 整輪開發、自測與修正 → 集中 review」，不新增開發測試計畫核准關卡。本次 HEAD 基準 `0a8ceeb560b06a7ca2f847f019f8894cd346bce0`、接手乾淨；只有文件與唯讀核對，沒有開發或業務 API 操作。正式驗收維持延後、F1～F5 accepted 不變；不推送、不展開後續 Round。以下段落保留歷史狀態。

最新複核進度（2026-10-13）：**F5-R1 結案、F5 code review 通過。** 局部獨立複核目標 `75860ac18f731ffa566dfed09c3f3c60cb65cbb5`，確認合法 undefined／省略一致、完整 config replacement 保留其他設定，null／未知 key／非法非空值仍 dirty 且拒絕，共用比較未放寬，中間斷言未降低契約預期。見 [局部複核報告](docs/review/F5_R1_Correction_ReReview_Report_20261013.md)／[獨立證據](docs/review/evidence/F5_R1_Independent_Verification_20261013.json)。本次 F5／F2 unit 225／225、lint／strict typecheck／build PASS；原 review／失敗證據保留，依 Owner 指示一併作本機文件提交。F1～F5 accepted 不變，正式驗收延後，不推送、不展開 F6；既有真實測資缺口維持。以下段落保留歷史狀態。

最新補正進度（2026-10-12）：**F5-R1 補正完成、待局部複核。** Owner 確認 F5-R1 並直接授權局部修正／回歸／交付；合法可選 config 的 undefined 與省略現在具有一致 dirty／candidate／Delta 語意，null／未知 key／非法非空值保持差異與拒絕。見 [局部修正報告](docs/implementation/F5_R1_Correction_Report.md)／[去敏證據](docs/implementation/evidence/F5_R1_Correction_20261012/verification-summary.json)。先補 58 案重現，最後受影響 F5／F2 unit 225／225、lint／strict typecheck／build／diff PASS；原 review、失敗及 F5 報告／證據保留。F5 review 尚待複核，正式驗收延後，不改 accepted、不推送、不展開 F6；既有真實測資缺口維持。下列開發交付段落保留歷史狀態。

最新進度（2026-10-12）：**F5 開發完成、待集中 review。** Owner 核准 [F5 計畫 v1.0](docs/implementation/F5_Implementation_Plan.md) 並授權整輪開發、自測與範圍內修正；已交付 Editor／Answer 純 Domain、Create／Draft Delta、Draft／Publish 驗證與錯誤定位，見 [F5 開發報告](docs/implementation/F5_Development_Report.md)／[去敏證據](docs/implementation/evidence/F5_20261012/verification-summary.json)。指定 Choice→text→Choice 固定 Body／wire 核對 PASS；必要 unit 167／167、lint／strict typecheck／build／diff 檢查 PASS。F4-R1 結案、F4 code review 通過的 Owner 決議維持；F1～F5 均未 accepted，正式驗收延後、既有真實測資缺口保留。本輪沒有 UI／保存／提交 API 接入，不推送、不展開 F6。

前次進度（2026-10-12）：**F4-R1 結案，F4 code review 通過。** 見 [局部獨立複核](docs/review/F4_R1_Correction_ReReview_Report_20261012.md)／[去敏證據](docs/review/evidence/F4_R1_Independent_Verification_20261012.json)。本次 unit 136／136、fresh built Browser 12／12 及必要工程檢查 PASS，三種 Auth 401、兩種關閉、外部變動撤銷及受影響清單回歸均通過。原 [修正報告](docs/implementation/F4_R1_Correction_Report.md)、review／修正前 FAIL／歷史證據與真實測資 BLOCKED 保留。F3-R1、F3-R2、N1 已結案；F1／F2／F3／F4 均未 accepted，正式驗收仍延後，不推送、不展開 F5～F10。以下較早日期的紀錄保留歷史狀態。

文件包版本：1.3。日期：2026-10-10。狀態：前端規格與總實作計畫已通過 Owner review；本次依 Owner 指示補分輪測試選擇原則，AGENTS／Skills 仍待 Owner review。

本組文件整合前端已定案內容，並採用後端 2026-10-10 的 Statistics v1.1 修訂內容。02／06 維持 v1.1，其他規格維持 v1.0；總實作計畫 v1.3 補測試選擇原則，AGENTS 為 v1.1。Round 分工不變。可放入未來獨立前端 repo，作為各 Round 實作計畫的來源。

目前進度（2026-10-11）：Owner 已確認 **F0 accepted**，見 [F0 Alignment Report](docs/implementation/F0_Alignment_Report.md) 與 [總計畫 §9.2](docs/implementation/V1_Frontend_Implementation_Plan.md#92-f0-owner-確認與有限收尾2026-10-11)。工程方向已確認；版本表為候選安裝基準，F1 實測相容性，F2 保留精確數值可行性 gate。本次只授權 F0 文件收尾／提交及 F1 規劃，未初始化或安裝。

F0 收尾 commit：`54ac4482dba6442408864971a2ef11a871c441f3`；F1 v1.0 計畫 commit：`b485d3e9c3c20457d1373a0fd6fd054a51891595`。Owner 已通過 F1 review 並授權開發；[修訂版計畫 v1.1](docs/implementation/F1_Implementation_Plan.md) 與 [F1 開發報告](docs/implementation/F1_Development_Report.md) 保留開發紀錄。[獨立 review](docs/review/F1_Code_Review_Report_20261011.md) 無阻擋缺陷，Owner 授權的 Dialog close icon 斷言補正與新五組 smoke 證據見 [P3 補正報告](docs/implementation/F1_P3_Correction_Report.md)。目前 **F1 P3 補正已交付，待局部複核及正式驗收，尚未 accepted**；未推送。原目錄 npm ci 的 EPERM 保留於 review；F2 本輪的重現與恢復紀錄見下方 F2 節，沒有升級既有套件。

後端狀態仍引用唯讀快照 2026-10-11／`7591633137c5a6f57c1fce8e1ba19ab394015880`：R10 accepted、R11 結果待 Owner 確認；本次沒有較新的後端 Owner 確認來源或重跑驗收。下文 §4 保留 2026-10-10 文件包的歷史接續說明，目前輪次依總計畫最新進度。

## 本機工程與開發自測

使用 Node **24.21.0**／npm **11.19.0**；`.nvmrc`、packageManager 與 lockfile 記錄基準。現有 repo 執行：

```powershell
npm ci
npm run dev
```

前端固定 `http://localhost:3000`；公開 API Base URL 預設 `http://localhost:5000/api/v1`，可由 `NUXT_PUBLIC_API_BASE_URL` 覆寫（安全範例見 `.env.example`）。F3 已提供登入／註冊、Header／手機導覽、首頁與 Profile 修改姓名；F4 提供本人表單清單與 Form 根資訊讀取／角色狀態路由；F6～F8 已提供 new／Draft編輯保存、Preview、生命週期與Owner管理、正式填答／Receipt／本人Latest。F9 已提供獨立 Statistics、完整分布與合法名單、公開／私有存取與登入返回；Owner 已確認 code review 通過，完整前端驗收計畫待 review，正式驗收尚未完成。`ssr=false`，無 BFF。圖示含 UI 內建狀態／關閉圖示全部來自 client bundle，沒有圖示 API fallback；字體用 system font。

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run build
npx playwright install chromium
npm run test:e2e
```

typecheck 實際執行 Nuxt app／generated project 檢查與 `tsc -p tsconfig.tools.json`，涵蓋 tests、TS／MJS 工具組態與靜態 probe script。E2E 在 built preview 上啟動 Chromium；需先 build、關閉自己啟動的 dev 並確保 3000 沒有其他服務。Playwright 不重用不明服務，也不停止既有後端。這些是開發自測，正式 AI／人工驗收未執行。

覆寫 smoke 用以下方式在 **process 啟動前** 注入；User GET／PATCH 由測試攔截，使用合成結果驗證實際產品 Toast／Dialog、焦點與本地圖示，不連接真實後端：

```powershell
$env:NUXT_PUBLIC_API_BASE_URL = 'http://localhost:5000/api/f1-smoke'
$env:F1_EXPECT_API_BASE_URL = 'http://localhost:5000/api/f1-smoke'
$env:F1_INJECTION_STAGE = 'preview-process-start'
npm run test:e2e
```

預設 `F1_SMOKE_MODE=preview`，實測可在預設 build 上 runtime 覆寫；dev 則先設 `$env:F1_SMOKE_MODE='dev'` 再執行同一 test。每次命令結束後移除本輪設定的 `NUXT_PUBLIC_API_BASE_URL`、`F1_EXPECT_API_BASE_URL`、`F1_INJECTION_STAGE`、`F1_SMOKE_MODE` 環境變數，再執行預設命令。

純靜態 smoke 先在指定 URL 的環境執行 `npm run generate`，再設定 `F1_SMOKE_MODE=static` 執行 E2E；本地 `scripts/static-smoke-server.mjs` 只提供 `.output/public`。靜態 server 啟動時的環境不能改 generate 時的 config，變更 URL 必須重建。`nuxt build` 預設是 CSR＋前端 Nitro renderer，`.output/public` 沒有入口 HTML，不能把它單獨當完整靜態站；generate 後若要回到 built preview，清除覆寫再 `npm run build`。上述靜態 server 是本機產物 probe，不是部署／BFF。

[F1 自測證據](docs/implementation/F1_Development_Report.md#4-必要自測與實際結果) 包含 Browser public config／network 摘要、圖示渲染證據及手機截圖；原始 Playwright report／trace 在 ignored `output/playwright/`。依賴與生成產物不提交；`backend-ref/` 維持唯讀。

## F2 共用基礎與隔離自測

Owner 已核准 [F2 計畫](docs/implementation/F2_Implementation_Plan.md) v1.0 並授權開發。原交付見 [F2 開發報告](docs/implementation/F2_Development_Report.md)；2026-10-12 依獨立 review 授權局部修正 R1～R3，見 [修正報告](docs/implementation/F2_Review_Correction_Report.md)。目前 **F2 修正完成、待局部複核；F1 P3 局部複核通過，F1／F2 仍未 accepted，正式驗收延後**。上述 F0／F1 段落保留歷史授權與交付狀態；不開始 F3。

```powershell
npm run test:unit
npm run lint
npm run typecheck
npm run build
node node_modules/nuxt/bin/nuxt.mjs typecheck tests/fixtures/f2/browser
npm run test:e2e -- --config=playwright.f2.config.ts
```

F2 使用獨立 Nuxt CSR fixture（`tests/fixtures/f2/browser`），需空閒 localhost:3000；輸出在 ignored `output/playwright/f2/`。F1 預設 E2E config 明確只選原 foundation smoke，原案例與證據未改。F2 Browser 使用原生 fetch＋合成 raw JSON 攔截；PASS 只證明前端處理，真實 API／Cookie／DB 整合未執行。`lossless-json` 固定 4.3.1；一般 Number 使用 `ExactNumber` 與 `stringifyExactJson`，避免 Number()、JSON 深複製或原生 JSON.stringify 失真。

原工作目錄 npm ci 的 native binding EPERM 本輪重現；乾淨副本依同一 package-lock 安裝通過。首次失敗、修正與限制詳見報告／去敏摘要，沒有停止不明程序或刪除 locked remnants。

## 1. 文件清單

| 順序 | 文件 | 內容 |
| --- | --- | --- |
| 00 | [Frontend Overview](docs/specs/00-v1-frontend-overview.md) | 範圍、契約基準、暫緩／排除與決議索引 |
| 01 | [Pages、Routing、Access](docs/specs/01-pages-routing-and-access.md) | 各頁內容、URL、Header、身分／狀態路由矩陣 |
| 02 | [Editor、Lifecycle](docs/specs/02-form-editor-and-lifecycle.md) | 建立／保存／發布、設定、題型、Delta、拖曳、預覽、管理操作 |
| 03 | [Response、Statistics](docs/specs/03-response-and-statistics.md) | 空白初始、single／multiple、Latest、Stars／Range、統計頁 |
| 04 | [Auth、State、Errors](docs/specs/04-auth-state-and-error-handling.md) | 完整 D-12、登入返回、停用、dirty、錯誤及結果不明 |
| 05 | [UI、Interaction](docs/specs/05-ui-and-interaction.md) | Nuxt UI、版型／手機、時間、驗證、Dialog 與文案 |
| 06 | [Technical Architecture](docs/specs/06-technical-architecture.md) | Node／npm、資料層、API client、精度、結構與必要驗證 |
| 07 | [API Integration Map](docs/specs/07-api-integration-map.md) | 18 Endpoint 範疇、實際使用時機、DTO、payload／錯誤對照 |

另含 [前端總實作計畫](docs/implementation/V1_Frontend_Implementation_Plan.md)，定義 F0～F10、依賴、驗證與停止點；各 Round 的「計畫提醒」與 §7.1 是 Codex 提出當輪計畫時需明確的工程項目。

[初版文件核對與版本銜接報告](docs/review/Frontend_Specification_Review_Report_20261010.md) 保留當時交付與檢查結果；本次 v1.1 的局部回補核對範圍見總計畫 §10。

本次新增協作文件：

| 文件 | 責任 |
| --- | --- |
| [AGENTS.md](AGENTS.md) | 共用來源、授權、停止點、Git／測資、驗證與回報 |
| [Round Development Skill](.agents/skills/v1-frontend-round-development/SKILL.md) | F0 Alignment、當輪具體計畫、授權開發／修正與自測報告 |
| [Acceptance Testing Skill](.agents/skills/v1-frontend-acceptance-testing/SKILL.md) | 正式驗收計畫、Browser／fixture／人工、執行結果與證據 |
| [協作文件核對報告](docs/review/Frontend_Workflow_Document_Review_20261010.md) | 本次格式、來源、階段邊界與隔離情境檢查 |

兩個 Skill 各含 `agents/openai.yaml`，採明確呼叫，避免影響其他專案。完整包保留 `.agents/skills` 路徑，可原樣放入未來前端 repo；Skill 讀取該 repo 的 AGENTS／docs，不將自己的安裝目錄當成業務 repo。

## 2. 建議 review 順序

先看 00 的範圍與契約基準，再看 01～03 的頁面／核心操作；接著確認 04 的 D-12 與錯誤流程，最後核對 05～07 的 UI、工程與 API 對接。

重點：新建第一次只有保存；既有 Visibility 即時更新；single／multiple 重新進頁都空白；Latest 必須主動呼叫；public Statistics 不被 Header me 阻擋；寫入結果不明採簡化手動核對。

這組文件取代 2026-10-09 暫存文件中已被後續決議取代的提案；不要把舊「待確認」清單與本組當成兩套平行規格。

## 3. 工程提醒與本次回補位置

| 位置 | 內容 |
| --- | --- |
| 總計畫各 Round／§7.1 | 9 項工程提醒的完成時點與當輪計畫需交付的設計／驗證；逐輪明確 |
| 02 §6.1 | 既有省略 variant 的呈現、原始 config、dirty／Delta；與新建初值分開 |
| 06 §7 | Email validator 相容策略；F0 核對，F3 接入驗證 |
| AGENTS 驗證章節／兩個 Skills／總計畫 §8.1 | 依每輪交付與風險選用測試；計畫交代方法及理由，不適用層級可省略，必要但受阻的驗證另列 |

## 4. 接續工作

1. 前端產品規格已確認；本次局部回補依 Owner 指示完成。
2. 總實作計畫已核准；具體工程設計在指定 Round 的實作計畫提出。
3. Review 本次 AGENTS.md 及兩個 Skills 的責任與階段邊界。
4. 確認前端工作目錄及可讀的後端來源，指定 F0 Alignment；F1 才依核准工程決議初始化獨立 repo。
5. 逐 Round 採計畫、review、開發、自測／code review、正式測試計畫、review、測試、Owner 決議。

F0～F10 仍為 not started；本次沒有初始化 Nuxt、套件安裝、前端 build、live API 或正式 Browser 驗收。

本次文件核對不是程式測試或 Browser Cookie／CORS 執行證據。已讀基準的 R10 尚未實作；最新進度與真正串接統計以當時後端 repo／可用 Endpoint 版本為準。
