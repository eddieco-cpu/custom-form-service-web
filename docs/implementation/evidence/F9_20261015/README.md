# F9 開發自測證據索引

本目錄是開發自測的去敏交付，集中 review、正式 AI／人工驗收均未執行。入口為 [開發報告](../../F9_Development_Report.md)。

- [verification-summary.json](verification-summary.json)：最終有效數量、版本與缺口。
- [case-results.json](case-results.json)：185 個 unit、每次 Browser 與真實分案；保留 FAIL／NOT RUN，再列最終 PASS／BLOCKED。
- [failure-index.json](failure-index.json)：Browser／真實組首敗與修正重測索引；工程首敗的原始 logs 在 commands。
- [resource-index.json](resource-index.json)：Run label、專用帳號／Form／Response IDs、用途、建立輸入與保留狀態；重用項目依 ID 去重。
- [build-source.json](build-source.json)：接手 SHA、產品來源與 fresh build assets SHA-256；[backend-metadata](backend-metadata.json)、[health/openapi](health-openapi.json)、[installed](installed-packages.json) 保存來源／版本。
- `execution/`：三個真實 Run 的完整 Statistics Body、固定預期、正常 API wire、CORS／network diagnostics、資源與逐案結果。全部業務請求由真實 Browser 發出，沒有攔截。
- `browser/`：各次 Playwright JSON reporter，內含明確的 fixture network diagnostic attachments／首敗 snapshot 與重測結果。隨 build 模式跳過的案例在另一 build 執行；不可把 skipped 當 PASS。
- `commands/`：實際 lint／strict／build／unit／Browser 命令輸出，包含首次失敗；[command-results](commands/command-results.json) 另記工程命令 exit code。交付 log 副本只移除行尾空白／尾端空行，ignored 原件保持不動；execution 的完整 JSON／API Body 原文保留。
- `images/`：合成長名單手機 viewport 與真實完整統計截圖，已目視檢查；不代替人工實機確認。

密碼、Cookie、Token、storageState 與 trace 不在白名單；實際私有 credentials 僅保留於 ignored `output/playwright/f9/`。交付掃描包含原始文字與 decoded JSON attachments。原件未覆寫；不用本次 PASS 修改歷史報告或 accepted。

後續複驗可使用 `F9_MODE=built|harness|live|regression` 與 `F9_RUN_LABEL`；Chrome／Edge 使用 `F9_CHANNEL=chrome|msedge`。live 重用專用帳號時以 `F9_REUSE_RUN` 指向 ignored 私有檔的 Run label；只有已宣告 Closed L02 資源可透過 `F9_REUSE_L02_FORM` 繼續讀回，不新增／改寫舊 Response。
