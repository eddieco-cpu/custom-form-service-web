# 需求／Round → 獨立驗收覆蓋矩陣 v1.1

2026-10-16；執行基準、方法、證據與判準見[主計畫](../F10_Acceptance_Test.md)，前置alias與固定預期見[測資藍圖](Data_and_Oracle.md)，缺口G01～G12見[前置伴檔](Prerequisites_and_History.md)。**此表為計畫，AI／人工全部NOT RUN（下列NR）**。已知前置阻塞不冒充案例已執行；執行時轉BLOCKED並列子案。CSV保留完整狀態字串與分欄。

FE00～07對應主計畫列出的前端檔案；BE00／01／02／03a／03b／03c／04／05對應後端八原件。每列步驟按①②順序執行；前置不得用假資料滿足。ENG／UNIT／LIVE／FAULT／HUMAN定義見主計畫§4。證據縮寫：V=版本／command／exit／build hash；W=去敏request wire＋method／完整URL／status／code／完整response；G=另一次獨立GET；U=UI／URL／Dialog／截圖／DOM與network計數；O=固定oracle；T=逐案runner／unit名稱／assertion；H=真人裝置／操作紀錄。所有證據均綁case ID／attempt／Run／版本；Auth body／Cookie值不入檔。

`parent`列不是額外一個可湊數的PASS；列有子格時每格各結果，父列只彙總，任一未跑／阻塞則父列不可PASS。CSV是執行空表；未需真人的ENG／UNIT／大多LIVE，其人工適用性N/A（自動觀察足夠），結果仍NR；H項真人必做。

## A. 工程與共用規則

| ID／需求／Round | 方法／目的 | 測資／前置 | 操作步驟 | 可觀察預期 | 證據 | AI／人工 |
| --- | --- | --- | --- | --- | --- | --- |
| E01 FE06§1～3、總計畫F1／F10 | ENG 安裝重現 | Node24.21.0／npm11.19.0、lock、G08 | ①記版本與Git ②npm ci ③核15直接依賴／lock與installed | 同lock可重現；失敗原樣保留。乾淨副本與原目錄分開，不以副本掩蓋EPERM | V／安裝首敗與重驗 | NR／NR |
| E02 FE06§11、總計畫F1／F10 | ENG 必要工程 | E01可用環境 | ①lint ②strict typecheck ③unit ④fresh build | 分別exit0；app與tools strict都涵蓋；產物綁目前source，不使用舊build | V／T | NR／NR |
| E03 FE06§2、F1最終scripts | ENG＋FAULT 五組config | 隔離child process／無業務資料 | 依[E03五組命令](E03_Commands.md)逐個啟動；每組清自己設定；最後恢復default build | default preview／dev為http://localhost:5000/api/v1；preview／dev覆寫及static generate值為http://localhost:5000/api/f10-probe；static啟動覆寫不改產物值 | V／U／五個子ID及固定URL | NR／NR |
| E04 FE00§4、FE05§1～2、FE06§1～5 | ENG＋Browser 產物邊界 | fresh產品build；公開Stats子檢查待S01測資可用後 | ①查ssr=false／strict與client ②開login／public stats ③掃公開config／產品output ④各頁量測寬度 | 無BFF／JWT持久化／secret／測試harness／不必要外部圖示字體請求；local SVG mask非零；Google隱藏零request；max寬外層/首頁/列表1280、editor960、Form/Stats800、Profile640、login440，手機左右16px | V／U／範圍明確的掃描 | NR／NR |
| E05 BE03a§5～7、BE02§3／15、F1～F9 | ENG 唯讀環境歸屬 | G01／runtime操作人 | ①核checkout→PID→DLL與hash ②health／ready／OpenAPI ③核DB非秘密target／只讀identity／migration | 17非Google操作描述；版本／DB確實可追溯；metadata不作功能PASS、provider未知列缺口 | V／G01證據 | NR／NR |
| E06 F1歷史audit／工具警告、總計畫F10交接 | ENG 依賴風險盤點 | G09，registry唯讀網路／目前lock | ①npm audit --json ②逐advisory記路徑／runtime可達性 ③對照build/generate警告 ④交Owner處理決議 | 不audit fix／升級／修改lock；exit非0依advisory與工具失敗分類，不直接等同產品FAIL；未評估風險不自行關閉，網路缺失BLOCKED | V／advisory摘要／Owner風險決議 | NR／NR |
| U01 FE06§6、BE01§3.3、F2 | UNIT 精確JSON round-trip | 獨立固定literal | ①長小數／9007199254740993／1e80／1e-101解析序列化 ②精確min/max相等與越界 ③1／1.0／1e0等值 ④空／0分開 | unquoted number無四捨五入；合法後端範圍內保真；NaN／Infinity／非法或不能安全處理值拒絕而不改值 | T／固定token | NR／NR |
| U02 FE05§5、FE06§7、BE01§3／USR、F2／F3 | UNIT 文字與Email | White_Space全集、emoji／組合字 | ①U+0085／3000 trim、FEFF／ZWSP保留 ②displayName99/100/101、title199/200/201、option value254/255/256、email254/255 CP ③password9/10/128/129 ④description候選 | 一般只trim White_Space、CP非UTF16／grapheme、password原樣；null／省略分責；各正式上限邊界正確，Question title／Option label不新增專屬maxlength。ASCII email lower；非ASCII由Server最終相容，不套Zod預設額外拒絕 | T；A02真實補證 | NR／NR |
| U03 FE05§6、FE06§8、F2 | UNIT datetime與dirty | 原微秒ISO、同瞬間不同格式 | ①載入到秒呈現 ②僅改title ③相同瞬間比較 ④台北修改／清除／非法日期 | 未改deadline不送、不截微秒、不假dirty；真改轉UTC、清除null；非法不偷偷補值 | T；D05真實補證 | NR／NR |
| U04 FE02§5～10、BE03b§7.2、F5 | UNIT Delta／config | 基準Server IDs與tmp keys | ①新增後本地刪 ②既有更新／id-only刪／未提不變 ③空Delta ④type／完整config／排序 ⑤省略variant往返 | tmp不出Request、新增不帶id；空Array非清空；保留ID／value；省略／undefined一致，null／未知key仍拒；稀疏載入no-op | T／固定前後Delta | NR／NR |
| U05 FE03§4～7、BE03c§4～5／8.1、F5／F8 | UNIT Answers／Latest | required／optional、亂序ID、同timestamp fixture | ①五型建Request ②完整Latest先全空再套 ③同時戳id DESC ④path mapping | 選項用ID，optional省略、0保留；缺題不補舊答；required漏題questions.UUID／answers[n]定位正確；tie-break不靠陣列順序 | T；R與S真實補證 | NR／NR |
| U06 FE04§2～12、FE06§10、F2／F3／F7～F9 | UNIT 狀態／世代 | deferred且不可取消回應 | ①共用me Promise ②Login／Logout超越me ③A→B頁／session、晚200／401／403／finally ④互斥lease／unknown | settled null不重查；bootstrap與credential change分開；舊結果不改Header／新頁／loading／route；解除unknown須可靠重讀 | T；F04 Browser補證 | NR／NR |

