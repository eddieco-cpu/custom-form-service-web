# 自建表單設計服務 V1 — Frontend Overview

| 項目 | 內容 |
| --- | --- |
| 版本／日期 | 1.0／2026-10-10 |
| 狀態 | 前端規格初版，待 Owner review；整合本對話已確認的產品決議 |
| 目標 | 本機 Email／Password 前端可完整建立、填答與查看統計 |
| 技術 | Nuxt CSR、TypeScript、Nuxt UI、Tailwind；瀏覽器直接呼叫 ASP.NET Core API |
| 工作邊界 | 本次交付規格文件；實作計畫、repo 初始化、程式開發與驗收分階段進行 |

## 1. 文件責任與閱讀順序

| 文件 | 權責 |
| --- | --- |
| [01 — Pages、Routing、Access](01-pages-routing-and-access.md) | URL、各頁內容、Header 入口、身分／狀態路由 |
| [02 — Editor、Lifecycle](02-form-editor-and-lifecycle.md) | 草稿建立、定義編輯、Delta、設定、發布／關閉／刪除、預覽 |
| [03 — Response、Statistics](03-response-and-statistics.md) | 填答、本人最新答案、Stars／Range、統計內容與權限 |
| [04 — Auth、State、Errors](04-auth-state-and-error-handling.md) | D-12 初始化、middleware、登入返回、停用、dirty、錯誤與結果不明 |
| [05 — UI、Interaction](05-ui-and-interaction.md) | 外觀、寬度、手機、Dialog、表單驗證、時間與共用呈現 |
| [06 — Technical Architecture](06-technical-architecture.md) | 工具選型、資料層、API client、精度、檔案結構與驗證策略 |
| [07 — API Integration Map](07-api-integration-map.md) | Endpoint、Request／Response 形狀、錯誤碼與欄位對照 |

先讀本文件，再依 01～07 閱讀。業務與 API 的正式來源在後端 repo；前端文件定義頁面與互動，不能放寬 API 的授權、驗證、生命週期或資料揭露限制。

同一主題以表中的專責文件為準。發現衝突時列出章節、衝突與受影響工作，先處理該衝突；不能把舊暫存提案當成較新的已定案行為。

## 2. 後端契約基準

| 後端文件 | 本次內容基準 |
| --- | --- |
| 00 Overview、02 Database、03a Common、03b Auth／User／Form、04 Error Catalog | 本次上傳 docs.zip 中的 v1.0 正式契約與既有修訂 |
| 01 Domain、03c Submission／Statistics、05 Constraints | 2026-10-10 上傳的 v1.1 修訂內容 |
| Backend Implementation Plan | 2026-10-10 版本；R10 已列 Statistics Root 四欄位投影，仍 not started |

版本證據邊界：讀到的 v1.1 附件仍有「修訂待 review」字樣；Owner 在本對話表示已於另一個專案對話紀錄及確認。本組文件採用已讀取的修訂內容與 Owner 本次確認，不宣稱已讀到最後核准原文或後端 repo 已完成狀態字樣收尾。

R9 依 Owner 本次明確說明為 accepted。R0～R9 review 修復已完成，最終人工 approve 尚待處理，與 R9 狀態分開記錄。本次沒有重新執行後端測試、連線 Swagger 或驗證實際 API process。

後端四欄位追加已寫入 v1.1 內容：creatorDisplayName、responseMode、resultVisibility、submissionDeadlineAt。前端統計不再沿用 2026-10-09 的三欄位草案。

## 3. 本次範圍

| 能力 | 最小交付 |
| --- | --- |
| 帳號 | 同頁登入／註冊 Tabs、登出、顯示本人資料、修改 displayName |
| 導覽 | 共用上方 Header、四個 nav、使用者頭像與選單、手機導覽 |
| 我的表單 | 本人分頁清單、status 篩選、手動刷新、狀態與不同填答者人數 |
| 新建 | 當頁編輯；首次保存才建立 Draft，再進 edit |
| 編輯 | 五種題型、選項、config、題目／選項排序、Draft 保存與預覽 |
| 管理 | 發布、關閉、soft delete、既有表單 resultVisibility 即時更新 |
| 填答 | 初始空白、驗證、提交成功 Dialog、主動查看本人最新完整答案 |
| 統計 | 獨立頁、根資訊、題型標示、答案分布、人數、具名姓名；public 可未登入 |
| 共用流程 | 一次 Auth 初始化、登入返回、dirty 離頁確認、API 錯誤與寫入結果不明 |

