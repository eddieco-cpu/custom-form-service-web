# V1 前端規格 — 文件核對與版本銜接

日期：2026-10-10。交付狀態：八份前端規格初版，待 Owner review。

本報告是文件整合與靜態核對紀錄，不是開發／驗收結果，也未替 Owner 核准本組新文件。

## 1. 來源與版本

| 來源 | 本次採用方式 |
| --- | --- |
| 本對話已確認的 A-1～D-12、Google 按鈕隱藏 | 最新產品決議優先；拆入 00～07 專責文件 |
| 2026-10-09 frontend_decisions 暫存 | 作歷史盤點，不保留已取代的待確認項目 |
| 2026-10-10 前後端契約核對／Statistics 調整交付 | 承接精度、Cookie／CORS、Delta 與四欄位追加 |
| 最新四份後端附件 | Backend Implementation Plan、01 Domain、03c API Part C、05 Constraints |
| docs.zip 的其餘後端規格 | 00／02／03a／03b／04 的現行正式內容 |

後端 01／03c／05 修訂內容為 v1.1（2026-10-10）。附件標頭仍有修訂待 review；Owner 已在本對話告知另一專案對話有紀錄及確認。這是文件狀態收尾的證據界線，不以此重新要求確認已告知的產品內容。

## 2. 舊提案與本組最終行為

| 舊草案／待確認 | 本組採用的最終行為 | 位置 |
| --- | --- | --- |
| 新建可保存或直接發布 | 第一次只有保存，成功後進 edit 才保存／發布 | [02](../specs/02-form-editor-and-lifecycle.md) |
| 登入／註冊分頁或 URL 待定 | /login 同頁 Tabs，註冊不自動登入 | [01](../specs/01-pages-routing-and-access.md) |
| Google UI 是否保留 | 按鈕隱藏 | [00](../specs/00-v1-frontend-overview.md) |
| 套件與版本待議 | Nuxt 4 CSR、Nuxt UI 4／Tailwind 4、TS、Zod、draggable、Node 24.21.0／npm；patch 與相容性在初始化計畫鎖定 | [06](../specs/06-technical-architecture.md) |
| 統計只有三個追加欄位、不含 responseMode | 改四個追加欄位；完整九欄 Root 已寫入後端 v1.1 內容 | [07](../specs/07-api-integration-map.md) |
| 統計圖表／比例／平均待議 | 簡單每題答案／人數／具名姓名列表，標示題型 | [03](../specs/03-response-and-statistics.md) |
| Visibility 等一般保存或另按套用 | new 必選、既有切換即專用 PATCH，成功 toast | [02](../specs/02-form-editor-and-lifecycle.md) |
| single 進頁先查 Latest 狀態 | single／multiple 一律空白，不預查；由使用者主動讀取或提交錯誤得知 | [03](../specs/03-response-and-statistics.md) |
| 缺 Rating max 當 100 | Publish 必填 min／max；UI 新題明確初值 1／5 | [02](../specs/02-form-editor-and-lifecycle.md) |
| 星星 min>1／optional 清除待議 | 前 min-1 不可選；有效分數亮對應前綴；optional 可清回未作答 | [03](../specs/03-response-and-statistics.md) |
| 手機預覽改成滿頁／其他方式 | 維持 Dialog，寬高扣總共 4px；每次開啟清空試填 | [02](../specs/02-form-editor-and-lifecycle.md)、[05](../specs/05-ui-and-interaction.md) |
| 只用 beforeunload 攔 SPA | beforeunload＋route leave／update guard＋資料替換確認 | [04](../specs/04-auth-state-and-error-handling.md) |
| 提交途中截止後導統計 | 已定案改提示後回首頁；正常讀已截止仍留表單頁 | [03](../specs/03-response-and-statistics.md) |
| 每次頁面跳轉重查 me | 完整 App 啟動一次，共享 Promise／記憶體結果；SPA 不重查 | [04](../specs/04-auth-state-and-error-handling.md) |
| 停用自動登出／前端全面封鎖 | 不主動登出，保留 Header／登出；依各 API 錯誤 | [04](../specs/04-auth-state-and-error-handling.md) |
| 不明寫入結果建立複雜核對系統 | 留輸入、提示、現有入口手動核對；Delta 重讀前禁止盲送 | [04](../specs/04-auth-state-and-error-handling.md) |

