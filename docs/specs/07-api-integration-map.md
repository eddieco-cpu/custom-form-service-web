# V1 Frontend — API Integration Map

版本／日期：1.0／2026-10-10。狀態：規格初版，待 Owner review。前置：[00](00-v1-frontend-overview.md)。這是前端對接摘要，不取代後端正式 API／Error Contract。

## 1. 共通傳輸

Base Path=/api/v1。本機完整 base URL=http://localhost:5000/api/v1；以下表格省略前綴。

| 規則 | 前端要求 |
| --- | --- |
| Body | 有 JSON Body 使用 application/json；camelCase；enum 值 snake_case |
| Cookie | credentials=include；由 API 設定 HttpOnly access_token，無 Bearer Token |
| 成功 | 直接 Resource，不包 data；Create 201、一般讀／更新 200 |
| 204 | Logout／Delete 無 Body，不作 JSON.parse |
| IDs | UUID string；新資源 id 由 Server 產生 |
| Date | UTC ISO 8601；UI 台北時間；原始精度保留 |
| Number | JSON number，不是 number string；精確策略見 06 |
| Optional／null | 只 nullable 可送 null；其他未設定 key 省略 |
| Readonly／未知欄位 | Request 不送；Server 會拒絕，不能直接序列化 FormDetail |

## 2. Endpoint 完整對照

| No. | Method／Endpoint | 輸入 | 成功 | 使用與時機 |
| --- | --- | --- | --- | --- |
| 1 | POST /auth/register | email、password、displayName | 201 User，無登入 Cookie | 註冊 Tab 主動送出 |
| 2 | POST /auth/login | email、password | 200 User＋Cookie | 登入 Tab；成功直接更新記憶體 |
| 3 | POST /auth/logout | 無 Body | 204 | Header 登出，先 dirty 確認 |
| 4 | POST /auth/google | 暫緩 | 不串接 | 按鈕隱藏；後續 G1 |
| 5 | GET /users/me | 無 Body | 200 User | App 共用初始化一次；明確手動核對可再讀 |
| 6 | PATCH /users/me | displayName | 200 User | Profile 保存 |
| 7 | POST /forms | 新 Form 定義樹 | 201 Draft FormDetail | /forms/new 第一次保存 |
| 8 | GET /forms | page、pageSize、status? | 200 Summary Page | /forms 初次、換頁／篩選、手動刷新 |
| 9 | GET /forms/{formId} | UUID | 200 FormDetail | edit／Form 頁與手動重新載入；統計不先讀 |
| 10 | PATCH /forms/{formId} | Draft root＋Question／Option Delta | 200 FormDetail | Owner Draft 保存 |
| 11 | DELETE /forms/{formId} | UUID、無 Body | 204 | Owner 三狀態 soft delete |
| 12 | POST /forms/{formId}/publish | UUID、無 Body | 200 Published FormDetail | Draft 已保存後發布 |
| 13 | POST /forms/{formId}/close | UUID、無 Body | 200 Closed FormDetail | Owner Published 含截止後 |
| 14 | PATCH /forms/{formId}/result-visibility | resultVisibility | 200 FormDetail | Owner 既有未刪除表單即時切換 |
| 15 | POST /forms/{formId}/responses | answers | 201 ResponseReceipt | Active User 收件中提交，含 Owner |
| 16 | GET /forms/{formId}/responses/me/latest | UUID | 200 ResponseReceipt | 按查看我的填答；不初始預查 |
| 17 | GET /forms/{formId}/respondent-count | UUID | 200 {count} | Owner 主動查看人數；API 三狀態皆允許 |
| 18 | GET /forms/{formId}/statistics | UUID、Conditional Auth | 200 Statistics | 獨立統計頁；R10 實作尚未開始 |

Question／Option 沒有單獨 CRUD endpoint。所有寫入與相關表單內容由正式聚合契約處理。

## 3. User、FormDetail、Summary

| 資源 | 欄位 |
| --- | --- |
| User | id、email、displayName、avatarUrl（nullable）；不含 status／Token |
| FormDetail | id、userId、creatorDisplayName、title、description、status、responseMode、responseIdentity、resultVisibility、submissionDeadlineAt、questions、createdAt、updatedAt |
| Question | id、type、title、description、required、sortOrder、config、options |
| Option | id、label、value、sortOrder |
| FormSummary | id、title、status、responseMode、responseIdentity、resultVisibility、submissionDeadlineAt、count、createdAt、updatedAt |
| Summary Page | items、pagination={page,pageSize,totalItems,totalPages} |

