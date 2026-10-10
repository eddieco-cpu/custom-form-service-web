# V1 Frontend — Pages、Routing、Access

版本／日期：1.0／2026-10-10。狀態：規格初版，待 Owner review。前置：[00](00-v1-frontend-overview.md)；Auth 與錯誤專責：[04](04-auth-state-and-error-handling.md)。

## 1. URL 與命名 middleware

| URL | Page 責任 | middleware | 初次頁面資料 |
| --- | --- | --- | --- |
| /login | 登入／註冊 Tabs | guest | 共用 Auth 初始化，無另設 register URL |
| / | 首頁 | auth | 共用 User，不新增首頁 API |
| /profile | 個人資訊 | auth | 共用 User；初始化已成功時不重 GET me |
| /forms | 我的表單 | auth | GET forms，pageSize=10 |
| /forms/new | 新建編輯器 | auth | 當頁初始 model；沒有 Form GET／POST |
| /forms/{formId}/edit | Owner Draft 編輯器 | auth | GET FormDetail 後判身分／狀態 |
| /forms/{formId} | 填答、本人答案、Owner 管理 | auth | GET FormDetail；不自動 GET latest |
| /forms/{formId}/statistics | 獨立統計 | 無 auth／guest | GET Statistics 與 Auth 初始化可並行 |

沒有每次路由導航執行 GET me 的 global middleware。所有完整 App 啟動包含 /login、statistics，仍有共用一次 Auth 初始化；命名 middleware 重用同一結果。

不另設固定 /error URL。讀取錯誤在原 URL 呈現；必要的登入返回與生命周期導向才跳轉。

## 2. 共用 Header

Header 导覽固定順序：建立表單 → 我的表單 → 個人資訊 → 首頁；對應 /forms/new、/forms、/profile、/。

| 使用者狀態 | Avatar／標示 | 點擊行為 |
| --- | --- | --- |
| 已初始化且有 User | avatarUrl，缺少／載入失敗用預設 icon | 開啟選單：使用者名稱、個人資訊 link、登出 |
| 已確認未登入 | 預設 icon＋未登入 | Avatar 不可點；四個 nav 導登入並以點擊目標作 redirect |
| 初始化中 | 中性載入呈現 | 需要身分的導航等待同一初始化；不先判定未登入 |
| 初始化網路／500 失敗 | 中性未知狀態 | 受保護頁提供重試；公開統計可繼續 |
| 已有 User、操作回停用 | 保留原 User／Avatar | 保留登出，不主動清空或強制跳登入 |
| 首次 GET me 回 AUTH_USER_DISABLED、沒有 User | 預設 icon＋登入中 | 選單保留登出；不假造姓名或 email |

公開統計使用同一 Header。未登入點「我的表單」時 redirect=/forms，不把目前 statistics URL 誤用為該 nav 的返回目標。手機行為見 [05](05-ui-and-interaction.md)。

## 3. 首頁 /

顯示登入者歡迎文字及三個主要入口：建立表單、我的表單、個人資訊。Header 的首頁入口維持存在。

不新增儀表板統計、最近表單或背景列表查詢。共用初始化失敗的重試與停用讀取錯誤依 04 處理。

## 4. 登入／註冊 /login

同頁兩個 Tab，預設登入；切換不改 URL，保留 redirect query。

| Tab | 欄位／操作 | 成功流程 |
| --- | --- | --- |
| 登入 | email、password、登入按鈕 | 200 User 更新記憶體；replace 到合法 redirect 或 / |
| 註冊 | displayName、email、password、註冊按鈕 | 201 後成功 toast、切回登入 Tab；帶入 email、清空密碼；不自動登入 |

Google 按鈕隱藏。沒有忘記／重設密碼、Email 驗證或修改帳密入口。驗證、停用與 API 錯誤見 04／05／07。

guest middleware 在 GET me=200 時 replace 到合法 redirect 或首頁；未登入可停留。AUTH_USER_DISABLED 不導首頁，仍可顯示登入 Tab 與停用訊息。

## 5. 我的表單 /forms

| 項目 | 規則 |
| --- | --- |
| 查詢 | GET forms；page 初值 1、pageSize 固定 10 |
| 篩選 | 全部／草稿／已發布／已關閉；全部省略 status，切換回 page=1 |
| 排序 | API updatedAt DESC、id DESC；不另在前端改排序 |
| 刷新 | 明確刷新 UI，重查目前 page／filter；沒有輪詢，文字提示「按刷新取得最新資料」 |
| 每列／卡片 | 標題、status、不同填答者人數、responseMode、responseIdentity、resultVisibility、deadline、建立／更新時間 |
| 進入 | Draft 導 edit；Published／Closed 導 Form 頁；仍以該頁 API 真實狀態判定 |
| 空狀態 | 全部空清單提供建立表單；篩選空結果提示目前條件沒有表單 |
| 刪除 | 不在列表執行；由編輯／Form 頁的 Owner 管理操作處理 |

已載入後刷新失敗，保留既有列表並顯示可重試錯誤；不可宣稱仍是最新資料。首次讀取失敗顯示原頁錯誤。

