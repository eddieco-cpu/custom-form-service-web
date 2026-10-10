# V1 Frontend — Auth、State、Error Handling

版本／日期：1.0／2026-10-10。狀態：規格初版，待 Owner review。前置：[00](00-v1-frontend-overview.md)。本文件完整承接 D-12 與已定案的簡化錯誤流程。

## 1. 基本原則

- 身分、權限、生命週期與收件資格以 API 為準，前端按鈕不是權限證明。
- 一般成功／錯誤保留原 URL；登入返回與不符合狀態的頁面才跳轉。
- 不儲存 JWT；HttpOnly access_token 由瀏覽器與 API 管理。
- 設計與答案只在當頁記憶體；沒有 localStorage、sessionStorage、跨頁恢復或登入後還原。
- 不自動重送 API 寫入；對網路／timeout／500 不推論一定沒寫成功。
- API error.code 作分支，HTTP 狀態與 message 只是輔助；登入錯誤、本人無紀錄、帳號停用各有自己的流程。

## 2. D-12：完整 App 啟動的 Auth 初始化

每次完整 App 啟動共用一次 GET /api/v1/users/me，包括新分頁、重新整理、直接輸入 URL，以及 /login、statistics。

同一 SPA 內只有首次 idle → pending 發起初始化。所有等待者共用同一 Promise；完成後保存 User／結果到記憶體，不能因 user=null 就認為還沒初始化。

| 初始化結果 | 記憶體／Header | 受保護頁 | 公開統計 |
| --- | --- | --- | --- |
| 200 User | 記錄 User，settled | 繼續 | 繼續統計、Header 登入中 |
| 401 AUTH_REQUIRED／AUTH_TOKEN_INVALID／AUTH_TOKEN_EXPIRED | User=null、已初始化，Header 未登入 | login redirect | 不因這個 me 錯誤離開；Statistics 自行判權限 |
| 403 AUTH_USER_DISABLED | 記錄該次初始化錯誤、不建立可持久化的 User status；有舊 User 保留，沒有時 Header 預設 icon＋登入中與登出 | 不導 login；依頁面資料需求顯示停用讀取錯誤或由該資源 API 回錯誤 | Statistics public 200 可繼續；private 按其 403 呈現 |
| 網路／timeout／500 | unknown，保留錯誤；不當成未登入 | 原 URL 初始化重試畫面；手動重試 me | Statistics 可獨立完成，Header 顯示身分未知 |

初始化失敗的重試只由明確使用者操作觸發。完成的 401／403 也是已初始化結果，SPA 導航不自動重查。

## 3. Plugin 與 middleware 職責

| 元件 | 只做的工作 | 不做的工作 |
| --- | --- | --- |
| client Auth plugin | 啟動一次初始化、管理共享 Promise／結果；可在背景開始 | 不等待後才允許 public Statistics 讀取；不每次導航重跑 |
| 命名 auth middleware | await 同一初始化；200 允許、401 login redirect、unknown 重試 gate、403 停用保留原頁流程 | 不判 Form Owner／Draft，也不為進每頁另 GET me |
| 命名 guest middleware | await 初始化；200 回合法 redirect 或 /；401／403 留 login；unknown 留 login 並提供重試，仍可主動登入 | 不把停用當成應導首頁的正常 User |
| Form page loader | GET FormDetail、Owner／status 判斷、依 01 導向 | 不用 PATCH 試探權限，不查 Latest 決定初始答案 |
| Statistics loader | 直接 GET Statistics，按特殊優先序處理 | 不套 auth middleware、不先 GET FormDetail |
| global middleware | 本次無需要 | 不加每次 GET me 的 global middleware |

/、/profile、new 等需要 User 顯示的頁面，首次 me 403／unknown 時不以假 User 建立可操作資料；在原頁顯示該讀取問題並保留 Header 的適當狀態。沒有新增全域 disabled 業務旗標來預先否定所有 API。

## 4. SPA 記憶體更新與競態

最低記憶體資料：User 或 null、初始化 idle／pending／settled、初始化錯誤／未知結果、共享中的初始化 Promise。Promise 使用 client 當次 App 的私有記憶體，不塞進需序列化的資源 DTO。