## B. 帳號、Header、首頁、Profile

| ID／需求／Round | 方法／目的 | 測資／前置 | 操作步驟 | 可觀察預期 | 證據 | AI／人工 |
| --- | --- | --- | --- | --- | --- | --- |
| A01 FE01§4、FE04§5～6、BE03b§4.1～2、F3 | LIVE 註冊→登入→返回 | 新A、帶`/profile?from=v1#name`返回 | ①匿名進保護URL ②切註冊輸入 ③POST register ④主動login | replace login保完整redirect；201 User無登入Cookie／不登入，toast回login Tab、email帶入／password清空、query保留；login200採User返回，不補me | W(register無秘密摘要)／U／Cookie flags | NR／NR |
| A02 FE05§5、FE06§7、BE03b§4.1、F3 | LIVE＋UNIT 邊界與Email相容 | EC1～4、新A、U02 | ①空／超長displayName、password9／129擋UI ②有效10／128 CP含前後空白與Unicode各驗 ③4種email正常UI註冊登入 ④不合法email送Server判格式 | 非空／長度精確，password不trim；single-label／quoted／Unicode／İ案例不被browser／Zod預設擋掉；Server正規化User.email、400details.email顯示且留Tab。密碼不入證據 | W去敏／U／CP案例對照 | NR／NR |
| A03 FE04§6／9、BE03b§4、F3 | LIVE 負向登入註冊 | 已有A＋未知合成email | ①重複email register ②錯密碼／未知email login ③修正 | 409 USER_EMAIL_ALREADY_EXISTS留註冊、email明細；兩種401 AUTH_INVALID_CREDENTIALS同語意且留登入，不啟動失效redirect；輸入保留，可手動修正 | W／U | NR／NR |
| A04 FE01§1／4／10、FE04§5、F3 | LIVE redirect合法 | A未登入、已登入guest | ①各保護頁帶query/hash進 ②login ③已登入進login?redirect=合法路徑 | replace返回已知route完整query/hash或/；返回重讀、無未保存恢復／原寫入重送；guest已登入不滯留login | W／U／history觀察 | NR／NR |
| A05 FE04§2～4、FE01§1、F3 | LIVE D-12次數 | A／guest，獨立context／新頁 | ①完整啟動login／保護頁／public stats ②SPA各nav含profile ③reload／新tab | 每完整App恰一次GET me；SPA settled User與null都不多查；Login／PATCH me直接採User不補GET；新App各一次 | W／U／每App request計數 | NR／NR |
| A06 FE04§2～4、F3／F9 | FAULT bootstrap未知／停用 | 隔離me200／401／403／500／network／timeout | ①每種初始結果 ②手動重試 ③Stats200早／晚於me | loading中性；unknown不當guest、原保護頁重試；403無假User但登入中可登出；public內容獨立完成；僅手動重試、不輪詢 | W模擬標記／U／F01子案 | NR／NR |
| A07 FE01§2～3、FE05§1～4／10、F3 | LIVE Header／首頁／UI | A、guest／公開統計；1440／390／1023／1024 | ①四nav順序與首頁3入口 ②avatar menu／fallback ③guest點nav ④手機開關選單鍵盤 | nav=建立→我的→Profile→首頁，連結各正確；guest avatar不可點，nav redirect採點擊目標；登入名／登出、壞avatar預設；Header64／56px與寬度／內容不遮擋；首頁不背景查列表／統計 | U／W／尺寸；壞avatar可明列攔截 | NR／NR |
| A08 FE01§6、FE04§4／7、BE03b§5、F3 | LIVE Profile保存／獨立讀回 | A共用User | ①進頁記me數 ②改displayName保存 ③獨立GET me ④改回基準／無改保存 | 只PATCH displayName；id／email／avatar唯讀；200更新Header、toast留頁；G同名；正常掛載無GET、無改零PATCH；無假User可保存 | W／G／U | NR／NR |
| A09 FE04§6～8／11、BE03b§4.3、F3 | LIVE dirty登出／Logout | A Profile dirty、另外guest context | ①登出取消 ②確認 ③無Cookie再logout（API） ④重新登入 | 取消零POST保輸入；確認才204無body、清User→replace /login無redirect／不二問；缺Cookie仍204；重新登入無未保存恢復 | W／U；故障見F02 | NR／NR |
| A10 FE04§5.3、F3 | UNIT＋Browser redirect拒絕 | 合成redirect集合 | ①外部https ②//host ③反斜線／編碼繞過 ④無效percent ⑤/login循環 ⑥未知route；login各一次觀察（可隔離mock） | 只接受本站已知絕對path、query/hash保留；非法一律/，無外部導航／文字執行；API寫入不因redirect發生 | T／U／W模擬標記 | NR／NR |

## C. 清單與路由

| ID／需求／Round | 方法／目的 | 測資／前置 | 操作步驟 | 可觀察預期 | 證據 | AI／人工 |
| --- | --- | --- | --- | --- | --- | --- |
| L01 FE01§5、FE05§9、F4 | LIVE 空狀態 | L建立前0筆；只有Draft時filter Published | ①全部空 ②只建Draft後篩Published | 200空items，總0／pages0；全部空提供建立；filter空顯條件無表，非404；page1固定10 | W／U | NR／NR |
| L02 FE01§5、BE03b§6.2、F4 | LIVE 21筆／三頁／列表內容 | LIST全21已準備；凍結當次基準 | ①page1→2→3 ②逐列比索引／API ③1440表格／390卡片 | 10／10／1，無重複遺漏；updatedAt DESC,id DESC，不自排序；title／status／distinct count／mode／identity／visibility／deadline／timestamps完整 | W／G／U | NR／NR |
| L03 FE01§5、F4 | LIVE 篩選／刷新／rowlink | 三態各7的LIST | ①page2切三status ②回全部 ③手動刷新目前page/filter ④點三種row | 每次切filter回1、pageSize10；全部省略status；刷新當前條件且無輪詢；Draft→edit／其他→Form，最終按GET狀態 | W／U／路由 | NR／NR |
| L04 FE01§5、F4 | LIVE 超界對齊 | LIST-SHRINK白名單；21→20 | ①L在page3 ②另context正常API只刪白名單 ③UI刷新 | page3 GET200 items=[]不是404，明確對齊page2且只補查一次；total20／2頁；空列表對齊page1不循環由L01＋FAULT補證 | W／G／U | NR／NR |
| L05 FE01§7～10、BE03b§7.1、F4／F6～F8 | LIVE parent角色×狀態×URL | LIST代表D／P／C；L Owner、X非Owner；guest | 依§G的12格＋guest2格直接開URL | Owner看Draft Form replace edit；非OwnerDraft404原URL；Published／Closed的edit兩角色replace Form；不發PATCH試探；guestlogin返回 | W／U／14子案 | NR／NR |
| L06 FE01§9、FE04§9、F4 | LIVE＋FAULT 讀取錯誤 | 合法未用UUID／專用已刪UUID／bad UUID | ①Form／edit各讀三種ID ②首次／手動刷新500／network | Active bad UUID400連結無效；不存在／刪除404找不到原URL；首次錯誤非假空，刷新失敗保舊列表、提示非最新及重試；Auth先於普通API path（API對照） | W／U；fault另標 | NR／NR |
| L07 FE04§8／12、FE06§10、F4 | FAULT stale列表／Form | 延遲page/filter／FormA、切B／session | ①先發A ②切B ③A晚200／401／403／finally | B資料／loading／Header／error／route不被A改；dirty param取消不讀B，確認才重設／讀B；沒有跨頁恢復 | T／W模擬／U | NR／NR |

