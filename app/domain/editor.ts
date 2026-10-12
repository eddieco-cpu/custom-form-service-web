import type { ConfigByType, FormDetailDto, QuestionType } from './api/form'
import type { DeepReadonly, EditorBaseline, EditorConfigByType, EditorDefinition, EditorOption, EditorQuestion, EditorSession } from './models'
import { cloneExact } from '../utils/exact-json'
import { ExactNumber, exactInteger } from '../utils/exact-number'
import { deadlineBaseline, deadlineCandidate } from '../utils/datetime'
import { descriptionCandidate, optionalTextCandidate, trimWhiteSpace } from '../utils/unicode'

export type IdFactory = () => string
const randomId: IdFactory = () => crypto.randomUUID()
export const isChoice = (type: QuestionType): boolean => type === 'single_choice' || type === 'multiple_choice'
export const defaultVariant = (type: QuestionType): string | undefined => ({ text: 'input', single_choice: 'radio', multiple_choice: 'checkbox', rating: 'stars', number: undefined })[type]
export const effectiveVariant = (question: Pick<EditorQuestion, 'type' | 'config'>): string | undefined => ('variant' in question.config ? question.config.variant : undefined) ?? defaultVariant(question.type)

export function freezeSnapshot<T>(value: T): DeepReadonly<T> {
  const copy = cloneExact(value)
  const freeze = (item: unknown): void => {
    if (item && typeof item === 'object' && !Object.isFrozen(item)) {
      Object.values(item).forEach(freeze)
      Object.freeze(item)
    }
  }
  freeze(copy)
  return copy as DeepReadonly<T>
}
export const editorSnapshot = (definition: EditorDefinition): EditorDefinition => cloneExact(definition)
const session = (definition: EditorDefinition): EditorSession => ({ definition, baseline: { definition: freezeSnapshot(definition) } })

