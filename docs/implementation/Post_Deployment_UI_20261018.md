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
- 線上 Chrome 桌面／手機及 Railway 部署：待本次提交後核對，結果另於交付訊息記錄。

本次為功能開發自測與部署檢查，並非 F10 正式驗收；未改寫歷史結果或人工驗收欄位。