## D. 建立、編輯、保存、預覽

| ID／需求／Round | 方法／目的 | 測資／前置 | 操作步驟 | 可觀察預期 | 證據 | AI／人工 |
| --- | --- | --- | --- | --- | --- | --- |
| D01 FE02§1～3、FE05§3～4、F6 | LIVE new初值／UI | A新建 | ①進new ②未選visibility保存 ③加題與選項 | 不GET／POST Form、不假id；title/desc空、single／anonymous、visibility未選、deadline無、questions=[]；必選擋POST；新題text／required false、Choice2選項、rating stars1..5；new無publish | W零寫入／U | NR／NR |
| D02 FE02§1／10、BE03b§6.1、F6 | LIVE 首次UI保存與ID | EDIT完整合法Draft | ①輸入根設定與五型 ②保存 ③獨立GET ④列表重進／reload | 一次POST201→toast草稿已建立→push edit；無連續publish；新增無server id／tmp、回應正式Form／Q／Option IDs；保存值精確一致，reload存在 | W／G／U | NR／NR |
| D03 FE02§5／9～10、BE03b§7.2、F5／F6 | LIVE UI CRUD／排序／Delta | EDIT Draft正式基準 | ①新題新option再本地刪 ②更新title／label、刪既有Q／Option ③drag與上下移動 ④保存＋G ⑤第二次以新增server ID更新 | 新增不送tmp、既有刪id-only、未提不變、無重複ID；label同名可用、value穩定；sortOrder依集合0..n-1、ID不變；description清null；成功採正式基準、clean零PATCH | W全部Delta／G／U | NR／NR |
| D04 FE02§6／8、F5／F6 | LIVE type／variant／config | EDIT Draft，Choice有Options | ①SC↔MC ②Choice→text取消／確認 ③非Choice→Choice ④text／rating改variant | 共通欄位保留；SC↔MC保ID/value而variant目標預設；取消零破壞；確認清Options、Delta無非空Options；回Choice新ID/value；非相容config清、相容bounds保留；每次G | W／G／U | NR／NR |
| D05 FE02§6.1／9、FE06§8、F5／F6 | LIVE 既有省略／稀疏／微秒 | API setup EDIT config省略variant、sort10／20、微秒deadline；先G | ①載入不改 ②只改title ③只加placeholder ④改variant再改回 ⑤UI修改／清deadline | effective預設顯示但不dirty、不補送variant／重排；完整config替換保其他key／省略variant；改回no-op；未動deadlinePATCH省略、G微秒不變；真改台北轉UTC／null | W／G／U／U03 | NR／NR |
| D06 FE02§6～7、FE05§5、F5～F7 | LIVE 前端驗證／分階段 | EDIT未publish時；可還原的正常定義 | ①空title／title200與201 CP／非法config／min>max ②正常UI輸入2000CP的Q title／Option label並保存讀回 ③Draft空Q／無Options／缺rating bounds／過去deadline保存 ④publish再補完整 | 非法結構不送API／首錯聚焦；200CP title可存、201擋，Q／label不因套件額外maxlength拒；合法不完整Draft能存；publish缺項不偷補／不暗保存；Server拒絕與path另由M08／F03核 | U／W／G | NR／NR |
| D07 FE02§11、FE05§7、F6 | LIVE Browser Preview（無提交） | EDIT未保存空內容／缺bounds／長內容 | ①開啟試填 ②關閉／×／遮罩 ③Esc ④重開 ⑤鍵盤focus／捲動／尺寸 | 獨立快照、試填不改editor dirty、不送Response；每開答案清空回頂；占位不進payload；bounds缺停用；Esc不關，背景鎖／焦點trap／回trigger；桌面90vw/vh、手機各方向總4px；人工H02另驗 | U／W零Response／尺寸 | NR／NR |
| D08 FE04§7～8、FE06§3、F2／F6 | LIVE dirty leave／unload | EDIT或new dirty；使用者gesture | ①nav／back／同組件換id ②取消再確認 ③reload／關tab beforeunload ④再進 | 取消保原model／URL；確認單次丟棄；dirty才綁beforeunload、clean移除；回頁讀Server或new空白、不local/sessionStorage恢復；Preview試填不算dirty | U／原生dialog／W | NR／NR |
| D09 FE04§9～11、FE06§9、F6 | FAULT PATCH錯誤path／unknown | 畫面第三題對Delta[0] | ①回FORM_DEFINITION_INVALID details ②未知path ③timeout／500 ④手動重讀取消／確認 | errors對真Q／Option key不按畫面index；未知明細留摘要；失敗保編輯、loading結束；unknown保存／publish封鎖至可靠重讀，取消不丟資料／不重送 | W模擬／U／F02／F03 | NR／NR |

## E. Lifecycle與Owner管理

