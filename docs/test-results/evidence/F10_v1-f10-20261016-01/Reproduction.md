# 版本、操作與重現

本檔說明**已執行**的Run，不授權下一次寫入、修產品、擴Delete白名單或部署。正式依據是Owner已核准的[計畫v1.1](../../../test-plan/F10_Acceptance_Test.md)，鎖定commit `bc98f85309ef55ee1015e5727157e8d5fb9ba5ae`。產品bytes等於`0e5a6dcadb4a52c184cef5fe46aff39eab6d40c6`；本機執行時HEAD為plan commit，加未提交的驗證工具。結果提交不冒充已驗新產品版本。

前端根目錄：`C:\Users\user\Desktop\custom-form-service-web`。Node24.21.0／npm11.19.0；lock SHA256 `514545e78546b99dacd0b3b8c49e89d0f7dab5b26acb3da725d58c8551dbb1a2`。Nuxt4.6.1、Nuxt UI4.11.3、TypeScript5.9.3、Playwright1.64.0；精確直接依賴沿鎖定盤點。Python3.12.14只用獨立Decimal／去敏整理，不是產品runtime。

後端`C:\Users\user\Desktop\custom-form-service`，HEAD `7591633137c5a6f57c1fce8e1ba19ab394015880`；既有PID34068執行net10.0 DLL，ProductVersion相同SHA、DLL SHA256 `06e2a62db9c4376701e75b0ce3e7283d34b129d378c884e33fb1cb764a0af180`。本次未重啟後端／DB。DB仍為既有PostgreSQL17.11、`custom-form-service-postgres-1`與原volume；只讀身份／migration／本Run UUID，G01 effective provider仍缺診斷。

## 命令與啟動

實際工程命令分開存log：`npm ci`（原目錄FAIL、工程副本PASS）、`npm run lint`、`npm run typecheck`、`npm run test:unit`（原505）、指定新增boundary檔（15）、`npm run build`、`npm audit --json`（exit1風險圖）。原目錄以已記錄的`npm install --no-audit --no-fund --ignore-scripts --fetch-retries=0 --fetch-timeout=20000`恢復依賴，沒有變lock。不要將此恢復或副本ci改寫成原目錄ci PASS。

正式核心用fresh default build＋`npm run preview`。Playwright自己管理child process：`HOST=127.0.0.1`／`PORT=3000`只控制listener，Browser URL仍固定`http://localhost:3000`；API固定`http://localhost:5000/api/v1`，跨port credentialed CORS。本次沒有LAN host、HTTPS、BFF或API proxy。

E03五模式依[鎖定命令伴檔](../../../test-plan/v1-acceptance/E03_Commands.md)逐個跑，使用`playwright.f10.engineering.config.ts`；default preview/dev預期`.../api/v1`、runtime/dev override及generate靜態值預期`.../api/f10-probe`，static啟動override不能改產物值。generate後已恢復default build；其158個產物檔hash見[manifest](Source_Build_Manifest.json)。E03業務URL攔截為工程fixture，不稱真API PASS。

正式runner `playwright.f10.config.ts`固定workers1／retry0／trace、video、自動screenshot關閉。明確手動取得合成頁截圖，沒有storageState。主要參數與實際順序：

| 參數／suite | 本次使用 |
| --- | --- |
| `F10_MODE=live`, `F10_SUITE=canonical` | a1工具定位中止；a2 profiles/editor/setup/list/responses/stats/delete；a3 recheck；a4 additional；a5 authRetest；a6 authRetest/completionProbes/editorProbes；a7 routeDiagnostics；a8 latestAndReturn；a9 lastReadbacks；a10 managementNoop。每版source與JSON各存，不覆寫首敗 |
| `F10_CHANNEL=chrome`／`msedge` | a1 smoke新建各自專用帳號／Form，分single與multiple；a2只補same-URL reload／政策讀回，未重建或再Submit |
| `F10_SUITE=fault` | 首輪61：33 unknown＋20 read＋8 decoder子檢查；只重驗Create的5個工具確認框失敗。所有業務request攔截，不到真Server |
| `F10_MODE=f2/f3/f4/f6/f9` | 既有薄harness按對應Nuxt config build；F2用其dev fixture。F3 38、F6 27、F9 harness8、F2 18有效PASS；F4 14PASS/6舊斷言失效，詳首敗鏈 |
| `F10_MODE=built`、`F6_MODE=built`、`F9_MODE=built` | 當前產品output的F6～F9 suite：126PASS／12模式互斥skip。F3/F4沒有混入這個built集合；它們的專用控制route另跑 |
| `F10_SUITE=ui/large/protocol` | 真實只讀頁面18組尺寸及Header／固定大型攔截fixture三尺寸／Cookie flags與同標籤Preview分開。protocol用正常API在既有D05-RECHECK加兩個同標籤選項，保存G後UI選Server IDs，沒有Response |

