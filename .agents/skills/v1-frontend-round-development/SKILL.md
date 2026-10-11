---
name: v1-frontend-round-development
description: Prepare F0 alignment or a named F0–F10 implementation plan for the Custom Form Service V1 frontend, develop an Owner-authorized round, or complete authorized current-round review fixes. Use for this project's round development workflow; formal acceptance preparation and execution belong to v1-frontend-acceptance-testing.
---

# V1 Frontend Round Development

## 定位與階段

從使用者指定的前端 repo／文件目錄讀取 `AGENTS.md`、`docs/implementation/V1_Frontend_Implementation_Plan.md` 與相關 `docs/specs`。首次接手按 AGENTS 讀完整來源；後續至少重讀當輪、§7／§7.1 與受影響規格。不要將本 Skill 的安裝目錄當成業務 repo；位置不明時先取得可讀來源。

依既有及本次授權判定：計畫、F0 Alignment、開發或當輪修正。遵守 AGENTS 的階段與資料／Git 規則；不自動準備正式驗收或開始下一輪。前置尚未完成仍可準備計畫，明列阻塞，不能推定已完成或開始實作。

## 準備當輪計畫

1. 核對實際 Git／專案狀態、相關來源版本、前置輪次與後端可用狀態。區分 Owner 提供的歷史進度、已讀契約及本次觀察；沒有 repo 不假造 SHA。
2. 將當輪範圍對應總計畫；回答 §7.1 的相關工程提醒。具體描述 adapter／model／狀態轉移／loading／錯誤映射等本輪方案，給代表性案例，避免重抄產品規格。
3. 產出 `docs/implementation/Fn_Implementation_Plan.md`，至少包含：
   - 目標、範圍與相關規格章節／版本。
   - 前置依賴、已確認與待確認事項、受阻工作。
   - 預計檔案與具體工程設計；重要取捨及對外行為。
   - 依 AGENTS 分輪原則選擇必要驗證：方法、目標、選用及不適用層級的理由；測資、fixture／真實 API 與預期證據。
   - 交付、完成判準、目前授權與停止點。
4. 交付計畫，按 AGENTS 等待當輪方案核准及開發指令。計畫準備不初始化 Nuxt、安裝業務依賴或改 app code；必要一次性工程 probe 只在已授權範圍進行並明列結果。

F0 改產出 `docs/implementation/F0_Alignment_Report.md`。按總計畫 F0 核對來源、18 Endpoint、官方版本／相容性、精確數值／時間／Unicode／Email 策略、timeout 與驗證基準。區分建議與已執行證據，保留 Node `24.21.0` 的指定值；不能宣稱不存在的 lockfile／安裝已驗證。F0 交付工程決議供 review，不開發業務功能。

## 執行已授權開發

1. 讀取目前核准的當輪計畫與既有授權；只實作該範圍。發現契約衝突時按 AGENTS 暫停受影響部分，繼續可獨立完成的工作。
2. 依總計畫次序完成共用資料語意及必要驗證，再接 UI。使用當輪已核准的型別、parser、基準／Delta 與狀態方案；不要以介面初值回填既有原始資料或默默改契約。
3. 完成核准當輪計畫及總計畫要求的必要檢查，依交付與風險選用 lint／typecheck／build、unit、Browser 或人工自測，不機械式跑所有層級。依待驗證行為判斷 Browser 需求，不只看有無新頁面；標明真實 API 或模擬。按測試內容保護合成測資與敏感證據。自測不需正式驗收計畫核准。
4. 檢查 diff 與 Git 狀態；按 AGENTS 與既有指示提交本輪已驗證變更。
5. 產出 `docs/implementation/Fn_Development_Report.md`：變更及原因、來源／前後端版本、實際命令與結果、主要證據、缺口、SHA／Git 狀態、停止點。沒有執行的檢查記 NOT RUN；依賴不可用記 BLOCKED。

交付後停在開發完成／待 code review 或後續指令，不把自測當成正式驗收或 Round accepted。

## 當輪 review 修正

僅要求 review 時交付發現；要求修正時完成授權範圍，重跑受影響檢查並更新開發報告。不要無關重構、擴增下一輪功能或自動建立正式驗收文件。

修正影響已存在的驗收計畫／結果時列出失效範圍，保留原始失敗及歷史結果；後續正式驗收依另一 Skill 與 Owner 授權處理。