| ID／需求／Round | 方法／目的 | 測資／前置 | 操作步驟 | 可觀察預期 | 證據 | AI／人工 |
| --- | --- | --- | --- | --- | --- | --- |
| M01 FE02§1／12、BE03b§8.2、F7 | LIVE Publish | EDIT已保存完整；先做dirty | ①dirty點publish ②保存 ③publish取消 ④確認 ⑤G | dirty先保存／擋發送、不暗PATCH；取消零POST；確認一次無body POST200、push Form與toast、定義凍結；G published、不能edit definition／無reopen | W／G／U | NR／NR |
| M02 FE02§12、FE03§8、BE03b§8.3、F7 | LIVE Close與到期 | EDIT Published、DEAD自然到期 | ①取消Close ②確認 ③G ④DEAD到期後Close | 取消零POST；確認200留Form、toast、Closed不可提交／定義readonly、統計入口依visibility；到期仍Published可Close，Close不重新判過去deadline | W／G／U | NR／NR |
| M03 FE02§4、BE03b§8.4、F7 | LIVE parent三態×三policy | EDIT各狀態按時序；Draft先改dirty title | 依本文件「K：M03三態九子案」UI切換；每次G，期間點其他寫入 | PATCH僅resultVisibility，200→toast／metadata更新，dirty定義不被完整DTO蓋；管理互斥；不改identity／提前統計；同值無多餘請求或API no-op updatedAt不變 | W／G／U；明確失敗還原F02 | NR／NR |
| M04 FE03§9、BE03c§6、F7 | LIVE distinct count | MULTI：未填→B1→B2→A1 | ①Owner每次主動點Count ②列表／Closed Stats對照 ③API查Draft／Closed | 0→1→1→2，非Response總數；無輪詢／初始自查；API Owner三態可讀、非Owner403；UI Published入口、Closed採Stats count | W／G／U | NR／NR |
| M05 FE03§9、FE01§8、F7 | LIVE分享＋FAULT Clipboard拒絕 | EDIT Published／Closed | ①複製填答 ②Close後複製統計／導航 ③拒絕Clipboard | 完整origin＋正確路徑，toast；Closed旁依policy說明資格，複製不授權；失敗可選取完整URL手動copy；統計link實到頁 | U／Clipboard讀回／W | NR／NR |
| M06 FE02§12、FE04§8、BE01 FORM-10、F7 | LIVE parent三態專用Delete | DEL-D/P/C白名單且有真UUID | 每態①取消 ②確認（Draft dirty）③G detail／list／Latest／Count／Stats／Submit | 取消零DELETE；確認單次204無body→replace /forms、不二問；後續404 FORM_NOT_FOUND及列表排除。Form／edit路由找不到；資料soft delete不硬清 | W／G／U／三子案 | NR／NR |
| M07 FE01§8、FE04§10、BE03b§7～8、F7 | LIVE 非Owner管理／憑證不同 | A記憶體Owner、Cookie切X的受控新Run context | ①X正常Form管理隱藏 ②各管理API對專用Form嘗試（含DELETE只用白名單）③舊Owner UI寫回403 ④SPA再進／明確核身 | 403 FORM_ACCESS_DENIED先於Lifecycle；無狀態變更、G相同；撤管理能力不因舊User.id再顯示；保dirty至確認；核明身分後才重建 | W／G／U／每操作子記錄 | NR／NR |
| M08 FE04§10／12、BE03b§8、F7 | LIVE＋FAULT 狀態衝突 | 同Owner兩tab、LIST代表／EDIT | ①舊Draft頁由另tab發布 ②舊保存／重複publish ③已Close再Close／Draft Close／Closed Publish API ④候選GET覆蓋dirty取消／確認 | FORM_NOT_EDITABLE／ALREADY_PUBLISHED／ALREADY_CLOSED／INVALID_STATE_TRANSITION各正確；UI只重讀不重送；取消保可複製資料且失效寫入disabled；確認才依真狀態導向 | W／G／U；非可自然達UI分支用FAULT標記 | NR／NR |

## F. 正式填答與Latest

| ID／需求／Round | 方法／目的 | 測資／前置 | 操作步驟 | 可觀察預期 | 證據 | AI／人工 |
| --- | --- | --- | --- | --- | --- | --- |
| R01 FE03§1～2、FE01§7、F8 | LIVE 初始化／readonly | EDIT single、MULTI、DEAD到期、Closed | ①首次進／reload／換id ②看完整root與控制 | 答案皆空、不預查Latest、不跨頁恢復；收件中有提交／Latest；到期／Closed原URL空白readonly無提交，status不自動Close；非Owner無管理 | W／U／初始化請求計數 | NR／NR |
| R02 FE03§3／5、FE05§5、BE03c§4、F8 | LIVE 驗證反向 | EDIT required、MULTI optional | ①required空、text長度、number界外、rating無操作 ②修正至合法再送 ③用正常API發錯Question／Option歸屬或value type | 前端非法零POST、首錯定位；合法值JSON型別／Option IDs；Server400 VALIDATION_ERROR與details，失敗不新增／G Latest維持前份或404；不新增至少答一題規則 | W／G／U | NR／NR |
| R03 FE03§2～4／8、F8 | LIVE single Owner／Respondent | EDIT A／B各第一次 | ①五型UI提交 ②成功Dialog等待 ③完成／× ④獨立Latest ⑤reload再送相同User | 201完整Receipt與G，Dialog不自關／留答案／clean；single readonly撤submit保Owner管理；reload空白無預查，Server409後撤submit，本地輸入標非Server答案，主動Latest才取得 | W／G／U／A/B分記 | NR／NR |
| R04 FE03§3～4、BE01 SUB-05、F8 | LIVE multiple每次新份 | MULTI B先全答、同內容再答、第三份省略；A1 | ①首次201 ②不改答案直接再submit ③第三份清optional ④每次G Latest | 同內容仍201且新Response ID，無強制修改規則；成功留可編輯答案／submit；Latest取當人最新完整份，省略題清空不補舊，A/B互不借答 | W／G／U | NR／NR |
| R05 FE03§5、BE03c§4.1～2、F8 | LIVE optional與0 | OPT全optional、MULTI已答 | ①全部未答submit ②本地輸入數字0／Stars0／Range0 ③清文字／數字／MC／optional rating | answers=[]可201／G[]；0是有效Answer，空／MC[]省略非null；清除是真未答。不要為每次本地試填都新增Response | W／G／U | NR／NR |
| R06 FE03§4、FE04§8、F8 | LIVE Latest取代 | MULTI dirty且Server最新缺optional | ①按Latest ②GET成功後取消 ③再按確認 ④再按一次 | 每按皆新GET、不先清空；成功後才確認，取消保全部輸入；確認先全題空再mapping／submittedAt標最近一次；缺optional空白，非歷史清單；pending停輸入／submit／替換 | W／G／U | NR／NR |
| R07 FE03§4、FE04§10、BE03c§5、F8 | LIVE 本人無紀錄／私有Latest | X未答、A Draft、已答B | ①X按Latest有dirty ②Owner Draft API Latest ③B已Close／過deadline／policy owner_only下Latest | RESPONSE_NOT_FOUND只Dialog「您從未填答過」，保輸入及模式；Draft Owner同code、非Owner FORM_NOT_FOUND；本人Latest不受visibility／identity／截止影響 | W／U／G | NR／NR |
| R08 FE03§6、FE05§3／10、F6／F8 | Browser LIVE／無寫入試填 Stars | 正式／Preview 0..5、20..100具合法定義（可FAULT固定100星） | ①hover/focus ②選2／5／0 ③min20檢查1..19 ④optional清除、required／readonly | focus不作答；max顆且每列10、亮星數=分數；0 radio互斥；min>0無0，min前星留位置不可選；optional清為未答，required/readonly無清除；兩同題名／Renderer不互干擾 | U／W無Response；H03實機 | NR／NR |
| R09 FE03§7、F6／F8 | Browser LIVE Range | 0..10、min>0；OPT／Preview | ①初始Tab/focus ②點當前min ③鍵盤／拖軌 ④clear | 初始視覺min但無答案；點min即作答，0可取；方向鍵有效整數；無0 radio；清除回未答與min，required/readonly無clear；送出不默取初始min | U／W；H03實機 | NR／NR |
| R10 FE03§8、FE04§8／10、F8 | LIVE＋FAULT 期限／被Close | DEAD自然時間；LIST指定Published另tab Close | ①正常進已到期 ②舊頁由另一tab Close後UI submit ③關錯誤Dialog／dirty取消與確認 ④deadline自然到期後用正常API拒絕對照 | 正常進留頁；真UI FORM_NOT_SUBMITTABLE→GET確認Closed，先Dialog後回/、dirty只問一次；取消可複製但無再submit；到期真API409 SUBMISSION_DEADLINE_EXCEEDED。若UI已被本地timer停用不強行點擊，deadline popup與晚201時序用FAULT另列，不冒稱真UI時序已證明 | W／G／U；deadline popup／晚201的FAULT證據明列 | NR／NR |
| R11 FE04§5／8、FE03§8、F8 | LIVE AUTH_REQUIRED dirty返回 | B有本地答案；明確清本context Cookie（非過期替代） | ①submit／Latest回401 ②Esc／遮罩 ③關閉／× ④dirty取消再確認 ⑤重新login | Dialog只關閉／×，Esc／遮罩不導走；取消保輸入但不恢復授權；確認replace login完整redirect；login後重新讀空白不重送／恢復；Cookie缺失不稱INVALID／EXPIRED | W／U／兩關閉方式 | NR／NR |
| R12 FE06§6～8、FE03§5、F2／F8 | LIVE 精度端到端 | EDIT／MULTI／ST長小數、大整數、科學記號 | ①UI raw輸入 ②POST wire ③Receipt ④獨立Latest ⑤Close Statistics | UI→未加引號number→Receipt／Latest／Stats精確等值，9007199254740992與...993不同；無小數位上限／隱性round；text換行／White_Space及大小寫語意保留 | W／G／O／U | NR／NR |
| R13 FE02§6、FE03§5、FE05§4／10、F6／F8 | LIVE 全呈現variant與readonly | EDIT text input／SC radio／MC checkbox；MULTI text textarea／SC select／MC multi_select；rating兩variant見R08～09 | ①各variant輸入／取消選取 ②以既定R03～04提交預算保存 ③主動Latest與readonly ④兩個同label選項依ID操作 | 五型所有合法variant具label與鍵盤可達；choice選label但model／wire為ID，MC集合不重複／取消後省略；readonly值一致不給誤改控制，換variant不污染另一題／Preview | W／G／U | NR／NR |

