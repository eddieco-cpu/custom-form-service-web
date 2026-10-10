# V1 Frontend — Form Editor、Lifecycle

版本／日期：1.1／2026-10-10。狀態：原產品規格已通過 Owner review；本次依 Owner 指示回補既有題目省略 variant 的規則。前置：[00](00-v1-frontend-overview.md)；頁面／錯誤：[01](01-pages-routing-and-access.md)、[04](04-auth-state-and-error-handling.md)。

## 1. 建立與保存流程

| 階段 | 可用主要操作 | API 與成功結果 |
| --- | --- | --- |
| /forms/new | 保存草稿、預覽 | 保存才 POST forms；201 後 toast「草稿已建立」，push 到 /forms/{id}/edit |
| Owner Draft edit | 保存、發布、預覽、刪除 | 保存 PATCH 定義，成功更新基準並 toast「已保存」，留原頁 |
| Draft 發布 | 定義已保存且前端發布驗證通過才可執行 | 確認後 POST publish；成功 toast 並 push 到 Form 頁 |

進入 new 不建立後端 Form，不先拿 formId。第一次只有保存，沒有直接發布；不連續自動 POST Create＋Publish。

有未保存定義時，發布需提示先保存，或停用發布並顯示原因。發布只使用最後成功保存的版本；Visibility 已成功獨立更新不算未保存定義。

無改動的既有 Draft 不發多餘 PATCH；預覽隨時可開，沒有保存副作用。實際發布仍以 Server 當下完整驗證為準。

## 2. 新建初始值

| 項目 | 初始值 |
| --- | --- |
| title／description | 空白，供使用者輸入；description 送出時依 nullable 規則處理 |
| status | 草稿（尚未保存），只顯示 |
| creator | 目前登入者 displayName |
| responseMode | single |
| responseIdentity | anonymous |
| resultVisibility | 未選；必須選擇，否則擋首次保存 |
| submissionDeadlineAt | 未設定 |
| questions | []；不自動新增題目 |
| Form ID／建立／更新時間 | 尚未產生；顯示未保存語意，不假造後端值 |

resultVisibility 的 UI 必選不更改後端的 owner_only default；前端首次 POST 必須明確送使用者所選值。

## 3. 根資訊與可修改性

編輯／FormDetail 頁顯示全部產品設定；資料庫欄位不全部轉為輸入。

| 欄位 | 呈現／修改 | 更新方式／條件 |
| --- | --- | --- |
| title | 編輯器輸入；Published／Closed 顯示唯讀 | 新建 POST；Owner Draft PATCH |
| description | 同上；null 無內容時不顯示多餘占位段落 | 同上，null 可清除 |
| status | 草稿／已發布／已關閉 badge，不可直接選值 | publish／close 專用 API |
| responseMode | 單次填答／可多次填答 | 新建 POST；Owner Draft PATCH |
| responseIdentity | 匿名／具名 | 新建 POST；Owner Draft PATCH；發布後凍結 |
| resultVisibility | 僅建立者／填答者／所有人 | 新建隨 POST；既有未刪除表單獨立即時 PATCH |
| submissionDeadlineAt | 未設定或截止時間；已截止另標示 | 新建 POST；Owner Draft PATCH；發布後不可改 |
| creatorDisplayName | 標題附近顯示目前建立者名稱 | 不透過 Form API 修改 |
| id、createdAt、updatedAt | Owner 既有表單的唯讀次要資訊 | Server 維護；新建前無值 |
| userId | 用於 Owner 判定，不作可修改設定 | Server 決定，不允許轉移 Owner |
| deletedAt | FormDetail 沒有該欄位 | 以有條件的刪除按鈕操作，不偽造輸入 |

Published 到期仍是 Published；「已截止」是額外提示，不改 status，也不提前顯示統計成功內容。

## 4. Visibility 即時更新

新建採 radio 選擇但不預選；既有 Owner 表單初始化 API 真實值，切換立即 PATCH result-visibility，沒有套用按鈕。

1. 保存最後已知成功值，顯示新選擇與此控制 loading。
2. 發送專用 Request，只含 resultVisibility。
3. 請求中停用該控制與同 Form 的其他寫入操作，避免互相競爭。
4. 成功採回應值與更新後的中繼資料，toast「結果可見性已更新」。
5. 明確失敗還原選擇，顯示錯誤；其他未保存定義保留。
6. 網路／500 結果不明時先還原最後已知值並標示待重新確認；重新載入前不宣稱 Server 一定已還原，依 04 手動核對。

API 回完整 FormDetail，但不能整份蓋掉正在編輯的 title、questions、config 等。一般定義保存也不把結果政策塞進 PATCH Form。

這個控制在 Owner 的 Draft edit、Published／Closed Form 頁皆提供。非 Owner 只顯示目前值，不提供管理控制。

## 5. Question／Option CRUD 與初始值