Form／Question description、submissionDeadlineAt 可為 null。FormDetail 沒有 count、deletedAt、Response／Answer、Statistics、Question／Option timestamps。列表不是完整 Definition。

Owner 判斷用 User.id=userId，creatorDisplayName 是目前名稱，不當 ID。ID、新建 Current User／status、timestamps 均由 Server 決定。

## 4. Auth Request 與限制

| 欄位 | 正式規則 |
| --- | --- |
| email | 一般 trim＋lowercase；合法格式；≤254 Code Points |
| register password | 10～128 Code Points；不 trim、不改大小寫／normalization |
| displayName | 一般 trim 後非空；≤100 Code Points |

Register 只送 email／password／displayName；Login 只送 email／password；PATCH me 只送 displayName。註冊不設定 Cookie，Google-only／既有會員 email 也不能再註冊以增 Password。

Logout 不需要有效 JWT，缺／壞／過期 Cookie 仍 204；不建全裝置撤銷或 Refresh。

## 5. Create 與 Draft PATCH

| 根欄位 | Create | PATCH 定義 |
| --- | --- | --- |
| title | 必須有效 | 出現即更新 |
| description | 可省略／null | 可 null 清除 |
| responseMode | 可省略，Server single；UI 明確初始化 | 只在 Draft 修改 |
| responseIdentity | 可省略，Server anonymous；UI 明確初始化 | 只在 Draft 修改 |
| resultVisibility | Server 可省略預設 owner_only；UI 必選並明確送 | 不允許，改走獨立 API |
| submissionDeadlineAt | 可省略／null | null 清除；未改值省略 |
| questions | 完整新題目 Array，無 id | Delta Array，不是完整取代 |
| id／userId／status／creatorDisplayName／timestamps | 不送 | 不送 |

新增 Question 必填 type、title、sortOrder；description 可 null、required 預設 false、config 預設 {}、options 預設 []。新增 Option 必填 label、value、sortOrder。配置型別規則見 02。

最小有效 Draft 示例，尚不符合發布至少一題的要求：

```json
{
  "title": "聚餐問卷",
  "description": null,
  "responseMode": "single",
  "responseIdentity": "anonymous",
  "resultVisibility": "respondents",
  "submissionDeadlineAt": null,
  "questions": []
}
```

Delta 示例：前提是第一題與兩個 Options、第二題 ID 都已存在且屬該 Draft；更新第一題／第一選項，刪第二選項／第二題，再新增一個 Text 題。

```json
{
  "questions": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "title": "更新後的題目",
      "options": [
        {
          "id": "22222222-2222-4222-8222-222222222222",
          "label": "更新後的選項"
        },
        {
          "id": "33333333-3333-4333-8333-333333333333"
        }
      ]
    },
    {
      "id": "44444444-4444-4444-8444-444444444444"
    },
    {
      "type": "text",
      "title": "新增文字題",
      "sortOrder": 1,
      "required": false,
      "config": {
        "variant": "input"
      }
    }
  ]
}
```

第一題原 sortOrder 假定為 0，第二題刪除後新題為 1。沒有提及的欄位／項目維持；{}、questions:[]、options:[] 是合法 no-op，不等於刪光。config 出現即整個取代；同一 ID 一次只能出現一個 Delta。

## 6. Visibility 與生命週期

Visibility Body 只有 resultVisibility：owner_only／respondents／public。Owner 未刪除 Form 的 Draft／Published／Closed 都允許；相同值 no-op、不改 updatedAt。

Publish 要完整有效 Definition，Rating 必填 min／max 整數，0≤min<max≤100；deadline 非 null 需晚於當下。Close 只 Published→Closed，不重新驗證已凍結定義。Delete 設 deletedAt，不改 status，後續 GET／Latest／Count／Statistics 視不存在。

Published／Closed 定義不可改；status 只用專用 API；沒有 reopen／轉回 Draft。到期不改 status。

## 7. Response Request／Receipt

| 資源 | 形狀 |
| --- | --- |
| Submit Request | {answers:[{questionId,value}]} |
| Receipt／Latest | {id,formId,submittedAt,answers:[{questionId,value}]} |
| 不接受的 Client 欄位 | userId、responseId、submittedAt、Answer id；formId 已在 URL |

| Question type | Answer value |
| --- | --- |
| text | JSON string；一般 trim |
| number | 精確 JSON number |
| rating | 整數、在 min～max |
| single_choice | 該題 Option ID string |
| multiple_choice | 該題不重複 Option ID Array |

Optional 未作答不建立 Answer；Text 空白／Multiple [] 視未作答，required 則失敗；null 不代表未作答。answers 可以 []，前提是所有題目 optional。