## G. Statistics與隱私

| ID／需求／Round | 方法／目的 | 測資／前置 | 操作步驟 | 可觀察預期 | 證據 | AI／人工 |
| --- | --- | --- | --- | --- | --- | --- |
| S01 FE03§10～11、BE03c§3.4／8、F9 | LIVE 獨立固定oracle | ST-I／A四Response與固定10題事件 | ①先算expected ②直接進stats ③核Body全部欄／UI每題每值 ④另GET | 根恰九欄、Root3／Q[2,3,3,3,3,3,3,3,0,3]、完整item／count DESC與文字排序／精確數字／同名／optional清空符合伴檔；只有Stats GET不Form／Latest／Count預查，me並行 | O／W／G／U | NR／NR |
| S02 FE03§12、BE03c§7.2、F9 | LIVE parent兩Identity×3policy×4角色 | POL6、A／B／X／guest，B曾答 | 依§H 24格全跑，private guest再login返回 | owner_only A200其餘Active403 guest401；respondents A/B200 X403 guest401；public全200；403留stats原URL；401由Stats自身判login回完整URL；Identity不改權限但改名單shape | W／U／24子案；200比POL固定答案 | NR／NR |
| S03 FE03§12、BE03c§7.1／7.4、F9 | LIVE parent非Closed／ID順序 | Draft／Published／到期Published、Owner／X／guest；已刪／不存在／badUUID | 依§I九態格＋九ID格；Stats直讀並記me | Draft只有ActiveOwner409，其他404；Published／到期Active409 guest404；已刪／不存在404先於Auth，badUUID400先於Auth；全留原URL，不用me401改成login；尚未開放有Form link | W／U／18子案 | NR／NR |
| S04 FE03§11、BE03c§8.6、F9 | LIVE 零資料 | ZERO-I／A；OPT可Close附加 | ①無Response的Closed直接讀 ②比全Root／題型 ③另GET；OPT空Response區別 | ZERO Root0所有Q0、text/number[]、choice全零、rating全範圍零，identified[]／anonymous無名單；保root／尚無填答；OPT Root1但Q0 | W／G／O／U | NR／NR |
| S05 FE03§10～11、BE01 STA-02～03、F9 | LIVE 現姓名／政策 | ST固定P0→P1；B可另改名 | ①本人PATCH name＋G me ②Stats新GET ③A UI政策切換＋G ④guest／B再讀 | Creator與具名Respondents用目前名稱、按name/id重排，同名不同ID不去重；匿名無respondents但Creator仍有；private立刻撤無權名單／403或401，不快取public舊資料 | W／G／O分階段／U | NR／NR |
| S06 FE04§2～5／9～12、FE06§10、F9 | FAULT 錯誤／重試／scope | built／薄harness；晚回Stats／me與session變動 | ①200後手動失敗 ②自身401兩關閉 ③外部Login／Logout／ID/query/hash變動 ④晚200／401／403／finally | retry先撤舊私有內容、不輪詢；初次401直接replace，手動401先Dialog；真正換身分清名單／取消舊flow，bootstrap不清public；晚回不導航／不結束新loading | W模擬／U／T不可取消 | NR／NR |
| S07 FE03§11、FE05§1～3／10、F9 | FAULT 大量完整可讀 | fixture30Q／200items／120名／2000CP／rating0..100；Text預排Z:2、Apple:1、apple:1、é:1、e+組合重音:1（後兩依binary排），中間雙空白／換行保留 | ①1440／390／320捲到最後 ②核每項／同名長名／換行 ③文本含HTML字面 ④核API順序不前端另排／合併 | 不截斷／隱性分頁／省略唯一內容；高count先、同count固定文字順序／非NFC合併，由固定fixture提供合法API順序，UI照呈；末人末item可達／純文字；不加圖表或管理面板；人工H04另做 | U／完整fixture清單／T | NR／NR |

## H. 受控故障、特殊真實前置、人工及Browser

