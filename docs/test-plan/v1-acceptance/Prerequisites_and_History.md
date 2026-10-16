# 前置、既有缺口與歷史承接 v1.1

2026-10-16。這是[主計畫](../F10_Acceptance_Test.md)的必要伴檔。**本次沒有取得新的特殊測資或操作授權，也未執行正式案例**。下列「前置BLOCKED／待安排」是準備狀態，CSV案例的AI／人工結果仍NOT RUN；F10嘗試開始而前置未滿足時才逐案填BLOCKED。所有項目都不阻擋本計畫文件交付；是否阻擋完整正式驗收分列，不以其他PASS抵銷。

## 1. 六項特殊前置：取得方案、權限與逐案阻塞

### G02／P01：真實invalid Cookie

需求：FE03§12、FE04§5～6、BE03a§5、BE03c§7.4。現狀：歷史F3～F9真實分支缺受控安排；route攔截的AUTH_TOKEN_INVALID只證前端。本次沒有對Cookie寫入。

方案：Owner核准在**本Run隔離Browser context**由驗收操作者透過Browser cookie API放入明確不可驗證的合成壞值（不是偽造可登入JWT、不取簽章金鑰）；或後端維護者提供可確認invalid的專用credential。前者是待核准的具體方案，不宣稱既有授權已涵蓋。設定HttpOnly／localhost／Path=/與本機scope，確認request確帶該Cookie但不輸出值，不動使用者常用Browser。若Browser工具無法安全注入或Owner不採此安排，P01留BLOCKED，不用清Cookie替代。

執行檢查點：①GET me／一般保護Form=401 AUTH_TOKEN_INVALID；②private Closed stats同401，首次導login、操作中Dialog→dirty返回；③public Closed stats200，不受me401先後影響；④Draft／Published stats404（不是401）；⑤logout204無有效登入需求；⑥context清掉本次壞Cookie，不把這個清除當業務資料cleanup。每個response碼／route獨立存證。

權限：Owner同意測試context內無效Cookie安排；操作者需可控獨立Browser context。缺任一前置→P01 BLOCKED，仍可跑普通guest與FAULT，但不能關閉此缺口。**阻擋未附例外的完整驗收通過**。

### G03／P02：真實expired Cookie

需求同上，必須證明AUTH_TOKEN_EXPIRED。現狀：清Cookie只得到AUTH_REQUIRED，歷史沒有有效expired前置。

方案優先使用後端正常Login簽發的專用credential，等待其真正exp到期；預設1440分鐘可跨日安排，並記Server時間證據。若需縮短，僅由後端操作人另獲授權以**專用child process**設正整數`Jwt__LifetimeMinutes`，確認其他設定與資料來源，不能修改既有服務／OS時鐘或簽發任意token。專用process的origin／CORS／build與主環境差異須記錄，本環境證據不自稱5000原程序的PASS。

瀏覽器通常在Cookie Expires清除它，因此「等到過期再刷新」可能只是AUTH_REQUIRED。要驗真正EXPIRED，需Owner另同意由受保護測試工具保留**原Server簽發、內容未改的credential**於ignored私有記憶體／檔，exp後於獨立context用測試cookie metadata使它仍被傳送；不能改JWT內容或簽章。只在受控工具內使用，不輸出token、解碼claims或JWT key。若無此安排／Server回REQUIRED而不是EXPIRED，就維持P02 BLOCKED，不改預期。

執行檢查點：①Server證實到期且request仍帶credential，me／保護Form及private stats=401 AUTH_TOKEN_EXPIRED；②public Closed200與me401並行；③D/P stats404；④操作dirty→Dialog→取消保留／確認login、login後空白無重送；⑤expired logout204。到期前正常有效對照與到期後各碼都要證據。

權限：Owner同意上述時間／私有cookie保存與重送，後端維護者有權啟專用process時才採短lifetime。缺前置→P02 BLOCKED。**阻擋完整驗收通過**；missing-cookie與模擬expired不抵銷。

