# F3 獨立 Code Review

日期：2026-10-12（Asia/Taipei）。審查 `b9f052a41165fb7a7552f0dc827f85f97bc887ec`，基準 `3987c388d1fc6690315c5244dfe10bf00554c724`；42 檔 diff。接手工作樹乾淨。**有兩項 P2 產品缺陷與一項 P3 驗證缺口；建議修正、局部複核後再通過 F3 review。**

依核准 F3 計畫 v1.0、總計畫 v1.3 F3／§7／§7.1、前端 00～07（02／06 v1.1，其餘 v1.0）、兩份 F3 交付報告及實際程式／測試審查。後端契約讀本 repo 唯讀 `backend-ref/`：來源 `7591633137c5a6f57c1fce8e1ba19ab394015880`，重點為 03a §5、03b §3.1／§4.1～4.3／§5、04 Errors、05 Constraints §4；manifest 108／108 相符。這不是 live 後端 SHA。

## Findings

### F3-R1 [P2] 切換 User 後仍使用舊 Profile operation key，下一次未知寫入可繞過核對

位置：[profile.vue:24](../../app/pages/profile.vue#L24)～25。`profileKey` 在掛載時固定；核對採用不同 User 或 PATCH 回不同 User 推進 session revision 後，operation 仍使用舊 key。

實際重現：A 的 PATCH 500 → GET me 回 B → 確認採用 B（當次基準與解鎖正常）→ B 再 PATCH 500 → 確認離頁到首頁 → SPA 回 Profile。沒有第三次 GET me，核對提示／按鈕卻消失；改姓名後可送第三次 PATCH。觀察 **me=2、PATCH=3**，後兩次寫入間沒有可靠重讀。重掛頁面使用新 revision 的 key，讀不到記在舊 key 的 unknown gate。

違反前端 04 §7／§11 與 F3 計畫 §3 的「重讀並採用基準後才解除限制」。B16 只驗當次採用後保存可用，漏了下一次未知結果與離頁重掛。修正時須一起處理當次 reconcile 的採用順序及後續 operation 所屬 session，不能讓切 key 提前解除未核對限制。

**判斷：阻擋 F3 review 通過；建議先修復再接續依賴 session／Profile 限制的開發。F4 純讀取工作本身沒有技術硬阻塞。**

### F3-R2 [P2] 新接入的操作 Dialog 關閉後未恢復觸發控制焦點

位置：[profile.vue:89](../../app/pages/profile.vue#L89) 的程式控制 Dialog；登入頁／Header 使用相同接法。共用 `ActionErrorDialog` 的 UModal 沒有 trigger slot，也沒有 caller 提供的焦點恢復流程；F3 新增的產品接入未補上此責任。

built Profile：修改姓名 → 合成 PATCH 回 AUTH_USER_DISABLED → 分別用底部「關閉」及 × 關閉。兩次均觀察 **Dialog=0、保存仍 enabled、activeElement=BODY、輸入保留**，未回保存按鈕。鍵盤使用者失去原操作位置；不符合前端 05 §7／§10。需在留原頁的關閉／dirty 取消路徑恢復適當控制；若已導航或原控制不可用，應選新畫面的合理焦點。

**判斷：需在 F3 修正並複核；不硬阻擋可隔離的 F4 列表／API 讀取，但後續採用同一操作 Dialog 前應修復。**

### N1 [P3] 新 smoke 未完整接替必要 Feedback 覆蓋

位置：[foundation-smoke.spec.ts:26](../../tests/e2e/foundation-smoke.spec.ts#L26)～37。保留 CSR、config、Header icon、寬度與手機 nav，但移除了 Toast／Dialog 開關、Dialog 焦點回復、其圖示尺寸／mask，以及從載入到 Feedback 關閉的外部／icon API 請求斷言。F3 行為案例驗證 Dialog 內容與分流，沒有接替這些 built 檢查；不能由它們宣稱 F1 計畫 §4.2／§5 的必要覆蓋已保留。

本次額外 built probe 確認 Dialog close／Toast close icon 都是本地 SVG、20×20；Toast 成功呈現，該成功操作只有被攔截 PATCH，沒有額外外部／icon 請求。但焦點項已實際 FAIL，且這些 probe 尚未成為持續測試。

**判斷：不阻擋 F4 獨立開發；需補回適用的產品 Feedback 回歸覆蓋，不能把舊 F1 smoke PASS 當新版覆蓋。**

## 獨立驗證與證據適用性

[去敏證據](evidence/F3_Independent_Verification_20261012.json) 包含版本、案例、原件 hash 與界線；本次 raw 留在 ignored `output/playwright/f3-review/`。沒有修改產品、測試、依賴、正式規格或進度，沒有提交／推送。

| 本次實際檢查 | 結果與界線 |
| --- | --- |
| `npm run lint`、`npm run typecheck`、`npm run build` | 全部 PASS；Node 24.21.0／npm 11.19.0；strict Nuxt＋tools |
| 原 F3／API／scope unit | **94／94 PASS**；直接 import 產品 AuthSession、input／redirect、API／scope 程式 |
| 原 F3 Browser B01～B16 | **同一次 22／22 PASS**；fixture srcDir 指向產品 app，公開 harness 只有合成 loader；含最後修正影響的 B09×4／B13／B15／B16 |
| 最終 built CSR smoke | **1／1 PASS**；合成 Auth；Chromium 156.0.8078.4 |
| 真實無效 Cookie | **PASS**；隔離 Chrome 156.0.8078.12，無 API 攔截的 GET me 回 401 AUTH_TOKEN_INVALID；ACAO／ACAC 正確，完整返回 `/profile?from=invalid#name`；SPA 點我的表單返回 `/forms`，me 仍 1 次 |
| R1／R2 補驗 | **FAIL，產品缺陷**；built 產品、全 API 攔截，不作 DB 寫入；不是後端整合證據 |
| 歷史交付原件 | **19／19 hash 相符**，原逐案結果可追溯；新完整 22 案覆蓋最後 Profile 核對修改，未抹去歷史失敗 |

初始化 Promise 去重／settled null、auth／guest、合法返回、同 User PATCH 的資料世代、晚 me 不蓋 Login／Logout／PATCH、離頁晚回、Auth 401 Dialog → dirty、停用保留、Header 登出取消零 POST／成功單次 permit，未發現本次額外缺陷。Profile raw／normalized／成功基準及 no-op 正常；不同 User 核對的**當次採用顺序正確，後續限制有 R1**。

## 未驗證事項與停止點

live health／ready／OpenAPI 本次均 200，metadata OpenAPI 3.1.1／API 1.0.0；live Git SHA／process 來源仍未確認。真實註冊／Login／PATCH／Cookie flags／刷新讀回與特殊 Email 沿用已核對歷史證據，**本次沒有重跑，不能寫成本次 live PASS**。

- 真實 disabled 正確帳密／既有 Cookie 後停用、AUTH_TOKEN_EXPIRED：BLOCKED，缺受控前置；無效 Cookie 這一項已由上述純讀取補驗解除。這些前置缺口不阻擋 F4 獨立開發，但相關真實整合／正式驗收仍待補。
- 真實 Server commit 故障結果、其他瀏覽器、人工實機、正式 AI／人工驗收：NOT RUN；不阻擋授權範圍內後續獨立工程，不可據此 accepted。
- live SHA／歷史執行與最終 commit 未附程式快照 hash：保留追溯限制；本次在指定 commit 的 fresh 檢查補足前端相關案例，不把快照 SHA 冒稱 live SHA。

自動核准審核拒絕了真實正常流程重跑，理由是既有測試會透過 API 建立／修改帳號，屬 DB 寫入，與本次「不修改 DB」限制衝突。該命令未執行，未繞過；改以歷史原件核對、真實純 GET 無效 Cookie及攔截式補驗完成 review。Vitest 的 sandbox spawn EPERM 經自動審核允許後重跑通過；沒有把啟動失敗列成產品 FAIL。

交付僅新增本報告與去敏證據，HEAD 不變、未提交；**F3 獨立 review 完成、待 Owner 集中確認**。不自行 accepted、不開始 F4；正式驗收仍延後。
