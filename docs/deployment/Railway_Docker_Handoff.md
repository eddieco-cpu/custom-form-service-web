# 前端 Docker／Railway 接手指引

日期：2026-10-17。Owner 授權本機去敏、實作、自測與提交；GitHub 建倉／推送及 Railway 網頁操作由 ChatGPT Work 接續。保留 Nuxt CSR、Browser 直連 API 與 HttpOnly Cookie，沒有 BFF、proxy 或新的 token 儲存方式。正式驗收狀態維持既有紀錄。

## 1. 已備妥的建置與啟動方式

- 根目錄 `Dockerfile`：`base → build → runtime`，官方 `node:24.21.0-bookworm-slim`；明確安裝並核對 npm `11.19.0`。
- build stage 使用既有 `package-lock.json` 與 `npm ci --include=dev`，保留 Nuxt、Nuxt UI、ESLint／Icon 等必要建置依賴，再執行 `npm run build`。沒有變更套件版本或 lockfile。
- Nuxt `ssr: false` 不變，明確採 `node-server` preset。Nitro 僅提供 CSR／資源及部署組態檢查，沒有新增業務 API。
- runtime 僅從 builder 複製 `.output`，以非 root `node`（實測 uid 1000）執行；`/app` 不含 docs、tests、測資、原始碼或 lockfile。
- 正式命令：`node .output/server/index.mjs`。沒有使用 dev、preview 或本機 static smoke server。

