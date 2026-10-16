# 計畫準備的唯讀盤點紀錄

2026-10-16（Asia/Taipei），對應[計畫v1.0](../F10_Acceptance_Test.md)。**本紀錄不是F10正式執行報告**。只有來源、版本、檔案完整性及非業務metadata核對；不執行Browser／測試／業務API／SQL、不建立測資、不啟停服務。準備階段的靜態核對結果與未來正式案例E01～P06分開。

## 1. 接手與來源

前端絕對路徑`C:\Users\user\Desktop\custom-form-service-web`；master，`git rev-parse HEAD`為 **0e5a6dcadb4a52c184cef5fe46aff39eab6d40c6**，起始`git status --short`空白。Owner指定此基準並確認F9 review通過，本次只追加進度；原review／開發／補驗報告不改，accepted不動。

已讀AGENTS v1.1、repo驗收skill、前端00～07與總計畫F1～F10／§7／§7.1／§8、後端SNAPSHOT八正式規格、後端README／configuration guide及F1～F9計畫／開發／修正／review的相關範圍與缺口、F1～F8補驗方案／報告。未將舊進度字樣當當前服務狀態。

| 唯讀檢查 | 實際觀察 |
| --- | --- |
| 20381116101824aeccca405eaaf4336f6fea9784→HEAD diff | 僅F9 review文件／證據，沒有產品／tests／依賴變更 |
| e25fe36ce887ce9a74fcbc66ee14e9edb4b7adf0→HEAD產品diff | 9檔：Statistics元件／loader／view／page／service與auth-state；因此不把補驗H01舊來源適用性擴大到所有當前跨輪流程 |
| backend-ref MANIFEST.sha256 | 108筆逐筆hash相符；只讀，未改任何內容 |
| F9 review artifact-manifest | 62／62去敏交付檔hash相符；不是重跑其中tests |
| F8 review artifact-manifest | 56／56去敏交付檔hash相符；僅保存完整性，不宣稱當前全部consumer適用 |
| F9 review execution/evidence-audit.json.source | 93／93當前source／根組態hash相符；sourceDigest=`3547457891d3165544b00165c7db58e15023f04f740f48697f7632c8d52d00f2` |

## 2. 本次runtime與依賴觀察

`node --version`=v24.21.0、`npm --version`=11.19.0、`dotnet --version`=10.0.400。沒有install／ci／build／test。package-lock SHA256=`514545e78546b99dacd0b3b8c49e89d0f7dab5b26acb3da725d58c8551dbb1a2`；下表每項declared／lock／installed三者相同：

| 套件 | 版本 |
| --- | --- |
| @nuxt/ui | 4.11.3 |
| lossless-json | 4.3.1 |
| nuxt | 4.6.1 |
| tailwindcss | 4.3.3 |
| vue-draggable-plus | 0.6.1 |
| zod | 4.6.5 |
| @iconify-json/lucide | 1.2.142 |
| @nuxt/eslint | 1.17.0 |
| @playwright/test | 1.64.0 |
| @types/node | 24.19.2 |
| @types/sortablejs | 1.15.9 |
| eslint | 10.12.0 |
| typescript | 5.9.3 |
| vitest | 5.0.3 |
| vue-tsc | 3.3.13 |

已靜態讀package.json scripts、nuxt.config.ts、.env.example、.nvmrc、Playwright根與F9／補驗config。CSR／strict／public apiBaseUrl符合計畫基準；client timeout／retry採既有核准來源與程式範圍，不當作本次執行證據。根Playwright有`trace: retain-on-failure`，F10必須覆寫或保護raw，不能直接公開敏感trace。

本次未啟動Browser、不讀Browser cookie、未建立connected session。Browserbinary版本只引用F9 review歷史，未宣稱本次可用。實機、人工結果均NOT RUN。

## 3. 實際後端與metadata

2026-10-16 **11:17:56 +08:00**起唯讀觀察，後端實際checkout`C:\Users\user\Desktop\custom-form-service`、HEAD **7591633137c5a6f57c1fce8e1ba19ab394015880**，`git status --short`僅既存`?? SNAPSHOT.md`，未動。

PID **34068**，`dotnet exec C:\Users\user\Desktop\custom-form-service\src\CustomFormService.Api\bin\Debug\net10.0\CustomFormService.Api.dll`。該DLL ProductVersion=`1.0.0+7591633137c5a6f57c1fce8e1ba19ab394015880`，SHA256=`06e2a62db9c4376701e75b0ce3e7283d34b129d378c884e33fb1cb764a0af180`。

