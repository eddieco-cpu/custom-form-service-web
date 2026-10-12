import { describe, expect, it } from 'vitest'
import { addQuestion, changeQuestionType, changeVariant, createEditor, editorDirty, loadEditor, removeOption, removeQuestion, reorderOptions, reorderQuestions } from '../../app/domain/editor'
import { buildCreateRequest, buildDraftDelta } from '../../app/domain/definition-request'
import { validateConfig, validateDraft, validatePublish } from '../../app/domain/definition-validation'
import { publishPathMap } from '../../app/domain/error-path'
import { locateDetails } from '../../app/domain/error-presentation'
import { stringifyExactJson, parseExactJson } from '../../app/utils/exact-json'
import type { EditorDefinition, RequestBuild } from '../../app/domain/models'
import { errorDetail, form, ids, O, Q, uuid } from '../fixtures/f5/payloads'

function ready<T>(result: RequestBuild<T>) { if (result.kind !== 'ready') throw new Error(`Expected ready: ${JSON.stringify(result)}`); return result }
const delta = (mutate: (d: EditorDefinition) => EditorDefinition | undefined) => {
  const s = loadEditor(form()), changed = mutate(s.definition)
  return buildDraftDelta(changed ?? s.definition, s.baseline)
}
describe('F5 fixed expected Create and Draft Delta', () => {
  it('new requires Visibility; valid minimum Create is a whitelisted normalized body', () => {
    const { definition } = createEditor('合成')
    definition.title = ' \u0085😀草稿\u3000 '; definition.description = ' \u0085 '
    expect(buildCreateRequest(definition).kind).toBe('invalid')
    definition.resultVisibility = 'public'
    expect(ready(buildCreateRequest(definition)).body).toEqual({ title: '😀草稿', description: null, responseMode: 'single', responseIdentity: 'anonymous',
      resultVisibility: 'public', submissionDeadlineAt: null, questions: [] })
    expect(validatePublish(definition, '2026-10-12T00:00:00Z').kind).toBe('invalid')
  })
  it('Create sends new complete questions/options without local keys or readonly metadata', () => {
    let d = createEditor('合成').definition
    d.title = '新表單'; d.resultVisibility = 'owner_only'
    d = addQuestion(d, 'single_choice', ids()); d.questions[0]!.title = '選擇'
    const body = ready(buildCreateRequest(d)).body
    expect(body.questions).toEqual([{ type: 'single_choice', title: '選擇', description: null, required: false, sortOrder: 0,
      config: { variant: 'radio' }, options: [
        { label: '選項 1', value: `opt_${uuid(101)}`, sortOrder: 0 }, { label: '選項 2', value: `opt_${uuid(103)}`, sortOrder: 1 },
      ] }])
    expect(stringifyExactJson(body)).not.toMatch(/tmp_|serverId|creatorDisplayName|createdAt|updatedAt|"id"|metadata/)
    expect(buildCreateRequest(loadEditor(form()).definition).kind).toBe('invalid')
  })
  it('unchanged loaded model produces noop; editing only title never fills config or sparse order', () => {
    const s = loadEditor(form())
    expect(buildDraftDelta(s.definition, s.baseline)).toEqual({ kind: 'noop' })
    s.definition.questions[0]!.title = '新標題'
    expect(ready(buildDraftDelta(s.definition, s.baseline)).body).toEqual({ questions: [{ id: Q[0], title: '新標題' }] })
  })
  it('config replacement keeps original settings and omitted variant', () => {
    const q = form().questions[0]!
    const s = loadEditor(form([{ ...q, type: 'text', config: { minLength: 2 } }]))
    const text = s.definition.questions[0]!
    if (text.type !== 'text') throw new Error('fixture')
    text.config.placeholder = ' 請輸入 '
    expect(ready(buildDraftDelta(s.definition, s.baseline)).body).toEqual({ questions: [{ id: Q[0], config: { minLength: 2, placeholder: '請輸入' } }] })
    const changed = changeVariant(s.definition, Q[0]!, 'textarea')
    expect(ready(buildDraftDelta(changed, s.baseline)).body).toEqual({ questions: [{ id: Q[0], config: { minLength: 2, placeholder: '請輸入', variant: 'textarea' } }] })
    const back = changeVariant(changed, Q[0]!, 'input')
    expect(ready(buildDraftDelta(back, s.baseline)).body).toEqual({ questions: [{ id: Q[0], config: { minLength: 2, placeholder: '請輸入' } }] })
  })
  it('fallback variant roundtrip and empty optional keys are noops', () => {
    const s = loadEditor(form())
    const changed = changeVariant(s.definition, Q[0]!, 'textarea')
    expect(buildDraftDelta(changeVariant(changed, Q[0]!, 'input'), s.baseline)).toEqual({ kind: 'noop' })
    const text = s.definition.questions[0]!
    if (text.type !== 'text') throw new Error('fixture')
    text.config.placeholder = ' \u0085 '; text.config.minLength = ''
    expect(buildDraftDelta(s.definition, s.baseline)).toEqual({ kind: 'noop' })
  })
  it('sparse reorder sends dense sortOrder, preserves ID/value and undo is noop', () => {
    const s = loadEditor(form())
    const swapped = reorderQuestions(s.definition, [Q[1]!, Q[0]!, ...Q.slice(2)])
    expect(ready(buildDraftDelta(swapped, s.baseline)).body).toEqual({ questions: [
      { id: Q[1], sortOrder: 0 }, { id: Q[0], sortOrder: 1 }, { id: Q[2], sortOrder: 2 }, { id: Q[3], sortOrder: 3 }, { id: Q[4], sortOrder: 4 },
    ] })
    expect(buildDraftDelta(reorderQuestions(swapped, Q), s.baseline)).toEqual({ kind: 'noop' })
    const options = reorderOptions(s.definition, Q[2]!, [O[1]!, O[0]!])
    expect(ready(buildDraftDelta(options, s.baseline)).body).toEqual({ questions: [{ id: Q[2], options: [{ id: O[1], sortOrder: 0 }, { id: O[0], sortOrder: 1 }] }] })
    expect(buildDraftDelta(reorderOptions(options, Q[2]!, [O[0]!, O[1]!]), s.baseline)).toEqual({ kind: 'noop' })
  })
  it('new then local delete emits nothing; existing option delete is id-only plus final sibling order', () => {
    const s = loadEditor(form()), added = addQuestion(s.definition, 'text', ids())
    expect(buildDraftDelta(removeQuestion(added, added.questions[5]!.key), s.baseline)).toEqual({ kind: 'noop' })
    expect(ready(buildDraftDelta(removeOption(s.definition, Q[2]!, O[1]!), s.baseline)).body).toEqual({ questions: [{ id: Q[2], options: [{ id: O[1] }, { id: O[0], sortOrder: 0 }] }] })
  })
  it('whole question removal sends one id-only delete without nested option deletion', () => {
    const s = loadEditor(form()), single = loadEditor(form([form().questions[2]!]))
    expect(ready(buildDraftDelta(removeQuestion(single.definition, Q[2]!), single.baseline)).body).toEqual({ questions: [{ id: Q[2] }] })
    const removed = ready(buildDraftDelta(removeQuestion(s.definition, Q[2]!), s.baseline)).body
    expect(removed.questions?.at(-1)).toEqual({ id: Q[2] })
    expect(removed.questions?.map(q => 'id' in q && q.id)).toEqual([Q[0], Q[1], Q[3], Q[4], Q[2]])
  })
  it('Choice -> text sends type and complete target config without nonempty Option Delta', () => {
    expect(ready(delta(d => changeQuestionType(d, Q[2]!, 'text', true).definition)).body).toEqual({ questions: [{ id: Q[2], type: 'text', config: { variant: 'input' } }] })
  })
  it('fixed expected: existing single_choice -> confirmed text -> single_choice explicitly deletes original IDs and creates new Options', () => {
    const s = loadEditor(form())
    const text = changeQuestionType(s.definition, Q[2]!, 'text', true).definition
    const choice = changeQuestionType(text, Q[2]!, 'single_choice', false, ids()).definition
    expect(choice.questions[2]?.type).toBe(s.definition.questions[2]?.type)
    expect(choice.questions[2]?.options.some(o => o.serverId === O[0] || o.serverId === O[1])).toBe(false)
    const result = ready(buildDraftDelta(choice, s.baseline))
    const expected = { questions: [{ id: Q[2], options: [
      { id: O[0] }, { id: O[1] },
      { label: '選項 1', value: `opt_${uuid(100)}`, sortOrder: 0 }, { label: '選項 2', value: `opt_${uuid(102)}`, sortOrder: 1 },
    ] }] }
    expect(result.body).toEqual(expected)
    expect(stringifyExactJson(result.body)).toBe('{"questions":[{"id":"00000000-0000-4000-8000-000000000003","options":[{"id":"00000000-0000-4000-8000-000000000011"},{"id":"00000000-0000-4000-8000-000000000012"},{"label":"選項 1","value":"opt_00000000-0000-4000-8000-000000000100","sortOrder":0},{"label":"選項 2","value":"opt_00000000-0000-4000-8000-000000000102","sortOrder":1}]}]}')
    expect(result.body.questions?.[0]).not.toHaveProperty('type') // The Server sees no type change.
    expect(editorDirty(choice, s.baseline)).toBe(true)
    // Independent contract-effect assertion: id-only removes originals; creates get only new synthetic Server IDs.
    const item = result.body.questions?.[0]
    if (!item || !('id' in item)) throw new Error('fixture')
    const remaining = [...form().questions[2]!.options]
    for (const entry of item.options ?? []) {
      if ('id' in entry) remaining.splice(remaining.findIndex(o => o.id === entry.id), 1)
      else remaining.push({ ...entry, id: uuid(300 + remaining.length) })
    }
    expect(remaining.map(o => ({ label: o.label, value: o.value, sortOrder: o.sortOrder }))).toEqual([
      { label: '選項 1', value: `opt_${uuid(100)}`, sortOrder: 0 }, { label: '選項 2', value: `opt_${uuid(102)}`, sortOrder: 1 },
    ])
    expect(remaining.some(o => O.includes(o.id))).toBe(false)
    expect(locateDetails([errorDetail('questions[0].options[0].id'), errorDetail('questions[0].options[2].label')], result.map).map(d => d.targetKey)).toEqual([undefined, choice.questions[2]?.options[0]?.key])
  })
  it('Choice interchange preserves Options without fabricated deletion; nonChoice -> Choice creates them', () => {
    expect(ready(delta(d => changeQuestionType(d, Q[2]!, 'multiple_choice').definition)).body).toEqual({ questions: [{ id: Q[2], type: 'multiple_choice', config: { variant: 'checkbox' } }] })
    const result = ready(delta(d => changeQuestionType(d, Q[0]!, 'single_choice', false, ids()).definition)).body
    expect(result).toEqual({ questions: [{ id: Q[0], type: 'single_choice', config: { variant: 'radio' }, options: [
      { label: '選項 1', value: `opt_${uuid(100)}`, sortOrder: 0 }, { label: '選項 2', value: `opt_${uuid(102)}`, sortOrder: 1 },
    ] }] })
  })
  it('description clearing uses null, deadline preserves subsecond precision until actually edited', () => {
    expect(ready(delta(d => { d.description = ' '; d.questions[0]!.description = ' '; d.resultVisibility = 'public'; return undefined })).body).toEqual({ description: null })
    expect(ready(delta(d => { d.deadlineInput = ''; return undefined })).body).toEqual({ submissionDeadlineAt: null })
    expect(ready(delta(d => { d.deadlineInput = '2026-12-31 18:31:00'; return undefined })).body).toEqual({ submissionDeadlineAt: '2026-12-31T10:31:00Z' })
    expect(delta(d => { d.deadlineInput = '2026-12-31 18:31'; return undefined }).kind).toBe('invalid')
    const withDesc = form([{ ...form().questions[0]!, description: '既有說明' }]), s = loadEditor(withDesc)
    s.definition.questions[0]!.description = ''
    expect(ready(buildDraftDelta(s.definition, s.baseline)).body).toEqual({ questions: [{ id: Q[0], description: null }] })
  })
  it('number config equivalence is noop and changed bounds survive the exact wire', () => {
    expect(delta(d => { const q = d.questions[1]!; if (q.type === 'number') q.config.min = '0e0'; return undefined })).toEqual({ kind: 'noop' })
    const body = ready(delta(d => { const q = d.questions[1]!; if (q.type === 'number') q.config.min = '0.123456789012345678901'; return undefined })).body
    expect(stringifyExactJson(body)).toBe(`{"questions":[{"id":"${Q[1]}","config":{"min":0.123456789012345678901,"max":9007199254740993.1234567890123456789}}]}`)
    expect(parseExactJson(stringifyExactJson(body))).toEqual(body)
  })
  it('rejects forged tmp IDs, foreign-parent Option IDs and duplicate IDs before building', () => {
    expect(delta(d => { Object.assign(d.questions[0]!, { serverId: `tmp_${uuid(100)}` }); return undefined }).kind).toBe('invalid')
    expect(delta(d => { Object.assign(d.questions[2]!.options[0]!, { key: O[2], serverId: O[2] }); return undefined }).kind).toBe('invalid')
    expect(delta(d => { Object.assign(d.questions[1]!, { serverId: Q[0] }); return undefined }).kind).toBe('invalid')
    const s = loadEditor(form()), other = loadEditor({ ...form(), id: uuid(999) })
    expect(buildDraftDelta(s.definition, other.baseline).kind).toBe('invalid')
  })
  it('Body/path snapshot is immutable, indexes locate third screen question and unknown/deleted controls remain summary', () => {
    const s = loadEditor(form())
    s.definition.questions[2]!.options[1]!.label = '更新乙'
    const result = ready(buildDraftDelta(s.definition, s.baseline))
    expect(result.body).toEqual({ questions: [{ id: Q[2], options: [{ id: O[1], label: '更新乙' }] }] })
    const paths = ['questions[0].options[0].label', 'questions[0].config.unknown', 'unknown', 'questions[5].title']
    const locations = locateDetails(paths.map(errorDetail), result.map)
    expect(locations.map(d => d.targetKey)).toEqual([O[1], undefined, undefined, undefined])
    expect(locations[0]?.suffix).toBe('.label')
    expect(locateDetails([errorDetail('questions[0].title')], publishPathMap(s.baseline.definition))[0]?.targetKey).toBe(Q[0])
    s.definition.questions.reverse(); s.definition.questions[2]!.options[1]!.label = '後續變更'
    expect(result.body.questions?.[0]).toEqual({ id: Q[2], options: [{ id: O[1], label: '更新乙' }] })
    expect(locateDetails([errorDetail(paths[0]!)], result.map)[0]?.targetKey).toBe(O[1])
    expect(Object.isFrozen(result.body.questions)).toBe(true)
    const deleted = ready(buildDraftDelta(removeQuestion(s.definition, Q[0]!), s.baseline))
    expect(locateDetails([errorDetail(`questions[${deleted.body.questions!.length - 1}].id`)], deleted.map)[0]?.targetKey).toBeUndefined()
  })
  it('saved response establishes new Server IDs and clean baseline only on explicit adoption', () => {
    const s = loadEditor(form()), added = addQuestion(s.definition, 'text', ids())
    added.questions[5]!.title = '新增'
    ready(buildDraftDelta(added, s.baseline))
    expect(s.baseline.definition.questions).toHaveLength(5)
    expect(editorDirty(added, s.baseline)).toBe(true)
    const saved = form([...form().questions, { id: uuid(500), type: 'text', title: '新增', description: null, required: false, sortOrder: 5, config: { variant: 'input' }, options: [] }])
    const adopted = loadEditor(saved)
    expect(adopted.definition.questions[5]?.key).toBe(uuid(500))
    expect(editorDirty(adopted.definition, adopted.baseline)).toBe(false)
    expect(buildDraftDelta(adopted.definition, adopted.baseline)).toEqual({ kind: 'noop' })
  })
})
describe('F5 Draft / Publish validation', () => {
  it('Draft permits empty questions, Choice options and missing Rating bounds; Publish rejects each', () => {
    for (const questions of [[], [{ ...form().questions[2]!, options: [] }], [{ ...form().questions[4]!, type: 'rating' as const, config: {} }]]) {
      const { definition } = loadEditor(form(questions))
      expect(validateDraft(definition).kind).toBe('valid')
      expect(validatePublish(definition, '2026-10-12T00:00:00Z').kind).toBe('invalid')
    }
    expect(validatePublish(loadEditor(form()).definition, '2026-10-12T00:00:00Z').kind).toBe('valid')
  })
  it('past/equal deadline saves Draft; Publish compares exact ticks with injected time', () => {
    const d = loadEditor(form()).definition
    expect(validateDraft(d).kind).toBe('valid')
    expect(validatePublish(d, '2026-12-31T10:30:00.1234566Z').kind).toBe('valid')
    expect(validatePublish(d, '2026-12-31T10:30:00.1234567Z').kind).toBe('invalid')
    expect(validatePublish(d, '2027-01-01T00:00:00Z').kind).toBe('invalid')
  })
  it.each([null, [], { minLength: null }, { minLength: 'broken' }, { minLength: '-1' }, { minLength: '1.0' }, { minLength: '2147483648' }, { variant: 'stars' }, { unknown: '' }, { minLength: '2', maxLength: '1' }])('rejects illegal provided text config %j', config => {
    expect(validateConfig('text', config, Q[0]!).kind).toBe('invalid')
  })
  it.each([{ min: 'NaN' }, { min: 'Infinity' }, { min: ' ' }, { min: '2', max: '1' }, { min: null }, { variant: 'input' }])('rejects illegal provided number config %j', config => {
    expect(validateConfig('number', config, Q[1]!).kind).toBe('invalid')
  })
  it.each([{ min: '-1' }, { min: '101' }, { min: '1.5' }, { min: '0', max: '0' }, { min: null }, { max: '100.0' }])('rejects illegal provided Rating config %j', config => {
    expect(validateConfig('rating', config, Q[4]!).kind).toBe('invalid')
  })
  it('normalizes optional config empties but never null and validates Unicode codepoint lengths', () => {
    expect(validateConfig('text', { minLength: '', placeholder: ' \u0085 ' }, Q[0]!)).toEqual({ kind: 'valid', candidate: {} })
    const d = loadEditor(form()).definition
    d.title = '😀'.repeat(200); expect(validateDraft(d).kind).toBe('valid')
    d.title += '😀'; expect(validateDraft(d).kind).toBe('invalid')
    d.title = '合法'; d.questions[0]!.title = '😀'.repeat(1000)
    d.questions[2]!.options[0]!.label = '😀'.repeat(1000)
    expect(validateDraft(d).kind).toBe('valid')
    d.questions[0]!.title = '\u0085\u3000'; expect(validateDraft(d).kind).toBe('invalid')
  })
  it('label duplicates are allowed; duplicate normalized values, blank labels and nonChoice Options fail', () => {
    const d = loadEditor(form()).definition
    d.questions[2]!.options[1]!.label = '既有甲'
    expect(validateDraft(d).kind).toBe('valid')
    Object.assign(d.questions[2]!.options[1]!, { value: ' original_A ' })
    expect(validateDraft(d).kind).toBe('invalid')
    const invalid = loadEditor(form()).definition
    invalid.questions[0]!.options.push(invalid.questions[2]!.options[0]!)
    expect(validateDraft(invalid).kind).toBe('invalid')
    invalid.questions[0]!.options = []; invalid.questions[2]!.options[0]!.label = ' '
    expect(validateDraft(invalid).kind).toBe('invalid')
  })
  it('rejects invalid, duplicate saved sortOrder and out-of-range Option values', () => {
    const d = loadEditor(form()).definition
    d.questions[1]!.sortOrder = d.questions[0]!.sortOrder
    expect(validateDraft(d).kind).toBe('invalid')
    d.questions[1]!.sortOrder = -1; expect(validateDraft(d).kind).toBe('invalid')
    d.questions[1]!.sortOrder = 30
    d.questions[2]!.options[1]!.sortOrder = 10; expect(validateDraft(d).kind).toBe('invalid')
    d.questions[2]!.options[1]!.sortOrder = 30
    Object.assign(d.questions[2]!.options[1]!, { value: '😀'.repeat(256) }); expect(validateDraft(d).kind).toBe('invalid')
  })
})