例如已執行a8的命令（不是現在再次執行的指令）：

```powershell
$env:F10_MODE='live'
$env:F10_SUITE='canonical'
$env:F10_ATTEMPT='a8'
$env:F10_PHASE='latestAndReturn'
npm run test:e2e -- --config=playwright.f10.config.ts
```

**不要對本Run重播`all`**。四個Delete已完成，主要Form也已經歷Publish/Close，前置已不可逆地改變；不能把重播FAIL解讀成回歸。交付工具已加既有Run禁止all、已刪／非記錄Owner禁止DELETE的防誤操作guard；只做syntax check，沒有再刪資料驗guard。未來若有修正重驗，先指定受影響案例、當下前置與新attempt；缺未刪白名單維持M07-DELETE BLOCKED。新的全Run需另定RunId、完整新索引與授權範圍。

## 證據、讀回與只讀重算

ignored原件：`output/playwright/v1-acceptance/v1-f10-20261016-01/`。`private-state.json`僅本機存合成帳密與工具基準，不提交；密碼／Cookie／Token不在交付檔。有效API原始Form／Answer JSON以字串保留，避免去敏過程用JS Number改精度。[Copy_Provenance](Copy_Provenance.json)分列raw SHA與交付SHA；UTF編碼正規化、實際NUL/ESC可視化或去敏後不假稱bytes相同。

證據目錄自己的`.gitattributes`只在此目錄停用Git換行轉換，確保CSV／log／manifest提交後bytes與交付SHA相同；不改產品或全repo換行政策。計畫七檔另同時核工作檔與鎖定commit的Git blob SHA256，避免把autocrlf轉換誤認為計畫改版。

本機可只讀重算（不啟Browser、不寫API或DB，只更新分析輸出）：

```powershell
$env:PYTHONUTF8='1'
& C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe output/playwright/v1-acceptance/v1-f10-20261016-01/tools/oracle.py --statistics-attempt a3
& C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe output/playwright/v1-acceptance/v1-f10-20261016-01/tools/audit_evidence.py
```

第一項由固定10題與8次輸入獨立算2/3/3/3/3/3/3/3/0/3題count、Root3、全部分組／零票／目前名單與排序，完整Body/UI/另一GET共22 snapshot；另核EDIT長小數/0的POST／Receipt／獨立Latest。第二項由21份detail與固定提交事件重算列表全部欄位／排序，核74個實際error.code及四份唯一Delete204。工具沒有import產品mapper或從Observed統計生成expected。

別的checkout若只取得交付證據，可把去敏`raw/`置於上述ignored Run相同相對路徑後用交付的`tools/*.txt`源檔重算；不要複製private-state、重建資料或直接跑Browser工具。`package_evidence.py`需要本機private-state只為精確去敏，不是公共review的必要步驟。

DB只讀命令均用`BEGIN READ ONLY ... ROLLBACK`，僅查identity／migration／明列本Run UUID或aggregate count；原件見E05 logs。未執行migration／reset／delete volume／直接SQL改業務狀態。內部交易與受控並行不屬這些SELECT能證明的範圍。

## 保留與後續

[Resource_Index](Resource_Index.json)有11個合成帳號、45 Form、34 Response UUID。藍圖38 Form之外的7份：DEAD-RECHECK補自然到期、EDIT-RECHECK補type/長度/衝突、CH-F/ED-F各一smoke、D05-RECHECK補省略config/拖曳/無效Draft、INCOMPLETE補空題與過期Draft、EMPTY-D補「只有Draft時Published filter空」。全部有正常API建立及用途索引；只有DEL-D/DEL-P/DEL-C/LIST-SHRINK四份soft delete，相關row／Response保留，其他Form全留。

後續真人只填自己的H01～04結果與裝置資訊；Owner確認本版結果及逐ID待處理事項後才決定accepted。當前停止於**正式驗收結果待人工驗收／Owner確認**，沒有推送或部署。