| 事件 | 更新 |
| --- | --- |
| Login 200 | 直接採 User；標記已初始化，不額外 GET me |
| Register 201 | 不建立登入狀態；回登入 Tab |
| PATCH me 200 | 更新共用 User／Header；不額外 GET me |
| Logout 204 | 清 User，標記已初始化且未登入；replace /login，無 redirect |
| 正常受保護操作 Auth 401 | 更新為登入失效；依操作 Dialog／dirty 返回流程 |
| Login 的 AUTH_INVALID_CREDENTIALS | 只顯示帳密錯誤；不啟動登入失效跳轉 |
| 操作 AUTH_USER_DISABLED | 不清掉 User、不主動登出；保留 Header、當頁輸入與 API 錯誤 |

Login／Logout 或明確更新登入狀態後，先前初始化回應不得反向覆蓋新狀態。以當次 session revision／請求世代或等效方式忽略舊結果。

User=null 且已初始化不是重查條件。只有完整 App 重啟、初始化手動重試、使用者明確核對結果等才可再次 GET me；Profile 正常掛載、SPA router 跳頁、成功 Login／PATCH me 均不重查。

不同分頁記憶體獨立，但 Cookie 共用。本次不做 BroadcastChannel 或即時跨分頁同步；下一次 API／完整重新整理確認真實身分，不能假設另一分頁登出會立即更新這個 Header。

## 5. 登入返回流程

### 5.1 初次進入保護頁

1. 共用初始化確認 Auth 401。
2. replace /login?redirect=原完整站內 path＋query＋hash。
3. Login 200 採 User，驗證 redirect。
4. 合法則 replace 返回；不存在／無效則回 /。
5. 返回後重新讀取資源，不恢復未保存輸入、不重送原寫入。

### 5.2 元素操作遇到登入失效

1. API 回 AUTH_REQUIRED／AUTH_TOKEN_INVALID／AUTH_TOKEN_EXPIRED，顯示錯誤 Dialog。
2. Dialog 只有關閉與 ×，兩者同流程；不能按 Esc／遮罩結束。
3. 使用者關閉後，嘗試 replace 到 login，redirect=當前頁完整 URL。
4. 當頁 dirty，先出原生丟棄確認；確認才離開，取消保留原頁及輸入。
5. 取消不恢復登入有效狀態；後續 API 仍以 Server 回應為準。

登入頁帳密錯誤留登入 Tab。統計首次私有讀取 Auth 401 無當頁輸入，直接走返回流程；Header me 401 不能代替 Statistics 的判定。

### 5.3 redirect 驗證

接受本站已知 route 的絕對站內 path，保留合法 query／hash；拒絕外部 URL、//host、反斜線繞過、無效編碼、/login 自循環與未知路由。

使用 URL parser／route matcher 及 origin 檢查，不用字串前綴判斷代替完整驗證。redirect 僅作導航，不執行其文字或 API。

## 6. 註冊、停用、登出

| 情境 | 規則 |
| --- | --- |
| 註冊成功 | toast、回登入 Tab、保留返回 query、帶 email、清密碼；仍需主動登入 |
| USER_EMAIL_ALREADY_EXISTS | 留註冊 Tab，email 欄位與明細提示；不自動登入／建立 Password |
| 正確帳密但已停用 | 留登入 Tab，顯示「帳號已停用，無法登入」 |
| 使用中遇停用 | 不主動登出；Header 保留登入資料／登出；操作錯誤保留輸入，不建立前端全域停用封鎖 |
| 停用造成頁面讀取失败 | 原 URL 的停用錯誤；仍可用 Header 登出 |
| public Statistics＋停用 Cookie | Statistics 成功結果繼續顯示；me 403 不覆蓋它 |

登出顺序：先確認當頁 dirty；取消不 call logout，確認才 POST logout。204 後清狀態，跳 /login，不再重複離頁確認；failed／結果不明保留現有記憶體呈現與當頁資料，不宣稱 Cookie 一定還有效，使用者可手動重試。Logout 契約允許無 Cookie／過期 Cookie。