export function createEditor(creatorDisplayName: string): EditorSession {
  return session({ metadata: { creatorDisplayName }, title: '', description: '', responseMode: 'single', responseIdentity: 'anonymous',
    resultVisibility: undefined, deadlineSource: deadlineBaseline(null), deadlineInput: '', questions: [] })
}
export function configInput<T extends QuestionType>(config: ConfigByType[T]): EditorConfigByType[T] {
  return Object.fromEntries(Object.entries(config).map(([key, value]) => [key,
    ['min', 'max', 'minLength', 'maxLength'].includes(key) ? String(value) : value])) as EditorConfigByType[T]
}
// Only a decoded complete Server response can establish a saved baseline.
export function loadEditor(dto: FormDetailDto): EditorSession {
  const { id, userId, status, creatorDisplayName, createdAt, updatedAt } = dto
  const deadlineSource = deadlineBaseline(dto.submissionDeadlineAt)
  return session({ metadata: { id, userId, status, creatorDisplayName, createdAt, updatedAt }, title: dto.title,
    description: dto.description ?? '', responseMode: dto.responseMode, responseIdentity: dto.responseIdentity,
    resultVisibility: dto.resultVisibility, deadlineSource, deadlineInput: deadlineSource.visible,
    questions: dto.questions.map(q => ({ key: q.id, serverId: q.id, type: q.type, title: q.title, description: q.description ?? '',
      required: q.required, sortOrder: q.sortOrder, config: configInput(q.config),
      options: q.options.map(o => ({ key: o.id, serverId: o.id, label: o.label, value: o.value, sortOrder: o.sortOrder })) }) as EditorQuestion),
  })
}
export function initialConfig(type: QuestionType): EditorConfigByType[QuestionType] {
  switch (type) {
    case 'text': return { variant: 'input' }
    case 'number': return {}
    case 'single_choice': return { variant: 'radio' }
    case 'multiple_choice': return { variant: 'checkbox' }
    case 'rating': return { variant: 'stars', min: '1', max: '5' }
  }
}
function newOption(options: readonly EditorOption[], ids: IdFactory): EditorOption {
  let n = 1
  while (options.some(o => trimWhiteSpace(o.label) === `選項 ${n}`)) n++
  const value = `opt_${ids()}`
  if (options.some(o => o.value === value)) throw new Error('Option value factory collision')
  return { key: `tmp_${ids()}`, label: `選項 ${n}`, value, sortOrder: options.length }
}
function initialOptions(type: QuestionType, ids: IdFactory): EditorOption[] {
  if (!isChoice(type)) return []
  const first = newOption([], ids)
  return [first, newOption([first], ids)]
}
export function addQuestion(definition: EditorDefinition, type: QuestionType = 'text', ids: IdFactory = randomId): EditorDefinition {
  const copy = editorSnapshot(definition)
  copy.questions.push({ key: `tmp_${ids()}`, type, title: '', description: '', required: false,
    sortOrder: copy.questions.length, config: initialConfig(type), options: initialOptions(type, ids) } as EditorQuestion)
  return copy
}
function questionAt(definition: EditorDefinition, key: string): EditorQuestion {
  const q = definition.questions.find(q => q.key === key)
  if (!q) throw new Error('Question key not found')
  return q
}
export function removeQuestion(definition: EditorDefinition, key: string): EditorDefinition {
  questionAt(definition, key)
  const copy = editorSnapshot(definition)
  copy.questions = copy.questions.filter(q => q.key !== key)
  return copy
}
export function addOption(definition: EditorDefinition, key: string, ids: IdFactory = randomId): EditorDefinition {
  const copy = editorSnapshot(definition), q = questionAt(copy, key)
  if (!isChoice(q.type)) throw new Error('Options require a Choice question')
  q.options.push(newOption(q.options, ids))
  return copy
}
export function removeOption(definition: EditorDefinition, key: string, optionKey: string): EditorDefinition {
  const copy = editorSnapshot(definition), q = questionAt(copy, key)
  if (!q.options.some(o => o.key === optionKey)) throw new Error('Option key not found')
  q.options = q.options.filter(o => o.key !== optionKey)
  return copy
}
function reordered<T extends { readonly key: string }>(items: T[], keys: readonly string[]): T[] {
  if (keys.length !== items.length || new Set(keys).size !== keys.length || keys.some(key => !items.some(item => item.key === key))) throw new Error('Reorder must contain every key exactly once')
  return keys.map(key => items.find(item => item.key === key)!)
}
export function reorderQuestions(definition: EditorDefinition, keys: readonly string[]): EditorDefinition {
  const copy = editorSnapshot(definition)
  copy.questions = reordered(copy.questions, keys)
  return copy
}
export function reorderOptions(definition: EditorDefinition, key: string, keys: readonly string[]): EditorDefinition {
  const copy = editorSnapshot(definition), q = questionAt(copy, key)
  q.options = reordered(q.options, keys)
  return copy
}
export function needsOptionsConfirmation(question: EditorQuestion, target: QuestionType): boolean {
  return isChoice(question.type) && !isChoice(target) && question.options.length > 0
}
export function changeQuestionType(definition: EditorDefinition, key: string, target: QuestionType, confirmed = false, ids: IdFactory = randomId):
  { readonly kind: 'unchanged' | 'confirmation-required' | 'changed'; readonly definition: EditorDefinition } {
  const original = questionAt(definition, key)
  if (original.type === target) return { kind: 'unchanged', definition }
  if (needsOptionsConfirmation(original, target) && !confirmed) return { kind: 'confirmation-required', definition }
  const copy = editorSnapshot(definition), q = questionAt(copy, key)
  const options = isChoice(q.type) && isChoice(target) ? q.options : initialOptions(target, ids)
  copy.questions[copy.questions.indexOf(q)] = { ...q, type: target, config: initialConfig(target), options } as EditorQuestion
  return { kind: 'changed', definition: copy }
}
export function changeVariant(definition: EditorDefinition, key: string, variant: string): EditorDefinition {
  const copy = editorSnapshot(definition), q = questionAt(copy, key)
  const allowed: Record<QuestionType, readonly string[]> = { text: ['input', 'textarea'], number: [], single_choice: ['radio', 'select'], multiple_choice: ['checkbox', 'multi_select'], rating: ['stars', 'range'] }
  if (!allowed[q.type].includes(variant)) throw new Error('Variant incompatible with question type')
  q.config = { ...q.config, variant } as EditorQuestion['config']
  return copy
}

