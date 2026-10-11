export const formId = '11111111-1111-4111-8111-111111111111'
export const questionId = '22222222-2222-4222-8222-222222222222'
export const optionId = '33333333-3333-4333-8333-333333333333'
export const instant = '2026-10-10T10:30:00.1234567Z'
export const longDecimal = '0.123456789012345678901234567890123456789'
export const bigInteger = '9007199254740993'
export const formText = (token = longDecimal) => `{"id":"${formId}","userId":"${formId}","creatorDisplayName":"合成建立者","title":"F2 fixture","description":null,"status":"draft","responseMode":"single","responseIdentity":"anonymous","resultVisibility":"owner_only","submissionDeadlineAt":"${instant}","questions":[{"id":"${questionId}","type":"number","title":"精確值","description":null,"required":false,"sortOrder":7,"config":{"min":${token}},"options":[]}],"createdAt":"${instant}","updatedAt":"${instant}"}`
export const receiptText = (token = longDecimal) => `{"id":"${optionId}","formId":"${formId}","submittedAt":"${instant}","answers":[{"questionId":"${questionId}","value":${token}}]}`
export const statisticsText = (token = longDecimal, respondents = '') => `{"formId":"${formId}","title":"F2 fixture","description":null,"creatorDisplayName":"合成建立者","responseMode":"multiple","resultVisibility":"public","submissionDeadlineAt":null,"count":1,"questions":[{"questionId":"${questionId}","title":"精確值","description":null,"type":"number","count":1,"statistics":[{"value":${token},"count":1${respondents}}]}]}`
export const errorText = (code = 'VALIDATION_ERROR') => `{"error":{"code":"${code}","message":"Synthetic error","details":[{"path":"questions[0].config.min","code":"INVALID_QUESTION_CONFIG","message":"合成欄位錯誤"},{"path":"unmapped","code":"INVALID_VALUE","message":"保留未知位置"}]}}`
