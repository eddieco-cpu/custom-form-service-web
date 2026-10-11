import type { ExactNumber } from '../../utils/exact-number'

export const formStatuses = ['draft', 'published', 'closed'] as const
export const responseModes = ['single', 'multiple'] as const
export const responseIdentities = ['anonymous', 'identified'] as const
export const resultVisibilities = ['owner_only', 'respondents', 'public'] as const
export const questionTypes = ['text', 'number', 'single_choice', 'multiple_choice', 'rating'] as const
export type FormStatus = typeof formStatuses[number]
export type ResponseMode = typeof responseModes[number]
export type ResponseIdentity = typeof responseIdentities[number]
export type ResultVisibility = typeof resultVisibilities[number]
export type QuestionType = typeof questionTypes[number]
export interface ConfigByType {
  text: { readonly variant?: 'input' | 'textarea'; readonly placeholder?: string; readonly minLength?: number; readonly maxLength?: number }
  number: { readonly placeholder?: string; readonly min?: ExactNumber; readonly max?: ExactNumber }
  single_choice: { readonly variant?: 'radio' | 'select' }
  multiple_choice: { readonly variant?: 'checkbox' | 'multi_select' }
  rating: { readonly variant?: 'stars' | 'range'; readonly min?: number; readonly max?: number }
}
export interface OptionDto { readonly id: string; readonly label: string; readonly value: string; readonly sortOrder: number }
export type QuestionDto = { [T in QuestionType]: {
  readonly id: string; readonly type: T; readonly title: string; readonly description: string | null
  readonly required: boolean; readonly sortOrder: number; readonly config: ConfigByType[T]; readonly options: readonly OptionDto[]
} }[QuestionType]
export interface FormDetailDto {
  readonly id: string; readonly userId: string; readonly creatorDisplayName: string; readonly title: string
  readonly description: string | null; readonly status: FormStatus; readonly responseMode: ResponseMode
  readonly responseIdentity: ResponseIdentity; readonly resultVisibility: ResultVisibility
  readonly submissionDeadlineAt: string | null; readonly questions: readonly QuestionDto[]
  readonly createdAt: string; readonly updatedAt: string
}
export type FormSummaryDto = Omit<FormDetailDto, 'userId' | 'creatorDisplayName' | 'description' | 'questions'> & { readonly count: number }
export interface SummaryPageDto { readonly items: readonly FormSummaryDto[]; readonly pagination: { readonly page: number; readonly pageSize: number; readonly totalItems: number; readonly totalPages: number } }
export interface VisibilityRequest { readonly resultVisibility: ResultVisibility }
