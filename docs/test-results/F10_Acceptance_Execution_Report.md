# F10 前端 V1 獨立驗收執行報告

2026-10-16（Asia/Taipei），Run **`v1-f10-20261016-01`**，涵蓋F1～F9。**AI已交付可執行範圍結果，整體未通過：248筆展開記錄為204 PASS／1 FAIL／43 BLOCKED，人工全部NOT RUN。** 18筆父項只彙總、不重複計數。沒有已確認產品缺陷；這不表示未驗情境沒有缺陷。**accepted不變，停止於「正式驗收結果待人工驗收／Owner確認」。**

Owner已通過整體計畫，要求局部補正後直接執行；本次未再設review gate。先補E03五組命令／process變數階段／固定URL、E03/M03章節引用及固定統計10題，同步伴檔／CSV，再以單一目的提交鎖定 **v1.1／`bc98f85309ef55ee1015e5727157e8d5fb9ba5ae`**。[Plan Lock核對](evidence/F10_v1-f10-20261016-01/Plan_Lock_Check.json)七份文件hash全符；鎖定計畫與原空表未覆寫，實際結果另存。

## 交付索引與判讀

| 文件 | 用途 |
| --- | --- |
| [逐案結果CSV](evidence/F10_v1-f10-20261016-01/Case_Results.csv) | 需求／方法／前置／步驟／原預期均保留，AI／人工分欄、首敗／重驗及每案證據；266列＝248執行＋18父彙總 |
| [結果摘要](evidence/F10_v1-f10-20261016-01/Result_Summary.json) | 未驗子案逐ID列出，不得被父項或其他PASS抵銷 |
| [前置與未驗清單](evidence/F10_v1-f10-20261016-01/Prerequisites_Results.md) | 六項特殊前置逐項結果、DB／同timestamp／ci／audit／實機及執行次序缺口，含解除方案／權限／是否阻擋完整通過 |
| [首敗與重驗](evidence/F10_v1-f10-20261016-01/Failures_and_Retests.md) | 原FAIL、工具修正、前置復原及歷史測試適用性；不改產品迎合測試 |
| [重現與操作](evidence/F10_v1-f10-20261016-01/Reproduction.md) | runtime、啟動／建置、各suite／attempt、只讀重算、測資保留及重播限制 |
| [資源索引](evidence/F10_v1-f10-20261016-01/Resource_Index.json) | 11帳號、45 Form、34 Response；四份白名單UUID與Owner、狀態、保留用途，無帳密 |
| [獨立oracle](evidence/F10_v1-f10-20261016-01/raw/oracle-results.json)／[列表與錯誤碼核對](evidence/F10_v1-f10-20261016-01/raw/evidence-audit-results.json) | 固定預期先算，再比wire／完整Body／UI／獨立GET，不以API數字互相比對作唯一真值 |
| [Browser逐項](evidence/F10_v1-f10-20261016-01/Browser_Checks.json)／[unit逐項](evidence/F10_v1-f10-20261016-01/Unit_Checks.json)／[真實checkpoints](evidence/F10_v1-f10-20261016-01/Checkpoints.json) | 執行名稱、結果、duration／錯誤／模擬診斷與來源；不是以通過數取代案例需求 |
| [Source/build hash](evidence/F10_v1-f10-20261016-01/Source_Build_Manifest.json)／[原件與去敏hash](evidence/F10_v1-f10-20261016-01/Copy_Provenance.json)／[交付manifest](evidence/F10_v1-f10-20261016-01/Evidence_Manifest.json) | 90份app＋3根設定／lock、158份fresh default產物、raw與交付bytes分開追溯 |

正式來源沿[AGENTS v1.1](../../AGENTS.md)、[驗收skill](../../.agents/skills/v1-frontend-acceptance-testing/SKILL.md)、前端00～07（02/06 v1.1，其餘v1.0）、總計畫v1.3 F10／§7／§7.1，以及backend-ref SNAPSHOT指定八份後端正式契約。F9集中review通過的Owner決議保持；原報告、首次失敗與既有缺口均保留，沒有把code review或開發自測代填為本次正式驗收。

## 實際版本、範圍與環境

