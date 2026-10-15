# F9 精簡實作計畫 — 獨立 Statistics

版本：1.0／2026-10-15（Asia/Taipei）。**v1.0 已通過 Owner review，並獲整輪開發、自測、範圍內修正、受影響回歸、正常 API 測資準備及單一目的本機提交授權。F9 開發完成、待集中 review。** 規劃接手 master／完整 HEAD **`e25fe36ce887ce9a74fcbc66ee14e9edb4b7adf0`**，與指定 `e25fe36` 一致；開發接手時三份規劃文件已獲核准，一併同步。方案本體維持核准 v1.0，實際執行見 [開發報告](F9_Development_Report.md)。

## 1. 範圍、來源與前置

Owner 已採納 [F1～F8 獨立整合補驗](../test-results/F1_F8_Independent_Integration_Supplement_Report.md) 表列核心真實 API／UI／路由結果；F4 的非空21筆／三頁10、10、1、篩選／刷新／21→20越界對齊、三態兩角色 Form／edit 導向、錯誤與手機卡片補驗已通過。既有 code review 結果與原件保留，包括[F8獨立review](../review/F8_Independent_Code_Review_Report_20261015.md)所記錄的無新finding／code review通過；特殊 Auth／交易故障、實機及其他未驗證事項仍保留，正式驗收未完成，accepted 不變。

依 [AGENTS v1.1](../../AGENTS.md)、[Round Development Skill](../../.agents/skills/v1-frontend-round-development/SKILL.md)、[總計畫 v1.3](V1_Frontend_Implementation_Plan.md) F9／§7／§7.1（重點1、3、5～9）實作 Statistics 頁、直接讀取／獨立錯誤流程、九欄位 Root、五題型分布與合法具名名單。只沿用共用 client／decoder／Auth／scope／日期／精確值，不增 Endpoint、BFF、持久化、跨頁統計快取、管理面板、圖表／百分比／平均數或原始答卷／跨題個人資料。

| 正式來源 | 本輪章節／版本 |
| --- | --- |
| 前端 [00](../specs/00-v1-frontend-overview.md)／[01](../specs/01-pages-routing-and-access.md) | v1.0：00 §3～5；01 §1～2／§8～10，獨立 URL、Header與跳轉 |
| 前端 [03](../specs/03-response-and-statistics.md)／[04](../specs/04-auth-state-and-error-handling.md) | v1.0：03 §9～12；04 §2～6／§9～12，統計資料、特殊存取優先序、D-12與登入返回 |
| 前端 [05](../specs/05-ui-and-interaction.md)／[06](../specs/06-technical-architecture.md)／[07](../specs/07-api-integration-map.md) | 05 v1.0 §1～3／§6／§8～10；06 v1.1 §2～6／§8／§10～11；07 v1.0 §1～3／§8～10 |
| 正式後端：唯讀 [SNAPSHOT](../../backend-ref/SNAPSHOT.md) 指定八份規格 | SHA `7591633137c5a6f57c1fce8e1ba19ab394015880`；00／01／03c／05 v1.1，02／03a／03b／04 v1.0；重點 [03c §3.4～3.5／§7～8](../../backend-ref/docs/specs/03c-v1-api-contract-submission-statistics.md)、[01 STA-01～05](../../backend-ref/docs/specs/01-v1-domain-specification.md)、[03a §2～6](../../backend-ref/docs/specs/03a-v1-api-contract-common.md)、[04 §2／§4～5／§7／§10～12](../../backend-ref/docs/specs/04-v1-error-catalog.md)、[05 §5～6／§10～13](../../backend-ref/docs/specs/05-v1-system-constraints.md)；03b Auth／Profile／Form／Lifecycle、03c §4～5僅供正常測資準備；02 §3／§10～12供持久化邊界查證 |