### G04／P03：真實disabled Caller Cookie／登入

需求：FE04§2／6、BE01 USR-02／06、BE03b§4.2／5、BE03c§7。正式V1沒有停用User endpoint；前端不得增加它。

方案：後端維護者提供本Run專用合成帳號與**已核准的受控停用安排**：先Active正常Login取得Cookie，保持前端已載入User及dirty表單，再於後端受控fixture／既有維運方式切為disabled。安排須寫明帳號alias／UUID、DB target、何時停用、影響與是否恢復；本計畫不授權直接SQL停用、秘密讀取、改backend或新增管理API。若目前只有測試程式能安排，維護者先提供適用runtime／DB的安全方案，不把測試用DB內disabled當本機真實服務已有測資。

執行檢查點：①正確密碼Login403 AUTH_USER_DISABLED、錯密碼401 INVALID_CREDENTIALS；②fresh App me403，沒有User時預設avatar＋登入中／可登出、不假姓名；③既有User操作403保User／輸入／原URL，不主動登出；④private stats403 AUTH_USER_DISABLED（不同於STATISTICS_ACCESS_DENIED）；⑤public stats200不受me403覆蓋；⑥D/P stats404；⑦logout204。Auth錯誤與Header／資料保留均由真Browser驗。

權限：Owner＋有權的後端／資料維護者，前端驗收人只有已提供帳密與本Run API操作權。未提供→P03 BLOCKED。**阻擋完整驗收通過**，前端fixture不能解除。

### G05／P04：真實disabled Creator

需求：BE01 STA-02、BE03c§3.4／§7。Creator disabled與Caller disabled是兩個獨立需求；不可拿P03相抵。

方案：後端維護者用另一個新Run專用Owner先正常建好anonymous／identified各三種Closed政策表、B的已提交紀錄及獨立正常統計對照，再依G04的核准方式停用該Owner。Viewer B保持Active／曾填答，X保持Active／未填，guest無cookie；不使用既有歷史Creator做停用。完整固定payload／名單expected先保存，停用不改Definition／Response／姓名。

檢查點：guest public200（兩Identity），B respondents200，X respondents403，Active非Owner owner_only403，disabled Creator自己private403；Creator仍出現在root、目前名稱正確、Form不因Creator disabled而消失、anonymous無respondents。另GET detail若Caller有效仍按一般規則，不把Owner停用當資源已刪。

權限與DB作用域同G04，需單獨Creator安排。缺→P04 BLOCKED。**阻擋完整驗收通過**。

### G06a／P05：真Server fault／交易故障

需求：FE04§11、BE03a§9、BE05§8／§15，既有F1～F8交易fault缺口延續。回500攔截、network abort都不能證明真Server在commit前／後的狀態。

方案：後端維護者提出並取得**僅對新Run指定request／專用資料生效**的受控故障方案（例如既有測試hook／可追溯的隔離診斷host；不假定目前已有），提供scope、開關、PID／DLL、DB target、觸發階段與恢復步驟。若需改後端程式／配置，屬另案授權，不在本計畫準備或前端驗收中偷偷做；不得停共享DB、破壞volume或對所有請求注入故障。

子情境：①真讀取fault（Form／Stats500，無寫入）；②Create／Delta／Submit**precommit**故障，前後以正常API及必要維護者只讀交易證據證明沒有部分資料；③同操作**postcommit／回應前**fault，Client只得到不明結果，獨立GET能看到實際保存。每一操作、階段獨立結果；無法構造某階段記該子情境BLOCKED。正常validation400失敗不替代故障回滾；Receipt／Latest只能核對現況，不足以證明內部transaction或特定unknown已完成。

Browser預期：loading結束、保輸入／unknown文案、不自重送；Create重複確認、Delta可靠重讀、single保護、multiple重複風險確認依F02；Server error不洩漏SQL／stack／credential。維護者提供去敏correlation／交易順序證據，禁止將整份敏感DB log交付。