Railway 對根目錄 Dockerfile 的偵測與 build-time 變數行為見 [Railway 官方文件](https://docs.railway.com/builds/dockerfiles)。此專案不需要新增秘密 build ARG；API URL 使用 **runtime** 組態。

## 2. Railway 設定

| 項目 | 接手設定 |
| --- | --- |
| Repository | Owner 決定為 private GitHub repository；本輪未建倉／推送 |
| Root directory | repo 根目錄 |
| Builder | Dockerfile；檔案路徑 `Dockerfile` |
| Build command | 交由 Dockerfile 的 `npm ci --include=dev`／`npm run build`，不另疊 Railpack build |
| Start command | 保留 image CMD；如需明填，使用 `node .output/server/index.mjs` |
| `NODE_ENV` | `production`，已在 image 設定 |
| `HOST` | `0.0.0.0`，已在 image 設定 |
| `PORT` | 接受 Railway 注入值；image 預設 3000，`EXPOSE 3000` 不是強制監聽埠 |
| `NUXT_PUBLIC_API_BASE_URL` | **必填**，實際公開 HTTPS API URL，包含 `/api/v1`，例如 `https://api.example.com/api/v1`；例子不是已部署端點 |
| `REQUIRE_PUBLIC_API_BASE_URL` | `true`，image 已啟用，不在正式環境關閉 |

`NUXT_PUBLIC_API_BASE_URL` 在伺服器啟動時覆寫 `runtimeConfig.public.apiBaseUrl`，再提供給瀏覽器。相同 image 已以兩個不同 runtime URL 實測，不需為換 API URL 重建 image。Nuxt／Nitro 的實際覆寫程式位於安裝版 `nitropack/dist/runtime/internal/config.mjs`、`utils.env.mjs`；實測證據比單純閱讀文件另行記錄。

部署 guard 會在 production 且 `REQUIRE_PUBLIC_API_BASE_URL=true` 時拒絕缺值、HTTP、loopback、帶帳密、query 或 fragment 的 URL，錯誤不回印輸入值。這是部署輸入檢查，沒有呼叫或驗證 API 可用性。現有本機 HTTP localhost preview／測試沒有開此旗標，沿用原本行為。

不要設定競爭的 `NITRO_PUBLIC_API_BASE_URL` 或整包 JSON runtime override；本專案的公開接手介面使用 `NUXT_PUBLIC_API_BASE_URL`。public config 會交給瀏覽器，只放公開 API 位址，不能加入 DB 密碼、JWT signing key、access token、Cookie 或 Google secret。`.env` 不進 build context 或 runtime image；後端秘密留在後端服務設定。

正式服務須接受 Railway PORT 並監聽可連線位址，參考 [Railway 網路排查](https://docs.railway.com/networking/troubleshooting/application-failed-to-respond)。本輪已在容器內改用 PORT=4320 並從 host 連線驗證。

## 3. Cookie／網域方案：先決定，再驗證登入

### 建議方案：同一自有註冊網域的 HTTPS 子網域

例：前端 `https://forms.example.com`、API `https://api.example.com`，兩者皆為 Owner 控制的同一 registrable domain 及 HTTPS。這維持 Browser 直接呼叫 API 的架構，也可維持現有 `SameSite=Lax`，不要求前端取得 JWT。

需後端／平台配合：

- 設定實際 API 自訂 Domain 與 HTTPS，前端 `NUXT_PUBLIC_API_BASE_URL` 指向該 Domain 的 `/api/v1`。
- 後端 `AccessTokenCookie__Secure=true`；保留 HttpOnly、Path=/、host-only 及既定到期／登出屬性。host-only Cookie 在 API host 設定與傳送，前端 JavaScript 不需要讀取，也不需要擴成整個父網域。
- `Cors__AllowedOrigins__0=https://forms.example.com`，替換為真實前端 origin，不含路徑或尾斜線；若有多個合法 origin，使用各 index 明列。
- 維持 `AllowCredentials`，回應特定 `Access-Control-Allow-Origin` 及 `Access-Control-Allow-Credentials: true`，核對 OPTIONS／必要 methods／headers。不能使用 credentials 加 `*` origin。
- Browser 端現有 fetch 已是 `credentials: 'include'`。同站子網域仍然 cross-origin，因此 CORS 仍有必要。
- 實際執行新帳號登入→me／受保護操作→重新整理→登出、過期／無效登入狀態與目標瀏覽器驗證；本機／合成端點的 PASS 不代稱遠端登入 PASS。

### 目前兩個不同 Railway 預設網域

`up.railway.app` 在 [Public Suffix List](https://publicsuffix.org/list/public_suffix_list.dat) 內；因此 `frontend-a.up.railway.app` 與 `backend-b.up.railway.app` 不是同一 site。相同的後綴外觀不會使它們成為同站。

目前讀到的後端 `AccessTokenCookie.cs` 固定 `SameSiteMode.Lax`，`AccessTokenCookieOptions` 只有 Secure，沒有可用的 SameSite 環境設定。前端 `credentials: include`、CORS 放行或 HttpOnly，都不能讓 Lax Cookie 隨 cross-site fetch 傳送。[Fetch credentials 與 SameSite](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch.)

若堅持使用這兩個不同的預設網域，需要後端另行授權修改為符合 cross-site 的 Cookie 方案，至少涉及 `SameSite=None; Secure`、登入／登出的屬性一致性，以及配套的 CSRF／信任來源審查。現有契約是 Lax，本輪未改後端，**不能宣稱僅設定一個 SameSite 環境變數即可完成**。即使改成 None，第三方 Cookie 封鎖／瀏覽器政策仍可能讓登入不可用，必須做目標瀏覽器實測。[MDN 第三方 Cookie](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies)、[CORS 與第三方 Cookie 限制](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)

本輪沒有新增反向代理、BFF、同源路由代理、localStorage token 或 Authorization Bearer 作為替代方案；如要改架構，另案決議。**Docker 部署準備已完成，遠端登入可用性仍待實際網域與後端設定確認。**

## 4. 後端與 EC1／EC2 的證據邊界

既有 F10 工具使用前端 `http://localhost:3000`、API `http://localhost:5000/api/v1`。兩個帳號的本機狀態都有 Server ID；可讀的相關註冊紀錄都指向 localhost:5000。環境證據記錄本機 dotnet process／PostgreSQL port。

但這只能確認原始執行情境，不能證明資料庫／帳號後來沒有匯出、複製或遷移到 Railway。本次缺少已部署 commit、實際服務設定與 DB 搬移來源；對既有後端目錄 `git -C` 的讀取也回 Permission denied。可讀工作樹 Cookie 程式仍為 Lax，但不將它當作遠端部署版本證明。

結論：**EC1／EC2 僅存在本機：UNCONFIRMED。** 未嘗試登入、停用、改密碼或操作 DB。後續 Railway 驗證只使用新建合成帳號與新的密碼學隨機密碼；原始密碼／登入狀態只留 ignored 本機位置，不重用 EC1／EC2。

## 5. 本機重現與接手驗證

```sh
docker build --progress=plain -t custom-form-service-web:local .
docker run --rm -p 127.0.0.1:3000:3000 \
  -e NUXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 \
  custom-form-service-web:local
```

將示例 API URL 換成實際 URL。示例沒有注入秘密或建立帳號；與正式後端連線前先落實上一節的網域／Cookie 決議。

接手時核對：首頁與登入頁載入、`/_nuxt/` 與 favicon、直接開啟／重新整理統計深層 URL、瀏覽器公開 config 與實際 API request origin。再以新帳號測 Cookie 寫入／回送及 CORS。不同 `*.up.railway.app`、localhost 的混合測試不能替代同站自訂網域的正式結果。

本輪容器與瀏覽器使用 `api-a.deploy-smoke.example.test`／`api-b.deploy-smoke.example.test` 合成 URL。驗證涵蓋 runtime 覆寫、CSR／路由及靜態內容；API 不可達時顯示載入失敗是預期觀察，**沒有真實 Railway API／登入整合 PASS**。

執行結果、首次受限與重跑、S01 去敏對照及仍待事項見 [開發交付報告](Docker_Deployment_Preparation_Report_20261017.md)。