本次唯讀觀察：Node **24.21.0**／npm **11.19.0**，15項 installed／lockfile相符；沿用 Nuxt4.6.1／UI4.11.3／Tailwind4.3.3／TypeScript5.9.3／Playwright1.64.0／Vitest5.0.3／lossless-json4.3.1，預計無新依賴。`backend-ref` manifest **108／108**相符；實際後端 `C:\Users\user\Desktop\custom-form-service` HEAD同快照，八份正式契約bytes一致，既存`?? SNAPSHOT.md`未動。

19:47:17台北時間起，既有PID34068 command line綁該checkout的Debug/net10.0 DLL，ProductVersion `1.0.0+7591633137c5a6f57c1fce8e1ba19ab394015880`，SHA256 `06e2a62db9c4376701e75b0ce3e7283d34b129d378c884e33fb1cb764a0af180`；health／ready／OpenAPI各200，OpenAPI3.1.1／info.version1.0.0列Statistics GET。**只是本次metadata／來源核對，沒有呼叫業務API或驗證R10統計結果。** 上輪DB只讀identity／migration觀察按原報告沿用，本次未再查DB；runtime DI provider內部來源未獨立確認。

未發現本輪契約衝突。舊文件「R10未實作」為當時歷史；目前有實作來源與Endpoint描述，仍須在開發自測證明真實統計。API不可用只阻擋相應live案例，fixture／UI可獨立進行，不能將其替代為真實整合PASS。

## 2. 檔案與資料設計

| 預計檔案 | 責任與具體方案 |
| --- | --- |
| `app/services/statistics.ts` | `GET /forms/{encodeURIComponent(formId)}/statistics`，無Body，沿client的credentials=include／30000ms／retry=0、`decodeStatistics`；成功再核對回應formId與送出ID相符。不先GET FormDetail／Latest／Count，不以client UUID或Auth gate改寫Server驗證順序 |
| `app/domain/statistics-read.ts`、`app/composables/useStatistics.ts` | 專屬read controller／當頁狀態、current ticket、錯誤與登入返回；錯誤helper沿`presentError(result, 'statistics')`，僅對formId明細／統計拒絕套對應文案，其餘details保留。沿RequestScope機制，不直接套用會等待有效User的`useFormRead`／`useFormDetail`。讀取不受Header初始化阻擋；§3列狀態／世代責任 |
| `app/domain/statistics-view.ts`、現有`app/domain/api/statistics.ts`／`decoders.ts` | 從既有DTO建立readonly顯示投影，保留全部Questions／Items／Respondents及API順序；Number仍是ExactNumber，顯示精確token，不先Number()／JSON深複製。沿decoder的九欄位／nullable／enum／count／一致respondents shape檢查，必要變更只補契約驗證，不補假資料 |
| `app/pages/forms/[formId]/statistics.vue` | 取代頁殼，無auth／guest middleware，保留共用Header；loading、內容、原URL錯誤／手動重試、查看表單link。唯讀，不建立Answer／Editor／dirty model或管理入口 |
| `app/components/statistics/StatisticsRoot.vue`／`StatisticsQuestion.vue`／`StatisticsItem.vue` | 五題型專屬展示，不用需要config／Owner ID的FormRenderer或FormRootInfo補造欄位。型別中文標籤可沿既有純label map；不同頁的model不共用 |
| `app/domain/auth-state.ts`／相關composable（必要最小增補） | 用App私有的身分變動通知區分bootstrap完成與真正credential／身分變更，見§3；不改User DTO、不另建Auth store，不改既有sessionRevision語意 |
| `tests/unit/f9-statistics-{read,view}.spec.ts`、`tests/fixtures/f9/`、`tests/e2e/f9-{browser,live}.spec.ts`、`playwright.f9.config.ts` | 純service／投影／狀態unit，fresh built攔截Browser與真實R10分開；必要薄harness只注入測試狀態、不複製產品頁；沿F1 scripts／tools strict與精確network diagnostics |

九個Root欄位各自承接正式語意，不把FormDetail投影成Statistics：

