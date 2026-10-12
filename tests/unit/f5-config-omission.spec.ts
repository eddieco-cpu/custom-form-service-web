import { describe, expect, it } from 'vitest'
import type { QuestionDto, QuestionType } from '../../app/domain/api/form'
import { editorDirty, loadEditor, semanticEqual } from '../../app/domain/editor'
import { validateDraft } from '../../app/domain/definition-validation'
import { buildDraftDelta } from '../../app/domain/definition-request'
import { ExactNumber } from '../../app/utils/exact-number'
import { stringifyExactJson } from '../../app/utils/exact-json'
import { form } from '../fixtures/f5/payloads'

type FieldCase = { type: QuestionType; field: string }
const optionalFields: FieldCase[] = [
  { type: 'text', field: 'minLength' }, { type: 'text', field: 'maxLength' }, { type: 'text', field: 'placeholder' },
  { type: 'number', field: 'placeholder' }, // The four independent review reproductions, in their original order.
  { type: 'text', field: 'variant' }, { type: 'number', field: 'min' }, { type: 'number', field: 'max' },
  { type: 'single_choice', field: 'variant' }, { type: 'multiple_choice', field: 'variant' },
  { type: 'rating', field: 'variant' }, { type: 'rating', field: 'min' }, { type: 'rating', field: 'max' },
]
const exact = ExactNumber.from
function session(type: QuestionType, config: QuestionDto['config'] = {}) {
  const original = form().questions.find(q => q.type === type)!
  return loadEditor(form([{ ...original, config } as QuestionDto]))
}