權限：Owner明確核准故障方案＋後端操作人執行，驗收人只發已列本Run請求。缺→P05各階段BLOCKED、G07原子性故障證據缺口保留。**阻擋完整驗收通過**。

### G06b／P06：真實timeout

需求：FE04§11～12、FE06§5，Client timeout30000ms不代表Server rollback。

方案：後端操作人以同G06a的受控單request延遲方案，讓真GET／Delta／single Submit／multiple Submit超過30000ms，記Server完成時間與Client timeout；不能只route.delay／fulfill、斷線或停止既有後端。延遲操作限定新專用alias，避免Deadline也到期混淆原因；若測晚201的Deadline，用另案說明Server判定點而不改Client時鐘。提供scope／恢復／版本及正常延遲前後對照。

檢查點：GET可手動重試；Delta／兩Submit超時後UI unknown、不自重送／保輸入／loading finally，維護者確認Server是否保存，再獨立正常GET detail／Latest。multiple即使Latest有相同值仍不可取消重複風險，手動再送需確認；頁面換id／session不讓晚結果污染新頁。無法證明真Server延遲與保存→相應子案BLOCKED，FAULT TIME PASS另列。

權限：同G06a；本次未同意或執行。**阻擋完整驗收通過**。

## 2. 其他既有缺口與解除責任

| Gap／影響案例 | 既有證據與現在狀態 | 取得前置／權限／BLOCKED處置 | 是否阻擋完整通過 |
| --- | --- | --- | --- |
| G01 DB identity／migration／runtime DI provider；E05與全部LIVE歸屬 | 2026-10-15補驗已只讀取得DB/user custom_form_service、server17.11、migration20260928122537_InitialV1Schema及專用UUID；F9本輪未重查不抹去此歷史。DI provider來源一直未獨立確認 | F10由後端操作人提供現行API effective非秘密PostgreSql host/port/db/user來源與DbContext target；有權read-only角色用BEGIN READ ONLY查current_database/current_user/server_version與migration。對新Run API建出的少量UUID做只讀對照，加強runtime→DB關聯。只查metadata，禁止SELECT全表敏感值／password／SQL寫入。無安全診斷或權限則E05 BLOCKED、LIVE仍可記API觀察但不宣稱DB來源已確認 | 阻擋無例外的完整環境歸屬確認；不需重跑全後端schema驗收 |
| G07 DB原子性／競爭／精確同時戳；P05與U05／F04邊界 | backend snapshot R11記420／420、49 HTTP＋6非HTTP歷史，未代Owner accepted；前端無內部DI／transaction新證據 | 核後端原報告／coverage與相同runtime SHA適用性，可承接已證明的schema／single並行／tie-break等後端責任。原始artifacts未隨snapshot提供，不宣稱本次驗過；未被歷史證明的fault／rollback／受控競態列殘餘。需要新安排時交後端Owner，前端只驗兩tab外部順序／unknown及不重送，不重建DB／全跑R11 | P05必要故障前置未齊會阻擋完整通過；後端全套重驗不新增成前端必要case，未證明部分要明列或Owner例外 |
| G08 原目錄npm ci native EPERM；E01 | F1首失敗及F2乾淨副本重現／依賴恢復歷史保留；本次只核installed/lock，不是ci通過 | F10關閉本次已知前端後依lock在原目錄npm ci，無權處理鎖檔則BLOCKED；可在repo ignored工程副本核同lock，但原目錄問題另列。不得刪未知native remnants／停不明process／換Node或升依賴 | 必要重現未過阻擋完整通過；副本可支持有限交付，需Owner具體例外 |
| G09 audit、工具警告、F1五組組態；E03／E04 | 歷史audit風險、DEP0155／generate cache-driver／callback／NO_COLOR等警告留原報告。F1舊工程頁被產品取代，五組歷史不可當當前產品PASS | F10 `npm audit --json`僅盤點，記advisory ID、實際依賴路徑／是否runtime可達與修正影響，不audit fix；缺registry網路列BLOCKED。E03按當前產品頁重新驗5模式，fixture URL覆寫只工程不真API。警告逐項記有無影響 | 五組必要工程未驗阻擋完整通過；audit未有評估／Owner處理決議亦不稱風險已關。advisory存在本身不自動等於產品FAIL／也不自動豁免 |
| G10 實機／人工、其他Browser；H01～04／B01～02 | 390／320 viewport與Chrome/Edge fixture smoke是歷史，touch／軟鍵盤／safe-area／真人尚NOT RUN | Owner安排Android裝置與操作者／OS／Chrome版本、連本機拓樸的已確認方式；不能為手機將API臨時換LAN host造成Cookie/CORS混淆。可由真機能訪localhost的受控port forwarding（前後端兩port／同hostname）、或Owner提供同規則環境，記差異及權限。若沒有安全連線／設備，H項BLOCKED或尚未排程NR；B項缺binary則BLOCKED，勿代填 | 必要H／B項未完成阻擋完整通過；iOS／Firefox／WebKit不在當前基準，保留未驗不宣稱支援 |
| G11 普通合成資料建立／4份Delete權；D／L／M／R／S | 歷史F4非空清單／分頁／路由已在補驗確認；本次未建新資料。既有特殊狀態缺口不能籠統說全未驗 | Owner核准本版正常API新Run藍圖與4份專用soft delete後可準備，記實際ID；未授權或缺帳密就對應case BLOCKED。普通deadline自然到期不需改時鐘；發布不及則換新alias保留首敗 | 核心資料／權限缺失阻擋相應與整體通過，並不阻擋本計畫交付 |
| G12 服務可用／版本／安全證據；全部LIVE | 本次唯讀PID／DLL／health／OpenAPI已確認，但不保證F10仍可用；當前Read_Only_Inventory不能替代執行當日記錄 | F10重新核來源／SHA／runtime／Origin；無R10只BLOCK S／相依流程，其他獨立可跑；缺真服務不改mock PASS。去敏證據需足夠wire、readback、版本及結果；raw不可安全分享時留ignored並交去敏可判讀證據 | 核心API／來源不能證明阻擋完整通過；工程與fixture可獨立交付 |

