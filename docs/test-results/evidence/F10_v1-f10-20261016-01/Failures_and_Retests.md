# 首敗、重驗與適用性

產品程式、正式預期與已鎖定計畫未修改。下表的工具／前置問題均保留原log、JSON及必要source snapshot；修正工具不是調整產品預期求PASS。[逐案CSV](Case_Results.csv)的`first_result`／`retest_of`與此表合讀。沒有已確認產品缺陷；FAIL與BLOCKED仍阻擋整體通過。

| 鏈 | 首次觀察 | 處置／新證據／目前結果 |
| --- | --- | --- |
| ENV-01／E01 | 原目錄`npm ci` sandbox及正常權限均EPERM unlink resolver native；[首敗](raw/E01-ci-first.log)、[正常權限](raw/E01-ci-normal-retest.log) | 同plan commit git archive副本ci PASS；原目錄`npm install --ignore-scripts`恢復PASS、lock hash不變。**原目錄E01仍FAIL**，沒有刪鎖檔／停未知程序 |
| T01／LIVE preflight | canonical工具缺右括號，`node --check`失敗；[原工具](raw/canonical-preflight-first.mjs.txt)／[log](raw/canonical-preflight-first.log) | 修正純語法後開始Browser；此時無業務請求，不算產品FAIL |
| T02／canonical a1 | `姓名`定位exact沒有涵蓋required標記，三個註冊checkpoint失敗後停止；[原件](raw/canonical-a1-all.json) | 改為實際accessible label定位；a2完成5核心帳號。a1沒有註冊成功／Form／Response，沒有偽造PASS；密碼未輸出 |
| T03／a2 A08→A09 | Profile計數把PATCH也算成GET；失敗中斷姓名復原，後續logout姓名前置失配；[a2](raw/canonical-a2-all.json) | a3先正常PATCH/G還原P0，計數限定GET，再驗A08/A09通過。不是改預期姓名 |
| T04／D01 | a2硬認HTML select.value必須空字串，a3再硬認placeholder option.disabled；規格要求是沒有有效policy並且必選擋POST | a4以正式語意「沒有三個enum任一值、有效title但未選仍零POST」通過。兩次工具多加條件的FAIL保留，沒有修改UI或刪必選需求 |
| T05／M06 a2→a3→a9 | 三份真DELETE均已204，工具卻讀204 body而拋Protocol error；a2導航晚事件可能標到下一checkpoint | 原204及/forms事件保留；a3只補可靠獨立GET／list／Submit404，a9補各兩條真UI路由。**沒有再DELETE**；用複合證據，不假裝所有導航事件原本有完美同case標籤 |
| T06／固定oracle | 初次oracle撞到a2 P0 Creator仍是新名，與固定原名不符；[首敗](raw/oracle-first.log)／[原source](raw/oracle-first.py.txt) | a3正常恢復P0後再實際改名P1/P2，固定預期完全不變；`--statistics-attempt a3`核22 Body/UI/readback通過。a2固定姓名前置不採為oracle PASS，但保留其實際wire |
| T07／a4 A03/A02/A05 | modal使背景Tabs inert，工具關閉前找Tab；後續boundary依賴失敗。另SPA click未等URL便reload，找不到首頁heading | a5先關modal再核Tab，等待每次SPA URL commit；A02/A03/A05通過。原a4四種Email相容成功仍保留 |
| T08／a5 R11 | Auth失效後local model已readonly，工具仍找可編輯textbox | a6改驗readonly內容；a8完整補真Submit／Latest401、Esc/遮罩、footer/×各取消保留與明確核身後完整query/hash登入返回、空白重讀／零重送。原產品行為符合規格 |
| T09／Chrome/Edge a1→a2 | 全部核心與public成功；同一帶hash的Stats URL `goto`未觸發新GET，等待response timeout | 明確reload後重驗public→private，a2均PASS。a1已建CH-F/ED-F各一份、Responses1/2，**未重建／重複提交** |
| T10／F4歷史suite | 新跑20：14PASS、6FAIL。五個B03仍期待F4時的「root唯讀stub／零textbox」；B07期待身分切換自動第三GET，與F8後明確核資格不同 | 保留全部FAIL，不改舊測試也不修產品迎合它。現行路由14格真API、F6/F8頁面及最新版scope unit／Browser另驗。這是歷史測試適用性失效，不當成正式case整體PASS；有效F4十四項可作有限FAULT輔證 |
| T11／fault-a1→a2 | 首輪61：56PASS，Create三unknown及兩不可靠201共5FAIL，因工具等頁面Dialog，產品實際使用原生confirm | 修正為事前監聽native confirm並取消，僅5案重驗5PASS；33 unknown／20 read／8 decoder子檢查全部有有效新結果。timeout保持30000ms，未換成network中斷冒充TIME |
| T12／U02＋strict | 新固定邊界15案首輪6FAIL：import錯module，9PASS；更正後15PASS。final strict又發現測試直接賦值readonly Option.value | 保留兩種source／log；改為建新fixture Option物件，15案再PASS、app/tools strict重驗PASS。沒有修改產品validator、readonly型別或邊界預期 |
| T13／UI a1→a2→a3 | 首輪認定首頁有section；二輪又以main外框left代替content padding | 首頁直接量main並包含實際padding，其他頁量section；原寬度／16px／Header預期不變，第三輪全部18組＋1023/1024＋login/guest通過。AI已看四張合成頁截圖，人工欄仍NOT RUN |
| T14／R12 Decimal補驗 | 初次補驗把所有JSON數字（含rating）都當Number題比較，assertion失敗；[log](raw/oracle-numeric-first.log) | 以固定Number題questionId選值，仍用原長小數／0預期；POST/Receipt/獨立Latest精確比對PASS，未改成Observed值 |
| T15／L05診斷清單 | a2兩筆非Owner Draft404符合計畫／UI斷言，但漏登工具的事前expectedErrors；Network_Review仍留2項 | a7在發送前登GET404，兩案新跑PASS。**沒有事後把原2項加入白名單**；原記錄保持不匹配並明確解釋 |
| T16／L02證據檢查 | network observer最後一份detail response body因頁面換頁不可再取，檢查工具誤讀`<body unavailable>`為JSON | 改採同一次真正獨立GET已在Browser `fetch`回傳並保存的完整`reads.body`，未重建／臆造回應；21份detail推三頁全部欄位／count／排序比對PASS。[原source](raw/evidence-audit-first.py.txt)／[重現log](raw/evidence-audit-first.log)／[重驗](raw/evidence-audit-retest.log) |
| T17／交付QA | 連結檢查先於本工具產出Evidence_Manifest，回報該預定輸出尚不存在 | 保留原source／log；將本工具自己產出的manifest存在性檢查移至寫出後，其餘相對連結仍逐份先核。不是忽略缺失交付檔或修改產品測試預期 |
| RUN-ORDER-01 | 非Owner DELETE403漏排在四份白名單Owner刪除前 | **M07-DELETE BLOCKED**，沒有改成404或新刪其他資料。需Owner另核新專用白名單才可解除，其他PASS不能抵銷 |

Browser報告總361筆attempt結果為307 passed／19 failed／35 skipped，**不是361個正式案例，也不是一次全綠**；35 skip多為產品build／harness兩種模式互斥（另一模式有相應實跑）。原a1中止與模型／工程首敗另存，不在此Browser reporter總數內。正式判定以248筆展開記錄與18父彙總為準。

交付版canonical工具另加「既有Run禁止all重播／已刪或非記錄Owner禁止DELETE」防誤操作guard，僅語法檢查，沒有為測guard再寫資料。實際執行的各attempt source snapshot均保留，不能以最終工具hash冒稱所有attempt用同一版。
