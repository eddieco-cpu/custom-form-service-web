import type { ErrorPathMap } from './error-presentation'
import type { DeepReadonly, EditorDefinition } from './models'
import type { QuestionType } from './api/form'
import { freezeSnapshot } from './editor'

export interface QuestionPathRef { readonly key: string; readonly type: QuestionType; readonly optionKeys: readonly (string | undefined)[] }
const configFields: Record<QuestionType, readonly string[]> = {
  text: ['variant', 'placeholder', 'minLength', 'maxLength'], number: ['placeholder', 'min', 'max'],
  single_choice: ['variant'], multiple_choice: ['variant'], rating: ['variant', 'min', 'max'],
}
export function definitionPathMap(namespace: 'delta' | 'publish', rootFields: readonly string[], refs: readonly (QuestionPathRef | undefined)[]): ErrorPathMap {
  const paths: Record<string, string> = {}, suffixes: Record<string, string> = {}
  const add = (path: string, key: string, suffix = ''): void => { paths[path] = key; suffixes[path] = suffix }
  rootFields.forEach(field => add(field, 'form', `.${field}`))
  refs.forEach((q, i) => {
    if (!q) return // Deleted items have no current control.
    const prefix = `questions[${i}]`
    add(prefix, q.key)
    for (const field of ['id', 'type', 'title', 'description', 'required', 'sortOrder', 'config', 'options']) add(`${prefix}.${field}`, q.key, `.${field}`)
    configFields[q.type].forEach(field => add(`${prefix}.config.${field}`, q.key, `.config.${field}`))
    q.optionKeys.forEach((key, j) => {
      if (key === undefined) return
      const prefixOption = `${prefix}.options[${j}]`
      add(prefixOption, key)
      for (const field of ['id', 'label', 'value', 'sortOrder']) add(`${prefixOption}.${field}`, key, `.${field}`)
    })
  })
  return freezeSnapshot({ namespace, match: 'exact' as const, paths, suffixes })
}
// Use the complete saved definition, never the unsaved editor or a Delta map.
export function publishPathMap(saved: DeepReadonly<EditorDefinition>): ErrorPathMap {
  return definitionPathMap('publish', ['title', 'description', 'responseMode', 'responseIdentity', 'submissionDeadlineAt', 'questions'],
    saved.questions.map(q => ({ key: q.key, type: q.type, optionKeys: q.options.map(o => o.key) })))
}
export function answerPathMap(questions: readonly { readonly key: string; readonly serverId?: string }[], sent: readonly { readonly key: string; readonly multipleLength?: number }[]): ErrorPathMap {
  const paths: Record<string, string> = {}, suffixes: Record<string, string> = {}
  const add = (path: string, key: string, suffix = ''): void => { paths[path] = key; suffixes[path] = suffix }
  questions.forEach(q => { if (q.serverId) add(`questions.${q.serverId}`, q.key) })
  sent.forEach((q, i) => {
    const prefix = `answers[${i}]`
    add(prefix, q.key); add(`${prefix}.questionId`, q.key, '.questionId'); add(`${prefix}.value`, q.key, '.value')
    for (let j = 0; j < (q.multipleLength ?? 0); j++) add(`${prefix}.value[${j}]`, q.key, `.value[${j}]`)
  })
  return freezeSnapshot({ namespace: 'answer' as const, match: 'exact' as const, paths, suffixes })
}
