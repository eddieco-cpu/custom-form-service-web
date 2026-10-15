# F1～F8 獨立整合補驗方案／覆蓋表

版本 1.0，2026-10-15（Asia/Taipei）。Owner 本次明確授權制定精簡方案後直接執行；本次為獨立補驗，與開發自測、既有 code review、正式 AI／人工驗收分列，accepted 不變。產品與既有斷言不修改；不推送、不展開 F9。

基準：前端 master `2f6dc4929e310c7e0ac1ef825dd1aefe63c97ab9`（起始乾淨），前端 specs 00～07（02／06 v1.1，其餘 v1.0）、總計畫 v1.3 F1～F8／§7／§7.1、各輪核准實作計畫與最終開發／修正／review 報告。後端權威為 `backend-ref/SNAPSHOT.md` 指定八份正式規格，SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`；實際 checkout／runtime 另作證。

## 方法與前置

- 新跑工程 scripts 與既有 unit：F1 工程基礎、F2 共用機制、F5 純模型適合工程／單元證據，不以頁面數或總 PASS 數代替能力覆蓋。既有攔截 Browser 故障／競態證據，核對來源未變及原件 hash 後可沿用，明列歷史模擬。
- 核心用本次來源 fresh `npm run build`＋preview、Chromium 真實瀏覽器→`http://localhost:5000/api/v1`，無業務攔截；UI 操作配對 Request／status、URL、獨立 GET、合成截圖。預設不錄 trace／storageState／密碼／Cookie／Token；Auth body 不落檔。
- 使用現有後端正常 Development 設定與現有 DB。已有服務先驗 PID→DLL→ProductVersion／hash；缺服務才依 README 正常啟動。health／ready／OpenAPI 分列，不能代稱功能 PASS。無 DB reset、volume 刪除、migration 或 SQL 業務寫入。
- 新 RunId 帳號與 Form／Response 只經正常 API。Owner、Respondent、清單專用 Owner 分 context；密碼只留當次記憶體。所有資源建立後立即寫去敏索引。Delete 白名單：專用 `delete-draft`／`delete-published`／`delete-closed`；清單 21 筆中事先標記 `list-shrink` 的唯一表單。確切 UUID 在刪除前保存至索引；其他及歷史資料保留。

## 執行前覆蓋表

下列新跑初始均 NOT RUN；完成後逐案結果與證據見獨立報告及 machine-readable results。人工均 NOT RUN，除純工程／模型不適用。