| 欄位 | 呈現／保留 |
| --- | --- |
| `formId` | 用於本次資源對應／查看表單URL；不改名id、不藉此推Owner |
| `title`／`description` | 完整純文字／換行；description=null省略內容段落 |
| `creatorDisplayName` | 建立者目前名稱；匿名統計也顯示，不推論為填答者身分 |
| `responseMode` | 單次填答／可多次填答 |
| `resultVisibility` | 僅建立者／填答者／所有人，唯讀 |
| `submissionDeadlineAt` | 「表定截止時間」；null未設定，Asia/Taipei到秒；保留原ISO精度，不稱實際關閉時間 |
| `count` | 「不同填答者人數」；0為成功，不是Response歷史筆數 |
| `questions` | 全部題目順序編號、中文type、title／可選description、Question count及items |

Root不含status／responseIdentity／建立更新時間／Creator ID，不為顯示補欄位；不依姓名或Header判Owner。view key以Question ID、Option ID或當次Item位置／Respondent ID保持穩定，不用label／姓名去重。

## 3. 獨立讀取、Auth與舊回應

完整App啟動：Auth plugin仍共用一次me；Statistics掛載即直接GET，兩者並行。me的200／401／403／unknown只更新Header自身，不替Statistics判權限或擋公開200。SPA跳統計不補me；refresh／新分頁各有自己的初始化。

目前AuthSession在bootstrap200／401也可能推進sessionRevision，**不能直接把每次revision變化都當成換帳號而清掉公開結果／重查統計**。擬在同一AuthSession追加小型App私有通知：初始化採用標記`bootstrap`；成功Login／Logout、操作Auth失效，以及手動me核對確定身分變化標記`credential-change`。bootstrap來源必須沿verify／invalidate路徑傳遞，不能猜「第一次revision」；既有generation仍拒絕被Login／Logout超越的舊me。Profile同ID改名不算換身分，需下次Statistics GET才反映Server的新名稱。

Statistics採自己的credential世代交給RequestScope；bootstrap通知不推進它，真正credential-change同步invalidate／清DTO、名單、error與導航flow，仍留該頁時按新身分重讀，不等待me放行；通知須保留Login／Logout／verify／invalidate原因，Logout沿Header既有replace而不多發Stats GET，自身401依下表處理。換Form ID／完整route key、卸載、手動重試同樣產生新ticket；Abort只節省請求，成功、錯誤、Auth副作用、導航與finally都檢查current。不同分頁Cookie變化仍按既有規格等下一API／刷新確認，不新增跨分頁同步。

| 事件／狀態 | 採用與畫面／導航責任 |
| --- | --- |
| 初載／手動重試pending | 中性loading；GET不自動retry、不輪詢。重新載入時撤下前次內容，避免把舊政策／私人名單當成最新；只有本次current200才顯示 |
| Statistics 200 | 完整解碼／資源ID核對後一次採用DTO及view；不依me結果覆寫，不額外查Form／Count／Latest |
| Statistics正式Auth401 | 由此支GET判定登入返回，先清私有結果；初次讀取直接replace到合法login redirect，保留原path＋query＋hash；已載入後手動讀取先Dialog再同一路徑。自有失效通知不觸發自動重查循環；以本次flow保存自身變更後revision，外部Login／Logout／換頁仍撤銷舊導航 |
| me先失敗、Statistics仍在pending／已成功 | me不能觸發Statistics導航、清公開資料或停止loading；Stats按自身結果完成。兩個GET不同完成順序都須覆蓋 |
| A慢回200／401／403，已換B／Session／卸載 | 不改B資料、Header、error、loading、toast或route；晚finally不能結束B loading。新頁／新身分不恢復舊統計 |

唯讀頁沒有當頁輸入或寫入unknown，不增加dirty／beforeunload／交易核對流程；從F6／F8點入統計仍經來源頁既有dirty guard。若修改Auth私有通知，必須追加§6的共用Auth回歸。

## 4. Visibility、錯誤與隱私

Closed未刪除的正式矩陣如下；Owner／Respondent／其他Active是相對該Form的關係，不從前端快取推測。`identified + public`合法，訪客可看API合法回傳的名單。

