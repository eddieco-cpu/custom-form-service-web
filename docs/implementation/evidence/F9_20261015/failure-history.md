# 首敗與修正重測

| 階段 | 首次結果 | 修正／實際重測 |
| --- | --- | --- |
| Vitest import | 6 files ENOENT，1 file／5 tests PASS；未執行的測試不能列產品 FAIL／PASS | TEMP／TMP 指向 repo ignored tmp；7 files／185 PASS。最終逐案 reporter 同為185 PASS。 |
| strict／lint | mock fetch tuple／unknown label／client plugin autoimport scope 型別錯誤；fixture import 順序 | typed mock、明確字串、plugin 獨立 strict app scope／共享 harness Window 型別；tools strict、harness strict、lint 均 PASS。 |
| Browser 啟動 | built-initial、built-ipv4-retry 未進案例；沙箱 localhost socket EACCES，BLOCKED | 停止已核對的本次程序，正常本機網路權限重跑；preview IPv4 binding，Origin 仍 localhost。 |
| F9 fixture 首輪 | 17 PASS／4 FAIL／5 alternate-build skipped；Email required marker 的 exact role locator，redirect 合法 `/forms` 與 `%2Fforms` 字串斷言 | 正確 label 與 URL；重測7 PASS（4修正＋2新壞Cookie＋1既有timeout）。產品獨立23案最終全PASS；harness另8 PASS。 |
| F3 回歸 | 23 PASS／1 FAIL；F3舊fixture沒有F4清單GET | 精確補 GET `/api/v1/forms` 空清單 mock；既有登入返回／me次數斷言維持，單案PASS。 |
| live-initial | L01 24格＋登入返回PASS；L02在 `2030-12-31T10:30:00.123456Z` 對 `2030-12-31T10:30:00.123456+00:00` 失敗；L03 NOT RUN | 按既有 datetime adapter 比較完整tick，保留原始Body；不截斷精度。instant-retest的固定答案／統計Body／UI通過。 |
| live-instant-retest | L02固定分案PASS；後續private讀回的「單GET」區段因前一獨立GET的遲到response event被算入而FAIL；L03 NOT RUN | 證據區段按 request 發送事件劃分，不依 response 完成時點。boundary-retest沿用首輪帳號／Closed L02／四份原始Response，L02兩案與L03十五案PASS。 |

真實組三份原始 JSON 及所有 API Body 都保留；Run 的日期、ID、前置與未跑項目不能被重測覆蓋。特殊 Cookie／停用／真實 Server 故障六案仍 BLOCKED。fixture 與真實結果分開，未降低統計、人數、精度、錯誤碼或隱私斷言。
