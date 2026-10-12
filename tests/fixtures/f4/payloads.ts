import type { FormDetailDto, FormStatus, FormSummaryDto } from '../../../app/domain/api/form'
export const owner = { id: '11111111-1111-4111-8111-111111111111', email: 'f4-fixture@example.test', displayName: '合成建立者', avatarUrl: null }
export const other = { ...owner, id: '22222222-2222-4222-8222-222222222222', displayName: '另一位合成使用者' }
export const ids = { draft: '44444444-4444-4444-8444-444444444444', published: '55555555-5555-4555-8555-555555555555', closed: '66666666-6666-4666-8666-666666666666' }
export function detail(status: FormStatus = 'published', id = ids[status]): FormDetailDto {
  return { id, userId: owner.id, creatorDisplayName: owner.displayName, title: `${status} 合成表單`, description: '第一行\n第二行', status,
    responseMode: 'multiple', responseIdentity: 'identified', resultVisibility: 'respondents', submissionDeadlineAt: null,
    questions: [], createdAt: '2026-10-10T01:02:03.1234567Z', updatedAt: '2026-10-11T02:03:04.7654321Z' }
}
export function summary(index: number, status: FormStatus = 'published'): FormSummaryDto {
  const { userId: _userId, creatorDisplayName: _creator, description: _description, questions: _questions, ...root } = detail(status, `77777777-7777-4777-8777-${String(index).padStart(12, '0')}`)
  return { ...root, title: `合成表單 ${index}`, count: index }
}
export const apiError = (code: string, path?: string) => ({ error: { code, message: '合成錯誤', ...(path ? { details: [{ path, code: 'INVALID_VALUE', message: '合成驗證明細' }] } : {}) } })
