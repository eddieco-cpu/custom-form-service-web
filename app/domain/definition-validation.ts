import { z } from 'zod'
import type { ConfigByType, NewQuestionRequest, QuestionType } from './api/form'
import { questionTypes, responseIdentities, responseModes, resultVisibilities } from './api/form'
import type { EditorBaseline, EditorDefinition, EditorItemIdentity, FieldIssue } from './models'
import { orderedDefinition } from './editor'
import { codePointSchema, descriptionCandidate, optionalTextCandidate } from '../utils/unicode'
import { ExactNumber, exactInteger } from '../utils/exact-number'
import { deadlineCandidate, parseInstant } from '../utils/datetime'

export type ValidatedQuestion = { [T in QuestionType]: Omit<Extract<NewQuestionRequest, { type: T }>, 'options'> & EditorItemIdentity & {
  readonly options: readonly (NewQuestionRequest['options'][number] & EditorItemIdentity)[]
} }[QuestionType]
export interface DefinitionCandidate {
  readonly title: string; readonly description: string | null; readonly responseMode: EditorDefinition['responseMode']
  readonly responseIdentity: EditorDefinition['responseIdentity']; readonly resultVisibility: EditorDefinition['resultVisibility']
  readonly submissionDeadlineAt: string | null; readonly questions: readonly ValidatedQuestion[]
}
export type Validation<T> = { readonly kind: 'valid'; readonly candidate: T } | { readonly kind: 'invalid'; readonly issues: readonly FieldIssue[] }

const numericInput = (integer?: number) => z.string().transform((raw, ctx) => {
  if (raw === '') return undefined
  try {
    const exact = ExactNumber.from(raw)
    return integer === undefined ? exact : exactInteger(exact, 0, integer)
  }
  catch {
    ctx.addIssue({ code: 'custom', message: integer === undefined ? '請輸入可精確處理的 JSON 數字' : `請輸入 0～${integer} 的整數` })
    return z.NEVER
  }
})
const placeholder = z.string().transform(optionalTextCandidate).optional()
const configSchemas = {
  text: z.strictObject({ variant: z.enum(['input', 'textarea']).optional(), placeholder,
    minLength: numericInput(2147483647).optional(), maxLength: numericInput(2147483647).optional() }),
  number: z.strictObject({ placeholder, min: numericInput().optional(), max: numericInput().optional() }),
  single_choice: z.strictObject({ variant: z.enum(['radio', 'select']).optional() }),
  multiple_choice: z.strictObject({ variant: z.enum(['checkbox', 'multi_select']).optional() }),
  rating: z.strictObject({ variant: z.enum(['stars', 'range']).optional(), min: numericInput(100).optional(), max: numericInput(100).optional() }),
}
export function validateConfig(type: QuestionType, raw: unknown, targetKey: string): Validation<ConfigByType[QuestionType]> {
  const result = configSchemas[type].safeParse(raw)
  if (!result.success) return { kind: 'invalid', issues: result.error.issues.map(issue => ({ targetKey, field: ['config', ...issue.path].join('.'), message: issue.message })) }
  const config = Object.fromEntries(Object.entries(result.data).filter(([, value]) => value !== undefined)) as ConfigByType[QuestionType]
  const values = config as { min?: number | ExactNumber; max?: number | ExactNumber; minLength?: number; maxLength?: number }
  const issue = (field: string, message: string): Validation<never> => ({ kind: 'invalid', issues: [{ targetKey, field: `config.${field}`, message }] })
  if (type === 'text' && values.minLength !== undefined && values.maxLength !== undefined && values.minLength > values.maxLength) return issue('maxLength', '最大長度須不小於最小長度')
  if (type === 'number' && values.min instanceof ExactNumber && values.max instanceof ExactNumber && values.min.compare(values.max) > 0) return issue('max', '最大值須不小於最小值')
  if (type === 'rating' && typeof values.min === 'number' && typeof values.max === 'number' && values.min >= values.max) return issue('max', '最大分數須大於最小分數')
  return { kind: 'valid', candidate: config }
}
const identity = { key: z.string().min(1), serverId: z.string().optional() }
const optionSchema = z.strictObject({ ...identity, label: codePointSchema(1, Infinity), value: codePointSchema(1, 255), sortOrder: z.number().int().min(0).max(2147483647) })
const questionSchema = z.strictObject({ ...identity, type: z.enum(questionTypes), title: codePointSchema(1, Infinity),
  description: z.string().transform(descriptionCandidate), required: z.boolean(), sortOrder: z.number().int().min(0).max(2147483647),
  config: z.unknown(), options: z.array(optionSchema) })
const definitionSchema = z.strictObject({ metadata: z.unknown(), title: codePointSchema(1, 200), description: z.string().transform(descriptionCandidate),
  responseMode: z.enum(responseModes), responseIdentity: z.enum(responseIdentities), resultVisibility: z.enum(resultVisibilities).optional(),
  deadlineSource: z.unknown(), deadlineInput: z.string(), questions: z.array(questionSchema) })

