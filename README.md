# 自建表單設計服務 — V1 前端規格與實作計畫

文件包版本：1.3。日期：2026-10-10。狀態：前端規格與總實作計畫已通過 Owner review；本次依 Owner 指示補分輪測試選擇原則，AGENTS／Skills 仍待 Owner review。

本組文件整合前端已定案內容，並採用後端 2026-10-10 的 Statistics v1.1 修訂內容。02／06 維持 v1.1，其他規格維持 v1.0；總實作計畫 v1.3 補測試選擇原則，AGENTS 為 v1.1。Round 分工不變。可放入未來獨立前端 repo，作為各 Round 實作計畫的來源。

目前進度（2026-10-11）：Owner 已確認 **F0 accepted**，見 [F0 Alignment Report](docs/implementation/F0_Alignment_Report.md) 與 [總計畫 §9.2](docs/implementation/V1_Frontend_Implementation_Plan.md#92-f0-owner-確認與有限收尾2026-10-11)。工程方向已確認；版本表為候選安裝基準，F1 實測相容性，F2 保留精確數值可行性 gate。本次只授權 F0 文件收尾／提交及 F1 規劃，未初始化或安裝。

後端狀態仍引用唯讀快照 2026-10-11／`7591633137c5a6f57c1fce8e1ba19ab394015880`：R10 accepted、R11 結果待 Owner 確認；本次沒有較新的後端 Owner 確認來源或重跑驗收。下文 §4 保留 2026-10-10 文件包的歷史接續說明，目前輪次依總計畫最新進度。

## 1. 文件清單

| 順序 | 文件 | 內容 |
| --- | --- | --- |
| 00 | [Frontend Overview](docs/specs/00-v1-frontend-overview.md) | 範圍、契約基準、暫緩／排除與決議索引 |
| 01 | [Pages、Routing、Access](docs/specs/01-pages-routing-and-access.md) | 各頁內容、URL、Header、身分／狀態路由矩陣 |
| 02 | [Editor、Lifecycle](docs/specs/02-form-editor-and-lifecycle.md) | 建立／保存／發布、設定、題型、Delta、拖曳、預覽、管理操作 |
| 03 | [Response、Statistics](docs/specs/03-response-and-statistics.md) | 空白初始、single／multiple、Latest、Stars／Range、統計頁 |
| 04 | [Auth、State、Errors](docs/specs/04-auth-state-and-error-handling.md) | 完整 D-12、登入返回、停用、dirty、錯誤及結果不明 |
| 05 | [UI、Interaction](docs/specs/05-ui-and-interaction.md) | Nuxt UI、版型／手機、時間、驗證、Dialog 與文案 |
| 06 | [Technical Architecture](docs/specs/06-technical-architecture.md) | Node／npm、資料層、API client、精度、結構與必要驗證 |
| 07 | [API Integration Map](docs/specs/07-api-integration-map.md) | 18 Endpoint 範疇、實際使用時機、DTO、payload／錯誤對照 |

另含 [前端總實作計畫](docs/implementation/V1_Frontend_Implementation_Plan.md)，定義 F0～F10、依賴、驗證與停止點；各 Round 的「計畫提醒」與 §7.1 是 Codex 提出當輪計畫時需明確的工程項目。

[初版文件核對與版本銜接報告](docs/review/Frontend_Specification_Review_Report_20261010.md) 保留當時交付與檢查結果；本次 v1.1 的局部回補核對範圍見總計畫 §10。

本次新增協作文件：

| 文件 | 責任 |
| --- | --- |
| [AGENTS.md](AGENTS.md) | 共用來源、授權、停止點、Git／測資、驗證與回報 |
| [Round Development Skill](.agents/skills/v1-frontend-round-development/SKILL.md) | F0 Alignment、當輪具體計畫、授權開發／修正與自測報告 |
| [Acceptance Testing Skill](.agents/skills/v1-frontend-acceptance-testing/SKILL.md) | 正式驗收計畫、Browser／fixture／人工、執行結果與證據 |
| [協作文件核對報告](docs/review/Frontend_Workflow_Document_Review_20261010.md) | 本次格式、來源、階段邊界與隔離情境檢查 |

兩個 Skill 各含 `agents/openai.yaml`，採明確呼叫，避免影響其他專案。完整包保留 `.agents/skills` 路徑，可原樣放入未來前端 repo；Skill 讀取該 repo 的 AGENTS／docs，不將自己的安裝目錄當成業務 repo。

## 2. 建議 review 順序

先看 00 的範圍與契約基準，再看 01～03 的頁面／核心操作；接著確認 04 的 D-12 與錯誤流程，最後核對 05～07 的 UI、工程與 API 對接。

重點：新建第一次只有保存；既有 Visibility 即時更新；single／multiple 重新進頁都空白；Latest 必須主動呼叫；public Statistics 不被 Header me 阻擋；寫入結果不明採簡化手動核對。

這組文件取代 2026-10-09 暫存文件中已被後續決議取代的提案；不要把舊「待確認」清單與本組當成兩套平行規格。

## 3. 工程提醒與本次回補位置

| 位置 | 內容 |
| --- | --- |
| 總計畫各 Round／§7.1 | 9 項工程提醒的完成時點與當輪計畫需交付的設計／驗證；逐輪明確 |
| 02 §6.1 | 既有省略 variant 的呈現、原始 config、dirty／Delta；與新建初值分開 |
| 06 §7 | Email validator 相容策略；F0 核對，F3 接入驗證 |
| AGENTS 驗證章節／兩個 Skills／總計畫 §8.1 | 依每輪交付與風險選用測試；計畫交代方法及理由，不適用層級可省略，必要但受阻的驗證另列 |

## 4. 接續工作

1. 前端產品規格已確認；本次局部回補依 Owner 指示完成。
2. 總實作計畫已核准；具體工程設計在指定 Round 的實作計畫提出。
3. Review 本次 AGENTS.md 及兩個 Skills 的責任與階段邊界。
4. 確認前端工作目錄及可讀的後端來源，指定 F0 Alignment；F1 才依核准工程決議初始化獨立 repo。
5. 逐 Round 採計畫、review、開發、自測／code review、正式測試計畫、review、測試、Owner 決議。

F0～F10 仍為 not started；本次沒有初始化 Nuxt、套件安裝、前端 build、live API 或正式 Browser 驗收。

本次文件核對不是程式測試或 Browser Cookie／CORS 執行證據。已讀基準的 R10 尚未實作；最新進度與真正串接統計以當時後端 repo／可用 Endpoint 版本為準。
