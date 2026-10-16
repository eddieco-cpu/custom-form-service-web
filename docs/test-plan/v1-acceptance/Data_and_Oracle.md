# V1 驗收測資藍圖與獨立預期 v1.1

2026-10-16。**全是待核准藍圖，現在未建立帳號、Form、Response或UUID**。只在F10執行授權後經正常業務API／UI準備；不得把本文件當成資料已存在的證據。來源：FE02§1～12、FE03§1～12、FE04§7～11、FE06§6～9；BE01 FORM／SUB／STA、BE03b§4～8、BE03c§3～8。來源縮寫連結見[主計畫](../F10_Acceptance_Test.md#2-鎖定來源與版本)。

## 1. Run、角色與保留

RunId=`v1-f10-<台北日期時間>-<隨機碼>`。所有email使用`.test`／相容性案例的合成address，姓名帶Run，密碼由執行時安全輸入或記憶體產生；不寫文件／CSV／console／trace。不同角色用獨立Browser context，guest新context無Cookie；同一context的新分頁共享Cookie但各自App初始化。

| Alias | 新Run角色與用途 | 權限／限制 |
| --- | --- | --- |
| A | 主Owner；必要時填自己的表 | 只改自己的Profile／本Run表單；不可代表他人 |
| B、C | 一般Active填答者，Statistics時同名不同User ID | 各自登入、提交、Latest、PATCH自己姓名；禁止合併帳號 |
| X | Active但從未提交POL表單的其他使用者 | 做403及管理入口隱藏檢查；不意外提交POL |
| L | 清單專用Owner | 從0筆建立21筆；隔離普通表單數量影響 |
| EC1～EC4 | 四種Email相容帳號 | 單標籤domain、quoted local part、Unicode local part、非ASCII casing；各用Run唯一email；註冊／登入後保留 |
| GUEST | 無帳號、無Cookie context | 只能登入／註冊頁與public統計；anonymous填答仍需登入 |

普通範圍預計9個帳號。P03／P04特殊停用帳號、B01／B02多Browser及失敗重驗的新帳號另取新alias、先登記計畫用途／數量再建立，不計入上述9個。既有歷史帳號與表單不作寫入目標。

B01 Chrome預列CH-A一帳號／CH-F一份single表／本人一份Response；B02 Edge預列ED-A一帳號／ED-F一份multiple表／本人兩份Response（同內容新增）。各自UI建表→發布→提交→Latest→Close→guest public，再Owner改private、guest登入返回。故正常多Browser合計另2帳號／2Form／3Response；全保留、非Delete白名單。P03／P04由維護者核准安排另外列確切預算與alias，P05／P06故障資料按操作／階段各隔離alias，尚缺其前置不能假稱已納入普通38份。

## 2. Form藍圖與準備順序

| Alias／數量 | 定義／準備 | 後續用途與保留 |
| --- | --- | --- |
| EDIT／1 | A以UI首次保存的single、anonymous；text input、number、SC radio、MC checkbox、Rating兩variant、required與optional混合；Visibility使用者明選。Draft階段做CRUD／Delta／省略variant與稀疏排序seed（正常PATCH，明列setup） | D／M／R流程；保存後發布，A／B各single一份，關閉；保留 |
| MULTI／1 | A建立multiple，含text textarea、number長小數、SC select、MC multi_select、Stars0～5、Range0～10，全optional | B依序3份（全答／相同／省略optional），A另1份；Latest dirty／multiple重送與隔離／R13各variant；保留 |
| OPT／1 | A建立全optional、五型／兩種Rating，published | B提交answers=[]一份；零與未作答UI另外在不提交的輸入檢查；保留 |
| DEAD／1 | A建立published，deadline依執行時Server時點留足操作時間（建議+2分鐘；不足則換新alias）；B先成功1份，再自然等待到期 | 未改Server／OS時鐘；到期讀仍published、Latest可讀、statistics409、再提交期限錯誤；然後OwnerClose；保留 |
| ST-I、ST-A／2 | A正常API準備§3固定10題，multiple，identified／anonymous，public；先保留Draft／Published證據，再固定4份Response／表，Close | S01固定oracle；保留Definition／wire／receipts，禁止改歷史答案 |
| POL-<identity>-<policy>／6 | anonymous／identified × owner_only／respondents／public，各一份簡單必答text；B以UI送固定文字`POL固定答案`，A Close | S02四角色24格；A沒提交仍為Owner，X從未提交；保留 |
| ZERO-I、ZERO-A／2 | 兩Identity、public、含五題型及Rating0～5，全optional；Publish後直接Close，無Response | S04零資料，不能用answers=[]冒充零Respondent；保留 |
| DEL-D、DEL-P、DEL-C／3 | A專用三態表；DEL-P／DEL-C各由B提交1份，後者Close | M06三態soft delete；先索引UUID白名單。DEL-D保留dirty本地修改供確認；取消不刪 |
| LIST-01～21／21 | L正常API建立，三態各7份，單題text；Published的7份由B各提交1份，Closed7份不提交；準備完成後凍結狀態與順序基準 | L02三頁10／10／1、L03三filter各7；LIST-SHRINK挑其中一份Draft先記UUID，L04唯一刪除後21→20；其他20份保留。後續M08／R10可指定一份Published做close競態，但須在列表數量斷言之後 |

合計**38份Form**，固定成功Response目標**31份**（EDIT2＋MULTI4＋OPT1＋DEAD1＋ST8＋POL6＋DEL2＋LIST7）。這是執行排程預算，不是已存在或必須湊滿的PASS數；若增加合法重驗／真正Server fault造成未知提交，逐Run索引列實際數與原因。一般路由測試的Draft／Published／Closed代表取LIST保留表，依當時索引確認status，不再產生影子資料。空清單先用L建立前狀態；filter空結果在專用帳號建立前／狀態尚單一時驗，不擅刪歷史資料取得空狀態。

在測試腳本中，setup可用context request正常API，但正式D02／D03／M01～03／R03～06等標UI的動作必須由產品控制觸發。API準備明列method／status／alias，不拿setup回應當正式UI證據。所有新資源成功後立即記Run／UUID／Owner／狀態／purpose；測試中途失敗也保留索引，不做cleanup hook刪資料。

## 3. ST固定定義與四份輸入

ST-I／ST-A除responseIdentity外完全一致：title=`<RunId> 固定統計`、description=`第一行\n第二行`（真換行）、responseMode=multiple、初始resultVisibility=public、deadline=`2030-12-31T10:30:00.123456Z`。UI顯示台北2030-12-31 18:30:00，API／讀回精度比較同一瞬間至微秒；若執行日已超出該deadline，先修訂本計畫固定日期再review，不在腳本偷偷延後。

| 排序／題號 | type／config／選項 | 必答 |
| --- | --- | --- |
| 0 T | text，textarea；description含換行 | false |
| 1 N | number，config={} | false |
| 2 ND | number，config={} | false |
| 3 NE | number，config={} | false |
| 4 SC | single_choice，radio；O1=`相同標籤`／value=`Case`、O2=`相同標籤`／value=`case`、O3=`零票`／value=`zero`，sort0／1／2 | false |
| 5 MC | multiple_choice，checkbox；M1／M2／M3，labels=`一`／`二`／`零票`，values=`m1`／`m2`／`m3`，sort0／1／2 | false |
| 6 S | rating stars min0 max5 | false |
| 7 R | rating range min0 max10 | false |
| 8 OLD | text，input | false |
| 9 TC | text，input，用於count DESC優先於文字排序 | false |

Server成功Create後用固定題號／sortOrder綁定正式questionId／optionId。O1等alias不當成Request ID。這兩個ST表可透過正常API建立指定業務value；UI建立的選項依產品自產opt_UUID，D03另驗穩定性，不強迫UI提供value編輯器。

下表所有number必須序列化成未加引號JSON number；讀取用獨立Decimal解析，不先JS Number。`—`表示該Answer完全省略。

| Response事件順序 | T | N | ND | NE原wire token | SC | MC | S | R | OLD | TC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1（先） | 舊值 | -99 | -99 | 2 | O3 | [M3] | 5 | 10 | 舊optional | 舊分組 |
| B1 | ` Apple ` | 9007199254740992 | 0.12345678901234567890123456789 | 1.0 | O1 | [M1,M2] | 2 | 0 | — | Z |
| C1 | apple | 9007199254740993 | 0.12345678901234567890123456790 | 1e0 | O2 | [M2] | 5 | 10 | — | Apple |
| A2（最後） | — | 0 | 0.12345678901234567890123456789 | 1 | O1 | [M1,M2] | 0 | 0 | — | Z |

每次201即核Receipt全部欄位／正規化值及Answers依Question順序；另主動Latest核整份。A2須保證回傳submittedAt晚於A1；若時間碰巧相同，BE03c§8.1按id DESC取最新，不能以本地事件順序覆蓋契約。普通真實測資以正常時間先後保證A2為Effective，精確同timestamp的tie-break另由U05 fixture及G07後端歷史證據承接，不SQL改時。

## 4. 在看Statistics之前固定的完整預期

每個ST有4份歷史Response、3個Effective（A2、B1、C1）。Root count=3，**不是4**。Question counts按T／N／ND／NE／SC／MC／S／R／OLD／TC為 **[2,3,3,3,3,3,3,3,0,3]**。

| 題 | 依回傳順序的全部items／count | 對應人員集合（identified才輸出） |
| --- | --- | --- |
| T | Apple:1；apple:1 | Apple→B；apple→C。trim去兩端，大小寫不合併；A1的舊值不存在 |
| N | 0:1；9007199254740992:1；9007199254740993:1 | A；B；C，三個精確不同群 |
| ND | 0.12345678901234567890123456789:2；0.12345678901234567890123456790:1 | [A,B]；[C]（集合；輸出順序按目前姓名／ID） |
| NE | 數值1:3（1／1.0／1e0同一群） | [A,B,C] |
| SC | O1:2；O2:1；O3:0；完整optionId／label／業務value | [A,B]；[C]；[]。同label不合併、Case／case不合併 |
| MC | M1:2；M2:3；M3:0 | [A,B]；[A,B,C]；[]。Item總5 > Question3 |
| S | 0:1、1:0、2:1、3:0、4:0、5:1 | [A]、[]、[B]、[]、[]、[C] |
| R | 0:2；1～9各0；10:1（共11項） | 0→[A,B]；1～9→[]；10→[C] |
| OLD | statistics=[]、count0 | 無Item；不能從A1補回 |
| TC | Z:2；Apple:1 | [A,B]；[C]。先count DESC，不能因Apple字母在前而前端改排；A1舊分組不見 |

Root必須**恰九欄**：formId／title／description／creatorDisplayName／responseMode／resultVisibility／submissionDeadlineAt／count／questions，對固定Create與當前事件值比對。Question恰questionId／title／description／type／count／statistics；Item完整shape依BE03c§8.3～5。不得加入status／Owner ID／responseIdentity／config／createdAt／closedAt等。SC／MC的item.value是業務值，提交時value則是Option ID；各層不可混用。

姓名分兩階段：P0為A=`建立者原名`、B=`同名`、C=`同名`（Run標記放其他可追溯欄位／表單title，這三個displayName用固定字面）；P1透過本人PATCH讓A=`建立者新名`、B／C保持同名。先獨立GET me確認，再重新查兩個ST；Creator必為目前A姓名，所有含A的identified名單更新，其餘不變。若也驗Respondent改名，B改`新名B`後再獨立GET／Stats，按同規則重排；每一階段預期分開存，不拿P1比P0 Body。

identified每個item的集合按**目前displayName ordinal／binary ASC、User ID ASC**排序後比全名單；B／C同名仍兩個不同id。例NE初階段為同名B／C按真ID ASC，再建立者A；不能預先猜兩個Server UUID誰較小。id只用來注入對應關係／排序tie-break，不從實際Statistics反推哪些人該出現。item.count必等respondents.length，零票必[]；respondent只有id／displayName，無email／avatar／identity。anonymous每Item完全省略respondents，也無替代個人ID或跨題mapping；Creator姓名仍提供。兩份ST均核全部Body、全部UI值及另一次GET，不能只抽一題。

ZERO-I／A預期Root0／各題0、Text／Number=[]、Choice全Options零票、Rating0..5全零票；identified每Item[]，anonymous無respondents。與OPT有一份answers=[]的情境區分：OPT若Close，Root1但所有Question0；可於S04作附加讀回，不能把Root1稱無Respondent。

## 5. 獨立oracle的責任

F10驗證工具依本表從**固定Definition／預定輸入事件**產生expected，使用Python stdlib `json.loads(parse_float=Decimal, parse_int=Decimal)`或等價獨立任意精度實作；不得import產品ExactNumber／mapper、既有live expected builder或從實際Stats生成expected。只注入Server產生的IDs／timestamps，以及已記錄的本人改名／政策事件。排序／Latest依BE03c，逐欄比較完整結構；number比較精確數值等值，不要求1.0字面與1相同。Datetime用保微秒的UTC instant，不能只比毫秒或文字Z／+00:00。

先比Create回應與固定Definition、每份POST wire與固定輸入、201 Receipt與正規化預期，確認輸入真的落到預定資源；再比獨立Latest與Stats。若上游輸入不同，該案FAIL／阻塞，不重算一份迎合實際錯誤資料的預期。既有F9 Python診斷僅可作方法參考，不能直接沿用舊expected數字，因本版固定10題與資料不同。本次只寫明計算，未執行oracle／API。

## 6. 專用資源刪除與索引欄位

索引欄位：planVersion／RunId／attempt／alias／UUID／resourceKind／ownerAlias或userAlias／purpose／createdBy(setup或UI)／預計與觀察status／allowedDelete／實際deleteStatus／保留狀態／createdRequest及readback證據。Response另記formAlias、UserAlias、submittedAt／Receipt ID，無密碼或Cookie。

只有DEL-D／P／C與LIST-SHRINK的`allowedDelete=true`；其餘false。刪除前輸出待核白名單（去敏UUID可入repo），核context身份／Owner／Run與status，取消Dialog確認沒有DELETE；確認後只一次204、replace /forms，GET detail404、list不含、Latest／Count／Stats／Submit按契約視不存在。不能把三態Delete合併成只驗一份。重驗建立新DEL alias並先索引，不重新DELETE歷史UUID求204。所有資料預設保留，無驗收後自動cleanup。
