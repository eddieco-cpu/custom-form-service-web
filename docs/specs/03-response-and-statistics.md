# V1 Frontend — Response、Statistics

版本／日期：1.0／2026-10-10。狀態：規格初版，待 Owner review。前置：[00](00-v1-frontend-overview.md)；API／錯誤：[07](07-api-integration-map.md)、[04](04-auth-state-and-error-handling.md)。

## 1. 表單頁 /forms/{formId}

GET FormDetail 取得題目、Options 與根資訊。Draft Owner 導 edit，其他 Draft 依 API 404；Published／Closed 留在表單頁。

頁面顯示 title、description、creatorDisplayName、status、responseMode、responseIdentity、resultVisibility、submissionDeadlineAt；Owner 另顯示唯讀 id／建立／更新時間。根設定與題目定義唯讀；Owner 的 Visibility 管理控制依 02 例外提供。

anonymous 表示統計不揭露填答者，不表示可以未登入提交。Owner 填自己的表單遵守相同收件與 single／multiple 規則。

## 2. 初始化一律空白

| 進入情境 | 答案與已提交記錄 | 按鈕 |
| --- | --- | --- |
| Published、可收件，single | 所有答案空白；本頁尚不知道是否提交過 | 提交表單、查看我的填答 |
| Published、可收件，multiple | 同上 | 同上 |
| 正常進入 Published 已截止 | 所有答案空白、不可提交 | 查看我的填答；顯示已截止 |
| 正常進入 Closed | 所有答案空白、不可提交 | 查看我的填答、依 Visibility 的統計入口 |
| 重新整理／重新進入／換 Form ID | 回到相應初始狀態 | 依當次 FormDetail 狀態 |

不自動呼叫 latest 預查是否填過，也不從 FormDetail、前次 SPA 頁面或 localStorage 推測。single 曾填過的人重新整理後可能看到提交按鈕；Server 的一次性保護負責拒絕，再更新本頁已知狀態。

本頁 knownSubmitted 只在成功 POST、成功讀到 single 的 Latest 或 RESPONSE_ALREADY_SUBMITTED 後成立。重新進頁重新初始化，不跨頁恢復答案／該判定。

## 3. 填答與提交流程

1. 使用者輸入答案，當頁 model 與空白或已載入基準比較 dirty。
2. 按提交，先依題型／required／config 驗證；錯誤留在欄位並定位第一個錯誤。
3. POST responses，只送實際有效答案；全部題目 optional 時允許 answers=[]。
4. 請求期間停用答案修改、提交與會替換答案的操作。
5. 201 後顯示「提交成功」Dialog，不自動關閉，保留本次答案並建立 clean 基準。
6. 使用者按「完成」或 × 關閉成功 Dialog，依下表繼續；不改 URL。

| 模式 | 成功後狀態 |
| --- | --- |
| single | knownSubmitted=true；答案唯讀，移除提交表單按鈕，保留查看我的填答 |
| multiple、仍可收件 | 答案保留、可編輯；提交表單與查看我的填答仍存在；再送是新增一份 Response |
| 已截止／Closed | 唯讀、不可提交；正常讀取不自動跳轉 |

提交成功不移除 Owner 的人數、分享、關閉、Visibility、刪除等管理入口。multi 再提交可以是同樣內容，沒有必須先修改答案的新規則。

## 4. 查看我的填答

每次按鈕皆明確 GET responses/me/latest，不使用初次預查或前一次快取代替。

| API 結果／本頁狀態 | 處理 |
| --- | --- |
| RESPONSE_NOT_FOUND | Dialog「您從未填答過」，保留目前輸入、按鈕與模式 |
| 成功、當頁沒有未提交差異 | 重建整份答案，記錄 submittedAt，建立載入基準 |
| 成功、當頁 dirty | 成功取得後確認「載入最近一次答案將取代目前輸入」；確認才替換，取消保留全部輸入 |
| single 成功 | knownSubmitted=true，mapping 後唯讀，移除提交 |
| multiple 成功、仍可收件 | 可編輯最近一次答案、可新增提交 |
| multiple 成功、已截止／Closed | mapping 後唯讀，不提交 |
| 網路／500／其他錯誤 | 保留當頁答案，依 04；不先清空再發請求 |

資料只是一份最近完整 Response，不是全部歷史。顯示「最近一次提交」與 submittedAt，避免誤解為修改原紀錄。

Mapping 以 questionId／Option ID；先建立所有題目未作答狀態，再套用 Response 中存在的 Answers。最新 Response 缺 optional 答案，該題維持空白，不保留目前答案或從歷史補回。

GET 進行時停用替換／提交與答案修改；成功後才判斷既有 dirty 是否需確認。換 ID、離頁或身分已改變時，舊請求結果不能寫到新頁。

## 5. 答案型別與未作答