新增題目預設 text、title／description 空白、required=false，放在最後。既有題目保留 Server id，新項目使用前端 key，詳見 06。

| 題型 | 初始 config／Options |
| --- | --- |
| text | variant=input；placeholder、minLength、maxLength 未設定 |
| number | placeholder、min、max 未設定；不提供 step 或 variant |
| single_choice | variant=radio；兩個選項「選項 1」「選項 2」 |
| multiple_choice | variant=checkbox；兩個選項「選項 1」「選項 2」 |
| rating | variant=stars，明確 min=1、max=5 |

Rating 的 1／5 是前端可見初值，不是後端遇到缺值時自動補出的資料。使用者可移除 Draft bounds；發布時仍必須完整。

每題可編輯 type、title、description、required、題型 config；可刪除題目，選擇題可新增／刪除／修改選項 label。修改保留當頁，保存才生效。

新增選項的 label 使用同題尚未使用的「選項 N」，value 自動產生 opt_UUID 且同題唯一。只開放 label；改 label／排序不改 value。允許不同選項 label 相同，不能依 label 去重。

新項目刪除前尚未保存，只需移除本地 model；刪除既有項目須在保存 Delta 表達。刪除題目連同選項由後端原子處理，不逐個發 Option API。

## 6. Config 欄位與驗證

| type | 可編輯 config | 規則 |
| --- | --- | --- |
| text | variant、placeholder、minLength、maxLength | input／textarea；長度限制為非負整數；兩者有值時 min≤max |
| number | placeholder、min、max | 精確 JSON number；兩者有值時 min≤max |
| single_choice | variant | radio／select |
| multiple_choice | variant | checkbox／multi_select |
| rating | variant、min、max | stars／range；bounds 為 0～100 整數；兩者都有時 min<max |

config 必須是 object，不接受 null、Array 或未知 key。可選 key 的空輸入表示省略該 key，不送 null。required 為 Question 的獨立欄位，Options 不放 config。

text／number 的限制欄位可不設定；不能自行加數字小數位數、選擇數上下限、defaultValue 或其他未定義設定。

### 6.1 既有題目省略 variant：呈現與保存

後端 01 §6 允許省略 variant，以下是既有資料的有效呈現值；number 不接受 variant。

| type | API 省略 variant 時呈現 |
| --- | --- |
| text | input |
| single_choice | radio |
| multiple_choice | checkbox |
| rating | stars |

載入既有題目時分開保留原始 config／保存基準，以及上述有效呈現值。控制可顯示預設值，但不能因初始化補值就把 model 判為 dirty 或自動發 PATCH。

- 只修改 Question title 等非 config 欄位，不順便補送 variant。
- 修改其他 config key 時，仍依完整替換規則送 config；未改的省略 variant 保持省略。不能因建置完整 config 而遺失其他既有設定。
- 使用者真正改成另一種呈現方式，才在新 config 明確送 variant；選回與原有效值相同時，不只因「省略／明確預設」的表示差異製造 dirty。
- 保存成功依 Server FormDetail 重建原始 config 與基準，effective variant 只負責呈現。
- 本節不改 §5 的新增題目初值或 §8 的題型切換；新建／type 切換仍採已定案的完整目標 config。
- 不把這個 fallback 套到 Rating min／max；既有 Draft 缺 bounds 仍不完整，不自動補成 1／5 或 0／100。

例：既有 text 的 `config={}`，UI 顯示 input；只改 title，Delta 只送 title。若只加 placeholder，該題送完整 `config={"placeholder":"請輸入"}`，variant 仍省略，不因此更動呈現方式。

F5 實作計畫須提供原始 config／有效值的 model、dirty 判定與 Delta 範例，並驗證上述 no-op／config 修改／切換再改回的行為。

## 7. 保存 Draft 與發布的差異

| 檢查 | 保存 Draft | 發布 |
| --- | --- | --- |
| Form title | trim 後非空，≤200 Code Points | 同左 |
| Question 集合 | 可以 [] | 至少一題 |
| 已有 Question title | trim 後非空，沒有另加欄位專屬 maxlength | 同左 |
| Choice Options | 可以 [] | 至少一個有效 Option |
| 已有 Option label／value | trim 後非空；value≤255 Code Points，同題唯一 | 同左 |
| Rating bounds | 可缺，已提供仍須合法 | min、max 均必填，0≤min<max≤100 |
| config／排序／歸屬 | 型別與完整候選結構一致 | 完整有效 |
| Deadline | 合法 datetime 或 null，可保存過去值 | 非 null 必須晚於發布 Server Time |

空白題目可在當頁編輯，但不能保存已有空白 title 的 Question。Draft 允許不完整不代表結構／型別錯誤可保存。沒有 max 自動視為 100 的發布規則。

Client 以對應規則提早提示；Server 可以因更精確的時鐘或狀態拒絕。一般文字正規化與數值精度依 05／06。

