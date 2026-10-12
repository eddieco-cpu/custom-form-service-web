import type { FormDetailDto, QuestionDto } from '../../../app/domain/api/form'
import { decodeFormDetail } from '../../../app/domain/api/decoders'
import { parseExactJson, stringifyExactJson } from '../../../app/utils/exact-json'
import { ExactNumber } from '../../../app/utils/exact-number'

export const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
export const Q = [uuid(1), uuid(2), uuid(3), uuid(4), uuid(5)]
export const O = [uuid(11), uuid(12), uuid(13), uuid(14)]
export function ids(start = 100): () => string { let n = start; return () => uuid(n++) }
export function form(questions?: readonly QuestionDto[]): FormDetailDto {
  const common = { title: '合成題目', description: null, required: false }
  const dto: FormDetailDto = { id: uuid(50), userId: uuid(51), creatorDisplayName: 'F5 合成建立者', title: 'F5 合成表單', description: '說明',
    status: 'draft', responseMode: 'single', responseIdentity: 'anonymous', resultVisibility: 'respondents',
    submissionDeadlineAt: '2026-12-31T10:30:00.1234567Z', createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-11T00:00:00Z',
    questions: questions ?? [
      { ...common, id: Q[0]!, type: 'text', sortOrder: 10, config: {}, options: [] },
      { ...common, id: Q[1]!, type: 'number', sortOrder: 30, config: { min: ExactNumber.from('0'), max: ExactNumber.from('9007199254740993.1234567890123456789') }, options: [] },
      { ...common, id: Q[2]!, type: 'single_choice', sortOrder: 50, config: { variant: 'radio' }, options: [
        { id: O[0]!, label: '既有甲', value: 'original_A', sortOrder: 10 }, { id: O[1]!, label: '既有乙', value: 'original_B', sortOrder: 30 },
      ] },
      { ...common, id: Q[3]!, type: 'multiple_choice', sortOrder: 70, config: {}, options: [
        { id: O[2]!, label: '既有甲', value: 'original_A', sortOrder: 10 }, { id: O[3]!, label: '既有乙', value: 'original_B', sortOrder: 30 },
      ] },
      { ...common, id: Q[4]!, type: 'rating', sortOrder: 90, config: { variant: 'range', min: 0, max: 5 }, options: [] },
    ] }
  // Exercise the actual lossless decoder boundary instead of a JSON.parse DTO copy.
  return decodeFormDetail(parseExactJson(stringifyExactJson(dto)))
}
export const errorDetail = (path: string) => ({ path, code: 'INVALID_VALUE', message: '合成明細' })
