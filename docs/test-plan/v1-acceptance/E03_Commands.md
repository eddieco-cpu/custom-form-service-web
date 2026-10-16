# E03 五組組態執行命令（計畫 v1.1）

2026-10-16。只驗證工程組態，使用當前產品頁及合成API攔截；不對這些probe URL發真實業務請求。每組於前端根目錄的**新PowerShell process**執行，port3000須空閒。沿用`foundation-smoke.spec.ts`與F1最終scripts，必要薄組態`playwright.f10.engineering.config.ts`只隔離本輪reporter／output並關閉trace。`F10_CASE_LABEL`需加本Run／attempt，不覆寫歷史report。

每個新process先執行共同設定（只移除列出的process變數，不改OS設定）：

```powershell
foreach ($key in @('NUXT_PUBLIC_API_BASE_URL','F1_EXPECT_API_BASE_URL','F1_SMOKE_MODE','F1_INJECTION_STAGE')) {
  Remove-Item -LiteralPath "Env:$key" -ErrorAction SilentlyContinue
}
$env:HOST = '127.0.0.1'
$env:PORT = '3000'
```

| 子案 | 注入階段 | Browser固定預期API Base URL |
| --- | --- | --- |
| E03-PREVIEW-DEFAULT | build與preview均無URL覆寫 | `http://localhost:5000/api/v1` |
| E03-PREVIEW-OVERRIDE | 沿上一組default build，僅preview process啟動前覆寫 | `http://localhost:5000/api/f10-probe` |
| E03-DEV-DEFAULT | dev process啟動前無URL覆寫 | `http://localhost:5000/api/v1` |
| E03-DEV-OVERRIDE | dev process啟動前覆寫 | `http://localhost:5000/api/f10-probe` |
| E03-STATIC | generate前=f10-probe；static server啟動前改成static-start-only | **仍為** `http://localhost:5000/api/f10-probe`，不是static-start-only |

## E03-PREVIEW-DEFAULT

```powershell
$env:F10_CASE_LABEL = '<RunId>-E03-PREVIEW-DEFAULT-a1'
$env:F1_SMOKE_MODE = 'preview'
$env:F1_EXPECT_API_BASE_URL = 'http://localhost:5000/api/v1'
$env:F1_INJECTION_STAGE = 'default-build-and-preview'
npm run build
npm run test:e2e -- --config=playwright.f10.engineering.config.ts
```

## E03-PREVIEW-OVERRIDE

不重建，使用上一組default產物；若default build未成功，此組BLOCKED。

```powershell
$env:F10_CASE_LABEL = '<RunId>-E03-PREVIEW-OVERRIDE-a1'
$env:F1_SMOKE_MODE = 'preview'
$env:NUXT_PUBLIC_API_BASE_URL = 'http://localhost:5000/api/f10-probe'
$env:F1_EXPECT_API_BASE_URL = 'http://localhost:5000/api/f10-probe'
$env:F1_INJECTION_STAGE = 'preview-process-start-on-default-build'
npm run test:e2e -- --config=playwright.f10.engineering.config.ts
```

## E03-DEV-DEFAULT

```powershell
$env:F10_CASE_LABEL = '<RunId>-E03-DEV-DEFAULT-a1'
$env:F1_SMOKE_MODE = 'dev'
$env:F1_EXPECT_API_BASE_URL = 'http://localhost:5000/api/v1'
$env:F1_INJECTION_STAGE = 'dev-default-process-start'
npm run test:e2e -- --config=playwright.f10.engineering.config.ts
```

## E03-DEV-OVERRIDE

```powershell
$env:F10_CASE_LABEL = '<RunId>-E03-DEV-OVERRIDE-a1'
$env:F1_SMOKE_MODE = 'dev'
$env:NUXT_PUBLIC_API_BASE_URL = 'http://localhost:5000/api/f10-probe'
$env:F1_EXPECT_API_BASE_URL = 'http://localhost:5000/api/f10-probe'
$env:F1_INJECTION_STAGE = 'dev-process-start'
npm run test:e2e -- --config=playwright.f10.engineering.config.ts
```

## E03-STATIC

```powershell
$env:F10_CASE_LABEL = '<RunId>-E03-STATIC-a1'
$env:NUXT_PUBLIC_API_BASE_URL = 'http://localhost:5000/api/f10-probe'
npm run generate
$env:NUXT_PUBLIC_API_BASE_URL = 'http://localhost:5000/api/static-start-only'
$env:F1_EXPECT_API_BASE_URL = 'http://localhost:5000/api/f10-probe'
$env:F1_SMOKE_MODE = 'static'
$env:F1_INJECTION_STAGE = 'generate-build-then-static-server-start'
npm run test:e2e -- --config=playwright.f10.engineering.config.ts
```

每組檢查實際`window.__NUXT__.config.public.apiBaseUrl`、只對預期URL的合成GET／PATCH、CSR／UI／local icons／Dialog焦點與network；實際值不可作expected來源。組間只停止runner自己啟動的前端，不停既有後端。記命令、環境注入階段、source/build hash、reporter、首敗／重驗。完成STATIC後用共同設定清除本process覆寫，重新`npm run build`，才回到預設API的正式LIVE；靜態產物不能直接當preview產物。