const sameKeys = (a: readonly { readonly key: string }[], b: readonly { readonly key: string }[]): boolean => a.length === b.length && a.every((item, i) => item.key === b[i]?.key)
// Compare final membership/order, so undoing a move or add/delete restores sparse Server orders.
export function orderedDefinition(definition: EditorDefinition, baseline?: EditorBaseline): EditorDefinition {
  const copy = editorSnapshot(definition), base = baseline?.definition
  if (!base && 'id' in copy.metadata) return copy // Without a comparison baseline, validate saved orders as supplied.
  const sameQuestions = base && sameKeys(copy.questions, base.questions)
  copy.questions.forEach((q, i) => {
    q.sortOrder = sameQuestions ? base.questions[i]!.sortOrder : i
    const old = base?.questions.find(old => old.key === q.key)
    const sameOptions = old && sameKeys(q.options, old.options)
    q.options.forEach((o, j) => { o.sortOrder = sameOptions ? old.options[j]!.sortOrder : j })
  })
  return copy
}
// Tolerant semantic comparison also keeps illegal, nonempty control input dirty.
export function semanticEqual(a: unknown, b: unknown): boolean {
  if (a instanceof ExactNumber && b instanceof ExactNumber) return a.equals(b)
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => semanticEqual(v, b[i]))
  const left = Object.entries(a), right = Object.entries(b)
  return left.length === right.length && left.every(([k, v]) => Object.hasOwn(b, k) && semanticEqual(v, (b as Record<string, unknown>)[k]))
}
function comparableConfig(q: EditorQuestion): unknown {
  if (!q.config || typeof q.config !== 'object' || Array.isArray(q.config)) return q.config
  const entries = Object.entries(q.config).flatMap<[string, unknown]>(([key, value]) => {
    if (typeof value !== 'string') return [[key, value]]
    if (['min', 'max', 'minLength', 'maxLength'].includes(key)) {
      if (value === '') return []
      try {
        const exact = ExactNumber.from(value)
        if (q.type !== 'number') exactInteger(exact, 0, q.type === 'rating' ? 100 : 2147483647)
        return [[key, exact]]
      }
      catch { return [[key, { invalidRaw: value }]] }
    }
    if (key === 'placeholder') { const text = optionalTextCandidate(value); return text === undefined ? [] : [[key, text]] }
    return [[key, value]]
  })
  return { ...Object.fromEntries(entries), ...(defaultVariant(q.type) ? { variant: effectiveVariant(q) } : {}) }
}
function comparableDefinition(definition: EditorDefinition, baseline: EditorBaseline): unknown {
  const ordered = orderedDefinition(definition, baseline)
  let deadline: unknown
  try { deadline = deadlineCandidate(ordered.deadlineSource, ordered.deadlineInput).value }
  catch { deadline = { invalidRaw: ordered.deadlineInput } }
  return { title: trimWhiteSpace(ordered.title), description: descriptionCandidate(ordered.description), responseMode: ordered.responseMode,
    responseIdentity: ordered.responseIdentity, deadline,
    ...('id' in ordered.metadata ? {} : { resultVisibility: ordered.resultVisibility }),
    questions: ordered.questions.map(q => ({ key: q.key, serverId: q.serverId, type: q.type, title: trimWhiteSpace(q.title), description: descriptionCandidate(q.description),
      required: q.required, sortOrder: q.sortOrder, config: comparableConfig(q), options: q.options.map(o => ({ ...o, label: trimWhiteSpace(o.label), value: trimWhiteSpace(o.value) })) })),
  }
}
export function editorDirty(definition: EditorDefinition, baseline: EditorBaseline): boolean {
  return !semanticEqual(comparableDefinition(definition, baseline), comparableDefinition(cloneExact(baseline.definition) as EditorDefinition, baseline))
}