Receipt 只回已保存答案、按 Question sortOrder／id 排序，無 User ID／Answer ID。Latest 在 Published／Closed、截止後仍可讀，不受 Visibility／匿名具名模式限制；只有本人最新完整 Response，沒有歷史清單。

single 同一 Form＋User 最多一份，multiple 每次新建歷史。提交有原子／並行保護；沒有 Idempotency-Key。

## 8. Statistics v1.1 Root

| 欄位 | 型別／來源 |
| --- | --- |
| formId | UUID string；forms.id |
| title | string |
| description | string／null |
| creatorDisplayName | Creator 目前 displayName；匿名／具名皆提供 |
| responseMode | single／multiple |
| resultVisibility | owner_only／respondents／public |
| submissionDeadlineAt | UTC datetime／null；表定截止時間，保留原精度 |
| count | 不同有效填答者數 |
| questions | 完整 Statistics Question Array |

固定九個欄位必須出現；nullable 沒值明確 null。無 Creator ID、status、responseIdentity、createdAt、updatedAt 或 closedAt。

| 層級 | 欄位 |
| --- | --- |
| Question | questionId、title、description、type、count、statistics[] |
| Choice Item | optionId、label、value（Option 業務值）、count |
| Text／Number／Rating Item | value（對應型別）、count |
| identified 額外 | 每 Item respondents=[{id,displayName}]；0 票 [] |
| anonymous | 完全省略 respondents；不是 null 或替代身分 ID |

Questions／Items／Respondents 不分頁、不截斷。以每人最新整份 Response 聚合；Root／Question／Item count 語意與排序見 03。public 200 不需要先 FormDetail；壞／過期／Disabled Cookie 視匿名。

## 9. 主要錯誤對應

| 功能 | Code／HTTP 與關鍵區別 |
| --- | --- |
| Login | 401 AUTH_INVALID_CREDENTIALS 留登入；403 AUTH_USER_DISABLED 停用 |
| Register | 400 VALIDATION_ERROR；409 USER_EMAIL_ALREADY_EXISTS |
| 普通保護操作 | 401 AUTH_REQUIRED／AUTH_TOKEN_INVALID／AUTH_TOKEN_EXPIRED；403 AUTH_USER_DISABLED |
| Create／Patch | 400 VALIDATION_ERROR／FORM_DEFINITION_INVALID；Patch 另有 403 管理權限／409 不可編輯 |
| Form 不存在／UUID | 404 FORM_NOT_FOUND／400 VALIDATION_ERROR；普通 API 認證先行 |
| 管理權限 | 403 FORM_ACCESS_DENIED，不是 VALIDATION_ERROR |
| Publish | 400 FORM_NOT_PUBLISHABLE；409 FORM_ALREADY_PUBLISHED／FORM_INVALID_STATE_TRANSITION |
| Close | 409 FORM_ALREADY_CLOSED／FORM_INVALID_STATE_TRANSITION |
| Submit | 400 VALIDATION_ERROR；409 FORM_NOT_SUBMITTABLE／SUBMISSION_DEADLINE_EXCEEDED／RESPONSE_ALREADY_SUBMITTED |
| Latest | 404 RESPONSE_NOT_FOUND 只是沒有本人紀錄；FORM_NOT_FOUND 才是不可存取 Form |
| Statistics | 409 FORM_STATISTICS_NOT_AVAILABLE；403 STATISTICS_ACCESS_DENIED；特殊 404／Auth 順序见 03 |
| 全部 | 500 INTERNAL_SERVER_ERROR；寫入視結果不明，讀取可手動重試 |

上表不是每個 endpoint 的完整優先序。精確流程以後端 03a／03b／03c 與 04 Error Catalog 為準；前端按 04 文件的情境分流，不自行更改 HTTP／code。

## 10. Error Envelope 與 DTO 映射

```json
{
  "error": {
    "code": "FORM_DEFINITION_INVALID",
    "message": "The form definition is invalid.",
    "details": [
      {
        "path": "questions[0].config.max",
        "code": "INVALID_QUESTION_CONFIG",
        "message": "The configured maximum is invalid."
      }
    ]
  }
}
```

error.code／message 必填，details 可省略。details 的 path／code／message 保留，不以英文 message 作路由條件。無正式 Envelope 的 network／timeout／異常 Body 按傳輸失敗處理，不偽造業務 code。

Decoder 驗證所需資源形狀／enum，遇到無法可靠 mapping 的資料不能假補 default 後當成功。前端 fixture／示例是對接與自測材料，不是 live API 執行證據。