| 項目 | 本次觀察 |
| --- | --- |
| 前端 | `C:\Users\user\Desktop\custom-form-service-web`，master；接手產品HEAD `0e5a6dcadb4a52c184cef5fe46aff39eab6d40c6`，最後產品實作`20381116101824aeccca405eaaf4336f6fea9784`。執行HEAD為上述plan commit，工作樹僅新增必要驗證工具／結果；app／產品設定／lock bytes未變 |
| Node/npm | 24.21.0／11.19.0；lock SHA256 `514545e78546b99dacd0b3b8c49e89d0f7dab5b26acb3da725d58c8551dbb1a2`；15項直接依賴按鎖定盤點，未升降依賴 |
| 真Browser | Chromium156.0.8078.4完整AI基準；Chrome156.0.8078.12 single smoke；Edge155.0.4283.45 multiple smoke，是真channel／binary，不互相冒充 |
| Origins／build | `http://localhost:3000` → `http://localhost:5000/api/v1`；CSR、fresh build＋preview、credentials include。listener child process可127.0.0.1，Browser仍localhost。E03探針／dev／static與真整合分開，最後恢復default build |
| 後端 | `C:\Users\user\Desktop\custom-form-service` HEAD `7591633137c5a6f57c1fce8e1ba19ab394015880`；PID34068／net10.0 DLL ProductVersion同SHA；DLL SHA256 `06e2a62db9c4376701e75b0ce3e7283d34b129d378c884e33fb1cb764a0af180`。health/ready/OpenAPI200、17個非Googleoperation含Statistics；功能PASS另靠實際業務請求 |
| DB | 原PostgreSQL17.11／container及volume；BEGIN READ ONLY查DB/user `custom_form_service`、migration `20260928122537_InitialV1Schema`；本Run七個UUID與四個soft_deleted=true相符，45 Form／34 Response最後aggregate。**effective config provider／runtime DI非秘密診斷仍缺，E05 BLOCKED** |
| 操作權／保留 | 本次明確授權的正常API合成資料、必要工具與四份白名單soft delete。11帳號／45 Form／34 Response全保留，包括失敗／補驗；只有4份DELETE，各一次204。無DB重建、volume刪除、SQL業務寫入、User停用、Server fault、產品變更、push或部署 |

原ignored資料／原件位於`output/playwright/v1-acceptance/v1-f10-20261016-01/`，帳號密碼只留`private-state.json`。交付無可登入憑證、Server簽發Cookie／Token、trace/video/storageState；Auth body不落證據，實際Cookie僅flags，P01工具只保留公開合成無效literal。所有LIVE保存均保留實際method／完整URL／JSON wire／status／receipt，另發正常GET讀回；API setup與UI正式操作有case／label區分。從未以攔截、模型或工程檢查冒充真後端串接。

## 執行結果與證明範圍

| 範圍 | 實際結果／證據邊界 |
| --- | --- |
| 工程 | 原目錄ci兩次EPERM **FAIL**；乾淨git archive副本ci PASS、原目錄ignore-scripts恢復PASS與lock不變不抵銷。lint、app/tools strict、505既有unit與15新增固定CP邊界、fresh build PASS；新增工具import／readonly失敗與重驗另留 |
| E03／產物 | 五模式各1PASS，固定URL、變數注入階段、static與runtime差異全部新驗；default產物已恢復。無產品BFF／JWT持久化來源，四種test route字串在產品產物零命中。這是限定範圍掃描 |
| 帳號／Profile | 真UI註冊／登入／redirect、四種Email相容、10/128CP不trim密碼、100CP姓名、負向400/409/401、Header與Profile PATCH＋獨立me、dirty logout；同SPA me次數、reload／新tab恰一次。實際Set-Cookie flags符合本機契約，值未交付 |
| Editor | new必選／初值、五型UI建立、真保存與第二次Delta正式ID、增刪／null／tmp、真拖曳題與option、上下移動、type/variant/config連動、稀疏/省略variant/微秒、台北修改清null、長title/Q/label、合法不完整Draft、dirty SPA/beforeunload及Preview均有新證據；純Browser幾何與故障另明列 |
| 列表／路由 | 真LIST21三頁10/10/1；另由21份獨立detail與固定提交事件計算全部summary／count／updatedAt-id排序。三態filter／刷新／rowlink、14個角色狀態入口；唯一LIST-SHRINK後21→20只補查一次。補驗只有Draft的Published filter空。Deleted／不存在／bad UUID真Form/edit與18個Stats狀態格均分記 |
| Lifecycle／管理 | 真Publish/Close取消／確認、dirty阻擋、三態九policy PATCH僅visibility＋獨立G、三態同值UI零request/API updatedAt不變、Count0→1→1→2、分享Clipboard、非Owner五種API403／舊Owner UI換真X Cookie、五種狀態衝突。**非Owner DELETE403因排程缺口BLOCKED** |
| Submit／Latest | single A/B各201→readonly、reload空白再409；multiple同內容仍新Response、第三份省略完整取代；answers=[]與0／長精度／所有variant；真400歸屬／型別拒絕不改Latest；本人Latest跨Draft錯誤／Closed／deadline／private政策；真Close競態、自然deadline與401兩種Dialog關閉／dirty取消再核身／完整返回，登入後零自重送 |
| Statistics | 固定**10題**、兩Identity各A1/B1/C1/A2，共8份正常API前置；Root3，題count **2/3/3/3/3/3/3/3/0/3**，相鄰大整數／長小數／1/1.0/1e0、文字大小寫／同標籤不同ID／零票／rating完整範圍、最新完整份去舊optional、P0/P1/P2目前姓名與同名不同ID，均由獨立Python Decimal完整核Body/UI/另一GET。6份ST＋16份POL/ZERO＝22 snapshot；另OPT Root1但全題0。24政策身分角色格及權限撤銷新跑 |
| 故障／scope | 當前產品built F6～F9 126PASS；F3 38、F6 harness27、F9 harness8、F2 18新PASS，F4舊suite14PASS/6失效斷言FAIL保留。新增33 unknown＋20 read＋8不可靠成功Body子檢查首輪56/61，工具原生confirm修正後只重驗5/5，所有必要故障子格有有效結果。真30000ms client timeout未縮短，攔截不代表真Server／transaction |
| UI／Browser／人工 | 18組真頁面1440/390/320與1023/1024 Header、login440及零外部請求；AI看四張合成頁截圖。大型固定fixture30Q/200items/120名/2000CP/101rating三尺寸、順序／Unicode／純文字通過。Chrome/Edge各完整真核心與政策補驗PASS。**H01～04實機缺前置、人工全部NOT RUN** |
| 真特殊前置 | P01已採核准isolated invalid Cookie方案PASS；P02/P03/P04/P05/P06共35子案BLOCKED。fixture的expired/disabled/error碼不解除真實缺口；U05同timestamp Server tie-break仍BLOCKED，前端Answer/Latest部分通過不抵銷 |

