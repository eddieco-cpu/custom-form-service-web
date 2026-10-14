import type { ReceiptDto, SubmitRequest } from './api/response'
import type { AnswerDefinition, AnswerModel } from './answer'
import { emptyAnswers, buildAnswerRequest, numberAnswer } from './answer'
import { semanticEqual } from './editor'
import { ExactNumber, exactInteger } from '../utils/exact-number'
import { trimWhiteSpace } from '../utils/unicode'

// A Receipt has no type tag. Interpret it only against this saved Definition.
export function mapReceipt(definition: AnswerDefinition, receipt: ReceiptDto, formId: string): AnswerModel {
  if (receipt.formId.toLowerCase() !== formId.toLowerCase()) throw new Error('Unexpected receipt form')
  const { model } = emptyAnswers(definition), seen = new Set<string>()
  for (const answer of receipt.answers) {
    const q = definition.questions.find(q => q.serverId === answer.questionId)
    if (!q || seen.has(q.key)) throw new Error('Unknown or duplicate receipt question')
    seen.add(q.key)
    const value = answer.value
    switch (q.type) {
      case 'text':
        if (typeof value !== 'string' || !value || trimWhiteSpace(value) !== value) throw new Error('Invalid receipt text')
        model.values[q.key] = { type: q.type, raw: value }; break
      case 'number':
        if (!(value instanceof ExactNumber)) throw new Error('Invalid receipt number')
        model.values[q.key] = numberAnswer(value.token); break
      case 'rating':
        model.values[q.key] = { type: q.type, value: exactInteger(value, 0, 100) }; break
      case 'single_choice': {
        if (typeof value !== 'string') throw new Error('Invalid receipt choice')
        const option = q.options.find(o => o.serverId === value)
        if (!option) throw new Error('Unknown receipt option')
        model.values[q.key] = { type: q.type, optionKey: option.key }; break
      }
      case 'multiple_choice': {
        if (!Array.isArray(value) || !value.length || new Set(value).size !== value.length) throw new Error('Invalid receipt choices')
        const keys = value.map(id => { const o = q.options.find(o => o.serverId === id); if (!o) throw new Error('Unknown receipt option'); return o.key })
        model.values[q.key] = { type: q.type, optionKeys: keys }; break
      }
    }
  }
  const built = buildAnswerRequest(definition, model)
  if (built.kind !== 'ready' || built.body.answers.length !== receipt.answers.length) throw new Error('Receipt does not satisfy definition')
  return model
}
export function requireSubmittedReceipt(definition: AnswerDefinition, receipt: ReceiptDto, formId: string, request?: SubmitRequest): void {
  const mapped = mapReceipt(definition, receipt, formId)
  if (!request) return
  const built = buildAnswerRequest(definition, mapped)
  if (built.kind !== 'ready') throw new Error('Invalid receipt')
  const project = (body: SubmitRequest) => Object.fromEntries(body.answers.map(a => [a.questionId, Array.isArray(a.value) ? [...a.value].sort() : a.value]))
  if (!semanticEqual(project(built.body), project(request))) throw new Error('Receipt differs from submitted answers')
}
