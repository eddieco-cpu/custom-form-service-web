# V1 Frontend — Technical Architecture

版本／日期：1.1／2026-10-10。狀態：原規格已通過 Owner review；本次依 Owner 指示回補 Email 驗證相容提醒。前置：[00](00-v1-frontend-overview.md)。本文件定義工程基準；尚未執行 repo 初始化或套件相容驗證。

## 1. 技術選型與版本策略

| 項目 | 基準 |
| --- | --- |
| Framework | Nuxt 4，CSR，ssr=false |
| 語言 | TypeScript strict、Vue Composition API |
| UI／CSS | Nuxt UI 4＋Tailwind CSS 4 |
| 表單驗證 | Zod 4＋UForm；特殊語意共用 adapter |
| 排序 | vue-draggable-plus；手機／鍵盤備用上下移動 |
| 共享狀態 | Nuxt useState 與 composables；本次不需要另加 Pinia |
| Runtime | Owner 指定 Node 24.21.0 |
| Package manager | npm；提交 package-lock.json；重現安裝用 npm ci |
| 驗證工具 | Vitest、Playwright、ESLint、TypeScript typecheck、Nuxt build |
| 後端存取 | Browser 直接呼叫 ASP.NET Core API，無 SSR／BFF／Nitro API proxy |

主要選型已確認。Nuxt／Nuxt UI／Tailwind／Zod 與其他套件的確切 patch version、Node 指定版本的可取得性與工具相容性，在 repo 初始化實作計畫中依官方來源核對並鎖定；本次沒有臆造 lockfile 或宣稱已安裝。

Lossless 數值 adapter／套件、datetime helper 的具體實作及 API timeout 值亦在初始化計畫選定，必須符合以下行為。這些不要求重談既有頁面或產品決議。

## 2. Repo 與組態

前後端分開 repo。前端 repo 保存本組前端 specs、前端 implementation plan、AGENTS 與 Skills；記錄所依據的後端契約版本，不把另一 repo 的程式當成本 repo 已完成。

| 項目 | 本機規劃值 |
| --- | --- |
| Frontend Origin | http://localhost:3000 |
| API Origin | http://localhost:5000 |
| API Base URL | http://localhost:5000/api/v1 |
| API client | credentials=include；JSON Body；共用 error decoder；自動 retry 停用 |
| 公開組態 | API Base URL，由 Nuxt public runtime config 承接；提供不含秘密的範例 |

後端 Development 文件預設明列上述 Frontend Origin、允許 credentials、Cookie Secure=false；仍需真實 Browser 串接驗證。兩端採相同 HTTP scheme 與 hostname localhost，不混用 127.0.0.1。

access_token 是 HttpOnly、SameSite=Lax、Path=/、Host-only；Expires 與 JWT exp 相同，沒有 Max-Age。前端不讀 Cookie token、不自帶 Authorization Bearer、不把 JWT／DB／Google／Signing Key 寫入公開組態或 repo。

Swagger URL 指向 Owner 電腦，本次未讀 live OpenAPI、未驗證實際 CORS process。串接時記錄可連線的 API 版本與環境證據。

## 3. 最小結構基準

以下為可調整的組織基準，功能責任與 source-of-truth 不因改檔名而變更。

```text
app/
  pages/
    index.vue
    login.vue
    profile.vue
    forms/
      index.vue
      new.vue
      [formId]/
        index.vue
        edit.vue
        statistics.vue
  layouts/default.vue
  plugins/auth.client.ts
  middleware/auth.ts
  middleware/guest.ts
  components/
    AppHeader.vue
    forms/             # editor、根設定、預覽、renderer
    questions/         # 五種題型的輸入／唯讀呈現
    statistics/        # Statistics 專屬 root／question／item
    feedback/          # read error、action error、confirmation
  composables/         # session、當頁表單、dirty、操作狀態
  services/            # API client、auth／user／form／response／statistics
  domain/              # 型別、schema、Delta、Answer mapper、正規化
  utils/               # exact number、datetime、redirect
tests/
  unit/
  e2e/
docs/specs/
```

不設每次重查 session 的 global middleware。NuxtPage 不以 KeepAlive 恢復 editor／答案；頁面卸載清除本地 model。Server 目錄不承接本次 BFF API。

## 4. 四種 model 的分離

