import type { ConfigByType, CreateFormRequest, DraftDeltaRequest, NewOptionRequest, NewQuestionRequest, OptionDelta, QuestionDelta } from './api/form'
import type { EditorBaseline, EditorDefinition, FieldIssue, RequestBuild } from './models'
import type { DefinitionCandidate, ValidatedQuestion } from './definition-validation'
import { validateDraft } from './definition-validation'
import { defaultVariant, freezeSnapshot, isChoice, semanticEqual } from './editor'
import { definitionPathMap } from './error-path'
import type { QuestionPathRef } from './error-path'
import { cloneExact } from '../utils/exact-json'

export const isServerId = (value: string): boolean => /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value)
function identityIssues(definition: EditorDefinition, baseline?: EditorBaseline): FieldIssue[] {
  const issues: FieldIssue[] = []
  const check = (key: string, serverId: string | undefined, old: { readonly key: string; readonly serverId?: string } | undefined): void => {
    if (serverId !== undefined ? !isServerId(serverId) || !old || old.key !== key || old.serverId !== serverId : !key.startsWith('tmp_') || !isServerId(key.slice(4)) || old?.serverId !== undefined) {
      issues.push({ targetKey: key, field: 'id', message: '項目 ID／key 不屬於可靠保存基準' })
    }
  }
  const seen = new Set<string>()
  definition.questions.forEach(q => {
    const old = baseline?.definition.questions.find(old => old.key === q.key)
    check(q.key, q.serverId, old)
    if (q.serverId && seen.has(q.serverId)) issues.push({ targetKey: q.key, field: 'id', message: '題目 Server ID 重複' })
    if (q.serverId) seen.add(q.serverId)
    const optionIds = new Set<string>()
    q.options.forEach(o => {
      check(o.key, o.serverId, old?.options.find(old => old.key === o.key))
      if (o.serverId && optionIds.has(o.serverId)) issues.push({ targetKey: o.key, field: 'id', message: '選項 Server ID 重複' })
      if (o.serverId) optionIds.add(o.serverId)
    })
  })
  return issues
}
function newOption(o: ValidatedQuestion['options'][number]): NewOptionRequest {
  return { label: o.label, value: o.value, sortOrder: o.sortOrder }
}
function newQuestion(q: ValidatedQuestion): NewQuestionRequest {
  return { type: q.type, title: q.title, description: q.description, required: q.required, sortOrder: q.sortOrder,
    config: cloneExact(q.config), options: q.options.map(newOption) } as NewQuestionRequest
}
function reconciledConfig(q: ValidatedQuestion, old: ValidatedQuestion): ConfigByType[keyof ConfigByType] {
  const config = { ...q.config } as ConfigByType[keyof ConfigByType] & { variant?: string }
  if (q.type === old.type && defaultVariant(q.type)) {
    const previous = old.config as { variant?: string }
    if ((config.variant ?? defaultVariant(q.type)) === (previous.variant ?? defaultVariant(q.type))) {
      if (previous.variant === undefined) delete config.variant
      else config.variant = previous.variant
    }
  }
  return config
}
function rootDelta(candidate: DefinitionCandidate, old: DefinitionCandidate): DraftDeltaRequest {
  return Object.fromEntries((['title', 'description', 'responseMode', 'responseIdentity', 'submissionDeadlineAt'] as const)
    .filter(field => !semanticEqual(candidate[field], old[field])).map(field => [field, candidate[field]]))
}
export function buildCreateRequest(definition: EditorDefinition): RequestBuild<CreateFormRequest> {
  const validation = validateDraft(definition)
  if (validation.kind === 'invalid') return validation
  const issues = identityIssues(definition)
  if ('id' in definition.metadata) issues.push({ targetKey: 'form', field: 'id', message: '既有表單不能使用 Create builder' })
  if (issues.length) return { kind: 'invalid', issues }
  const c = validation.candidate
  const body: CreateFormRequest = { title: c.title, description: c.description, responseMode: c.responseMode, responseIdentity: c.responseIdentity,
    resultVisibility: c.resultVisibility!, submissionDeadlineAt: c.submissionDeadlineAt, questions: c.questions.map(newQuestion) }
  return { kind: 'ready', body: freezeSnapshot(body), map: definitionPathMap('delta', Object.keys(body),
    c.questions.map(q => ({ key: q.key, type: q.type, optionKeys: q.options.map(o => o.key) }))) }
}
export function buildDraftDelta(definition: EditorDefinition, baseline: EditorBaseline): RequestBuild<DraftDeltaRequest> {
  if (!('id' in definition.metadata) || !('id' in baseline.definition.metadata) || definition.metadata.id !== baseline.definition.metadata.id) return { kind: 'invalid', issues: [{ targetKey: 'form', field: 'id', message: 'Draft Delta 需要同一表單的保存基準' }] }
  const validation = validateDraft(definition, baseline)
  if (validation.kind === 'invalid') return validation
  const issues = identityIssues(definition, baseline)
  if (issues.length) return { kind: 'invalid', issues }
  const oldValidation = validateDraft(cloneExact(baseline.definition) as EditorDefinition, baseline)
  if (oldValidation.kind === 'invalid') return { kind: 'invalid', issues: [{ targetKey: 'form', field: '', message: '保存基準不可可靠解析，請重新讀取' }] }
  const c = validation.candidate, old = oldValidation.candidate
  const questions: QuestionDelta[] = [], refs: (QuestionPathRef | undefined)[] = []
  c.questions.forEach(q => {
    const previous = old.questions.find(old => old.serverId === q.serverId && q.serverId !== undefined)
    if (!previous) {
      questions.push(newQuestion(q)); refs.push({ key: q.key, type: q.type, optionKeys: q.options.map(o => o.key) }); return
    }
    type UpdateFields = Omit<Extract<QuestionDelta, { id: string }>, 'id'>
    const fields: { -readonly [K in keyof UpdateFields]?: UpdateFields[K] } = {}
    for (const field of ['type', 'title', 'description', 'required', 'sortOrder'] as const) if (!semanticEqual(q[field], previous[field])) Object.assign(fields, { [field]: q[field] })
    const config = reconciledConfig(q, previous)
    if (q.type !== previous.type || !semanticEqual(config, previous.config)) fields.config = config
    const optionRefs: (string | undefined)[] = []
    if (isChoice(q.type)) {
      const options: OptionDelta[] = []
      // Explicit deletion is essential when the final type equals the baseline after a round trip.
      previous.options.filter(old => !q.options.some(o => o.serverId === old.serverId && old.serverId !== undefined)).forEach(old => { options.push({ id: old.serverId! }); optionRefs.push(undefined) })
      q.options.forEach(o => {
        const previousOption = previous.options.find(old => old.serverId === o.serverId && o.serverId !== undefined)
        if (!previousOption) { options.push(newOption(o)); optionRefs.push(o.key); return }
        const changes = Object.fromEntries((['label', 'value', 'sortOrder'] as const).filter(field => !semanticEqual(o[field], previousOption[field])).map(field => [field, o[field]]))
        if (Object.keys(changes).length) { options.push({ id: o.serverId!, ...changes }); optionRefs.push(o.key) }
      })
      if (options.length) fields.options = options
    }
    // Choice -> non-Choice relies on the documented Server cleanup; nonempty Option Delta is forbidden.
    if (Object.keys(fields).length) { questions.push({ id: q.serverId!, ...fields }); refs.push({ key: q.key, type: q.type, optionKeys: optionRefs }) }
  })
  old.questions.filter(old => !c.questions.some(q => q.serverId === old.serverId && old.serverId !== undefined)).forEach(old => { questions.push({ id: old.serverId! }); refs.push(undefined) })
  const body = { ...rootDelta(c, old), ...(questions.length ? { questions } : {}) }
  if (!Object.keys(body).length) return { kind: 'noop' }
  return { kind: 'ready', body: freezeSnapshot(body), map: definitionPathMap('delta', Object.keys(body), refs) }
}