| ID／輪次 | 案例、測試方法 | 前置／測資 | 可觀察預期與證據 | 本次處置／初始狀態 |
| --- | --- | --- | --- | --- |
| E01 F1 | lint／strict typecheck／fresh build、版本／CSR／公開組態 | 指定 Node、現有 lock／installed | scripts exit、build hash／時間；Browser CSR／API origin | 新跑 NOT RUN |
| E02 F2 | client／decoder／exact／Unicode／datetime／scope／dirty／operation unit | 既有 unit fixtures | 對應檔案案例名／逐檔結果，不以總數推定 UI | 新跑 NOT RUN |
| E03 F5 | editor／Delta／variant omission／Answer builder unit | 純模型 fixture | id-only、no-op、config、排序、path、空／0 | 新跑 NOT RUN；獨立 UI 不適用，接入由 F6／F8驗 |
| A01 F3 | UI 註冊→登入返回（query／hash）、Cookie／CORS | 全新 Owner | 201 不登入、回登入 tab／密碼空；200 返回；Cookie flags／credentialed CORS | 新跑 NOT RUN |
| A02 F3 | Profile UI PATCH＋獨立 GET me | 新 Owner | 姓名／Header更新、200 GET 讀回；SPA 不多查 me | 新跑 NOT RUN |
| A03 F3 | dirty 登出取消／確認、再登入返回 | Profile未保存 | 取消零POST、確認204→login；返回空白／真實基準 | 新跑 NOT RUN |
| A04 F3 | 完整刷新／新頁初始化、SPA導覽 | 同帳號 | 每 App一次me；新 App另查，不跨頁恢復 | 新跑 NOT RUN |
| D01 F6 | UI new→五題型 Create→edit、獨立 GET | 新 Owner | 201、正式 Form／Q／Option UUID、JSON number長小數／大整數精確、無隱藏初建 | 新跑 NOT RUN |
| D02 F6 | UI Delta新增／更新／刪除／排序、保存後ID | D01 Draft | 200＋獨立GET、第二次Delta正式ID、穩定value、no-op | 新跑 NOT RUN |
| D03 F6 | Preview試填／重開與 dirty離頁 | D01 | 不送Response；重開空白；取消保留、確認離頁 | 新跑 NOT RUN；尺寸／焦點完整矩陣可沿用有效模擬 |
| M01 F7 | Draft dirty擋Publish、取消／確認、UI發布 | D01保存後 | 不暗中PATCH；200→Form、定義凍結，獨立GET published | 新跑 NOT RUN |
| M02 F7 | 三態×三Visibility UI切換 | 專用主要Form | PATCH sole field、200；獨立GET；Draft dirty定義保留 | 新跑 NOT RUN |
| M03 F7 | Count UI 0→1→1→2 | multiple、兩人正常提交 | 主動GET、distinct count，無輪詢 | 新跑 NOT RUN |
| M04 F7 | UI Close及正常到期後Close | 專用Form／短deadline | 200、留Form；到期仍published；Closed入口／不可提交 | 新跑 NOT RUN |
| M05 F7 | UI三態專用Delete／取消／dirty單次確認 | 白名單UUID先列索引 | 204→replace /forms、獨立404／列表排除、無雙重確認 | 新跑 NOT RUN |
| M06 F7 | 非Owner UI管理隱藏及API權限 | Respondent | Published可讀、管理不顯示；正常API管理403且不改狀態 | 新跑 NOT RUN |
| M07 F7 | 分享URL／統計入口導航 | Published／Closed | 完整本站URL、統計link目的；不驗F9內容 | 新跑 NOT RUN |
| R01 F8 | single五型UI提交、Receipt＋獨立Latest | 五型single、Owner／Respondent | 201、數字精確／0／Option IDs；成功Dialog保留／唯讀／無提交 | 新跑 NOT RUN |
| R02 F8 | multiple重複內容、新Response／Latest | 五型multiple | 同內容可再201、不同Response ID、Latest為最新完整份 | 新跑 NOT RUN |
| R03 F8 | optional清空／alloptional[]、0／Range min | multiple optional | omission非null、0保留、整份Latest清空舊optional | 新跑 NOT RUN |
| R04 F8 | 刷新空白、不自動Latest、single重複提交 | R01／R02 | 初始空白、主動Latest；single409後撤提交且不冒充真答案 | 新跑 NOT RUN |
| R05 F8 | Latest dirty取消／確認、本人資料隔離 | 兩人各不同Response | 成功GET後才確認；取消保留、確認整份取代；互不借用 | 新跑 NOT RUN |
| R06 F8 | 真實AUTH_REQUIRED／dirty返回／重新登入 | 正常logout或清Cookie | 401→Dialog→dirty取消保留／確認login，登入後空白不重送 | 新跑 NOT RUN |
| L01 F4 | 正常API準備同Owner 21筆，UI三頁清單 | 清單Owner；7 Draft／7 Published／7 Closed | 10／10／1，不重排；每列資料／row link；獨立索引 | 新跑 NOT RUN |
| L02 F4 | UI三status篩選、換頁／刷新 | L01 | 固定10、全部省略status、切篩選回1、刷新目前條件 | 新跑 NOT RUN |
| L03 F4 | 第3頁21→20後UI刷新越界對齊 | 預列list-shrink API刪除 | 第3頁空200→只補第2頁GET一次，無循環、非404 | 新跑 NOT RUN |
| L04 F4 | Owner／非Owner三態Form／edit矩陣 | L01保留代表三態 | Draft Owner→edit；非Owner404原URL；Pub／Closed edit→Form兩角色 | 新跑 NOT RUN |
| L05 F4 | 不存在／刪除／無效UUID；mobile list | 專用已刪UUID／390px | 原URL正確錯誤；卡片欄位完整／無水平溢位 | 新跑 NOT RUN |
| H01 F2～F8 | unknown／timeout／stale／Auth競態／特殊錯誤的既有Browser | 最終review原件＋來源hash | 僅有效且來源相容者沿用；分列模擬，不作真實API PASS | 待核對；非本次新跑 |
| B01 F3／F7／F8 | 真實invalid／expired／disabled Auth | 受控帳號／Cookie缺前置 | 不偽造Token或SQL停用 | BLOCKED |
| B02 F6～F8 | 真實交易失敗／timeout寫入不明／並行注入 | 缺受控後端故障安排 | 模擬沿用不能解除真實缺口 | BLOCKED |
| N01 F1 | npm ci／audit／完整組態五模式重現 | 本次依賴未變 | 歷史EPERM／audit保留；本次不重裝／升級 | NOT RUN（非核心補驗，非已解除） |
| N02 F1～F8 | 人工實機touch／軟鍵盤／safe-area | 人工尚未操作 | 保留有意義體驗確認，不代填PASS | NOT RUN |
| X01 | F9統計內容／權限、Google／部署 | 超出本次範圍 | 只驗F7統計入口URL，不宣稱F9完成 | 不適用於本次 |

## 證據與停止點

逐案捕捉 method／完整URL／status、合成Form／Response送出及獨立讀回、導航／Dialog、首次失敗與工具修正。去敏 JSON／截圖／script／命令摘要保存於 `docs/test-results/evidence/F1_F8_Integration_20261015/`；執行原件在 ignored `output/playwright/integration-supplement/`。新腳本只做驗證，不修改產品，不放寬既有斷言。FAIL保留重現／規格預期／實際／影響；不自行修產品。交付停於「獨立整合補驗完成、待 Owner 確認」。

2026-10-15 執行完成：上表為執行前狀態，保留其歷史；實際逐案 PASS／沿用／BLOCKED／NOT RUN／不適用與證據見[獨立補驗報告](../test-results/F1_F8_Independent_Integration_Supplement_Report.md)，不更新正式驗收或 accepted。