## 7. Dirty 定義

以當頁 model 與對應基準的差異判斷，不只看有沒有非空文字。

| model | 基準 |
| --- | --- |
| new 編輯 | 明確新建初始值 |
| 既有 Draft | 最後成功 GET／PATCH 的定義；Visibility 與定義 dirty 分離 |
| 實際填答 | 空白、已成功載入 Latest 或成功提交時的答案基準 |
| Profile | 最後成功取得／保存的 displayName |
| 預覽試填 | 不納入正式 dirty |

文字、config、選項、增刪、排序均參與比較；改回基準清 dirty。自動初值、單純載入、保存／提交成功後沒有再改，都不提醒。單次後唯讀／多次保留成功答案時皆為 clean。

當前表單在結果不明時仍視為有待核對資料；即使輸入與舊基準剛好相同，也不能解除「需重讀建立基準」的寫入限制。

## 8. 離頁與資料取代

| 行為 | 機制 |
| --- | --- |
| 關閉分頁、重新整理、整頁導航 | dirty 時添加 beforeunload；handler preventDefault 及必要相容處理；clean／卸載時移除 |
| SPA nav、上一頁、API 後導向 login／首頁 | route leave guard＋window.confirm |
| 同元件更換 formId | route update guard，先確認才重設 model／讀新資料 |
| 原 URL 改成錯誤畫面或 Server 重讀覆蓋 model | 同一丟棄確認，確認才銷毀輸入 |
| 查看我的填答成功要覆蓋 dirty 答案 | 顯式替換確認，取消不套用 |
| 成功保存後既定導向 | 已建立 clean 基準，無多餘確認 |
| 已確認登出／刪除後成功導向 | 本次授權丟棄，不再第二次詢問 |

beforeunload 不會替 SPA router 自動觸發；不能靠它取代 route guard。瀏覽器提示文字由瀏覽器決定，手機強制結束不保證事件触發；本次仍不增資料恢復。

一次 transition 只確認一次；不要為中途 redirect 重問，也不要用全域永久 bypass 讓下一次未保存修改漏掉。取消後保留輸入，若已知操作不合法，停用該操作但允許查看／複製。

## 9. 錯誤呈現分層

| 來源 | 呈現 |
| --- | --- |
| 前端欄位驗證 | 欄位下提示＋聚焦／捲到首個錯誤；不發非法 Request |
| 首次資源 GET | 原 URL error／empty state；只有必要 Auth 401 導 login |
| 元素 API 操作 | Dialog 主訊息與可對應的 details；error.code 用於內部分流，保留輸入 |
| 成功一般保存／管理 | toast；Response 提交使用不自動關閉 Dialog |
| 無正式 Envelope 的網路／timeout | 前端可理解的載入／結果不明提示，不偽造後端 error.code |

details.path 對應這次 Request 的位置。Delta questions[0] 不一定是畫面第一題，送出時保留 path→前端 key 的映射；不能直接用 Array index 標錯題。無法定位的明細放 Dialog／摘要，不能丟掉。

## 10. Error code 分流