## 3. 跨文件重点核對

| 主題 | 一致性要求 |
| --- | --- |
| Route／Access | 01 的 route 與 04 的 middleware 一致；statistics 沒有 auth gate |
| 根設定 | 02 的更新方式與 07 Request 一致，Visibility 不進定義 PATCH |
| 填答 | 01 入口與 03 single／multiple 狀態一致；重新進頁不恢復 |
| 隱私 | 統計 Root Creator 名稱與 anonymous Respondent 身分分開，04 Header 不額外披露 |
| 精度 | 05 顯示秒與 06 原始時間保存一致；Number 收送／比較均保留合法精度 |
| Error | 03／04／07 以正式 code 分支，不把 Latest 404、登入帳密 401、停用 403 混為通則 |
| 資料丟棄 | 保存／提交成功 clean；其他導向、換 ID 或畫面取代經單次 dirty 確認 |
| 後端進度 | R9 Owner accepted；R10 文件修訂不等於 Endpoint 開發完成 |

## 4. 交付前靜態檢查結果

本次已執行 Python 文件靜態檢查：10 個 Markdown（8 規格＋README＋本報告）、47 個相對連結、70 個表格欄數、3 個 JSON 示例皆通過；版本日期與 code fence 結構一致。

18 個 Endpoint 編號／Method／Path 唯一且完整，與後端 Common 索引一致；23 個本組使用的正式錯誤／明細碼可在後端 Error Catalog 找到。Create／Delta 示例另核對可送欄位、UUID、id-only 刪除與新增不帶 id。

Statistics Root 九欄位已與讀到的後端 v1.1 §3.4 直接比對一致；零資料、匿名／具名、Creator 名稱與時間語意由人工文件核對承接。跨文件重點按第 3 節核對。

首次靜態檢查發現技術架構表格把 AUTH_INVALID_CREDENTIALS 簡寫為不存在的獨立 code，已更正完整名稱並重跑通過。這是文件修正，未修改後端規格或程式。

下載包包含這 10 個 Markdown 的完整資料夾結構；交付前已檢查每個 entry 與本地檔案位元組相同，ZIP CRC 完整性通過。這些結果只證明文件與打包核對；本次沒有 npm install、build、單元／E2E、Browser CORS／Cookie 或 live API 測試。

## 5. 仍交由實作計畫選定的工程細節

| 項目 | 必須滿足的規格 | 選定階段 |
| --- | --- | --- |
| 套件 patch／Node 可取得性與相容性 | Owner Node 指定值、npm lockfile、Nuxt／UI／Tailwind 等版本可重現 | 初始化計畫 |
| Lossless number adapter／serializer | 合法精度保留、JSON number、精確 min／max／Latest／Statistics | 初始化計畫，實作驗證 |
| Datetime helper | 台北顯示／UTC 收送、未修改保留原始精度 | 初始化計畫 |
| API timeout／request scope | 不自動重試、結果不明、忽略 stale 回應 | 初始化計畫 |
| 最終檔案組織／scripts | 06 責任分工、lint／typecheck／build／必要測試 | 初始化計畫 |
| 真實 Browser／OpenAPI／R10 串接 | 實際可用 API 版本、Cookie／CORS 證據、未可用不填 PASS | 個別串接與驗收計畫 |

互斥 loading、錯誤 path 映射、分頁超界對齊與 stale response 保護，是將已定案行為落實的工程細節，沒有新增 Backend endpoint、Schema、權限或冪等契約。

產品範圍已经收斂；本次新文件仍需 review，工程小版本或 adapter 的選擇不應讓所有既有產品決議重新變成待討論。

## 6. 接續與停止點

本組規格 review 確認後，接續前端總實作計畫的整理；依 Owner 指定的階段處理。AGENTS／Skills 與 repo 初始化尚屬後續工作，不能把文件完成當成已完成程式開發／正式測試。