| Visibility | Owner | 非Owner曾提交 | 其他Active | guest |
| --- | --- | --- | --- | --- |
| owner_only | 200 | 403 | 403 | 401 |
| respondents | 200 | 200 | 403 | 401 |
| public | 200 | 200 | 200 | 200 |

| 統計GET結果 | UI／路由 |
| --- | --- |
| Draft Owner409、Published Active409（含到期）`FORM_STATISTICS_NOT_AVAILABLE` | 原統計URL「統計尚未開放」，可push查看表單；不提前顯示結果 |
| Draft其他身分404、Published匿名／invalid／expired／disabled404、已刪／不存在404 `FORM_NOT_FOUND` | 原URL「找不到表單」；不因Header me401改成login，不推測隱藏原因 |
| UUID無效400 `VALIDATION_ERROR`且formId明細 | 原URL「連結無效」，保留details；讓統計API先判UUID，不先套普通Form認證順序 |
| Closed private三種正式Auth401 | 送出前捕捉是否已有成功資料，再撤下內容：初次／無成功資料重試直接replace登入返回；已載入後手動讀取沿既有Auth Dialog，關閉／×才走相同返回，Esc／遮罩不關閉。無當頁dirty輸入，不增加丟棄確認；兩情境在測試明列 |
| `AUTH_USER_DISABLED`403 | 原URL停用錯誤，Header保留已有User／登出；不主動logout |
| `STATISTICS_ACCESS_DENIED`403 | 原URL「您沒有查看此統計的權限」，不導login、不用Form GET探測身分 |
| network／timeout／500／異常Body／不可可靠解碼 | 原URL載入失敗、loading結束、可手動重試；不當404或寫入結果不明，不保留前次私有內容冒稱仍有權限 |
| public＋無效／過期／disabled Cookie | 依Statistics自己的200顯示；特殊Cookie真實前置未具備時live列BLOCKED，模擬分列 |

匿名Item完全沒有respondents：不建立未知姓名／替代ID、不查Profile／Latest來補人。具名Item只依該Item的respondents列完整displayName；同名不同id保留兩列、0票[]不造人，不把名單提升成跨題索引或原始答卷。所有文字作純文字，保留大小寫、換行及API排序；Root未提供responseIdentity，全部items皆空時不猜測模式或假造匿名／具名badge。非法null／mixed shape由既有decoder拒絕，不以空名單補成功。

## 5. 五題型與版面

| 題型 | 展示與代表案例 |
| --- | --- |
| single_choice | Option label＋Item count；同label不同optionId兩列，零票不隱藏；不拿業務value當Submission Option ID |
| multiple_choice | 同上；同人可命中兩選項，Item加總可大於Question count，不換算百分比／Root count |
| text | 完整value＋count；保留多行／大小寫，不做HTML、正規化或自行重新分組／排序；空Array顯示尚無作答 |
| number | 精確value＋count，0／相鄰大整數／長小數不可合併或截斷；1、1.0、1e0的分組由API決定，UI沿原Array順序 |
| rating | 列API回傳min～max全部整數及零票；不用互動Stars／Range猜config／範圍，不自行補0～100 |

Root count=0仍顯示完整Root與全部題目：Text／Number空分布，Choice／Rating零票；Root>0但optional題count=0也是正常，不能從過去Response補值。Question／Item／Root count各自顯示，不在前端重算統計。

桌機最大800px、手機左右16px，沿亮色Header與中文標籤；單欄題目卡／答案列、count清楚，長文字與名單自然換行，不省略、不摺疊成只剩前幾人、不分頁／截斷／另查Form。局部配置：

```text
共用Header（me獨立）
表單統計                         重新載入統計
title／description／建立者
不同填答者人數／填答模式／結果範圍／表定截止時間
題目1 [題型] title／description／本題填答人數
  答案或Option label · N人
  API有respondents才列完整姓名
其餘題目（完整）                 查看表單
```