| 唯讀metadata | 本次結果／意義 |
| --- | --- |
| GET http://localhost:5000/health | 200，status healthy；非業務端點 |
| GET http://localhost:5000/health/ready | 200 Healthy；只表API可連DB，不證明DB identity／migration／provider |
| GET http://localhost:5000/openapi/v1.json | 200，OpenAPI3.1.1／info.version1.0.0，列Statistics GET；不是已取得統計Body |
| docker ps限定名稱／image／status／ports | `custom-form-service-postgres-1`，postgres:17.11-alpine，Up17hours healthy，127.0.0.1:5432→5432；沒有讀docker env／秘密／SQL |
| DB identity／migration／DI provider | 本次NOT RUN；2026-10-15補驗的只讀DB/user／migration／UUID證據仍有效歷史，未抹除；本次未新確認runtime DI來源 |

八份實際正式契約逐檔SHA256與backend-ref相同：

| 檔案 | SHA256 |
| --- | --- |
| 00-v1-overview.md | d6bff54a6fdfd7f2be1a5145d7b564940d30b31920f7fe59b518156f76116c11 |
| 01-v1-domain-specification.md | 3f1a836fd3133a111e684f18a836b7b43fed2479a0585f46c460d97af84ca594 |
| 02-v1-database-specification.md | 90079ad3e4d7a41882a3bc2b99859ab72e71892e523d0956bbcf86b551f8a257 |
| 03a-v1-api-contract-common.md | 1abb28c69af5fe505660db06cc6aa12224c6e20fe0948b440ca6dccda515fa9b |
| 03b-v1-api-contract-auth-user-form.md | 3e6feeed460d3aa27fe9a3d3187d6551a56c426669c0852f9b8e3ef6e30c89fc |
| 03c-v1-api-contract-submission-statistics.md | e7ca4f2d2b85533f8453f9e07a60c276319b22ce76ce9fb736211c677ffcf7f0 |
| 04-v1-error-catalog.md | c855ee35bb44572ec9eb3bfc68639bffa3ab8effcd951b7962d7a2ae2843c28e |
| 05-v1-system-constraints.md | 1308c26dcb876d12bca494aa78d3e1a91e218ee2b26d1bb58b7b04daf979b50a |

## 4. 盤點工具失敗與本次未執行項

首次讀檔誤查不存在的`.node-version`，後改讀repo實際`.nvmrc`；一次PowerShell glob語法使rg拒絕，改用rg -g後完成。初次PowerShell JSON處理因lockfile空鍵而失敗，改`ConvertFrom-Json -AsHashtable`後15項版本核對完成；metadata catch一度把ErrorRecord當path輸出造成大量診斷，改顯式route字串及只輸出Exception.Message，未含業務credential。這些都是唯讀盤點工具錯誤，不是正式產品FAIL。

沙箱首次拒讀後端Git／CIM／localhost socket；後以限定唯讀目的的正常本機權限核對成功，沒有automatic approval rejection、沒有啟停服務／改DB。失敗不當作服務不存在，也不把無權Git的空status當乾淨；目前後端status以上述成功觀察為準。

本次install／npm ci／audit／lint／typecheck／build／unit／Browser／oracle執行／業務API讀寫／SQL／migration／DB或volume重建／正式AI／真人驗收全部 **NOT RUN**。文件連結／矩陣與CSV／格式／Git diff靜態核對另於交付列實際結果；僅文件工作，不需為此新增產品測試。未提交、不推送、不部署；HEAD不變。停止於 **完整前端驗收計畫待 Owner review**。

## 5. 文件交付靜態核對

本版5份新增Markdown文件的相對連結、31張表格欄數、code fence、控制字元及結尾換行核對無錯；`Case_Results.csv` 24欄、266列唯一ID（83個需求案例群、248個執行記錄、18個父項彙總），父子關係完整，AI／人工結果全部NOT RUN。S02政策24格、S03狀態／ID18格、M03九格、F02十一操作×三故障33格皆有獨立結果列；未因parent彙總重複計PASS。

`git diff --check`及新增文件的尾空白／連結／表格靜態檢查通過；受保護的app／tests／scripts／依賴／正式規格／backend-ref／AGENTS／skills／歷史review與test-results無diff。Git仍為接手SHA，只有README／總計畫兩份進度變更及本計畫／五個伴檔共六個新檔，全部未提交。Git的LF→CRLF提示屬現有Windows換行設定，未改.gitattributes／core.autocrlf。這些是文件檢查，不是83群案例或正式驗收的PASS。
