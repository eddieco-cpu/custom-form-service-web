import { describe, expect, it } from 'vitest'
import { addOption, addQuestion, changeQuestionType, changeVariant, createEditor, editorDirty, editorSnapshot, effectiveVariant, loadEditor, needsOptionsConfirmation, orderedDefinition, removeOption, removeQuestion, reorderOptions, reorderQuestions } from '../../app/domain/editor'
import { form, ids, O, Q, uuid } from '../fixtures/f5/payloads'

describe('F5 Editor models and operations', () => {
  it('new initial state is clean, unsaved and contains no automatic question or Visibility', () => {
    const { definition, baseline } = createEditor('合成建立者')
    expect(definition).toEqual({ metadata: { creatorDisplayName: '合成建立者' }, title: '', description: '', responseMode: 'single', responseIdentity: 'anonymous',
      resultVisibility: undefined, deadlineSource: { original: null, visible: '' }, deadlineInput: '', questions: [] })
    expect(editorDirty(definition, baseline)).toBe(false)
  })
  it('decoded detail loads clean with raw omission, sparse order, exact bounds and deadline precision', () => {
    const { definition, baseline } = loadEditor(form())
    expect(definition.questions[0]?.config).toEqual({})
    expect(effectiveVariant(definition.questions[0]!)).toBe('input')
    expect(definition.questions.map(q => q.sortOrder)).toEqual([10, 30, 50, 70, 90])
    expect(definition.questions[1]?.config).toEqual({ min: '0', max: '9007199254740993.1234567890123456789' })
    expect(definition.deadlineSource.original?.originalIso).toBe('2026-12-31T10:30:00.1234567Z')
    expect(editorDirty(definition, baseline)).toBe(false)
  })
  it('DTO, editable model, baseline and preview snapshots are independent', () => {
    const dto = form(), { definition, baseline } = loadEditor(dto), snapshot = editorSnapshot(definition)
    snapshot.questions[2]!.options[0]!.label = '預覽變更'
    definition.questions[2]!.options[0]!.label = '編輯变更'
    expect(dto.questions[2]?.options[0]?.label).toBe('既有甲')
    expect(baseline.definition.questions[2]?.options[0]?.label).toBe('既有甲')
    expect(snapshot.questions[2]?.options[0]?.label).toBe('預覽變更')
    expect(Object.isFrozen(baseline.definition.questions[2]?.options)).toBe(true)
  })
  it.each(['text', 'number', 'single_choice', 'multiple_choice', 'rating'] as const)('creates %s with explicit type defaults and local identity', (type) => {
    const definition = addQuestion(createEditor('合成').definition, type, ids())
    const q = definition.questions[0]!
    expect(q.key).toBe(`tmp_${uuid(100)}`); expect(q.serverId).toBeUndefined()
    expect(q.title).toBe(''); expect(q.description).toBe(''); expect(q.required).toBe(false)
    const expected = { text: { variant: 'input' }, number: {}, single_choice: { variant: 'radio' }, multiple_choice: { variant: 'checkbox' }, rating: { variant: 'stars', min: '1', max: '5' } }
    expect(q.config).toEqual(expected[type])
    expect(q.options.map(o => o.label)).toEqual(type.includes('choice') ? ['選項 1', '選項 2'] : [])
    q.options.forEach(o => { expect(o.key).toMatch(/^tmp_/); expect(o.value).toMatch(/^opt_/); expect(o.serverId).toBeUndefined() })
  })
  it('new labels fill the first unused number and values stay stable through label edits and reorder', () => {
    let d = addQuestion(createEditor('合成').definition, 'single_choice', ids())
    const q = d.questions[0]!, key = q.key, value = q.options[0]!.value
    q.options[0]!.label = '重複'; q.options[1]!.label = '重複'
    d = addOption(d, key, ids(200))
    expect(d.questions[0]?.options[2]?.label).toBe('選項 1')
    d = reorderOptions(d, key, d.questions[0]!.options.map(o => o.key).reverse())
    expect(d.questions[0]?.options[2]?.value).toBe(value)
    expect(new Set(d.questions[0]!.options.map(o => o.value)).size).toBe(3)
  })
  it('Choice -> non-Choice requires confirmation; cancel does not change any data', () => {
    const { definition, baseline } = loadEditor(form()), q = definition.questions[2]!
    expect(needsOptionsConfirmation(q, 'text')).toBe(true)
    const change = changeQuestionType(definition, q.key, 'text')
    expect(change.kind).toBe('confirmation-required'); expect(change.definition).toBe(definition)
    expect(editorDirty(definition, baseline)).toBe(false)
    expect(changeQuestionType(definition, q.key, 'text', true).definition.questions[2]?.options).toEqual([])
  })
  it('Choice round trip through text never resurrects removed Options', () => {
    const { definition } = loadEditor(form())
    const text = changeQuestionType(definition, Q[2]!, 'text', true).definition
    const choice = changeQuestionType(text, Q[2]!, 'single_choice', false, ids()).definition
    expect(choice.questions[2]?.options.map(o => o.serverId)).toEqual([undefined, undefined])
    expect(choice.questions[2]?.options.map(o => o.value)).toEqual([`opt_${uuid(100)}`, `opt_${uuid(102)}`])
    expect(definition.questions[2]?.options.map(o => o.serverId)).toEqual(O.slice(0, 2))
  })
  it('Choice interchange preserves identity and values while changing variant', () => {
    const { definition } = loadEditor(form())
    const multiple = changeQuestionType(definition, Q[2]!, 'multiple_choice').definition.questions[2]!
    expect(multiple.config).toEqual({ variant: 'checkbox' })
    expect(multiple.options).toEqual(definition.questions[2]?.options)
  })
  it('non-Choice switches use complete target defaults and retain common fields', () => {
    const { definition } = loadEditor(form())
    const rating = changeQuestionType(definition, Q[0]!, 'rating').definition.questions[0]!
    expect(rating.config).toEqual({ variant: 'stars', min: '1', max: '5' })
    expect(rating.title).toBe(definition.questions[0]?.title); expect(rating.serverId).toBe(Q[0])
    const number = changeQuestionType(definition, Q[4]!, 'number').definition.questions[4]!
    expect(number.config).toEqual({}); expect(number.options).toEqual([])
  })
  it('variant changes retain compatible settings and reverting effective fallback clears dirty', () => {
    const { definition, baseline } = loadEditor(form())
    const changed = changeVariant(definition, Q[0]!, 'textarea')
    expect(editorDirty(changed, baseline)).toBe(true)
    expect(editorDirty(changeVariant(changed, Q[0]!, 'input'), baseline)).toBe(false)
    const stars = changeVariant(definition, Q[4]!, 'stars')
    expect(stars.questions[4]?.config).toEqual({ variant: 'stars', min: '0', max: '5' })
    expect(() => changeVariant(definition, Q[1]!, 'input')).toThrow()
  })
  it('sparse question and option order is restored from final membership, not operation history', () => {
    const { definition, baseline } = loadEditor(form())
    const moved = reorderQuestions(definition, [...Q].reverse())
    expect(orderedDefinition(moved, baseline).questions.map(q => q.sortOrder)).toEqual([0, 1, 2, 3, 4])
    expect(editorDirty(moved, baseline)).toBe(true)
    expect(editorDirty(reorderQuestions(moved, Q), baseline)).toBe(false)
    const options = reorderOptions(definition, Q[2]!, [O[1]!, O[0]!])
    expect(orderedDefinition(options, baseline).questions[2]?.options.map(o => o.sortOrder)).toEqual([0, 1])
    expect(editorDirty(reorderOptions(options, Q[2]!, [O[0]!, O[1]!]), baseline)).toBe(false)
    expect(() => reorderQuestions(definition, [Q[0]!, Q[0]!])).toThrow()
  })
  it('add then remove clears dirty, existing visibility is excluded and invalid raw numeric input stays dirty', () => {
    const { definition, baseline } = loadEditor(form())
    const added = addQuestion(definition, 'text', ids())
    expect(editorDirty(removeQuestion(added, added.questions[5]!.key), baseline)).toBe(false)
    const withOption = addOption(definition, Q[2]!, ids())
    expect(editorDirty(removeOption(withOption, Q[2]!, withOption.questions[2]!.options[2]!.key), baseline)).toBe(false)
    definition.resultVisibility = 'public'
    expect(editorDirty(definition, baseline)).toBe(false)
    const number = definition.questions[1]!
    if (number.type !== 'number') throw new Error('fixture type')
    number.config.min = 'broken'; expect(editorDirty(definition, baseline)).toBe(true)
    number.config.min = '0e0'; expect(editorDirty(definition, baseline)).toBe(false)
    definition.title = '其他'; expect(editorDirty(definition, baseline)).toBe(true)
    definition.title = '  F5 合成表單  '; expect(editorDirty(definition, baseline)).toBe(false)
  })
  it('existing Rating missing bounds stays missing without fallback 1/5', () => {
    const rating = form().questions[4]!
    const { definition, baseline } = loadEditor(form([{ ...rating, type: 'rating', config: {} }]))
    expect(definition.questions[0]?.config).toEqual({})
    expect(effectiveVariant(definition.questions[0]!)).toBe('stars')
    expect(editorDirty(definition, baseline)).toBe(false)
  })
})
