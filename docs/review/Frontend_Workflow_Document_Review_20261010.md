# 前端協作文件核對與交接紀錄

版本／日期：1.1／2026-10-10。本版於 §6 記錄 Owner 指定的分輪測試選擇回補；§1～§5 保留初版紀錄。此報告不是 F0～F10 的開發、自測或正式驗收結果。

## 1. 本次範圍與核准紀錄

Owner 已明確表示 Frontend Implementation Plan「我沒問題」，記錄總計畫 v1.1 通過 Owner review。總計畫 v1.2 僅更新核准紀錄、AGENTS／Skills 初版交付狀態與下一步；Round 分工與工程提醒不變。

本次新增 `AGENTS.md` 與 `.agents/skills` 中的 development／acceptance Skills，各 Skill 含 `SKILL.md` 及 `agents/openai.yaml`。三份協作規範為初版，待 Owner review。前端規格 00～07 的內容未修改；02／06 維持 v1.1，其餘 v1.0。

| 文件 | 已核對的責任 |
| --- | --- |
| AGENTS | 來源、既有授權、階段／停止點、Git／測資、驗證與回報共用規則 |
| Development Skill | F0 Alignment、當輪計畫、授權開發與修正、自測／開發報告 |
| Acceptance Skill | 正式計畫準備、review 後執行、Browser／fixture／人工與證據 |
| 總計畫／README | 核准狀態、相對路徑、初版協作文件及接續順序 |

## 2. 文件與格式核對

| 檢查 | 實際結果 |
| --- | --- |
| 兩個 Skills 執行 `quick_validate.py` | PASS；名稱與 frontmatter 格式有效 |
| UI metadata | PASS；描述長度、明確 Skill 名稱、`allow_implicit_invocation=false` |
| Skill 原件與文件包副本逐位元組比對 | PASS；兩個 SKILL.md 與兩個 metadata 一致 |
| 文件相對連結、最終換行、控制字元 | PASS；本版新增／更新文件與整包核對 |
| 核准／進度／責任核對 | PASS；總計畫已核准、協作文件待 review、F0～F10 not started |
| 業務語意 | 以原規格引用為主；沒有新增 API、產品功能、數值策略或版本選型 |

格式 PASS 只代表檔案可讀及基本 metadata 有效，不保證所有未來開發任務均能正確執行。

## 3. 隔離情境核對

依 Skill 建立流程，以新工作情境及文件副本分別準備計畫；沒有把預期答案提供給執行者。兩份產出保留在隔離目錄，沒有放入正式文件包，不能當成 Owner 指定或核准的 F3／F9 計畫。

| 情境 | 觀察到的產出／結果 |
| --- | --- |
| 僅要求 F3 實作計畫；前端尚未初始化、後端未啟動 | 產出文件計畫，列 F0～F2、後端版本／R4／測資前置；實際驗證 NOT RUN，真實整合受阻；未初始化、發 API、安裝或開發 |
| 僅要求 F9 驗收計畫；前端尚未初始化、R10 不可用 | 產出 14 案，分 8 fixture／6 真實 API；AI／人工均 NOT RUN，明列 R10 整合阻塞；未執行驗收或改 accepted |
| 產出與目錄檢查 | PASS；計畫連結有效、依賴與未執行狀態明確，未建立 app、package／lockfile、node_modules 或執行報告 |

本次只核對這兩種「準備計畫」情境；未測試真實開發、正式驗收執行、Browser 或後端行為，也不以此推定 F3／F9 已 ready。

## 4. 初版 Skills 保存與限制

兩個 Skills 已完成本地單一目的提交，Git 剩餘狀態為 clean。同步返回 HTTP 422；另以唯讀方式核對遠端，尚未包含本次提交，故不宣稱已安裝／同步成功。本次完整下載包仍含兩個可放入未來前端 repo 的 Skill 目錄。

Skills 提交：development `77c190d`、acceptance `8d60a8c`。這些是協作 Skills 的提交，不是前端業務 repo 的開發版本。

## 5. 接續與停止點

1. Owner review 本版 AGENTS／兩個 Skills 的責任及階段邊界。
2. 確認前端工作目錄及可讀的後端來源後，指定 F0 Alignment 與工程決議。
3. F1 才依核准 F0 決議初始化前端工程；各輪依總計畫的 review／實作／驗收授權執行。

前端業務 repo 仍未初始化；F0～F10 全部 not started。npm install／build／unit、live API、正式 Browser／AI／人工驗收均未執行。

## 6. v1.1 — 分輪測試選擇回補

Owner 本次明確要求更新 Skills 與 AGENTS。AGENTS v1.1 保存共用原則；development Skill 要求當輪實作計畫說明必要自測的選用理由，acceptance Skill 要求正式計畫選擇必要方法與伴檔。總計畫 v1.3 的 §8.1 與 README／完整包同步。

- 依交付、受影響行為與風險選擇，不強制每輪全部使用 Vitest、Playwright 或人工驗證。
- 計畫交代方法、驗證目標、選用理由；不適用層級可省略並簡述原因，不為湊格式建立測試或伴檔。
- Browser 需求依行為判斷；沒有新頁面不代表 Cookie／CORS、導航、beforeunload 無需驗證。
- 總計畫當輪的必要檢查仍適用；缺前置的必要驗證記 BLOCKED／NOT RUN，不改列不適用。

實際核對：兩個 Skills 的 quick_validate、metadata／副本一致性、Markdown 連結／格式、產品規格未變與 F0～F10 進度未變均 PASS。這次局部修訂沒有重跑 §3 的隔離情境，也沒有執行前端程式或 Browser 測試。

本版協作 Skills 本地提交 `80b7d4a`，Git clean；同步仍返回 HTTP 422，沒有宣稱安裝／同步成功。完整包中的 repo-local Skills 已更新，可用於未來前端 repo。