| 題型 | UI／API value | 空白與驗證 |
| --- | --- | --- |
| text | 字串 | White_Space trim 後空白為未作答；非空依 minLength／maxLength |
| number | UI 保留原始輸入／精確值；API JSON number | 空字串為未作答；0 是答案；min／max 用精確比較 |
| single_choice | Option ID 字串 | 沒選為未作答；不是 label／Option value |
| multiple_choice | 不重複 Option ID Array | [] 為未作答；UI 以勾選／multi_select 映射 |
| rating | 整數 | 未操作無答案；0 可為答案；min≤value≤max |

API 不以 null 表示未作答；optional 空白省略 Answer，required 空白阻擋。清除數字／文字、取消多選不誤當 0 或已作答。前端內部使用 undefined 等明確未作答狀態，但不把它當正式 Answer value 送出。

Number 不使用 truthy、浮點四捨五入或 Zod 數字強制轉型代替精確策略，詳見 06。Text 等值大小寫敏感，不做 normalization 或合併空白。

## 6. Rating — Stars

顯示 max 顆累積星星，依序每列 10 顆，最後一列放剩餘星；上限 100 即最多十列。星數對應分數，不是 max-min+1 顆。

| 範圍／狀態 | 顯示／互動 | 答案 |
| --- | --- | --- |
| 0～5、尚未操作 | 0 分 radio 未選，五顆空星，文字尚未作答 | 無 |
| 點第 2 顆 | 前兩顆亮、0 radio 取消，文字 2 分 | 2 |
| 點第 5 顆 | 五顆亮，文字 5 分 | 5 |
| 點 0 分 radio | 全部熄滅、0 radio 選取，文字 0 分 | 0 |
| min>0 | 不顯示 0 radio | 僅 min～max 可選 |
| min>1，未作答 | 前 min-1 的星不可選並以次要外觀標示，仍保留位置 | 無 |
| min=20，選 20 | 累積前二十顆亮；1～19 仍不能單獨選作分數 | 20 |

0 radio 與星星共用一個答案值且互斥；hover／focus 只作提示，不產生答案。有效選分亮星數等於分數，不能把 min 當作第 1 顆重新編號。

optional Rating 作答後提供「清除答案」；清除為未作答，熄滅星與取消 0 radio。required Rating 不提供清除按鈕；readonly 不提供清除。0 分不是清除。

## 7. Rating — Range

| 狀態／操作 | 視覺位置 | 答案 |
| --- | --- | --- |
| 初始／清除 | min；顯示尚未作答 | 無 |
| 點選當前 min，即使位置未變 | min；顯示 min 分 | min |
| 點軌道／拖曳／分數方向鍵 | 對應整數位置與文字 | 有效整數 |
| 只有 focus／hover／Tab | 不因此改變答案 | 保持原狀 |

不另加 0 radio；min=0 時可以操作取得 0。答案與滑桿視覺位置分開管理，不能只用 change 判斷作答，否則初始 min 的點選會漏掉。

optional Rating 的清除把答案回未作答，視覺回 min；required／readonly 不提供清除。按保存／提交不能把滑桿初始位置自動當答案。

## 8. 提交失敗與結果不明

| 錯誤 | 本頁行為 |
| --- | --- |
| VALIDATION_ERROR | Dialog＋欄位明細；保留原輸入，修正後手動提交 |
| RESPONSE_ALREADY_SUBMITTED | Dialog 告知已提交，移除提交、停用答案修改；保留這次本地輸入但標示它不是已查得的 Server 答案；使用者可主動查看我的填答 |
| SUBMISSION_DEADLINE_EXCEEDED | 標示已截止、禁止提交；關閉錯誤 Dialog 後回首頁，經 dirty 確認 |
| FORM_NOT_SUBMITTABLE | 重新 GET FormDetail 判狀態；確認 Closed 後同上回首頁；若 Draft 等其他狀態依 01 路由规則 |
| FORM_NOT_FOUND | 原 URL 找不到；取代輸入前經 dirty 確認 |
| AUTH_REQUIRED／TOKEN_INVALID／TOKEN_EXPIRED | 依操作中 Auth Dialog → dirty 確認 → login redirect |
| AUTH_USER_DISABLED | 保留輸入、顯示停用錯誤；不主動登出或跳登入 |
| 網路／timeout／500 | Dialog 表示無法確認結果；保留輸入、不自動重送；使用者主動查 Latest 核對 |

關閉截止／Closed 錯誤 Dialog 後若取消離頁確認，可留原頁查看／複製本地內容，但不可再提交。正常首次進入已截止／Closed 不是此跳轉流程。

multiple 對結果不明後再次提交，需確認可能重複新增；Latest 只能協助核對，不能證明某一次操作是否完成。完整規則見 04。

## 9. 填答人數與分享

