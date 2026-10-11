import { ExactNumber, exactInteger } from '../../utils/exact-number'
import { parseInstant } from '../../utils/datetime'
import type { ApiError } from './error'
import type { UserDto } from './user'
import type { ConfigByType, FormDetailDto, FormSummaryDto, OptionDto, QuestionDto, QuestionType, SummaryPageDto } from './form'
import { formStatuses, questionTypes, responseIdentities, responseModes, resultVisibilities } from './form'
import type { CountDto, ReceiptDto } from './response'
import type { ChoiceItemDto, StatisticsDto, StatisticsQuestionDto, ValueItemDto } from './statistics'

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof ExactNumber) throw new Error('Expected object')
  return value as Record<string, unknown>
}
function keys(value: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Unknown resource field')
}
function string(value: unknown): string { if (typeof value !== 'string') throw new Error('Expected string'); return value }
function uuid(value: unknown): string {
  const result = string(value)
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(result)) throw new Error('Expected UUID')
  return result
}
function nullableString(value: unknown): string | null { return value === null ? null : string(value) }
function date(value: unknown): string { const iso = string(value); parseInstant(iso); return iso }
function nullableDate(value: unknown): string | null { return value === null ? null : date(value) }
function boolean(value: unknown): boolean { if (typeof value !== 'boolean') throw new Error('Expected boolean'); return value }
function array<T>(value: unknown, decode: (value: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error('Expected array')
  return value.map(decode)
}
function enumeration<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new Error('Unknown enum value')
  return value as T
}
function exact(value: unknown): ExactNumber { if (!(value instanceof ExactNumber)) throw new Error('Expected exact JSON number'); return value }
function optional<T>(value: Record<string, unknown>, key: string, decode: (value: unknown) => T): { [key: string]: T } {
  return Object.hasOwn(value, key) ? { [key]: decode(value[key]) } : {}
}

