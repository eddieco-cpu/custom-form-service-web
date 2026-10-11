import type { ExactNumber } from '../../utils/exact-number'
import type { QuestionType, ResponseMode, ResultVisibility } from './form'
export interface RespondentDto { readonly id: string; readonly displayName: string }
interface ItemBase { readonly count: number; readonly respondents?: readonly RespondentDto[] }
export interface ChoiceItemDto extends ItemBase { readonly optionId: string; readonly label: string; readonly value: string }
export interface ValueItemDto<T> extends ItemBase { readonly value: T }
export interface ItemByType { text: ValueItemDto<string>; number: ValueItemDto<ExactNumber>; rating: ValueItemDto<number>; single_choice: ChoiceItemDto; multiple_choice: ChoiceItemDto }
export type StatisticsQuestionDto = { [T in QuestionType]: {
  readonly questionId: string; readonly title: string; readonly description: string | null; readonly type: T
  readonly count: number; readonly statistics: readonly ItemByType[T][]
} }[QuestionType]
export interface StatisticsDto {
  readonly formId: string; readonly title: string; readonly description: string | null; readonly creatorDisplayName: string
  readonly responseMode: ResponseMode; readonly resultVisibility: ResultVisibility; readonly submissionDeadlineAt: string | null
  readonly count: number; readonly questions: readonly StatisticsQuestionDto[]
}
