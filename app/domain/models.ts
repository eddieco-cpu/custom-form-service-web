import type { ConfigByType, QuestionType, ResultVisibility } from './api/form'
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