每項精確子案與部分方法邊界以CSV為準；沒有將API setup稱為UI建立、沒有把mock 500/timeout稱真交易，也沒有把後端R11歷史當本次重新驗過的原artifact。核心固定測資重新建立／執行；歷史只作同版本適用範圍的背景。F4已失效的stub斷言沒有拿來修現在產品。

## 缺陷、未驗與整體判定

**已確認產品缺陷：無。** 未做產品修正；產品缺陷若日後出現，須先回報、保留本版首次結果，再依修正授權換SHA/build/attempt重驗，不能下修本版預期。

| 未通過記錄 | 數量 | 本次處置 |
| --- | --- | --- |
| E01原目錄ci／ENV-01 | 1 FAIL | 兩次原失敗與副本／恢復分開；等待本機鎖定來源處理後原地重驗 |
| P02～P06展開子案 | 35 BLOCKED | 真expired／disabled Caller／disabled Creator／Server fault／Server timeout缺受控前置與操作權，逐子案記錄、繼續其他案 |
| E05／E06／U05 | 3 BLOCKED | effective provider診斷、audit Owner處置、同timestamp Server Latest前置／原件仍缺 |
| M07-DELETE | 1 BLOCKED | 執行次序缺口；白名單已刪，沒有新刪除授權，不以404代替403 |
| H01～H04 | 4 BLOCKED | 無實機／操作者／安全連線；人工結果仍NOT RUN，不能用emulation代填 |

完整驗收需要所有必要子案與真人項完成、版本／DB來源及風險處置可追溯、無未解FAIL/BLOCKED/NOT RUN；本版不符合。Owner若接受延期／殘餘風險，須逐ID、版本、原因、限制與解除條件確認，不能改稱無缺口完整PASS。這些缺口不妨礙交付已驗範圍；本次沒有先等待全部特殊前置才繼續。

真實canonical各attempt的CORS metadata不符0、pageerror0、Vue warning0；原a2兩筆預期404漏列工具事前診斷仍留在[Network_Review](evidence/F10_v1-f10-20261016-01/Network_Review.json)，a7事前宣告後重驗。Browser reporter總361是attempt結果307PASS／19FAIL／35模式互斥SKIP，含首敗與重跑，不能用它湊正式通過數。[首敗表](evidence/F10_v1-f10-20261016-01/Failures_and_Retests.md)說明各工具／前置修正，原件未覆寫。

## Git 與停止點

本次實際變更只有：v1.1計畫鎖定提交、兩份F10 runner config、15個必要固定邊界測試、執行工具source snapshots／去敏證據／報告，以及README／總計畫追加進度。app、既有tests、scripts、正式規格、package/lock、nuxt.config、backend-ref及後端repo均未修改；後端原`?? SNAPSHOT.md`保留。

計畫提交SHA已明列；本報告／工具／結果以單一目的本機提交，實際結果提交SHA見Git log及最終交付訊息，避免在檔案內虛填自身SHA。使用者`docs/test-plan.zip`原樣保留且不納提交，SHA256 `48a4ee96f69ebbd4d6d7be9f8562f844d585daa7ab3e7691ed8b798c5e1f9897`；提交後剩餘Git狀態另於最終訊息回報。

**正式驗收結果待人工驗收／Owner確認。accepted不變；不推送、不部署、不擴展刪除或自行修產品。**
