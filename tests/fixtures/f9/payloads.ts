import type { StatisticsDto } from '../../../app/domain/api/statistics'
import { ExactNumber } from '../../../app/utils/exact-number'
import { uuid } from '../f5/payloads'
export { uuid } from '../f5/payloads'

export const respondents = [{ id: uuid(71), displayName: '同名合成' }, { id: uuid(72), displayName: '同名合成' }] as const
export function statistics(identified = false, zero = false): StatisticsDto {
  const count = zero ? 0 : 2
  const people = (indices: number[]) => identified ? { respondents: zero ? [] : indices.map(i => respondents[i]!) } : {}
  const common = { description: null, count }
  return {
    formId: uuid(50), title: 'F9 合成統計', description: '根說明\n第二行', creatorDisplayName: '合成建立者',
    responseMode: 'multiple', resultVisibility: 'public', submissionDeadlineAt: '2026-12-31T10:30:00.1234567Z', count,
    questions: [
      { ...common, questionId: uuid(1), title: '文字題', type: 'text', statistics: zero ? [] : [
        { value: '<script>window.fake = 1</script>\nCase', count: 1, ...people([0]) }, { value: 'case', count: 1, ...people([1]) },
      ] },
      { ...common, questionId: uuid(2), title: '數字題', type: 'number', statistics: zero ? [] : [
        { value: ExactNumber.from('9007199254740992'), count: 1, ...people([0]) }, { value: ExactNumber.from('9007199254740993'), count: 1, ...people([1]) },
      ] },
      { ...common, questionId: uuid(3), title: '單選題', type: 'single_choice', statistics: [
        { optionId: uuid(11), label: '同標籤', value: 'business-a', count, ...people([0, 1]) },
        { optionId: uuid(12), label: '同標籤', value: 'business-b', count: 0, ...people([]) },
      ] },
      { ...common, questionId: uuid(4), title: '多選題', type: 'multiple_choice', statistics: [
        { optionId: uuid(13), label: '多選甲', value: 'business-c', count, ...people([0, 1]) },
        { optionId: uuid(14), label: '多選乙', value: 'business-d', count, ...people([0, 1]) },
      ] },
      { ...common, questionId: uuid(5), title: '評分題', type: 'rating', statistics: [
        { value: 0, count, ...people([0, 1]) }, { value: 1, count: 0, ...people([]) }, { value: 2, count: 0, ...people([]) },
      ] },
    ],
  }
}
export const longText = `${'長😀'.repeat(495)}\n${'文'.repeat(1009)}` // 2000 Code Points, including newline.
export function largeStatistics(): StatisticsDto {
  const dto = statistics(true)
  return { ...dto, count: 200, description: longText, questions: Array.from({ length: 30 }, (_, index) => {
    const base = { questionId: uuid(100 + index), title: `大量題目 ${index + 1}`, description: null }
    if (index === 1) return { ...base, type: 'rating' as const, count: 0, statistics: Array.from({ length: 101 }, (_, value) => ({ value, count: 0, respondents: [] })) }
    if (index === 2) return { ...base, type: 'text' as const, count: 120, statistics: [{ value: longText, count: 120, respondents: Array.from({ length: 120 }, (_, i) => ({ id: uuid(1000 + i), displayName: i < 2 ? '同名合成' : `完整姓名 ${i + 1} ${'長名'.repeat(20)}` })) }] }
    return { ...base, type: 'text' as const, count: index === 0 ? 200 : 0, statistics: index === 0 ? Array.from({ length: 200 }, (_, i) => ({ value: `完整答案 ${String(i + 1).padStart(3, '0')}`, count: 1, respondents: [{ id: uuid(2000 + i), displayName: `合成 ${i + 1}` }] })) : [] }
  }) }
}