大量內容fixture分別驗30題、文字題200個分布值、同一具名Item120人（含同名不同id）、2000 Code Points多行文字、Rating0～100共101列；這些是測試樣本，不是產品上限。Browser檢查完整節點數、首／中／末內容、390px無水平溢位、鍵盤重試／link與長內容可捲動；實機觸控／軟鍵盤／safe-area仍由人工後續確認，不能以viewport代填。

## 6. 必要自測、測資與證據方案

以下為核准 v1.0 的必要開發自測設計；規劃時均為 NOT RUN，實際結果及首敗／重測另見開發報告，不是正式驗收計畫。

| 分組／方法 | 目標、前置與預期證據 |
| --- | --- |
| U01 service／投影unit | sole GET／200 decoder／formId核對、九欄位與nullable、五型／精確數值／台北時間、完整排序與同名／同label、匿名省略／具名[]／非法shape；固定預期view，不用同一投影自比 |
| U02 read／Auth unit | deferred me與Stats的所有先後：bootstrap200／401／403／unknown不攔public，真Login／Logout／verify切身分清私人名單，A晚200／401／403／finally不改B；Statistics自身401只導航一次、不被自身revision中斷或循環；manual retry／離頁清理 |
| B01 fresh built＋攔截 | 真實產品頁驗並行請求、各初次錯誤／後續讀取Auth情境、Header guest nav redirect目標、私有登入返回／403留URL、Draft／Published特殊404／409／UUID400、public壞Cookie；精確顯示、零資料／optional、隱私、同名、長文字／大量內容。嚴格記method／URL／status／console allowances，全部標模擬 |
| B02 Browser競態／來源頁接入 | 同元件換formId、A慢回／失敗、換Session／卸載、重試失敗不得洩露前份名單；F7 Closed入口push統計、查看表單push回去；F6／F8 dirty取消不離開／確認才進，公開統計的Header導航與logout沿既有行為 |
| L01 真實R10 Browser矩陣 | 三Active帳號A Owner／B Respondent／C該Form未填者＋guest分Context；三Visibility×anonymous／identified各一份專用Closed Form，兩模式皆跑12格矩陣。真Cookie／CORS，Statistics先直GET；正常200／401／403和UI／導航相符，匿名無名單，identified public guest可看合法姓名 |
| L02 真實資料語意／獨立GET | 另用專用multiple Form，已知固定答案驗Root／Question／Item count、同人重送不加Root、Latest整份省略optional不補歷史、multiple choice加總；Number長小數／相鄰大整數／1、1.0、1e0；B／C同名不同ID保留；更新合成Creator／Respondent姓名後獨立Statistics GET與UI反映目前名稱／表定deadline，不冒充提交時快照 |
| L03 真實零資料／狀態錯誤 | anonymous／identified零Response Closed 200及零票[]；正常API建Draft／Published，含短deadline自然到期仍Published，驗Owner／其他Active／guest的409／404優先序；沿保留專用已刪UUID讀404、隨機UUID404及無效UUID400；不改SQL狀態／時鐘 |
| L04 特殊真實前置 | invalid／expired／disabled Cookie及停用Creator、真實Server fault／timeout等須另有已同意受控安排。缺前置各案BLOCKED，不製造Token／SQL停用、不用me404或清Cookie代稱；攔截可做但另列。既有交易故障缺口不由本輪只讀GET解除 |
| 工程／回歸 | F1最終`npm run lint`／`npm run typecheck`／`npm run build`；新F9 unit及直接沿用的api-client／exact-number-gate／common-adapters。若加入Auth通知，另跑F3 Auth unit、scoped-state與F3初始化／登入返回／登出、F7 logout／F8換身分的受影響built案例；其他不受影響範圍不重跑湊數。主Browser Chromium，Chrome／Edge各取public／private返回代表smoke，不無理由擴大Browser矩陣 |

