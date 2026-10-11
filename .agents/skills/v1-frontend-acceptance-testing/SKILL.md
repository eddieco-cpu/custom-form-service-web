---
name: v1-frontend-acceptance-testing
description: Prepare or revise a named F0–F10 formal acceptance plan for the Custom Form Service V1 frontend, or execute its current Owner-approved plan when execution is authorized. Use for round-specific acceptance cases, evidence and AI/manual result recording; do not use it to turn development self-checks or code review into acceptance.
---

# V1 Frontend Acceptance Testing

## 定位與階段

從指定前端 repo／文件目錄讀取 `AGENTS.md`、總實作計畫的當輪與 §7／§7.1、相關規格、當輪實作計畫／開發報告、已存在的驗收文件與 code review 狀態。首次接手按 AGENTS 讀完整來源。本 Skill 安裝目錄不是業務 repo。

依 Owner 既有及當次授權區分「準備／修訂計畫」與「執行核准計畫」。計畫未核准時不執行正式案例；Owner 核准且明確要求執行時不重複索取授權。開發自測由 development Skill 處理。

## 準備或修訂計畫

1. 核對當輪 Scope、實際 code／前後端版本、前置輪次、code review、啟動方式、測資與 Browser 能力。無法驗證的進度標明來源；不虛構前置已完成。
2. 產出 `docs/test-plan/Fn_Acceptance_Test.md`。準備階段可列未具備的前置及 BLOCKED 條件；不要為了補前置而開始業務開發或執行案例。
3. 按 AGENTS 的分輪原則選擇必要驗證，依案例需要建立 Vitest／Playwright／fixture／必要 HTTP 範例等伴檔；不強制每輪使用 Playwright、附 `.http` 或安排人工案例。不為湊格式新增測試。準備伴檔不代表允許正式執行；不得用測試修改產品預期。
4. 明列以下資訊：
   - 計畫版本、來源、目標 Round／code 版本或待確認基準。
   - 啟動方式、Origins／非秘密組態、Browser 基準、測資建立／保留、尚缺的前置。
   - 範圍、案例 ID、目的、前置、操作、可觀察預期、驗證方式／證據。
   - 方法的選用理由與不適用層級的簡述；依待驗證行為判斷 Browser 需求，不只看有無新頁面。必要但前置未具備的驗證列阻塞，不能當成不適用省略。
   - 各案例的 AI 實際結果與人工結果分欄；初始均 NOT RUN，人工不適用時說明原因。
   - fixture／攔截與真實 API 的區別，何種前置缺失導致 BLOCKED，執行／人工／Owner 的交接點。
5. 對照規格與當輪風險核對涵蓋度、驗證方法是否足以證明預期，以及是否有多餘測試；交付本版計畫與必要伴檔供 review，停止在計畫準備完成。

使用可觀察結果驗證資料與流程：需要真實 Cookie／CORS、登入／路由、保存／讀回時使用 Browser＋真實 API。受控網路／timeout／競態可用攔截，但證據只代表前端處理。R10 不可用時，Statistics fixture 與真實串接分開，後者列 BLOCKED。F0 純 Alignment 不強制新增 Browser 正式驗收。

## 執行目前核准計畫

1. 核對核准版本、執行授權、實際 code／環境／來源是否仍適用。版本改變若影響案例，指出失效範圍，不能用舊核准掩蓋新的產品預期。
2. 依核准前置與啟動方式執行，在既有本機環境保留合成測資；不重建 DB、不直接 SQL 修改狀態。需要特殊測資時使用已同意安排，未具備則記 BLOCKED。
3. 逐案例記錄實際步驟、命令、PASS／FAIL／BLOCKED／NOT RUN 與必要證據；保留首次失敗。AI 未完成或人工未執行的項目不能填 PASS。
4. 可修正不改預期與產品行為的測試工具／環境小問題並記錄，重跑受影響案例。產品缺陷另交付發現與影響，依既有或新增修正授權處理；不能調低預期求 PASS。
5. 產出 `docs/test-results/Fn_Acceptance_Execution_Report.md`：計畫與實際版本、前置／測資、執行命令、逐案結果、首次失敗及重測、fixture／真實區別、人工待辦、Git 狀態與停止點。

保護 Cookie、Token、密碼與 Playwright storageState／trace 等秘密；使用合成資料，交付不含秘密的證據。驗證完成後按 AGENTS 與既有指示提交計畫／測試／報告，避免混入業務修正或無關變更。

交付結果後等待人工驗收及 Owner 決議。只有 Owner 明確確認才更新 Round accepted；不要自行開始下一輪，也不要將未完成的真實 API 驗收以 fixture PASS 替代。
