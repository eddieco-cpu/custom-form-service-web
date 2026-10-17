# Git 去敏與 Docker 部署準備交付

日期：2026-10-17（Asia/Taipei）。接手 HEAD：`975ef8b2e78221a18956972dc762fda4005aae2f`，master；既有未提交變更只有前輪 `.gitignore`／`.dockerignore`／`docs/security/`，已依本次授權納入同一目的提交。最終 SHA 隨交付訊息提供，可用 `git log -1` 核對本報告所在提交。

## 1. 授權與來源

Owner 本次明確授權直接實作、自測與本機提交，決定私有 GitHub、保留 Git history／作者 metadata、S01 八檔本機保留原件並在原追蹤路徑去敏。GitHub 建倉／push／Railway 網頁操作交由 ChatGPT Work；本輪沒有執行。

讀取 AGENTS v1.1、development Skill、總計畫 §7／§7.1、前端架構 06 v1.1／Auth 04 v1.0／API 07、本機實作與 F10 證據。只完成本次部署準備，不重開或代填正式驗收，不改 accepted。後端快照基準仍為 `7591633137c5a6f57c1fce8e1ba19ab394015880`；Owner 表示後端已部署，但本輪沒有可驗證的 Railway endpoint／deployed SHA／DB 來源。

## 2. 實際變更

- 完成並納入前輪安全 ignore 與完整 Git hygiene 盤點，保留 docs、tests、Skills、去敏 evidence 及歷史；無取消追蹤。
- S01 八份工具文字副本：先逐檔備份並與來源 Git blob bytes 核對，再只遮蔽 EC1／EC2 的兩個密碼重建分支；每檔另加去敏標示。其他歷史內容可逐 byte 還原比對。
- 追加 [S01 Redaction Manifest](../security/evidence/docker-prep-20261017/S01_Redaction_Manifest.json)：來源 commit／blob、原件與去敏副本 SHA-256、行位、備份位置及範圍。原件位於 ignored `output/hygiene-private-originals-20261016/S01/`，沒有入 Git。
- 原 `Evidence_Manifest.json`／Plan Lock／Case Results／失敗與重驗紀錄維持原 bytes；其原 hash 對應本機原件，新 manifest 對應去敏副本。沒有把修改後 hash 冒充原執行版本。
- 新增 multi-stage Dockerfile；保留 Node `24.21.0`／npm `11.19.0`，lockfile 未改，builder 安裝完整必要依賴；runtime 僅複製 `.output` 並以非 root 執行。
- 維持 `ssr: false`，明確 `node-server` preset；正式 CMD 為 `node .output/server/index.mjs`，NODE_ENV production、HOST 0.0.0.0、接受 PORT。
- 新增僅 Docker 啟用的 production API URL startup guard 與必要 unit cases；沒有新增業務端點或 BFF。既有本機 preview 的 HTTP localhost 用法不變。
- 提供 [Railway 接手指引](Railway_Docker_Handoff.md)，包含 runtime 公開變數、正式啟動、網域／Cookie 方案及後端配合事項。

## 3. 去敏與帳號環境結論

八原件皆已備份與來源 blob 核對；共 16 個分支替換，沒有修改案例輸入／預期／結果紀錄。S01 舊提交仍可讀，由 Owner 明確決定保留完整歷史並採 private repository；本輪沒有歷史改寫。

[EC1／EC2 環境核對](../security/evidence/docker-prep-20261017/EC1_EC2_Environment_Review.json) 確認原工具與紀錄指向 localhost，兩帳號有本機 Server ID。**無法確認僅存在本機**，因缺少 Railway DB 搬移／部署設定證據；未操作帳號、API 或 DB。後續遠端驗證用新帳號及新隨機密碼，不重用舊帳號。

## 4. 驗證結果

| 驗證 | 實際結果 |
| --- | --- |
| `npm run lint`，最終來源 | PASS |
| `npm run typecheck`，最終來源 | PASS |
| `npm run build` | 初次 PASS；最終來源本機重建曾遇 Windows `.output/server/node_modules/@vue/shared` EPERM，保留錯誤；停止本輪 Node 程序並於可寫入環境重跑後 PASS |
| `npm run test:unit -- tests/unit/production-api-url.spec.ts tests/unit/api-client.spec.ts tests/unit/f3-auth.spec.ts` | 最終 3 files／106 tests PASS |
| 官方 image tag | 實際 pull／resolve `node:24.21.0-bookworm-slim` PASS；base digest 記於執行摘要／build log |
| Docker Linux fresh `npm ci --include=dev` | PASS，983 packages added；沒有變更 lockfile |
| 實際 Docker build | PASS；最終 image ID 記於 Docker probe 證據 |
| 實際 Docker run | PASS；Node v24.21.0、npm 11.19.0、uid 1000、`/app` 僅 `.output`、正式入口可用 |
| Docker runtime／HTTP cases | PASS：缺值與 loopback 拒絕啟動；同 image 兩組不同 API URL，各 48 checks；合計 98 checks |
| Docker 首頁／靜態資源／深層 URL | PASS，四種 shell URL 各兩次直接 HTTP 請求、CSS／JS／favicon；使用自訂 PORT=4320，HOST=0.0.0.0 |
| 原生 Node 產物補充 probe | PASS，94 checks；與 Docker 結果分列，不代稱容器測試 |
| 實際 Browser | PASS（CSR／路由／DOM 公開組態範圍）：Docker 登入頁載入、統計深層 URL 直接開啟與 reload 保留路由、第二容器首頁／公開 API B 覆寫；無真實後端登入 |
| 真實 Railway API／Cookie／CORS | NOT RUN；本輪使用合成 API URL，沒有新建遠端帳號 |
| 正式 AI／人工驗收 | NOT RUN；既有 F10 結論與 accepted 維持 |