## 8. 題型切換

| 變更 | 本地行為 |
| --- | --- |
| 共通欄位 | 保留 title、description、required、題目位置 |
| single_choice ↔ multiple_choice | 保留 Options、id、value；variant 改為目標題型合法的預設值 |
| Choice → 非 Choice、有 Options | 先確認將清除選項；確認才切換；取消維持原題型與資料 |
| 非 Choice → Choice | 初始化目標 variant 與兩個新選項 |
| 非 Choice 互換 | 套用目標 config 初值，不保留不相容 key |
| 同題型切換 variant | 保留仍合法的其他 config 值，例如 rating bounds、text 長度限制 |

PATCH type 改變時明確送目標完整 config，避免依賴 Server 的省略 config 重設 {}。Choice → 非 Choice 不送非空 Options Delta；Server 在同交易清除原 Options。

## 9. 排序

題目與選項採 vue-draggable-plus。拖曳手柄在編輯模式提供；手機／鍵盤備用上下移動，效果與拖曳一致。沒有跨題拖移選項。

載入時按 API 順序顯示，保留原 sortOrder，不因載入稀疏排序值就變 dirty。使用者增刪／重排某集合後，依畫面順序產生該集合的 0..n-1。

保存時以 sortOrder 表達順序，非僅重排 Request Array。Question 同 Form、Option 同 Question 內不得重複或為負值；移動保持 id、value。

## 10. Create／Delta builder

| 資料形狀 | 契約效果 |
| --- | --- |
| Create Form／新增 Question／Option | 不送 Server id；完整新增必填欄位 |
| PATCH 無 id | 新增 |
| PATCH id＋至少一個可改欄位 | 更新 |
| PATCH 只有 id | 刪除 |
| 未提及欄位或既有項目 | 不變 |
| questions:[]／options:[] | 空 Delta、no-op，不是清空 |

Delta 以最後成功載入／保存基準比較：新項目新增、既有變更送變更欄位、既有刪除送 id-only。不把完整回應含唯讀欄位當成 Request；不把未變更既有項目送 id-only。

config 出現時完整取代，description 清除用 null。一次同一 Question／Option ID 只出現一次。前端 tmp_UUID 僅作 key，不進 Request id。

保存期間停用定義修改，以成功 FormDetail 重建 Server ID 對應與基準；失敗保留編輯資料。寫入結果不明會封鎖再次保存／發布，直到使用者重新載入建立可靠基準，見 04。

## 11. Preview Dialog

| 項目 | 規則 |
| --- | --- |
| 資料 | 開啟時取得目前未保存定義的獨立快照；不修改編輯 model |
| 尺寸 | 桌面 90vw × 90vh；手機 calc(100vw - 4px) × calc(100dvh - 4px)，fallback 100vh |
| 答案 | 每次開啟清空、內容捲動回頂；與正式填答及 editor 分開 |
| 可用行為 | 正常題型可試填；沒有正式提交按鈕／Response API |
| 關閉 | 關閉按鈕、×、點遮罩；Esc 不關閉；底部可用「關閉預覽」 |
| 背景 | 鎖背景捲動，焦點留 Dialog，關閉回觸發按鈕 |
| Dirty | 試填不更改編輯器 dirty；關閉不另問未提交試填答案 |

題目／標題／選項無內容時顯示「（暫無內容）」；沒有 Options 顯示「尚未設定選項」；Rating bounds 缺少／矛盾顯示「尚未設定完整評分範圍」，停用該題試填控制。未選 Visibility 顯示「尚未選擇」。可選 description 沒有內容則省略，無 Deadline 顯示未設定。

占位文字只用於呈現，不寫回 model 或保存 Request。預覽不代表發布驗證通過，不測試正式收件資格，也不因過去的 deadline 禁止本地試填。

## 12. 發布／關閉／刪除

| 動作 | 顯示條件／確認 | 成功行為 |
| --- | --- | --- |
| 發布 | Owner Draft、無未保存定義；確認發布後定義凍結，僅 Visibility 可另調整 | API FormDetail → Published；toast 並 push Form 頁 |
| 關閉 | Owner Published，包含已截止；確認停止收件且不能重新開啟 | 更新 Closed、toast，留 Form 頁；依 Visibility 顯示統計入口 |
| 刪除 | 有正式 id、Owner、未刪除；三種 status 均可；確認刪除後無法查看與恢復 | 204；清除頁面狀態，replace /forms |

刪除前有 dirty 時，確認文案包含丟棄未保存資料；一次確認完成後成功跳轉不再重問。發布前不得用丟棄確認跳過必須保存的規則。

管理操作請求期間停用同 Form 寫入按鈕，結束 loading 後依真實結果呈現。失敗／結果不明不假裝成功；狀態衝突、權限變更及資料丟棄均依 04。