| ID／需求／Round | 方法／目的 | 測資／前置 | 操作步驟 | 可觀察預期 | 證據 | AI／人工 |
| --- | --- | --- | --- | --- | --- | --- |
| F01 FE04§2／9／12、F2～F9 | FAULT 讀取失敗 | bootstrap／list／Form／Latest／Stats | 每資源各network／timeout／500／malformed Body，首次與可手動重試；控制完成順序 | 原URL／特定Latest Dialog、輸入保留、loading finally、手動retry；public不等me；列表刷新保舊、Stats失敗撤名單。無假Auth／404 | W模擬／U／資源×故障子ID | NR／NR |
| F02 FE04§11、F2～F9 | FAULT parent11種寫入unknown | 既有built控制／正常固定DTO；11操作見§J | 每操作各network／timeout／500：①開始前固定預期 ②發一次 ③故障 ④不操作觀察零重送 ⑤明確核對／手動retry限制 | 原頁保輸入、unknown提示／loading結束；Create重複確認、Delta／visibility封鎖至重讀、Lifecycle按新狀態、multiple重複確認不由Latest清除；各操作政策見§J | W模擬／U／33子案 | NR／NR |
| F03 FE04§9～10、FE06§9、F5～F8 | FAULT 三種path快照 | Delta[0]對第三題；Publish完整定義；Answer缺題 | ①Delta questions[0].options[1] ②Publish完整questions[n] ③answers[n].value[j]與questions.UUID ④未知path | 分別依Request Delta／保存Definition／Answer snapshot與漏答ID映射，非同一index；未知明細不丟。VALIDATION_ERROR與FORM_DEFINITION_INVALID／NOT_PUBLISHABLE不混碼 | W模擬／U／T | NR／NR |
| F04 FE04§4／8／12、FE06§10、F2～F9 | FAULT 請求世代／互斥 | 延遲讀寫、A→B／session／dispose | ①保存／Submit pending改輸入／其他寫入 ②Visibility pending其他命令 ③舊GET跨新寫入 ④舊成功／錯誤／finally | freeze／同Form互斥；不同scope互不誤鎖；離頁舊toast/model/route無回寫；舊GET不復活權限／覆蓋已知201；單次dirty授權不成永久bypass | T／U／W模擬；真Server並行另G07 | NR／NR |
| F05 FE06§5、FE07§10、F2／F6／F8 | FAULT 成功Body不可可靠解碼 | Create201／Delta200／Response201三種；malformed／非法UUID；Delta與Response另做資源ID錯置 | ①回表面成功但格式錯的Body，或已有目標id的回應對錯Form ②關Dialog ③核對／安全重讀 | 不假成功或以default補資料；保輸入／結果不明、不自重送；Delta鎖到重讀，Receipt不冒充他表；Create新ID由Server產生，僅驗有效shape／Owner／Draft，不要求Client預知ID；HTTP成功與解碼失敗分開 | W模擬／U／三子案 | NR／NR |
| P01 FE03§12、FE04§5～6、BE03a§5、F3～F9 | LIVE 真實invalid Cookie | G02：專用context受控壞Cookie | 依前置伴檔P01步驟，protected／private／public／Draft／Published／logout | protected與private AUTH_TOKEN_INVALID；public200不被me401撤掉；Draft／Published stats404；logout204；不得用缺Cookie代替 | W／U／受控安排ID | NR／NR |
| P02 同上及BE03c§7.4 | LIVE 真實expired Cookie | G03：Server簽發後自然到期且仍送達 | 依伴檔P02；證明Expired而非cookie被瀏覽器丟棄 | protected／private AUTH_TOKEN_EXPIRED、public200、Draft／Published404、logout204；操作dirty返回保輸入、登入後無重送 | W／U／時間與受控證明（無token值） | NR／NR |
| P03 FE04§2／6、BE01 USR-02、F3～F9 | LIVE 真實disabled Caller | G04：後端受控停用前有Cookie | ①正確／錯密碼login ②首次me ③已有User操作 ④public/private／D/P stats ⑤logout | 正確403停用／錯誤401不揭露；已有User／輸入保留、不主動logout，初始無假姓名仍可logout；private403停用、public200、D/P404；不是一般ACCESS_DENIED | W／U／停用安排證明 | NR／NR |
| P04 BE01 STA-02、BE03c§3.4、F9 | LIVE 真實disabled Creator | G05：專用Owner被受控停用、Viewer Active | ①停用前備6policy/identity對照 ②停用後guest看public／B看respondents／X無資格／Owner private | 建立者停用不排除Form或改政策／目前creator名；public200含root、anonymous仍無名單；ActiveB可respondents200、X403、停用Owner private403 | W／G／O／安排證明 | NR／NR |
| P05 FE04§11、BE05§8、F6～F9 | LIVE 真Server fault | G06：後端維護者受控read／precommit／postcommit故障 | 依伴檔分三階段＋Create／Delta／Submit專用scope，UI一次請求、人工恢復後獨立讀回 | read錯誤可手重試；precommit完整無副作用；postcommit結果不明不自重送、UI保輸入／核對；不能從Latest推特定交易確已完成；不洩漏內部資訊 | W／G／受控交易證據／U | NR／NR |
| P06 FE04§11～12、FE06§5、F6～F9 | LIVE 真實timeout | G06：真Server單一request延遲>30000ms | 依伴檔GET＋Delta＋single／multiple Submit，Server完成點可查 | 真client timeout終止loading、不自重送；Server可能完成且可獨立讀回，Delta重讀／multiple風險確認；不把Abort當rollback。與FAULT delay／abort分列 | W／G／Server受控時序／U | NR／NR |
| H01 FE05§2～3／10、FE02§9、F3／F6 | HUMAN 實機導航／排序 | G10：Android實機；專用Draft | ①手機nav/avatar ②觸控手柄拖題／選項 ③上下移動 ④鍵盤替代／保存讀回 | 控制可辨識可達、拖動不誤觸輸入／頁scroll、無跨題option拖移、備援同順序，固定操作區safe-area不遮內容；獨立讀回排序 | H／U／G | NR／NR |
| H02 FE02§11、FE05§7、F6 | HUMAN 實機Preview／軟鍵盤 | G10；長表／小螢幕直橫向 | ①開Preview ②focus底部輸入叫鍵盤 ③捲動／關閉／遮罩／Esc鍵若有 ④重開 | 四邊約2px且隨可視高度、Body滾動、頂底控制可達／背景鎖、關閉回trigger、重開清空；不增加資料恢復保證 | H／裝置畫面／尺寸觀察 | NR／NR |
| H03 FE03§6～7、FE05§10、F6／F8 | HUMAN 實機評分 | G10；0..100 stars與Range min0／min20 | ①觸控／鍵盤選0／20／100 ②focus不作答 ③清除／readonly | 每列10與前min不可選可辨、0不混空、Range點當前min可答、觸控不誤觸；required／readonly無錯誤可改暗示 | H／U | NR／NR |
| H04 FE03§11、FE05§7／10、F9 | HUMAN 長內容／Dialog／可讀性 | G10；S07固定大型fixture（明列模擬）與ST | ①到末題／末人 ②長文字換行 ③鍵盤focus與錯誤 ④成功Dialog等待／關閉 | 無截斷／水平溢位，姓名／答案完整可辨，同名保留；Dialog標題/close可達、焦點正確／不自關、非只靠顏色 | H／U | NR／NR |
| B01 FE06§11、總計畫F10 | LIVE Chrome代表核心 | 已安裝Chrome／全新專用smoke資料索引 | ①註冊登入 ②UI保存→發布 ③single或multiple提交→Latest ④Close→guest public／private返回 | 真Cookie／CORS、wire／G／URL符合主矩陣；無業務攔截；記實際binary版本／新資源。故障完整矩陣仍Chromium | W／G／U／V | NR／NR |
| B02 同上 | LIVE Edge代表核心 | 已安裝Edge／另一專用smoke資料 | 同B01，另一mode覆蓋single／multiple差異 | 同B01；缺binary記BLOCKED，不用Chromium channel冒充Edge | W／G／U／V | NR／NR |