| model | 用途／生命期 |
| --- | --- |
| API DTO | 對應後端 camelCase、readonly、nullable、Question type、Response／Statistics Shape |
| Editor model | 當頁可編輯資料、tmp key、原 Server ID、文字輸入、排序與基準 |
| Answer model | 當頁未作答／實際答案、Known single 狀態、Latest／提交基準 |
| Statistics view model | 從 Statistics DTO 顯示列表；不假補 FormDetail config 或 Owner ID |

API DTO 不直接雙向綁為 editor，不把 UI temp keys、dirty、loading、placeholder 或 User status 送給 API。Preview snapshot 與試填答案獨立。

tmp_UUID 作前端 key，新增 option value 使用 opt_UUID；id 只來自 Server。GET／保存成功後重建 ID 對應與可比較基準。

Auth User 可以共享；完整 Form／答案不放跨頁可恢復 store。每個請求屬於當次 Page／Form ID／Session；舊結果不能更新已換頁的 model。

## 5. API client 與情境分流

傳輸層處理 base URL、credentials、JSON、204、timeout／network、Envelope 解碼，回有型別的成功／錯誤。頁面決定錯誤分支與導航；傳輸 interceptor 不把每個 401／404 都一律導走。

| 情境參數 | 為何需要 |
| --- | --- |
| bootstrap | me 401／403 是初始化結果，public Statistics 仍可繼續 |
| login／register | AUTH_INVALID_CREDENTIALS／USER_EMAIL_ALREADY_EXISTS 留本頁 |
| page read | 原 URL error 或必要的 Auth 返回 |
| action write | Dialog、dirty、結果不明與安全重試限制 |
| latest | RESPONSE_NOT_FOUND 是正常無本人紀錄 |
| statistics | Conditional Auth 與特殊存在性／錯誤優先序 |

GET／寫入的自動 retry 都停用，重試由明確 UI 操作觸發。寫入 timeout 結束不代表 Server 未執行；AbortController／離頁只能防止 stale UI 回寫，不構成回滾證據。

一個 Form 的管理寫入互斥；保存／提交採送出快照，期間停用相應輸入。Visibility 回完整 DTO 時只合併該操作必要欄位與 timestamps，不能丟失其他 dirty 定義。

## 6. 精確數值要求

後端 Number 接受有限合法 JSON number，不額外限定 Answer 小數位數，不得偷偷四捨五入／截斷。R9 歷史驗收包含長小數的 JSONB／Receipt 精確等值。

工程要求：

1. Number 的 UI 輸入先保留字串；空與 0 明確區分。
2. 精確解析、min／max 比較、等值比较與序列化使用可保留數值的 adapter，不能所有值都經 Number()／原生 JSON.parse 再 stringify。
3. API Request 中仍是 JSON number token，不能改成數字字串、額外 value 型別或新 endpoint。
4. FormDetail 的 number config、Latest／Receipt、Statistics number value 都經同一策略；不是只處理送出。
5. 比較採數值等值，1／1.0／1e0 可同值；不要求原始 token 逐字相同，也不能把它們當不同統計組。
6. Rating 0～100 可使用安全整數；不得讓這個簡單類型限制一般 Number。
7. 超過可安全處理能力時清楚拒絕／報契約處理失敗，不能先改值再當成功。不能為圖方便新增固定小數位數或未定義的業務上限。

adapter 的選型、型別與 serializer 是初始化計畫的明確交付；需有長小數、超出 JS safe integer 的合法數值、科學記號與 min／max 的 round-trip 證據。測試範圍以實際後端可安全接受的 JSONB 數值為準，不自創後端保證。

## 7. 文字正規化與 schema

一般文字只 trim Unicode White_Space=Yes，Code Point 計長；不以 UTF-16 String.length 或使用者感知字形數替代。Email 再轉 lowercase，Password 完全保留原始輸入。

共用 adapter 避免 JavaScript trim() 與後端 White_Space 集合差異；Zod refinement 調用相同語意。不要以原生 min／max 字串長度直接宣稱符合 Code Point。

nullable description 空白→null；optional config key 空白→省略；optional Text／Multiple Choice 答案空白→省略 Answer。不能將所有空輸入都泛化成 null。

同時保留 UI 原始輸入與規範化候選，送出前取得快照；驗證錯誤映射回原控制，不丟失未保存內容。

**Email 驗證相容提醒（F0／F3 計畫必須明確）**：先核對後端正式契約及實際 Email validator 的接受規則，再選前端 validator。Zod 或原生 email input 的預設格式限制不能直接當作契約；前端不得因套件預設而額外拒絕後端契約接受的 Email。