G01的只讀SQL預定最小內容：`BEGIN READ ONLY`；`SELECT current_database(), current_user, current_setting('server_version')`；`SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId"`；必要時只查本Run已知Form UUID是否存在／owner/status/deleted_at，不取其他資料；`ROLLBACK`。此為待核准執行說明，**本次沒有查SQL**，不把連另一個DB的psql輸出當runtime DI證明。

## 3. 歷史承接與版本適用性

| 證據／來源版本 | 本版承接方式 | 必須新跑／失效範圍與理由 |
| --- | --- | --- |
| [F1～F8補驗](../../test-results/F1_F8_Independent_Integration_Supplement_Report.md)，接手2f6dc49／交付e25fe36 | 沿用為Owner已確認的**歷史核心整合結果**與保留資源索引，含Profile G、21筆清單／越界、專用Delete、五型Receipt／Latest；原FAIL不改。DB只讀觀察保留其日期／範圍 | 本版A／L／D／M／R全新跑：e25fe36→當前有F9 Auth通知與Stats接入，跨輪行為需要正式新證據；不能把原H01144份相符直接延伸到當前全部source |
| [F9開發報告](../../implementation/F9_Development_Report.md)，產品2038111 | 沿用歷史自測與固定輸入／原件追溯，59fixture／42真實的數量與分次意義按原報告；L04六BLOCKED保留 | 本版S01換10題固定oracle，完整F1～F9新Run與正式責任不同，原預期不可直接套；正式AI不預填PASS |
| [F9集中review](../../review/F9_Independent_Code_Review_Report_20261016.md)，2038111→0e5a6dc | Owner本次確認review通過；0e5a6dc對2038111只有review／證據，產品不變，93份source hash可核。歷史獨立42真實分案、Python完整Body oracle與63fixture可作同產品版本的輔證 | 真實invalid／expired／disabled／Creator／fault／timeout仍未驗，不能補填。完整核心LIVE、工程重現、各必要人工本版仍新跑；review不是正式驗收 |
| F2／F5純規則與修正證據 | exact／Unicode／datetime／Delta／config omission／Answer等未變來源可承接設計、邊界資料與歷史回歸的根因證據；F10依矩陣跑現有全部unit有意義一次 | 狀態／Auth／consumer版本變過者不能只核單檔就宣稱整合適用；U01～06新跑，以案例斷言而非歷史總數判定 |
| F6-R1/R2、F7-R1～R4/R3-N1、F8 review的built／harness | 可沿用**首次失敗與修正結案、工具方式**；Preview／同名Stars／嚴格network／dirty guard的有效子證據可附參考；每個沿用片段記source／config／Browser／hash與影響範圍 | F9共用Auth變更會影響初始化／logout／scope，對這些舊fixture不得直接全面延用為當前PASS；本版F01～04／D07～09等新跑，harness產物只證明薄注入分支 |
| F1五模式與原工程smoke | 保留config語意與歷史mask尺寸／首ci EPERM；不改當時PASS | 舊頁／lock已演進，E01／E03／E04新驗當前產品；generate／dev組不混入正式built LIVE |
| backend-ref R11／DB schema／transaction | 同SHA正式後端契約、migration設計、後端已記錄結果可作依賴佐證；不擴大前端F10為另一次R11 | snapshot不附原artifacts，R11人工／Owner確認邊界按原文；runtime DI／新故障安排未確認者留G01／G07，不自行accepted後端 |

