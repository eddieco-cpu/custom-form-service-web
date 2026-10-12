import type { ConfigByType, FormDetailDto, QuestionType, ResponseIdentity, ResponseMode, ResultVisibility } from './api/form'
import type { StatisticsDto } from './api/statistics'
import type { ExactNumber } from '../utils/exact-number'
import type { DeadlineBaseline } from '../utils/datetime'
export interface EditorItemIdentity { readonly key: string; readonly serverId?: string }
export type EditorConfigBoundary = { [T in QuestionType]: { readonly type: T; readonly originalConfig: ConfigByType[T]; readonly candidateConfig: ConfigByType[T] } }[QuestionType]
export interface EditorBoundary {
  readonly title: string; readonly description: string; readonly deadline: DeadlineBaseline
  readonly resultVisibility: ResultVisibility | undefined; readonly questions: readonly (EditorItemIdentity & EditorConfigBoundary)[]
}
export type AnswerBoundary =
  | { readonly state: 'unanswered' }
  | { readonly state: 'number-input'; readonly raw: string; readonly exact?: ExactNumber }
  | { readonly state: 'answered'; readonly value: string | readonly string[] | number }
export interface StatisticsViewBoundary { readonly source: StatisticsDto }

// Controls retain raw numeric input; only validation produces API config values.
export interface EditorConfigByType {
  text: { variant?: 'input' | 'textarea'; placeholder?: string; minLength?: string; maxLength?: string }
  number: { placeholder?: string; min?: string; max?: string }
  single_choice: { variant?: 'radio' | 'select' }
  multiple_choice: { variant?: 'checkbox' | 'multi_select' }
  rating: { variant?: 'stars' | 'range'; min?: string; max?: string }
}
export interface EditorOption extends EditorItemIdentity { label: string; readonly value: string; sortOrder: number }
export type EditorQuestion = { [T in QuestionType]: EditorItemIdentity & {
  type: T; title: string; description: string; required: boolean; sortOrder: number
  config: EditorConfigByType[T]; options: EditorOption[]
} }[QuestionType]
export interface EditorDefinition {
  readonly metadata: Readonly<Pick<FormDetailDto, 'id' | 'userId' | 'status' | 'creatorDisplayName' | 'createdAt' | 'updatedAt'>> | { readonly creatorDisplayName: string }
  title: string; description: string; responseMode: ResponseMode; responseIdentity: ResponseIdentity
  resultVisibility: ResultVisibility | undefined
  readonly deadlineSource: DeadlineBaseline; deadlineInput: string; questions: EditorQuestion[]
}
export type DeepReadonly<T> = T extends ExactNumber ? T : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T
export interface EditorBaseline { readonly definition: DeepReadonly<EditorDefinition> }
export interface EditorSession { readonly definition: EditorDefinition; readonly baseline: EditorBaseline }
export interface FieldIssue { readonly targetKey: string; readonly field: string; readonly message: string }
export type RequestBuild<T> =
  | { readonly kind: 'invalid'; readonly issues: readonly FieldIssue[] }
  | { readonly kind: 'noop' }
  | { readonly kind: 'ready'; readonly body: DeepReadonly<T>; readonly map: import('./error-presentation').ErrorPathMap }
