import type { SubmitRequest } from './api/response'
import type { ConfigByType, FormDetailDto, QuestionType } from './api/form'
import type { DeepReadonly, EditorConfigByType, EditorDefinition, FieldIssue, RequestBuild } from './models'
import type { Validation } from './definition-validation'
import { validateConfig } from './definition-validation'
import { freezeSnapshot, loadEditor, semanticEqual } from './editor'
import { isServerId } from './definition-request'
import { answerPathMap } from './error-path'
import { cloneExact } from '../utils/exact-json'
import type { ExactNumber } from '../utils/exact-number'
import { numberCandidate, withinBounds } from '../utils/exact-number'
import { codePointLength, trimWhiteSpace } from '../utils/unicode'

export type AnswerInput =
  | { type: 'text'; raw: string }
  | { type: 'number'; raw: string; readonly exact?: ExactNumber }
  | { type: 'single_choice'; optionKey: string | undefined }
  | { type: 'multiple_choice'; optionKeys: string[] }
  | { type: 'rating'; value: number | undefined }
export interface AnswerModel { values: Record<string, AnswerInput> }
export interface AnswerBaseline { readonly values: DeepReadonly<AnswerModel['values']> }
export interface AnswerQuestion {
  readonly key: string; readonly serverId?: string; readonly type: QuestionType; readonly title: string; readonly description: string
  readonly required: boolean; readonly config: DeepReadonly<EditorConfigByType[QuestionType]>
  readonly options: readonly { readonly key: string; readonly serverId?: string; readonly label: string }[]
}
export interface AnswerDefinition { readonly questions: readonly AnswerQuestion[] }
// Each opening of Preview uses this projection plus a fresh empty answer session.
export function answerDefinition(editor: EditorDefinition): AnswerDefinition {
  return freezeSnapshot({ questions: editor.questions.map(q => ({ key: q.key, ...(q.serverId === undefined ? {} : { serverId: q.serverId }),
    type: q.type, title: q.title, description: q.description, required: q.required, config: q.config,
    options: q.options.map(o => ({ key: o.key, ...(o.serverId === undefined ? {} : { serverId: o.serverId }), label: o.label })) })) })
}
export const savedAnswerDefinition = (dto: FormDetailDto): AnswerDefinition => answerDefinition(loadEditor(dto).definition)
export function numberAnswer(raw: string): Extract<AnswerInput, { type: 'number' }> {
  try { const exact = numberCandidate(raw); return { type: 'number', raw, ...(exact === undefined ? {} : { exact }) } }
  catch { return { type: 'number', raw } }
}
function emptyInput(type: QuestionType): AnswerInput {
  switch (type) {
    case 'text': return { type, raw: '' }
    case 'number': return { type, raw: '' }
    case 'single_choice': return { type, optionKey: undefined }
    case 'multiple_choice': return { type, optionKeys: [] }
    case 'rating': return { type, value: undefined }
  }
}
export function emptyAnswers(definition: AnswerDefinition): { readonly model: AnswerModel; readonly baseline: AnswerBaseline } {
  const values = Object.fromEntries(definition.questions.map(q => [q.key, emptyInput(q.type)]))
  return { model: { values }, baseline: { values: freezeSnapshot(values) } }
}
export const answerBaseline = (model: AnswerModel): AnswerBaseline => ({ values: freezeSnapshot(model.values) })
function comparable(input: DeepReadonly<AnswerInput>): unknown {
  switch (input.type) {
    case 'text': return { type: input.type, value: trimWhiteSpace(input.raw) }
    case 'number': {
      try { return { type: input.type, value: numberCandidate(input.raw) } }
      catch { return { type: input.type, invalidRaw: input.raw } }
    }
    case 'single_choice': return input
    case 'multiple_choice': return { type: input.type, optionKeys: [...input.optionKeys].sort() }
    case 'rating': return input
  }
}
export function answerDirty(model: AnswerModel, baseline: AnswerBaseline): boolean {
  const project = (values: DeepReadonly<AnswerModel['values']>): unknown => Object.fromEntries(Object.entries(values).map(([key, input]) => [key, comparable(input)]))
  return !semanticEqual(project(model.values), project(baseline.values))
}
export interface AnswerCandidate { readonly key: string; readonly value: string | ExactNumber | number | readonly string[] }
export function validateAnswers(definition: AnswerDefinition, model: AnswerModel): Validation<readonly AnswerCandidate[]> {
  const issues: FieldIssue[] = [], candidates: AnswerCandidate[] = []
  const add = (key: string, message: string, field = 'value'): void => { issues.push({ targetKey: key, field, message }) }
  const questionKeys = new Set<string>()
  for (const q of definition.questions) {
    if (questionKeys.has(q.key)) add(q.key, '題目 key 重複')
    questionKeys.add(q.key)
    const input = model.values[q.key]
    if (!input || input.type !== q.type) { add(q.key, '答案模型不符合此題型'); continue }
    const configResult = validateConfig(q.type, q.config, q.key)
    if (configResult.kind === 'invalid') { issues.push(...configResult.issues); continue }
    const config = configResult.candidate
    let value: AnswerCandidate['value'] | undefined
    switch (input.type) {
      case 'text': {
        if (typeof input.raw !== 'string') { add(q.key, '請輸入文字'); break }
        const text = trimWhiteSpace(input.raw)
        if (!text) break
        const c = config as ConfigByType['text'], length = codePointLength(text)
        if ((c.minLength !== undefined && length < c.minLength) || (c.maxLength !== undefined && length > c.maxLength)) add(q.key, '文字長度不符合設定')
        else value = text
        break
      }
      case 'number': {
        if (typeof input.raw !== 'string') { add(q.key, '請輸入數字文字'); break }
        try {
          const exact = numberCandidate(input.raw), c = config as ConfigByType['number']
          if (exact !== undefined && !withinBounds(exact, c.min, c.max)) add(q.key, '數字不在設定範圍內')
          else value = exact
        }
        catch { add(q.key, '請輸入可精確處理的 JSON 數字') }
        break
      }
      case 'single_choice': {
        if (input.optionKey === undefined) break
        if (!q.options.some(o => o.key === input.optionKey)) add(q.key, '選項不屬於此題')
        else value = input.optionKey
        break
      }
      case 'multiple_choice': {
        if (!Array.isArray(input.optionKeys)) { add(q.key, '請選擇有效選項'); break }
        if (!input.optionKeys.length) break
        if (new Set(input.optionKeys).size !== input.optionKeys.length) add(q.key, '選項不可重複')
        else if (input.optionKeys.some(key => !q.options.some(o => o.key === key))) add(q.key, '選項不屬於此題')
        else value = [...input.optionKeys]
        break
      }
      case 'rating': {
        const c = config as ConfigByType['rating']
        if (c.min === undefined || c.max === undefined) { add(q.key, '尚未設定完整評分範圍'); break }
        if (input.value === undefined) break // A Range's initial min is a visual position, never an answer.
        if (!Number.isInteger(input.value) || input.value < c.min || input.value > c.max) add(q.key, '分數須為設定範圍內的整數')
        else value = input.value
        break
      }
    }
    if (value === undefined) {
      if (q.required && !issues.some(issue => issue.targetKey === q.key)) add(q.key, '此題必填')
    }
    else candidates.push({ key: q.key, value })
  }
  Object.keys(model.values).filter(key => !questionKeys.has(key)).forEach(key => add(key, '答案不屬於此表單'))
  return issues.length ? { kind: 'invalid', issues } : { kind: 'valid', candidate: candidates }
}
export function buildAnswerRequest(definition: AnswerDefinition, model: AnswerModel): RequestBuild<SubmitRequest> {
  const validation = validateAnswers(definition, model)
  if (validation.kind === 'invalid') return validation
  const issues: FieldIssue[] = [], questionIds = new Set<string>()
  definition.questions.forEach(q => {
    if (!q.serverId || !isServerId(q.serverId) || questionIds.has(q.serverId)) issues.push({ targetKey: q.key, field: 'questionId', message: '正式提交需要唯一的 Server Question ID' })
    if (q.serverId) questionIds.add(q.serverId)
    const optionKeys = new Set<string>(), optionIds = new Set<string>()
    q.options.forEach(o => {
      if (!o.serverId || !isServerId(o.serverId) || optionIds.has(o.serverId) || optionKeys.has(o.key)) issues.push({ targetKey: q.key, field: 'value', message: '正式提交需要同題唯一的 Server Option ID' })
      optionKeys.add(o.key)
      if (o.serverId) optionIds.add(o.serverId)
    })
  })
  if (issues.length) return { kind: 'invalid', issues }
  const answers = validation.candidate.map(answer => {
    const q = definition.questions.find(q => q.key === answer.key)!
    let value = answer.value
    if (q.type === 'single_choice') value = q.options.find(o => o.key === answer.value)!.serverId!
    if (q.type === 'multiple_choice') value = (answer.value as readonly string[]).map(key => q.options.find(o => o.key === key)!.serverId!)
    return { questionId: q.serverId!, value: cloneExact(value) }
  })
  return { kind: 'ready', body: freezeSnapshot({ answers }), map: answerPathMap(definition.questions,
    validation.candidate.map(a => ({ key: a.key, ...(Array.isArray(a.value) ? { multipleLength: a.value.length } : {}) }))) }
}