真實組須fresh build＋preview、不攔截業務API；記實際前後端SHA／PID來源、Origins、Browser、非秘密設定與health/readiness。開發前重核Endpoint，不以本次OpenAPI／歷史R10狀態當整合PASS。正常API完成合成帳號／Form／Response／Publish／Close／政策／姓名測資準備，測試預期以固定輸入獨立列出，再對Statistics原始Body與UI；不是只比較UI與同一錯誤API數值。歷史補驗有35份保留Form／15份Response，不假定其帳密可用或滿足F9全部組合；優先適用既有資料，不足才在整輪開發授權內建立新Run專用資料並保留。本次未取得或新建任何帳密／測資。

Owner 本次已明確授權上述正常 API 測資準備；規劃交付時未有業務寫入授權或執行的歷史保留於 §7。依本版建立／保留專用合成資料，不刪歷史資料、不 reset DB／volume／SQL 修改；本輪無需新的真實 Delete，可讀既有專用已刪 UUID。缺 API／帳號／受控前置只阻擋對應 live 案例，不把必要項改為不適用。

預計命令沿F1 scripts：`npm run test:unit -- tests/unit/f9-statistics-read.spec.ts tests/unit/f9-statistics-view.spec.ts ...受影響既有檔案`；`npm run test:e2e -- --config=playwright.f9.config.ts`分built／live結果；必要harness另跑strict。實際檔名／grep／命令由開發交付記錄，不預填通過數。唯讀Statistics自身不新增寫入unknown／交易或dirty測試，相關回歸只驗來源頁／既有共用機制。

證據保存於ignored `output/playwright/f9/`，去敏交付至`docs/implementation/evidence/F9_*/`：逐案PASS／FAIL／BLOCKED／NOT RUN、URL／導航、method／status／Statistics原始完整Body、固定預期／UI與獨立GET、資源索引、首敗與重測、source/build hash、console與非預期請求。密碼／Cookie／Token／storageState／秘密trace不提交；人工列獨立欄，沒做不能填PASS。只修範圍內前端問題；契約衝突或後端缺陷列來源／重現／影響，不改契約或放寬斷言。

## 7. 完成判準、驗收銜接與本次停止點

F9完成需有直接讀取／完整資料與隱私／路由錯誤／必要自測的實際結果，交付`F9_Development_Report.md`、必要去敏證據／單一目的本機提交與剩餘Git狀態，再集中review；真實R10受阻時明列缺口，不能稱完整真實整合完成或accepted。沿用 **「計畫確認 → 整輪開發、自測與範圍內修正 → 集中 review」**，不新增中途測試計畫核准關卡。

按Owner本次安排，**完整前端驗收計畫於F9收尾後交付、審查，再於F10執行**；屆時用驗收Skill整理F1～F9覆蓋、沿用有效證據、未驗證／人工與受控前置。F9開發必要真實自測不等待該正式計畫，也不拿自測代填正式驗收；本次不準備／執行完整驗收、不展開F10。

規劃交付歷史：當時只新增本計畫並同步 README／總計畫，原補驗／review／首敗／歷史報告與 accepted 不改。Git／版本／manifest／契約 bytes／metadata 唯讀核對完成；三份文件連結、表格／code fence／控制字元／末尾換行、`git diff --check` 與受保護路徑無 diff 的靜態核對 PASS，不是產品執行結果。當時 install／lint／typecheck／build／unit／Browser／業務 API 讀寫／DB／正式 AI 與人工驗收均 NOT RUN；未提交，留三份文件供 review。

## 8. 本版核准後的開發交付

Owner 核准 v1.0 與三份規劃文件後，已依 §2～6 完成實作、自測、範圍內修正與受影響回歸，沒有新增中途核准關卡。交付 [F9 開發報告](F9_Development_Report.md)、[逐案結果](evidence/F9_20261015/case-results.json)、[保留測資索引](evidence/F9_20261015/resource-index.json) 及去敏證據；實際 PASS／FAIL／BLOCKED／NOT RUN、版本與首敗／重測以報告為準。完整前端驗收計畫留待 F9 收尾後另行交付審查，再於 F10 執行；本次正式驗收與 accepted 不變。

**停止於「F9 開發完成、待集中 review」；僅單一目的本機提交，不推送、不展開 F10。**