describe('F5-R1 optional config omission consistency', () => {
  it.each(optionalFields)('$type config[$field] undefined: Draft valid, Delta noop, dirty=false', ({ type, field }) => {
    // Keep the review's number bounds; the other absent-field scenarios use an empty config.
    const original = form().questions.find(q => q.type === type)!
    const s = session(type, type === 'number' && field === 'placeholder' ? original.config : {})
    const question = s.definition.questions[0]!
    const omitted = validateDraft(s.definition, s.baseline)
    Object.assign(question.config, { [field]: undefined })
    const validation = validateDraft(s.definition, s.baseline)
    expect(validation.kind).toBe('valid')
    expect(validation).toEqual(omitted)
    if (validation.kind !== 'valid') throw new Error('Expected valid config')
    expect(validation.candidate.questions[0]!.config).not.toHaveProperty(field)
    expect(buildDraftDelta(s.definition, s.baseline)).toEqual({ kind: 'noop' })
    expect(editorDirty(s.definition, s.baseline)).toBe(false)
    // Comparing/building must not mutate the raw control input or the saved baseline.
    expect(Object.hasOwn(question.config, field)).toBe(true)
    expect(Object.hasOwn(s.baseline.definition.questions[0]!.config, field)).toBe(false)
  })

  const clearingCases: (FieldCase & { config: QuestionDto['config']; expected: QuestionDto['config'] })[] = [
    { type: 'text', field: 'minLength', config: { minLength: 2, maxLength: 8, placeholder: '提示' }, expected: { maxLength: 8, placeholder: '提示' } },
    { type: 'text', field: 'maxLength', config: { minLength: 2, maxLength: 8 }, expected: { minLength: 2 } },
    { type: 'text', field: 'placeholder', config: { placeholder: '提示', minLength: 2 }, expected: { minLength: 2 } },
    { type: 'text', field: 'variant', config: { variant: 'textarea', placeholder: '提示' }, expected: { placeholder: '提示' } },
    { type: 'number', field: 'placeholder', config: { placeholder: '提示', min: exact('0'), max: exact('9007199254740993.1234567890123456789') },
      expected: { min: exact('0'), max: exact('9007199254740993.1234567890123456789') } },
    { type: 'number', field: 'min', config: { min: exact('0'), max: exact('10') }, expected: { max: exact('10') } },
    { type: 'number', field: 'max', config: { min: exact('0'), max: exact('10') }, expected: { min: exact('0') } },
    { type: 'single_choice', field: 'variant', config: { variant: 'select' }, expected: {} },
    { type: 'multiple_choice', field: 'variant', config: { variant: 'multi_select' }, expected: {} },
    { type: 'rating', field: 'variant', config: { variant: 'range', min: 0, max: 5 }, expected: { min: 0, max: 5 } },
    { type: 'rating', field: 'min', config: { variant: 'range', min: 0, max: 5 }, expected: { variant: 'range', max: 5 } },
    { type: 'rating', field: 'max', config: { variant: 'range', min: 0, max: 5 }, expected: { variant: 'range', min: 0 } },
  ]
  it.each(clearingCases)('$type config[$field] cleared: dirty=true and full replacement removes only that key', ({ type, field, config, expected }) => {
    const s = session(type, config), q = s.definition.questions[0]!
    Object.assign(q.config, { [field]: undefined })
    const validation = validateDraft(s.definition, s.baseline)
    expect(validation.kind).toBe('valid')
    if (validation.kind !== 'valid') throw new Error('Expected valid config')
    expect(validation.candidate.questions[0]!.config).toEqual(expected)
    expect(editorDirty(s.definition, s.baseline)).toBe(true)
    const result = buildDraftDelta(s.definition, s.baseline)
    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') throw new Error('Expected replacement')
    const body = { questions: [{ id: q.serverId, config: expected }] }
    expect(result.body).toEqual(body)
    if (type === 'number' && field === 'placeholder') {
      expect(stringifyExactJson(result.body)).toBe(`{"questions":[{"id":"${q.serverId}","config":{"min":0,"max":9007199254740993.1234567890123456789}}]}`)
    }
    expect(result.body.questions![0]).not.toHaveProperty('type')
    expect(Object.hasOwn(s.baseline.definition.questions[0]!.config, field)).toBe(true)
    expect(Object.hasOwn(q.config, field)).toBe(true)
  })

  it.each(optionalFields)('$type config[$field] null stays dirty and is rejected', ({ type, field }) => {
    const s = session(type)
    Object.assign(s.definition.questions[0]!.config, { [field]: null })
    expect(validateDraft(s.definition, s.baseline).kind).toBe('invalid')
    expect(buildDraftDelta(s.definition, s.baseline).kind).toBe('invalid')
    expect(editorDirty(s.definition, s.baseline)).toBe(true)
    expect(s.definition.questions[0]!.config).toHaveProperty(field, null)
  })

  const unknownCases = [
    { type: 'text', field: 'unknown', value: undefined }, { type: 'number', field: 'unknown', value: undefined },
    { type: 'single_choice', field: 'unknown', value: undefined }, { type: 'multiple_choice', field: 'unknown', value: undefined },
    { type: 'rating', field: 'unknown', value: undefined }, { type: 'text', field: 'unknown', value: '' },
    { type: 'text', field: 'min', value: '' }, { type: 'number', field: 'variant', value: undefined },
    { type: 'single_choice', field: 'placeholder', value: ' \u0085 ' },
  ] satisfies (FieldCase & { value: unknown })[]
  it.each(unknownCases)('$type unknown $field=$value stays dirty and is rejected', ({ type, field, value }) => {
    const s = session(type)
    Object.assign(s.definition.questions[0]!.config, { [field]: value })
    expect(validateDraft(s.definition, s.baseline).kind).toBe('invalid')
    expect(buildDraftDelta(s.definition, s.baseline).kind).toBe('invalid')
    expect(editorDirty(s.definition, s.baseline)).toBe(true)
    expect(Object.hasOwn(s.definition.questions[0]!.config, field)).toBe(true)
  })

  const invalidCases = optionalFields.map(({ type, field }) => ({ type, field,
    value: field === 'placeholder' ? 7 : field === 'variant' ? 'invalid-variant' : 'not-a-number',
  }))
  it.each(invalidCases)('$type config[$field] illegal nonempty input stays dirty and is rejected', ({ type, field, value }) => {
    const s = session(type)
    Object.assign(s.definition.questions[0]!.config, { [field]: value })
    expect(validateDraft(s.definition, s.baseline).kind).toBe('invalid')
    expect(buildDraftDelta(s.definition, s.baseline).kind).toBe('invalid')
    expect(editorDirty(s.definition, s.baseline)).toBe(true)
    expect(s.definition.questions[0]!.config).toHaveProperty(field, value)
  })

  it('generic comparison still distinguishes an unknown undefined key from omission', () => {
    expect(semanticEqual({ unknown: undefined }, {})).toBe(false)
    expect(semanticEqual({ value: null }, {})).toBe(false)
  })
})