承接的意義是保留相同版本下有效的背景、資料與歷史事實，**不免除本版已列必要新跑案例**。本計畫沒有選擇以舊PASS直接關閉任何正式核心案例。若Owner希望免新跑某項，需逐ID記來源hash／完整依賴適用性、免跑理由與本版處置，經計畫差異review，不能執行者自行刪除需求。

既有tests可用的命令入口（現在NOT RUN）：`npm run test:unit`；`npm run test:e2e -- --config=playwright.integration-supplement.config.ts`（會建立真實資料／含Delete，**不可在本次準備執行**）；`F9_MODE=live`配`playwright.f9.config.ts`（會建真實資料）；F6／F7／F8／F9各config的built／fixture／harness必須看mode／testMatch。F10新runner應逐case對照本矩陣與新Run索引，覆寫trace=off、reporter path唯一；不能一鍵跑舊live腳本就說本版完整覆蓋。PowerShell用`$env:F9_MODE='live'`等，勿直接貼POSIX env前綴。必要薄工具的新增／調整不改產品或既有預期，本次未新增會執行業務請求的腳本。

## 4. 必須保留的首次失敗與延期

保留原F1安裝native unlink EPERM／audit、F2暫存／precision gate歷史、F3／F4修正前Auth／dirty FAIL、F5省略config問題、F6同名Stars與network診斷寬放、F7 dirty／logout／可靠採用修正、F8讀取錯誤呈現回歸、補驗Profile選單／Rating locator首敗、F9 Email locator／UTC等值／request邊界及review build EPERM／oracle階段／harness前置失敗。具體檔案與attempt都從各原報告連結取，不重寫、不刪證據、不把同一案重測當新覆蓋數。

本版若再失敗，在新的F10報告追加attempt；工具問題分類不能抹去首FAIL，也不代表產品FAIL已證實。Google整合／正式domain／遠端部署／HTTPS／負載與其他FE00排除仍延期，不納本機完整通過宣告；正式AI、真人、Owner決議始終三層分開。現在停止於完整計畫待review，不向後端操作人發訊或觸發任何安排。
