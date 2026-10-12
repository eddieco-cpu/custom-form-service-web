# F2 精簡補充測試計畫

版本：1.0／2026-10-12（Asia/Taipei）。Owner 授權提出後直接執行，無本版 test-plan review 停止點。這是 F2 開發自測補充，**正式驗收延後，F1／F2 未 accepted**。採 repo development skill 的驗證選擇原則，不啟動正式驗收流程。

基準 HEAD `c68f5bd63b1f73cc5b780013bb2d6cc603b0235f`；產品／測試基準為修正提交 `73348ab233c9dcdafa9ee04429e7c7e9088a03e3`，之後兩筆提交僅 review 文件。來源：AGENTS v1.1、總計畫 v1.3 F2／§7／§7.1、核准 F2 計畫 v1.0、前端 04 v1.0 §7～12、06 v1.1 §5～8；後端 Part A v1.0 §9，快照 SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`。Part A 引用筆誤修正不觸發測試。

## 範圍與沿用證據

執行前核對證據原件 SHA256、package-lock SHA256、來源差異與 backend manifest；不能核實的證據標明缺口，不直接沿用為已核對。

| 範圍 | 來源與沿用條件 |
| --- | --- |
| 精確數值／JSON、文字、時間、DTO | [原 F2 摘要](../implementation/evidence/F2/verification-summary.json) 的未受 R1～R3 影響 unit；[局部複核](../review/F2_Correction_ReReview_Report_20261012.md) 的 Browser 精確數值 gate（11 合法／4 拒絕 token）；來源未變即可沿用 |
| R1 跨操作限制、R2 Latest、R3 同步及其他既有回歸 | [獨立複核摘要](../review/evidence/F2_Correction_Independent_Verification_20261012.json)：受影響 unit 46／46、完整 F2 Browser 10／10，含原生 30000ms write timeout；只作歷史來源 PASS，非本次重跑 |
| lint／strict typecheck／build／fixture typecheck | 同一複核摘要，各 exit 0；產品未改時沿用 build／產品檢查，新增測試後補跑 lint、root strict 及 fixture strict |

## 必要缺口與執行方式

1. **舊寫入隔離**：Browser 將真實共用 OperationState／composable 與 native fetch 接入合成 harness，送出 pending PATCH 後分別更換 session、同元件 Form ID、卸載。各驗成功及 Auth 401 晚回為 stale、基準／錯誤 callback 不執行、新頁 URL／輸入不被覆寫。等待該次完成訊號，不能用原本成立的 UI 斷言或固定 sleep 代替。
2. **自然 history 取消**：建立 SPA history，dirty 狀態實際 `goBack`／`goForward`；等待 confirm dismiss 與 router afterEach 的該次 cancelled outcome，再驗 URL／輸入保留。接受一次後導航成功，下一次 dirty history 仍要求確認，取消不留下永久 bypass。
3. **Latest 原生 timeout**：既有 unit 已驗語意，但獨立複核明列 Browser timeout 未跑；補單次實際 30000ms client timeout，答案保留、讀取失敗、無 unknown write／自動 retry，手動 GET 成功。使用合成延遲回應，不聲稱 Server 寫入／API 整合。

新增案例放既有 F2 spec，僅補必要 fixture 的完成觀察；不修改 app、既有預期或套件。執行新增 Browser 案例及 lint／兩組 strict；既有完整 10 cases 與 build 沿用已核對證據，不為文件或純觀察新增無理由重跑。unit 沒有新規則／產品變動，沿用相關已執行結果。人工／真實 API／Cookie／CORS 不屬本次共用機制缺口，留 F3 等接入輪次；不將這些必要後續證據列作全面 PASS。

每條命令記 exit／版本／案例及去敏 hash，原件另存 ignored `output/playwright/f2-supplement-20261012/`；首次失敗保留，定位測試同步或產品問題後才重跑受影響部分，不改預期求 PASS。若發現阻擋 F2 問題，交付失敗與受影響範圍，暫停 F3 計畫條件；若無阻擋，交付 [結果](../test-results/F2_Supplemental_Test_Report.md) 及 F3 精簡計畫，停於 **F3 計畫待 Owner review**。不開發 F3、不安裝、不操作 DB／後端服務、不推送。