最初 sandbox Docker build 分別遇 buildx lock 與 daemon Access denied、manifest inspect 遇 registry DNS 限制；原生 HTTP probe 遇 EACCES，IAB 連 sandbox Node timeout。已保留首敗；在已授權允許 daemon／loopback 的環境重跑 Docker build／run 成功，沒有變更系統安全設定或以靜態檢查代替實際 build。

Browser 以合成、不可達 API URL 檢查部署組態，頁面顯示「身分未知／載入失敗」屬預期；這不表示真實登入成功。Browser evaluate 的 resource timing API 不可用，未將它記為 network request origin 的直接證據；已核對 DOM 中序列化的 API URL 與現有 `useRuntimeConfig().public.apiBaseUrl` 讀取程式。

Docker fresh install 回報既有 **15 項 audit findings（1 low／12 high／2 critical）**，與 F10 `raw/E06-audit.json` 計數相同。未升級／自動修復依賴，原 F10 audit 待處理決議保留；不能把安裝／build PASS 解讀為無弱點或可免除後續風險決策。

本輪兩個無 volume 測試容器已核對專屬 label 後停止並由 `--rm` 移除；未處理其他容器／DB，image 留本機供查閱，清理結果見 `Container_Cleanup.json`。

原件、初敗、最終 logs／probes 與本輪去敏工具見 [執行證據目錄](../security/evidence/docker-prep-20261017/)；完整可重跑的本機工具副本為 `.mjs.txt`，不是產品程式或正式驗收測試。輸出採去敏資料，原始私密測資不在伴檔。

本輪新收集的 execution log 原件保留於 ignored `output/docker-prep-20261017/`；追蹤副本只統一 LF、移除行尾空白與多餘 EOF 空行，結果／錯誤文字不改，雙 SHA-256 對照見 `Log_Copy_Provenance.json`。首次 staging 曾因 sandbox 無法寫入 `.git/index.lock` 受限；當時對原 index 的未通過檢查保留於 `execution/Safety_Review_Before_Staging.json`，最終以核准 staging 後的 Safety Review 為準。

## 5. Git 與交付前安全檢查

提交前檢查 staged diff、秘密模式／本機 18 個秘密值、S01 原件與去敏 bytes／blob、原測試結果完整性、lockfile／app 無變更及 `git diff --cached --check`；結果以 [Staged Safety Review](../security/evidence/docker-prep-20261017/Staged_Safety_Review.json) 為準。檢查紀錄不輸出秘密值。

本輪採單一目的本機提交；無 push／remote 建倉／Railway 網頁操作、無 force push／reset／歷史改寫。最終工作樹狀態及 commit SHA 隨集中交付訊息提供。

## 6. 仍需接手的事項

1. Cookie／Domain：建議同一 Owner 自有 registrable domain 的 HTTPS 子網域，維持現有 Lax／host-only／Secure Cookie 與 direct API 架構；設定精確 CORS origin。兩個不同 `*.up.railway.app` 是 cross-site，現有 Lax 不能直接用於跨站 fetch 登入。
2. 若選不同 Railway 預設網域，需要後端另案修改 Cookie／CSRF 方案，且 None／Secure 仍受第三方 Cookie 政策限制；本輪未擅改契約或新增 proxy。
3. Work 建立私有 GitHub repo、推送本提交、以 Dockerfile 建立 Railway 前端服務，設定實際 `NUXT_PUBLIC_API_BASE_URL`；真實 API URL／Domain 尚未提供給本輪。
4. 遠端驗證使用新建合成帳號與新密碼學隨機密碼；核對 Cookie 寫入／回送、CORS、登入／刷新／登出與深層路由，保留去敏證據。
5. 確認 EC1／EC2 的遠端資料來源邊界及既有 audit findings 的風險決議。這些缺口不因本輪 Docker PASS 而自動關閉。

停止點：Git 去敏與 Docker 實作／自測完成並本機提交，供 GitHub／Railway 接手；正式驗收結果照實保留，沒有宣告 Production 整合或整體 V1 accepted。