F0 提出相容策略與代表性有效／無效案例；F3 接登入／註冊並驗證。若前端無法完全對等，於計畫說明基礎驗證／提示與 Server 最終格式判定的責任。既定 trim／lowercase、Code Point 長度及 Server 最終授權／驗證仍維持。

## 8. Datetime 與 dirty 比較

保留原 API deadline 字串／精確值及目前可見本地時間，只有使用者真正變更才產生新 UTC 值。顯示格式化不寫回 model。

| 行為 | 精度處理 |
| --- | --- |
| 載入／顯示 | 可顯示到秒，原始精度保留 |
| 未改 Deadline 的 PATCH | 省略該欄位；不截斷原值或觸發非必要 updatedAt |
| 用戶改 Deadline | 以 Asia/Taipei 輸入轉合法 UTC；清除用 null |
| 同語意時間比較 | 能辨別相同瞬間的不同 ISO 格式，保留 API 可處理精度 |

dirty／Delta 的 snapshot 比較不得因 formatDate 或不可靠浮點轉換製造變更。排序只在使用者改集合時生成，單純載入稀疏 sortOrder 不變 dirty。

## 9. Delta 與 Error path

用基準與當前 model 建立 Create／Update／Delete Delta；只送允許欄位，config 全替換。Choice → 非 Choice 避免非空 Option Delta；同一 ID 不重複。

Request builder 同時產生 path→前端 key 映射，例如 request questions[0] 對應畫面的第三題；Answer builder 同樣记錄 questionId／Request index。收到 details 不直接按畫面 Array index定位。

保存不明時停用 Delta 重送直到重讀；Server 新生成 IDs 可能已存在，舊新增 Delta 不可安全直接再次送出。

## 10. Auth／Request 的競態處理

共享初始化單次、Promise 去重、settled null 不重查。session revision 保護成功 Login／Logout 不被舊 me 覆蓋。

Page loader 採請求世代／scope／取消或等效方式：換 Form ID、離頁、切換帳號後，舊 Response 不覆蓋新的資料、errors 或 route。不可僅防 request 發出次數，却讓晚回資料覆蓋新頁。

dirty guard 涵蓋 route leave 與同元件參數更新；丟棄授權只對單次 transition 有效。成功導航先更新基準，避免多餘提醒。

## 11. 必要驗證策略

| 層級 | 有意義的驗證 |
| --- | --- |
| Typecheck／lint／build | 型別、規範、Nuxt CSR 可建置；版本與命令在初始化記錄 |
| Vitest | Delta 刪除／no-op／type 連動、精確數值／時間、Unicode、未作答與 0、Latest 整份 mapping、Auth 初始化去重／競態、redirect 與錯誤分支 |
| Playwright＋真實 API | Browser Cookie／CORS、首次保存→edit→發布、single／multiple、主動 Latest、公開／私有統計、dirty→登入返回、停用及代表性錯誤 |
| 人工 | 手機手柄與上下移動、100 星、Range 初始 min、Preview 尺寸／捲動／關閉、長答案與具名名單 |

自測针對外部可觀察規則，不為單純文字／樣式建立鏡像測試。每 Round 跑受影響且必要的檢查；正式驗收另先交付可 review 計畫，不用開發自測代填人工 PASS。

R10 真實 Endpoint 尚未可用時，相關正式整合驗收記 BLOCKED／未執行。契約 fixture 可做開發驗證，但不是後端端點已完成或真實 Browser 驗收的證據。

## 12. 後續初始化計畫需具體交付

分輪工程提醒已收斂於 [Frontend Implementation Plan §7.1](../implementation/V1_Frontend_Implementation_Plan.md) 及各 Round 的「計畫提醒」；提出當輪計畫時按相關項目補設計，不要求本次提前完成全部工程細節。

- 官方相容資訊與實際可取得版本；明確 package.json／lockfile／Node 指定值。
- 數值／時間／Unicode adapter 的選擇、API client、timeout、腳本與目錄。
- 可重現的 dev 啟動、lint／typecheck／build／test 命令與環境範例。
- 以當前 API process 取得 OpenAPI／Browser CORS／Cookie 證據；只列非秘密設定。
- 前端 AGENTS、development／acceptance Skills 與個別 Round 的停止點。

本文件不是上述初始化的執行授權；repo 與實作計畫在規格 review 後依序處理。