export function decodeUser(value: unknown): UserDto {
  const v = object(value); keys(v, ['id', 'email', 'displayName', 'avatarUrl'])
  return { id: uuid(v.id), email: string(v.email), displayName: string(v.displayName), avatarUrl: nullableString(v.avatarUrl) }
}
function decodeConfig<T extends QuestionType>(type: T, value: unknown): ConfigByType[T] {
  const v = object(value)
  let result: ConfigByType[QuestionType]
  switch (type) {
    case 'text': {
      keys(v, ['variant', 'placeholder', 'minLength', 'maxLength'])
      const min = optional(v, 'minLength', exactInteger); const max = optional(v, 'maxLength', exactInteger)
      if (min.minLength !== undefined && max.maxLength !== undefined && min.minLength > max.maxLength) throw new Error('Invalid text range')
      result = { ...optional(v, 'variant', x => enumeration(x, ['input', 'textarea'])), ...optional(v, 'placeholder', string), ...min, ...max }
      break
    }
    case 'number': {
      keys(v, ['placeholder', 'min', 'max'])
      const min = optional(v, 'min', exact); const max = optional(v, 'max', exact)
      if (min.min && max.max && min.min.compare(max.max) > 0) throw new Error('Invalid number range')
      result = { ...optional(v, 'placeholder', string), ...min, ...max }; break
    }
    case 'single_choice': keys(v, ['variant']); result = optional(v, 'variant', x => enumeration(x, ['radio', 'select'])); break
    case 'multiple_choice': keys(v, ['variant']); result = optional(v, 'variant', x => enumeration(x, ['checkbox', 'multi_select'])); break
    case 'rating': {
      keys(v, ['variant', 'min', 'max'])
      const min = optional(v, 'min', x => exactInteger(x, 0, 100)); const max = optional(v, 'max', x => exactInteger(x, 0, 100))
      if (min.min !== undefined && max.max !== undefined && min.min >= max.max) throw new Error('Invalid rating range')
      result = { ...optional(v, 'variant', x => enumeration(x, ['stars', 'range'])), ...min, ...max }; break
    }
    default: throw new Error('Unknown question type')
  }
  return result as ConfigByType[T]
}
function decodeOption(value: unknown): OptionDto {
  const v = object(value); keys(v, ['id', 'label', 'value', 'sortOrder'])
  return { id: uuid(v.id), label: string(v.label), value: string(v.value), sortOrder: exactInteger(v.sortOrder) }
}
function decodeQuestion(value: unknown): QuestionDto {
  const v = object(value); keys(v, ['id', 'type', 'title', 'description', 'required', 'sortOrder', 'config', 'options'])
  const type = enumeration(v.type, questionTypes)
  const options = array(v.options, decodeOption)
  if (type !== 'single_choice' && type !== 'multiple_choice' && options.length) throw new Error('Options on non-choice question')
  return { id: uuid(v.id), type, title: string(v.title), description: nullableString(v.description), required: boolean(v.required), sortOrder: exactInteger(v.sortOrder), config: decodeConfig(type, v.config), options } as QuestionDto
}
const summaryKeys = ['id', 'title', 'status', 'responseMode', 'responseIdentity', 'resultVisibility', 'submissionDeadlineAt', 'createdAt', 'updatedAt']
function formRoot(v: Record<string, unknown>) {
  return { id: uuid(v.id), title: string(v.title), status: enumeration(v.status, formStatuses), responseMode: enumeration(v.responseMode, responseModes), responseIdentity: enumeration(v.responseIdentity, responseIdentities), resultVisibility: enumeration(v.resultVisibility, resultVisibilities), submissionDeadlineAt: nullableDate(v.submissionDeadlineAt), createdAt: date(v.createdAt), updatedAt: date(v.updatedAt) }
}
export function decodeFormDetail(value: unknown): FormDetailDto {
  const v = object(value); keys(v, [...summaryKeys, 'userId', 'creatorDisplayName', 'description', 'questions'])
  return { ...formRoot(v), userId: uuid(v.userId), creatorDisplayName: string(v.creatorDisplayName), description: nullableString(v.description), questions: array(v.questions, decodeQuestion) }
}
export function decodeSummaryPage(value: unknown): SummaryPageDto {
  const v = object(value); keys(v, ['items', 'pagination'])
  const p = object(v.pagination); keys(p, ['page', 'pageSize', 'totalItems', 'totalPages'])
  return { items: array(v.items, x => {
    const item = object(x); keys(item, [...summaryKeys, 'count'])
    return { ...formRoot(item), count: exactInteger(item.count) } satisfies FormSummaryDto
  }), pagination: { page: exactInteger(p.page, 1), pageSize: exactInteger(p.pageSize, 1, 100), totalItems: exactInteger(p.totalItems), totalPages: exactInteger(p.totalPages) } }
}
export function decodeReceipt(value: unknown): ReceiptDto {
  const v = object(value); keys(v, ['id', 'formId', 'submittedAt', 'answers'])
  const answers = array(v.answers, x => {
    const a = object(x); keys(a, ['questionId', 'value'])
    const value = typeof a.value === 'string' ? a.value : Array.isArray(a.value) ? array(a.value, uuid) : exact(a.value)
    return { questionId: uuid(a.questionId), value }
  })
  if (new Set(answers.map(a => a.questionId)).size !== answers.length) throw new Error('Duplicate receipt question')
  return { id: uuid(v.id), formId: uuid(v.formId), submittedAt: date(v.submittedAt), answers }
}
export function decodeCount(value: unknown): CountDto { const v = object(value); keys(v, ['count']); return { count: exactInteger(v.count) } }
export function decodeStatistics(value: unknown): StatisticsDto {
  const v = object(value); keys(v, ['formId', 'title', 'description', 'creatorDisplayName', 'responseMode', 'resultVisibility', 'submissionDeadlineAt', 'count', 'questions'])
  const questions = array(v.questions, x => {
    const q = object(x); keys(q, ['questionId', 'title', 'description', 'type', 'count', 'statistics'])
    const type = enumeration(q.type, questionTypes)
    const statistics = array(q.statistics, x => {
      const item = object(x)
      const choice = type === 'single_choice' || type === 'multiple_choice'
      keys(item, [...(choice ? ['optionId', 'label'] : []), 'value', 'count', 'respondents'])
      const count = exactInteger(item.count)
      const respondents = optional(item, 'respondents', x => array(x, x => {
        const r = object(x); keys(r, ['id', 'displayName']); return { id: uuid(r.id), displayName: string(r.displayName) }
      }))
      if (respondents.respondents && (respondents.respondents.length !== count || new Set(respondents.respondents.map(r => r.id)).size !== count)) throw new Error('Invalid respondents')
      if (choice) return { optionId: uuid(item.optionId), label: string(item.label), value: string(item.value), count, ...respondents } satisfies ChoiceItemDto
      const value = type === 'text' ? string(item.value) : type === 'rating' ? exactInteger(item.value, 0, 100) : exact(item.value)
      return { value, count, ...respondents } satisfies ValueItemDto<string | number | ExactNumber>
    })
    return { questionId: uuid(q.questionId), title: string(q.title), description: nullableString(q.description), type, count: exactInteger(q.count), statistics } as StatisticsQuestionDto
  })
  const identityShapes = questions.flatMap(q => q.statistics.map(item => Object.hasOwn(item, 'respondents')))
  if (identityShapes.some(Boolean) && identityShapes.some(has => !has)) throw new Error('Mixed anonymous and identified items')
  return { formId: uuid(v.formId), title: string(v.title), description: nullableString(v.description), creatorDisplayName: string(v.creatorDisplayName), responseMode: enumeration(v.responseMode, responseModes), resultVisibility: enumeration(v.resultVisibility, resultVisibilities), submissionDeadlineAt: nullableDate(v.submissionDeadlineAt), count: exactInteger(v.count), questions }
}
export function decodeError(value: unknown): ApiError {
  const root = object(value); keys(root, ['error']); const v = object(root.error); keys(v, ['code', 'message', 'details'])
  return { code: string(v.code), message: string(v.message), ...optional(v, 'details', x => array(x, x => {
    const d = object(x); keys(d, ['path', 'code', 'message']); return { path: string(d.path), code: string(d.code), message: string(d.message) }
  })) }
}