## I. 必須逐格記錄的子案例

本節標題序號僅為文件編排。上表步驟中的§G／H／I／J分別指以下「路由」「Closed政策」「Statistics狀態」「unknown」小節，不是產品規格章節。M07六管理操作、M08五狀態錯誤、R03兩角色及P01～06各檢查點也在CSV展開，繼承父案例的前置／步驟／預期並逐項記錄。

### G：路由 L05（14子案）

| 子ID | 身分／狀態／原URL | 預期API／最終URL |
| --- | --- | --- |
| L05-O-D-F | Owner Draft Form | GET200，replace edit |
| L05-O-D-E | Owner Draft edit | GET200，edit |
| L05-X-D-F | 非Owner Draft Form | 404 FORM_NOT_FOUND，原URL |
| L05-X-D-E | 非Owner Draft edit | 404 FORM_NOT_FOUND，原URL |
| L05-O-P-F | Owner Published Form | GET200，Form |
| L05-O-P-E | Owner Published edit | GET200，replace Form |
| L05-X-P-F | 非Owner Published Form | GET200，Form |
| L05-X-P-E | 非Owner Published edit | GET200，replace Form |
| L05-O-C-F | Owner Closed Form | GET200，Form readonly |
| L05-O-C-E | Owner Closed edit | GET200，replace Form |
| L05-X-C-F | 非Owner Closed Form | GET200，Form readonly |
| L05-X-C-E | 非Owner Closed edit | GET200，replace Form |
| L05-G-F | guest Form，任一既有表 | me401→replace login，redirect原完整URL；無繞過保護 |
| L05-G-E | guest edit，同上 | 同上，登入後按當下狀態重讀路由 |

### H：Closed政策 S02（24子案）

以下每格分別以Identity `AN`／`ID`（anonymous／identified）執行，共24子ID=`S02-<AN或ID>-<O或R或P>-<A或B或X或G>`；A=Owner、B=曾答非Owner、X=未答Active、G=guest。200均核完整POL固定答案／Root1，AN無respondents、ID只有B的id/name；錯誤不可顯舊私有內容。

| policy代號 | A | B | X | G |
| --- | --- | --- | --- | --- |
| O owner_only | 200原統計URL | 403 STATISTICS_ACCESS_DENIED原URL | 403同左 | 401 AUTH_REQUIRED→login返回統計 |
| R respondents | 200原URL | 200原URL | 403 STATISTICS_ACCESS_DENIED原URL | 401 AUTH_REQUIRED→login返回統計 |
| P public | 200 | 200 | 200 | 200且Header未登入、不被me401導走 |

### I：Statistics狀態 S03（18子案）

子ID=`S03-<D或P或T>-<A或X或G>`；D=Draft、P=Published未截止、T=Published自然到期。三身分九案皆直接進Stats；T另G Form證明status仍published（含在T-A證據）。

| status代號 | A Owner | X Active非Owner | G guest |
| --- | --- | --- | --- |
| D | 409 FORM_STATISTICS_NOT_AVAILABLE | 404 FORM_NOT_FOUND | 404 FORM_NOT_FOUND |
| P | 409 FORM_STATISTICS_NOT_AVAILABLE | 409同左 | 404 FORM_NOT_FOUND |
| T | 409 FORM_STATISTICS_NOT_AVAILABLE | 409同左 | 404 FORM_NOT_FOUND |

另子ID=`S03-<DEL或NONE或BAD>-<A或X或G>`共九案：DEL專用已刪UUID／NONE合法不存在UUID均404 FORM_NOT_FOUND；BAD非UUID均400 VALIDATION_ERROR details.formId。**含guest仍先判path／存在性，不因Header401先導login**。這些全部留原URL。P01～03另處理invalid／expired／disabled的D/P存在性，不能用guest抵銷。

### J：寫入結果不明 F02（33子案）

子ID=`F02-<操作代號>-<NET或TIME或500>`。NET=無正式Envelope network、TIME=client timeout、500=正式INTERNAL_SERVER_ERROR；均模擬，不能當P05／P06。

| 操作代號／實際請求（均含/api/v1前綴） | 未知後必要UI、核對與重送限制 |
| --- | --- |
| REGISTER POST /auth/register | 留輸入／Tab、不自註冊或登入；主動切login用原帳密確認 |
| LOGIN POST /auth/login | 不假登入、不讀JWT；主動retry或GET me核對 |
| LOGOUT POST /auth/logout | 保既有UI／資料，提示Cookie可能已清，手動retry；dirty取消不曾發POST |
| PROFILE PATCH /users/me | 保姓名；手動刷新／GET me重建基準後再保存，不以舊UI保證保存失敗 |
| CREATE POST /forms | 保new輸入；列表／另tab核對，同title非可靠ID；再保存前確認可能重複 |
| DELTA PATCH /forms/{id} | 保存／發布停用；明確重新GET採用可靠Server IDs／基準前不盲送含新增項Delta，dirty確認可取消 |
| PUBLISH POST /forms/{id}/publish | 不假Published；主動重讀按真status操作，不自重送／把409當先前成功 |
| CLOSE POST /forms/{id}/close | 同上，不能先顯Closed成功或開放統計 |
| VIS PATCH /forms/{id}/result-visibility | 還原最後已知UI但標待確認，dirty定義保留；核對前鎖該寫入、不宣稱Server還原 |
| DELETE DELETE /forms/{id} | 不自再DELETE；使用者重讀404只代表目前不存在，dirty取代先確認 |
| RESPONSE POST /forms/{id}/responses | 保答案、不自重送；single主動Latest，multiple再送前重複新增確認；Latest／FormGET不解除multiple duplicateRisk、不證明某次unknown成功 |