function issueTarget(definition: EditorDefinition, path: readonly PropertyKey[]): { targetKey: string; field: string } {
  if (path[0] === 'questions' && typeof path[1] === 'number') {
    const q = definition.questions[path[1]]
    if (q && path[2] === 'options' && typeof path[3] === 'number') return { targetKey: q.options[path[3]]?.key ?? q.key, field: path.slice(4).join('.') }
    if (q) return { targetKey: q.key, field: path.slice(2).join('.') }
  }
  return { targetKey: 'form', field: path.join('.') }
}
export function validateDraft(definition: EditorDefinition, baseline?: EditorBaseline): Validation<DefinitionCandidate> {
  // Shape check before any projection: malformed config/null cannot be mistaken for omitted input.
  const shape = definitionSchema.safeParse(definition)
  if (!shape.success) return { kind: 'invalid', issues: shape.error.issues.map(issue => ({ ...issueTarget(definition, issue.path), message: issue.message })) }
  const ordered = orderedDefinition(definition, baseline)
  const parsed = definitionSchema.parse(ordered)
  const issues: FieldIssue[] = []
  const add = (targetKey: string, field: string, message: string): void => { issues.push({ targetKey, field, message }) }
  if (!('id' in definition.metadata) && !parsed.resultVisibility) add('form', 'resultVisibility', '請選擇結果可見範圍')
  let deadline: string | null = null
  try { deadline = deadlineCandidate(definition.deadlineSource, parsed.deadlineInput).value }
  catch { add('form', 'submissionDeadlineAt', '請輸入完整且有效的台北日期與時間') }
  const keys = new Set<string>(), orders = new Set<number>()
  const questions = parsed.questions.map(q => {
    if (keys.has(q.key)) add(q.key, '', '題目 key 重複')
    keys.add(q.key)
    if (orders.has(q.sortOrder)) add(q.key, 'sortOrder', '題目順序重複')
    orders.add(q.sortOrder)
    const config = validateConfig(q.type, q.config, q.key)
    if (config.kind === 'invalid') issues.push(...config.issues)
    if (!(['single_choice', 'multiple_choice'] as string[]).includes(q.type) && q.options.length) add(q.key, 'options', '此題型不接受選項')
    const values = new Set<string>(), optionKeys = new Set<string>(), optionOrders = new Set<number>()
    q.options.forEach(o => {
      if (values.has(o.value)) add(o.key, 'value', '同題選項 value 不可重複')
      if (optionKeys.has(o.key)) add(o.key, '', '同題選項 key 不可重複')
      if (optionOrders.has(o.sortOrder)) add(o.key, 'sortOrder', '同題選項順序不可重複')
      values.add(o.value); optionKeys.add(o.key); optionOrders.add(o.sortOrder)
    })
    return { key: q.key, ...(q.serverId === undefined ? {} : { serverId: q.serverId }), type: q.type, title: q.title, description: q.description,
      required: q.required, sortOrder: q.sortOrder, config: config.kind === 'valid' ? config.candidate : {}, options: q.options } as ValidatedQuestion
  })
  return issues.length ? { kind: 'invalid', issues } : { kind: 'valid', candidate: { title: parsed.title, description: parsed.description,
    responseMode: parsed.responseMode, responseIdentity: parsed.responseIdentity, resultVisibility: parsed.resultVisibility, submissionDeadlineAt: deadline, questions } }
}
export function validatePublish(definition: EditorDefinition, now: string, baseline?: EditorBaseline): Validation<DefinitionCandidate> {
  const result = validateDraft(definition, baseline)
  if (result.kind === 'invalid') return result
  const issues: FieldIssue[] = [], candidate = result.candidate
  if (!candidate.questions.length) issues.push({ targetKey: 'form', field: 'questions', message: '發布至少需要一題' })
  candidate.questions.forEach(q => {
    if ((q.type === 'single_choice' || q.type === 'multiple_choice') && !q.options.length) issues.push({ targetKey: q.key, field: 'options', message: '發布至少需要一個選項' })
    if (q.type === 'rating') {
      const config = q.config as ConfigByType['rating']
      for (const field of ['min', 'max'] as const) if (config[field] === undefined) issues.push({ targetKey: q.key, field: `config.${field}`, message: '發布須提供完整評分範圍' })
    }
  })
  const instant = parseInstant(now) // Caller must provide a reliable clock; never infer it inside the domain.
  if (candidate.submissionDeadlineAt && parseInstant(candidate.submissionDeadlineAt).ticks <= instant.ticks) issues.push({ targetKey: 'form', field: 'submissionDeadlineAt', message: '發布截止時間須晚於現在' })
  return issues.length ? { kind: 'invalid', issues } : result
}