合法超界 page 回空 items，不能把它當 404。若刷新後 page 超過新的最後一頁，採顯式回最後有效頁後重查一次；空清單回 page=1 且不連續重查。這是 UI 分頁對齊，不修改 API 的合法 page 規則。

## 6. 個人資訊 /profile

顯示 avatar、User id、email、displayName。avatar／id／email 唯讀，只有 displayName 可編輯。

使用共用 User 作初始與保存基準；正常進頁不另 GET me。PATCH me 成功後更新 Header 的 User，toast「個人資訊已更新」，留原頁；無修改時不送寫入。有未保存姓名修改也套用 dirty guard。

API 不提供 User status 或頭像修改。初始 User 未取得時依 Auth 初始化結果呈現，不以空假資料建立可保存 Profile。

## 7. 表單路由成功矩陣

Owner 以 User.id 等於 FormDetail.userId 判定；不靠 URL、名稱或按鈕推論權限。

| Form 狀態 | 有效登入身分 | /forms/{id} | /forms/{id}/edit |
| --- | --- | --- | --- |
| Draft | Owner | replace 到 edit | 顯示編輯器 |
| Draft | 非 Owner | API 404；原 URL 找不到 | 同左 |
| Published、未截止 | Owner | 填答頁＋管理操作 | replace 到 Form 頁 |
| Published、未截止 | 非 Owner | 填答頁 | replace 到 Form 頁 |
| Published、已截止 | Owner／非 Owner | 原頁顯示已截止；不能提交 | replace 到 Form 頁 |
| Closed | Owner／非 Owner | 原頁唯讀表單／本人答案；不能提交 | replace 到 Form 頁 |
| 任一既有狀態 | 未登入／Token 無效或過期 | 登入返回 | 登入返回 |

Published／Closed 的非 Owner 讀 edit URL 可以得到 GET 200，前端直接導到 Form 頁；不建立假的編輯權限錯誤，也不發 PATCH 試探權限。

## 8. Owner／Respondent 操作入口

| 階段 | Owner 主要操作 | 非 Owner 主要操作 |
| --- | --- | --- |
| 尚未建立 | 保存草稿、預覽 | 不適用 |
| Draft edit | 保存、發布、預覽、刪除、Visibility 即時更新 | 他人的 Draft 不可讀 |
| Published、未截止 | 提交表單、查看我的填答、查看填答人數、複製填答連結、關閉、刪除、Visibility | 提交表單、查看我的填答 |
| Published、已截止 | 查看我的填答、查看填答人數、關閉、刪除、Visibility；顯示已截止 | 查看我的填答；顯示已截止 |
| Closed | 查看我的填答、查看統計、複製統計連結、刪除、Visibility | 查看我的填答；依 visibility 顯示查看統計 |
| 已刪除 | 原 URL 找不到表單 | 同左 |

single 已知提交後只移除提交相關入口，不移除 Owner 管理功能。Respondent Count API 允許 Owner 三種狀態；本次主要按鈕安排在 Published，Closed 使用統計 count。

Closed 非 Owner：owner_only 不顯示統計入口；respondents 顯示入口，是否曾提交由 Statistics API 判定；public 顯示入口。Draft／Published 不顯示統計入口。

Owner 複製統計連結旁依目前 Visibility 說明誰能看：僅建立者／建立者及填答者／所有人。複製不授予新權限。

## 9. 讀取失敗與必要跳轉

| 情境 | 讀取結果 | 呈現／跳轉 |
| --- | --- | --- |
| 不存在／已刪除 | FORM_NOT_FOUND | 原 URL 顯示找不到表單 |
| 無效 UUID | VALIDATION_ERROR 的 formId 明細 | 原 URL 顯示連結無效；一般 Form API 仍先認證 |
| 保護頁未登入／過期 | 對應 Auth codes | replace 到 login?redirect=原完整站內 URL |
| 已停用 | AUTH_USER_DISABLED | 原 URL 顯示停用錯誤，Header 保留登入／登出 |
| 網路／500 讀取失敗 | 未取得可用資源 | 原頁載入失敗、手動重試，不當成未登入或 404 |

Statistics 的 Draft／Published 隱藏、Closed Visibility、401 與 403 規則另見 [03](03-response-and-statistics.md)，不能套用一般 Form 頁的認證優先序。

## 10. 跳轉方法與資料生命期

| 動作 | 方法／去向 |
| --- | --- |
| 首次保存／發布成功 | push 到 edit／Form 頁 |
| 正常 nav、查看統計、查看表單 | push 到點擊目標 |
| 狀態不符 edit／Draft Form URL | replace 到合法狀態 URL |
| 登入導向、登入返回、guest 返回 | replace；驗證 redirect |
| 成功刪除 | replace 到 /forms，避免返回已刪頁 |
| 成功登出 | replace 到 /login，不保留 redirect |
| 提交錯誤後確認截止／Closed | popup 關閉後回 /；仍經 dirty guard |

同一 Form ID 的不同頁面也不恢復未保存 model。離頁、換 Form ID、取代畫面或載入 latest，依 04 的資料丟棄確認處理。自然上一頁／下一頁與程式導向遵守相同規則。
