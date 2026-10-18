# 上線後前端 UI 改善

日期：2026-10-18。基準：`fd6ece30ca68933bb4b1998621dbc1ec6c27efa5`。Owner 直接要求五項前端更新，沿用已授權的 GitHub／Railway 部署流程；不新增 Fn 或變更既有 accepted 狀態。

## 範圍與實作

1. 關閉表單按鈕說明以查看統計為目的，常駐提示與確認框說明停止收件、不可重開及統計資格仍依可見性。
2. 刪除常駐提示與確認框明列表單、填答內容及統計結果無法再查看或恢復。
3. 複製填答連結按鈕與說明交代傳給填答者、須登入與截止限制。
4. `answerRules` 重用既有 config parser，於正式填答、readonly 及預覽呈現五題型限制。保留零值與 exact number，不另建驗證規則或改 Request。
5. 表單設定與題目設計分區；題目藍色標頭集中必填／排序／刪除。欄位並排、縮短空說明高度及選項列，保留原 key、label、dirty、排序及保存機制。

相關來源：前端 02 §5–12、03 §5–7、05 §2–10；05 新增本次 Owner UI 指示。後端 API 及 backend-ref 未修改。

## 驗證

Node 24.21.0、npm 11.19.0；原工作樹乾淨，快轉後仍為基準 SHA。

- npm ci：PASS。
- lint／strict typecheck／production build：PASS；首次 lint 的新 optional prop warning 已補正，重跑 lint 無警告。
- 作答規則及既有答案單元測試：39／39 PASS，涵蓋 0、單邊／未設限制、長小數、大整數、非法 config 及五題型。
- 受影響 F7／F8／整合 Browser 測試只同步新關閉按鈕標籤，不改 API／狀態預期。
- F6 built Browser 選跑七案：瀏覽器啟動前皆失敗，未執行頁面斷言。原因為 runner 無對應 Chromium；官方下載重試仍取得不可解壓縮內容。記為環境 BLOCKED，不視為產品失敗或 PASS。
- 原五項更新已合併至 master `60cc1b8b084de1c399ac53c6168bf232c19f92c9`（PR #1），Railway web deployment `2f180ce3-8644-4285-9933-16bde8c58d32` 成功／Active。
- 線上 Chrome 確認正式 readonly 與未保存 Preview 均顯示五題型限制；合成題目上／下移可透過鍵盤操作。手機實測 viewport 400×682，文字題卡約 367 px、兩選項單選題卡約 461 px，無水平溢出。viewport 工具的指定尺寸與實際結果不完全相同，僅記錄實測尺寸。
- 本次合成表單只在未保存的編輯器／Preview 操作，離開時已捨棄；沒有新增／提交／關閉／刪除線上表單。測試帳號無既有表單，管理提示採來源／建置核對，未宣稱線上管理操作通過。

## 數值上下限追補（同日 Owner 回饋）

Owner 指出 Preview 的超大最大值容易與 Infinity 混淆。該值為本次未保存的有限測試資料，不是系統預設上限。

- 未設／留空的上下限明示「無下限（−∞）」／「無上限（∞）」。有限值（含 0、大整數及長小數）仍完整顯示，並標示含邊界。
- 編輯欄位 placeholder 與說明交代不限制請留空，不需輸入 Infinity／∞；填答提示只接受有限數值。原精確比較、API DTO 與省略語意不變。
- 追補 lint／strict typecheck／production build PASS；相關 39／39 unit PASS，補查未設／留空、單邊上限 0，以及 Infinity／∞ 不會被顯示成合法設定。
- 部署後線上核對結果於交付訊息記錄；不將本次自測改列正式驗收。

本次為功能開發自測與部署檢查，並非 F10 正式驗收；未改寫歷史結果或人工驗收欄位。