Owner Published 頁主動按「查看填答人數」才 GET respondent-count，顯示不同填答者人數；不是即時訂阅或 Response 歷史總數。清單 count 與統計 Root count 採正式語意，不以 Option 加總推算。

Published Owner 可複製 origin＋/forms/{id}；Closed Owner 可複製 origin＋/forms/{id}/statistics，並顯示當前 Visibility 的資格說明。Clipboard 成功 toast；失敗提供可選取的完整 URL 供手動複製。填答 URL 仍須登入。

## 10. 統計頁：獨立資料與頂部內容

直接 GET Statistics，不先 GET FormDetail，也不加 auth middleware。Header 的 GET me 按 04 共用一次初始化，不阻擋公開結果。

| 顯示資訊 | Statistics 欄位／文字 |
| --- | --- |
| 標題／說明 | title／description；空說明省略 |
| 建立者 | creatorDisplayName，目前姓名 |
| 填答人數 | count，標示不同填答者人數 |
| 填答模式 | responseMode，單次填答／可多次填答 |
| 結果範圍 | resultVisibility，僅建立者／填答者／所有人 |
| 表定截止時間 | submissionDeadlineAt；null 為未設定，日期依 05 |

API 根 id 欄位名稱是 formId，Root 固定九欄位。UI 不额外假造 status、responseIdentity、建立／更新時間或 Creator ID。統計頁不增加 Owner 管理面板；其 API 沒有 Owner ID 可據以判定。

## 11. 統計 Body 與空狀態

每題：順序編號、type 中文標籤、title、可選 description、Question count；底下列每個答案與 Item count，具名時列 respondents 的 displayName。

| type | 中文／Item 呈現 | 零值／排序 |
| --- | --- | --- |
| single_choice | 單選；Option label（N 人） | 全 Options 含 0，API 順序 |
| multiple_choice | 多選；同上 | 全 Options 含 0；Item 加總可超過 Question count |
| text | 文字；完整 value（N 人），換行保留 | 只有實際值；空 Array 顯示尚無作答；API count DESC、固定文字順序 |
| number | 數字；精確 value（N 人） | 只有實際值；空 Array 尚無作答；API 數值順序 |
| rating | 評分；每個分數（N 人） | min～max 全部整數含 0 票，API 分數順序 |

匿名 Item 沒有 respondents，不顯示姓名或嘗試映射個人。具名 Item 顯示名單，0 票為 []；同名不去重，保留不同 id 的人。名單與長文字換行，不隱性截斷、分頁或只顯示前幾人。

Root count=0 是成功：顯示尚無填答及零值題目，仍保留根資訊；text／number 是空分布，Choice／Rating 列零票。最新有效 Response 沒回答 optional 題，不從過去答案補回；Question count 可小於 Root count。

不加百分比、圖表、平均、中位數、完成率或跨題個人答案。按 API 的排序直接呈現，不在前端重算聚合。

## 12. 統計存取矩陣

Closed 且未刪除，登入欄皆指有效 Active 身分。

| Visibility | Owner | 非 Owner、曾提交 | 其他登入者 | 未登入 |
| --- | --- | --- | --- | --- |
| owner_only | 200 | 403 | 403 | 401 |
| respondents | 200 | 200 | 403 | 401 |
| public | 200 | 200 | 200 | 200 |

public 的無效／過期／Disabled Cookie 視匿名，仍可成功；Header me 的失敗不能提前跳 login。

| 狀態／身分 | API | 前端 |
| --- | --- | --- |
| Draft、Active Owner | 409 FORM_STATISTICS_NOT_AVAILABLE | 原 URL 尚未開放 |
| Draft、其他身分 | 404 FORM_NOT_FOUND | 原 URL 找不到 |
| Published、Active User | 409 FORM_STATISTICS_NOT_AVAILABLE | 原 URL 尚未開放；到期也相同 |
| Published、匿名／無效／過期／Disabled | 404 FORM_NOT_FOUND | 原 URL 找不到，不推測是登入問題 |
| Closed private Auth 401 | 對應 Auth code | 首次讀取直接 login redirect 回統計 URL |
| Closed private Disabled | 403 AUTH_USER_DISABLED | 原 URL 停用錯誤，保留登出 |
| Closed、Active 但無資格 | 403 STATISTICS_ACCESS_DENIED | 原 URL 無權查看 |
| 不存在／已刪除 | 404 FORM_NOT_FOUND | 原 URL 找不到 |
| UUID 無效 | 400 VALIDATION_ERROR | 原 URL 連結無效；此端點 UUID 先於身分判定 |
| 網路／500 | 載入失敗 | 原 URL 手動重試 |

尚未開放可提供查看表單 link；該 link 進受保護的 Form URL，再走正常身分／狀態路由。錯誤重試屬使用者主動操作，不輪詢可見性。