## 4. 暫緩與正式 V1 範圍外

| 項目 | 分類 | 本次行為 |
| --- | --- | --- |
| Google 登入／Google Project／真實 Provider | 正式 V1 的延後整合 G1 | Google 按鈕隱藏，不呼叫 auth/google |
| Railway、正式 Domain、遠端正式部署 | 後續工程階段 | 以本機前後端整合為目標 |
| 忘記／重設密碼、Email verification、修改 Email／Password | 正式 V1 範圍外 | 不新增流程或入口 |
| Refresh Token、綁定／解綁、撤銷所有裝置 | 正式 V1 範圍外 | 使用後端 HttpOnly Cookie，不擴充 Auth |
| 未登入填答 | 正式 V1 不支援 | anonymous 填答仍需有效 Active 登入者 |
| Reopen、退回 Draft、復原／垃圾桶、永久刪除 | 正式 V1 範圍外 | Closed 不重開；soft delete 後視為不存在 |
| 共同管理、複製／版本歷史、模板、條件分支、檔案上傳、匯入／匯出 | 正式 V1 範圍外 | 不加入編輯器 |
| 本人歷史答案清單、修改／撤回 Response、Owner 原始答卷清單 | 正式 V1 範圍外 | 只提供本人最新完整 Response 與正式 Statistics |
| 圖表、百分比、平均／中位數、完成率 | 本次統計 UI 不做 | 只列題目、答案、人數及合法的具名名單 |
| 定義／答案的 localStorage、sessionStorage、跨頁恢復 | 本次明確排除 | 當頁記憶體＋離頁確認；離開後不恢復 |

DB、API 或套件具備某種能力，不等於本次已授權新增 UI 功能。

## 5. 核心決議索引

| 決議 | 本組文件的最終版本 |
| --- | --- |
| 新建 | /forms/new 只有保存草稿、預覽；第一次成功後 push 到 edit |
| 定義保存與發布 | Draft 保存、發布分開；有未保存定義時先保存，不暗中連續提交 |
| Visibility | 新建未預選、必選；既有表單切換即 PATCH，成功 toast，失敗還原 |
| Creator／設定 | 編輯與 FormDetail 顯示建立者與完整產品設定；status 唯讀 |
| Options | label 可編輯；value 自動產生且穩定，不能拿 value 代替 Option ID 填答 |
| 排序 | draggable 為主要方式，手機／鍵盤提供上下移動備用方式 |
| 預覽 | Dialog；桌面 90vw × 90vh，手機各方向只保留總共 4px；每次開啟清空試填答案 |
| 初始填答 | single／multiple 都空白，不自動查 latest；使用者按查看我的填答才呼叫 |
| 提交成功 | Dialog 不自動關閉，答案保留；single 移除提交，multiple 可再新增提交 |
| Stars／Range | 未作答與 0 分分開；Stars 的 0 用獨立 radio，Range 直接操作 0 |
| Deadline | 到期仍 Published；正常進頁留原頁，提交才遇截止／關閉錯誤提示後回首頁 |
| Statistics | 獨立 URL，直接讀 Statistics；尚未開放／無權查看留統計原 URL |
| D-12 | 每次完整 App 啟動共用一次 GET users/me；SPA 內跳頁不重查 |
| 已停用 | 不主動登出；Header 保留既有登入資料與登出；依 API 錯誤處理 |
| 寫入結果不明 | 簡化方案：提示、保留輸入、手動核對；不自動重送、不增自訂版本衝突系統 |

## 6. 文件確認與下一階段

這八份文件是本次可 review 的完整前端規格初版。產品決議與工程細節的來源不同：既定產品行為按此執行；06 中標示交由初始化計畫選定的套件小版本／adapter／timeout 等，屬後續工程選擇，不是待重談的產品需求。

規格 review 後依序產出前端總實作計畫、前端專用 AGENTS 與 development／acceptance Skills，再授權 repo 初始化與個別 Round。每個 Round 延續「實作計畫 → review → 實作 → code review → 測試計畫 → review → 測試 → Owner 決議」。正式驗收與開發自測分開。

實際串接 R10 必須記錄當時後端版本及可用狀態；規格已確認不代表統計 Endpoint 已完成。