E03子ID=`E03-PREVIEW-DEFAULT`／`E03-PREVIEW-OVERRIDE`／`E03-DEV-DEFAULT`／`E03-DEV-OVERRIDE`／`E03-STATIC`。M03=`M03-<D或P或C>-<O或R或P>`九格，M06=`M06-D/P/C`三格，F01=`F01-<ME或LIST或FORM或LATEST或STATS>-<NET或TIME或500或BODY>`二十格。P01／P02各至少protected、private、public、Draft、Published、logout六觀察；P03另login正確／錯誤、初始／已有User；執行報告逐觀察記checkpoints，不用一個HTTP代表整案。

F05子ID=`F05-CREATE`／`F05-DELTA`／`F05-RESPONSE`，每列做malformed成功Body／非法UUID，後兩列另做formId／id錯置；所有適用檢查點同時符合才可PASS。CSV共83個父定義（其中18個彙總），展開248個執行記錄；所有初始AI／人工結果NOT RUN，父項不重複算覆蓋數。

### K：M03三態九子案

依Draft→Published→Closed狀態順序執行，每態依owner_only→respondents→public切換並獨立GET。若當前已是首值，先正常切到另一值並登記setup，再執行該子案，不能拿no-op代替真正切換；同值no-op另留檢查點。

| 狀態 | owner_only | respondents | public |
| --- | --- | --- | --- |
| Draft | M03-D-O | M03-D-R | M03-D-P |
| Published | M03-P-O | M03-P-R | M03-P-P |
| Closed | M03-C-O | M03-C-R | M03-C-P |

九案皆為一次UI PATCH200、sole resultVisibility欄位、GET同值及真status；Draft dirty定義保留，其他兩態定義凍結。這裡的policy P與status P依子ID位置區分，不引用路由§G。

## J. 反向覆蓋索引與現有測試對照

先有上述正式需求預期，再用下表判斷現有測試能提供哪一段證據。**所有正式核心LIVE必須新跑**；歷史承接只作相容範圍的背景／輔證，細節見前置伴檔。不存在符合預期的既有斷言時，F10實作薄驗證工具或按本表操作，不刪案例。

| Round／來源能力 | 本矩陣案例 | 可承接工具／已有證據位置與限制 |
| --- | --- | --- |
| F1 CSR／UI／runtime／scripts | E01～05、A07、B01～02 | foundation-smoke與F1五組模式僅方法參考；原工程頁過時，當前產品必須新驗 |
| F2 client／decoder／exact／Unicode／time／scope／dirty | U01～03／U06、D08、F01～04 | tests/unit/{api-client,common-adapters,exact-number-gate,scoped-state}.spec.ts；f2-common瀏覽器fixture，不證Cookie／DB |
| F3 Auth／Header／Profile | A01～10、R11、P01～03 | f3-auth unit；f3-browser／corrections／reconciliation／live／email-live；新註冊與Profile獨立GET不可用mock替代 |
| F4 list／routes | L01～07、S03 | f4-form-read、f4-browser／live、integration-supplement；歷史21筆已補驗，但本版新跑 |
| F5 Editor／Answer domain | U04～05、D03～06／D09、R02／R05／R12 | f5-editor／definition-request／config-omission／answer unit；固定預期先核，純模型不作UI保存證據 |
| F6 Editor／Preview／Renderer | D01～09、R08～09、H01～03 | f6-editor-page／network-diagnostics unit、f6-browser／live；fixture與harness專用case分列、產品產物不得含測試route |
| F7 Lifecycle／Visibility／Count／share | M01～08、F02、P05～06 | f7-form-management unit、f7-browser／live；F7-R3-N1／Delete單次guard歷史保留，正式case新跑 |
| F8 Submit／Latest／knownSubmitted | R01～12、F02／04、P01～03／05～06 | f8-response-page、f8-browser／live；Receipt比wire＋獨立Latest，未知交易前置仍缺 |
| F9 Stats／privacy／scope | S01～07、P01～06、H04 | f9-statistics-read/view、f9-browser／live；本版固定10題oracle與歷史不同，不能直接沿用expected；F9集中review僅review結論 |

| 頁面／入口 | UI／路由證明 |
| --- | --- |
| /login | A01～06／A10、R11、S02／P01～03 |
| / | A07、R10、A04／A05 |
| /profile | A08／A09／D08、P03 |
| /forms | L01～04／L06／L07、M06 |
| /forms/new | D01／D02／D07／D08、F02-CREATE |
| /forms/{id}/edit | L05、D03～09、M01／M03／M06／M08 |
| /forms/{id} | L05、M02～08、R01～12 |
| /forms/{id}/statistics | S01～07、P01～06、H04 |

| BE03a Endpoint No.／method＋path（省略/api/v1） | 核心UI／實際請求＋獨立讀回案例 |
| --- | --- |
| 1 POST /auth/register | A01～03；無自登入、User保留由之後login／GET me獨立確認 |
| 2 POST /auth/login | A01／A03～05、Cookie／CORS與GET me／保護頁 |
| 3 POST /auth/logout | A09、P01～03，204後me／重新App確認未登入 |
| 4 POST /auth/google | FE00§4延期；E04確認隱藏／零request，無Google整合PASS |
| 5 GET /users/me | A05～08、E05僅metadata非此業務GET；P01～03 |
| 6 PATCH /users/me | A08→獨立GET me、S05目前姓名 |
| 7 POST /forms | D02→獨立GET detail |
| 8 GET /forms | L01～04／M06，對獨立資源索引／API排序，不回應互比代真值 |
| 9 GET /forms/{formId} | L05～06／D02～05／M01～03／R10的讀回 |
| 10 PATCH /forms/{formId} | D03～06→獨立GET detail；F02未知另列 |
| 11 DELETE /forms/{formId} | M06／L04→404＋list排除；只准4份專用白名單 |
| 12 POST /forms/{formId}/publish | M01→GET published；M08衝突 |
| 13 POST /forms/{formId}/close | M02→GET closed；M08／R10 |
| 14 PATCH /forms/{formId}/result-visibility | M03→GET、S05重新權限讀回 |
| 15 POST /forms/{formId}/responses | R02～05／R12→獨立Latest，ST setup另標 |
| 16 GET /forms/{formId}/responses/me/latest | R03～07／R11、本人完整份／隔離 |
| 17 GET /forms/{formId}/respondent-count | M04，固定提交事件獨立計算distinct User |
| 18 GET /forms/{formId}/statistics | S01～05固定oracle＋獨立GET／UI，S02完整24格 |

缺陷回報及重驗不改此覆蓋關係。案例的AI／人工欄與CSV同為事前空表；沒有任何矩陣列因歷史PASS而在本版預填PASS。