| Code／操作 | 當頁処理與後續 |
| --- | --- |
| VALIDATION_ERROR／FORM_DEFINITION_INVALID | Dialog＋欄位明細，留原頁修正 |
| FORM_NOT_PUBLISHABLE | 顯示發布缺項；回編輯原頁，不偷偷補 config 或保存 |
| FORM_NOT_EDITABLE | 停用定義保存／發布，GET 最新狀態；丟棄確認後依 01 導 Form 頁 |
| FORM_ALREADY_PUBLISHED／FORM_ALREADY_CLOSED／FORM_INVALID_STATE_TRANSITION | 提示狀態衝突，GET 最新狀態，依路由呈現；不重送原操作 |
| FORM_ACCESS_DENIED | 提示管理權限被否定，撤下管理操作；可讀時回／留 Form 頁；取代 dirty 前確認 |
| FORM_NOT_FOUND，首次 GET | 原 URL 找不到 |
| FORM_NOT_FOUND，操作中 | 顯示錯誤，確認丟棄才切找不到畫面；取消保留可複製資料並停用失效寫入 |
| RESPONSE_NOT_FOUND，Latest | 正常「您從未填答過」Dialog，保留答案，不套全頁 404 |
| RESPONSE_ALREADY_SUBMITTED | 本頁 single 已知完成；移除提交、保留輸入但不冒充 Server 答案，主動 Latest 才取得真答案 |
| SUBMISSION_DEADLINE_EXCEEDED | 禁止提交；關閉 Dialog 後回 /，經 dirty 確認 |
| FORM_NOT_SUBMITTABLE | GET 判真實 status；Confirmed Closed 同上，其餘按 01 路由 |
| FORM_STATISTICS_NOT_AVAILABLE | 統計原 URL 尚未開放 |
| STATISTICS_ACCESS_DENIED | 統計原 URL 無權查看 |
| Auth 401，普通保護操作 | 依第 5 節；不是所有 401 都同處理 |
| AUTH_USER_DISABLED | 依第 6 節；不是所有 403 都同處理 |
| INTERNAL_SERVER_ERROR／網路／timeout | GET 手動重試；寫入按第 11 節結果不明 |

讀最新狀態可以在背景取得候選，但不能直接覆蓋 dirty model。若 UI 身分與 Cookie 不一致造成管理 403，不可只因舊 User.id 再次顯示已被否定的管理能力；完整刷新或明確重建身分後才重新判定。

## 11. 簡化的「寫入結果不明」方案

共通：結束 loading，Dialog「未能確認操作結果，操作可能已完成」，保留輸入、留原頁；不自動重送、不假顯示成功、不建立自訂版本差異對話框。

| 原操作 | 使用者接下來的普通操作 | 重送限制 |
| --- | --- | --- |
| POST Create | 先到我的表單核對；可用原有 nav 或另開列表 | 再按保存前確認可能建立重複表單；相同 title 不是可靠識別 |
| PATCH Draft Delta | 手動重新載入當前表單；丟棄確認後重建 id／基準 | 重新載入前停用保存／發布，不能盲目再送含新增項目的 Delta |
| Publish／Close | 使用者重新載入當前 Form 取得真實 status | 按新狀態規則操作；不自動把 conflict 當成先前成功 |
| Visibility | 手動重新讀取目前值；保留其他 dirty 定義直到確認丟棄 | 核對前暫停該設定寫入；還原畫面不代表後端已還原 |
| Delete | 使用者重新載入；404 符合已不存在的現況 | 不自動再 DELETE；依新結果呈現 |
| POST Response、single | 使用者主動查看我的填答，核對 Server 紀錄 | 若選擇手動再送，仍由 single 保護；不能自動重送 |
| POST Response、multiple | 主動 Latest 協助核對 | 此次不明狀態後再次提交前確認可能新增重複 Response；Latest 不能證明特定那一次已完成 |
| PATCH Profile | 手動刷新／GET me 核對真實 displayName | 保留輸入；以重讀後的基準再保存 |
| Register | 可主動切登入 Tab，用原帳密確認 | 不自動再次註冊或登入 |
| Login | 主動重試／GET me 核對當前登入狀態 | 不自行保存 Token 或解 JWT 推測成功 |
| Logout | 留現有 UI，使用者可手動重試 | Cookie 可能已清；不能宣稱仍有效，無自動輪詢 |

核對使用現有 GET、列表／Latest 入口與整頁刷新，沒有新增後端冪等 API，也不要求新的前端核對中心。完整刷新會丟棄本地輸入，事前經 dirty 確認。

## 12. 操作 loading 與可取消性

同 Form 管理寫入互斥；保存／提交期間資料輸入停用，Visibility 期間至少停用該設定及其他寫入命令。各作用域 loading 在 finally 結束，failed 後允許安全的手動修正／核對。

送出的寫入請求不能因 UI 取消就假設 Server 回滾；使用者離頁／timeout 也不能推論尚未發生副作用。離頁後舊回應不再修改新頁的 model／toast／route。這是前端一致性要求，不新增 Server cancellation 契約。
