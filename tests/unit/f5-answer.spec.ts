import { describe, expect, it } from 'vitest'
import { answerBaseline, answerDefinition, answerDirty, buildAnswerRequest, emptyAnswers, numberAnswer, savedAnswerDefinition, validateAnswers } from '../../app/domain/answer'
import { addQuestion, createEditor, loadEditor } from '../../app/domain/editor'
import { locateDetails } from '../../app/domain/error-presentation'
import { parseExactJson, stringifyExactJson } from '../../app/utils/exact-json'
import { ExactNumber } from '../../app/utils/exact-number'
import type { RequestBuild } from '../../app/domain/models'
import { errorDetail, form, ids, O, Q, uuid } from '../fixtures/f5/payloads'

function ready<T>(result: RequestBuild<T>) { if (result.kind !== 'ready') throw new Error('Expected ready'); return result }
const setup = () => { const definition = savedAnswerDefinition(form()); return { definition, ...emptyAnswers(definition) } }
describe('F5 five-type Answer domain', () => {
  it('initializes every type explicitly unanswered and optional blanks produce answers []', () => {
    const { definition, model, baseline } = setup()
    expect(model.values).toEqual({
      [Q[0]!]: { type: 'text', raw: '' }, [Q[1]!]: { type: 'number', raw: '' }, [Q[2]!]: { type: 'single_choice', optionKey: undefined },
      [Q[3]!]: { type: 'multiple_choice', optionKeys: [] }, [Q[4]!]: { type: 'rating', value: undefined },
    })
    expect(answerDirty(model, baseline)).toBe(false)
    expect(ready(buildAnswerRequest(definition, model)).body).toEqual({ answers: [] })
    model.values[Q[0]!] = { type: 'text', raw: '\u0085\u3000' }
    expect(ready(buildAnswerRequest(definition, model)).body).toEqual({ answers: [] })
    expect(answerDirty(model, baseline)).toBe(false)
  })
  it.each(['text', 'number', 'single_choice', 'multiple_choice', 'rating'] as const)('required %s empty blocks submission', type => {
    const q = form().questions.find(q => q.type === type)!
    const definition = savedAnswerDefinition(form([{ ...q, required: true }]))
    const { model } = emptyAnswers(definition)
    expect(buildAnswerRequest(definition, model).kind).toBe('invalid')
    expect(validateAnswers(definition, model)).toEqual({ kind: 'invalid', issues: [{ targetKey: q.id, field: 'value', message: '此題必填' }] })
  })
  it('keeps number 0 and Rating 0, distinguishes Range visual min from explicit answer, clearing restores empty', () => {
    const { definition, model, baseline } = setup()
    expect(model.values[Q[4]!]).toEqual({ type: 'rating', value: undefined })
    model.values[Q[1]!] = numberAnswer('0'); model.values[Q[4]!] = { type: 'rating', value: 0 }
    expect(ready(buildAnswerRequest(definition, model)).body).toEqual({ answers: [{ questionId: Q[1], value: ExactNumber.from('0') }, { questionId: Q[4], value: 0 }] })
    expect(answerDirty(model, baseline)).toBe(true)
    model.values[Q[1]!] = numberAnswer(''); model.values[Q[4]!] = { type: 'rating', value: undefined }
    expect(ready(buildAnswerRequest(definition, model)).body).toEqual({ answers: [] })
    expect(answerDirty(model, baseline)).toBe(false)
  })
  it('five valid values use only Server Question/Option IDs, with a fixed expected wire', () => {
    const { definition, model } = setup()
    model.values[Q[0]!] = { type: 'text', raw: ' \u0085Hello  😀\u3000 ' }
    model.values[Q[1]!] = numberAnswer('9007199254740993')
    model.values[Q[2]!] = { type: 'single_choice', optionKey: O[1] }
    model.values[Q[3]!] = { type: 'multiple_choice', optionKeys: [O[2]!, O[3]!] }
    model.values[Q[4]!] = { type: 'rating', value: 5 }
    const result = ready(buildAnswerRequest(definition, model))
    expect(stringifyExactJson(result.body)).toBe(`{"answers":[{"questionId":"${Q[0]}","value":"Hello  😀"},{"questionId":"${Q[1]}","value":9007199254740993},{"questionId":"${Q[2]}","value":"${O[1]}"},{"questionId":"${Q[3]}","value":["${O[2]}","${O[3]}"]},{"questionId":"${Q[4]}","value":5}]}`)
    expect(stringifyExactJson(result.body)).not.toMatch(/opt_|original_|tmp_|userId|formId|submittedAt/)
  })
  it.each(['0.123456789012345678901234567890123456789', '9007199254740993', '1e-100'])('exact builder -> F2 serializer/parser retains %s without rounding or strings', token => {
    const { definition, model } = setup()
    model.values[Q[1]!] = numberAnswer(token)
    const result = ready(buildAnswerRequest(definition, model))
    expect(stringifyExactJson(result.body)).toBe(`{"answers":[{"questionId":"${Q[1]}","value":${token}}]}`)
    const roundtrip = parseExactJson(stringifyExactJson(result.body)) as { answers: { value: ExactNumber }[] }
    expect(roundtrip.answers[0]?.value.equals(ExactNumber.from(token))).toBe(true)
  })
  it('1 / 1.0 / 1e0 are equal in dirty; stale cached exact cannot override raw input', () => {
    const { definition, model } = setup()
    model.values[Q[1]!] = numberAnswer('1')
    const baseline = answerBaseline(model)
    for (const token of ['1.0', '1e0']) { model.values[Q[1]!] = numberAnswer(token); expect(answerDirty(model, baseline)).toBe(false) }
    model.values[Q[1]!] = { type: 'number', raw: '2', exact: ExactNumber.from('1') }
    expect(ready(buildAnswerRequest(definition, model)).body.answers[0]?.value).toEqual(ExactNumber.from('2'))
    expect(answerDirty(model, baseline)).toBe(true)
  })
  it.each(['bad', 'NaN', 'Infinity', ' ', '01', '-0.1', '9007199254740993.123456789012345679'])('invalid nonempty optional number %s blocks', token => {
    const { definition, model, baseline } = setup()
    model.values[Q[1]!] = numberAnswer(token)
    expect(buildAnswerRequest(definition, model).kind).toBe('invalid')
    expect(answerDirty(model, baseline)).toBe(true)
  })
  it('bounds compare exactly at the final decimal digit', () => {
    const { definition, model } = setup()
    model.values[Q[1]!] = numberAnswer('9007199254740993.1234567890123456789')
    expect(buildAnswerRequest(definition, model).kind).toBe('ready')
    model.values[Q[1]!] = numberAnswer('9007199254740993.1234567890123456790')
    expect(buildAnswerRequest(definition, model).kind).toBe('invalid')
  })
  it('text trim/codepoint rules preserve case and inner whitespace; optional nonempty out-of-range blocks', () => {
    const q = form().questions[0]!, definition = savedAnswerDefinition(form([{ ...q, type: 'text', config: { minLength: 2, maxLength: 3 } }]))
    const { model } = emptyAnswers(definition)
    model.values[Q[0]!] = { type: 'text', raw: '😀' }; expect(buildAnswerRequest(definition, model).kind).toBe('invalid')
    model.values[Q[0]!] = { type: 'text', raw: '\u0085😀A\u3000' }
    expect(ready(buildAnswerRequest(definition, model)).body).toEqual({ answers: [{ questionId: Q[0], value: '😀A' }] })
    model.values[Q[0]!] = { type: 'text', raw: ' a B ' }
    expect(ready(buildAnswerRequest(definition, model)).body.answers[0]?.value).toBe('a B')
    model.values[Q[0]!] = { type: 'text', raw: 'e\u0301' }
    expect(ready(buildAnswerRequest(definition, model)).body.answers[0]?.value).toBe('e\u0301')
    model.values[Q[0]!] = { type: 'text', raw: '1234' }; expect(buildAnswerRequest(definition, model).kind).toBe('invalid')
  })
  it('rejects foreign Choice keys, value/label impostors, duplicate multiple selections and wrong input type', () => {
    const { definition, model } = setup()
    for (const key of [O[2]!, 'original_A', '既有甲', uuid(999), null]) {
      Object.assign(model.values[Q[2]!]!, { optionKey: key })
      expect(buildAnswerRequest(definition, model).kind).toBe('invalid')
    }
    model.values[Q[2]!] = { type: 'single_choice', optionKey: undefined }
    model.values[Q[3]!] = { type: 'multiple_choice', optionKeys: [O[2]!, O[2]!] }
    expect(buildAnswerRequest(definition, model).kind).toBe('invalid')
    model.values[Q[3]!] = { type: 'multiple_choice', optionKeys: [O[0]!] }
    expect(buildAnswerRequest(definition, model).kind).toBe('invalid')
    model.values[Q[3]!] = { type: 'multiple_choice', optionKeys: [] }
    model.values[Q[0]!] = numberAnswer('1')
    expect(buildAnswerRequest(definition, model).kind).toBe('invalid')
  })
  it.each([-1, 6, 1.5, NaN, Infinity, null])('invalid nonempty optional Rating %s blocks', value => {
    const { definition, model } = setup()
    Object.assign(model.values[Q[4]!]!, { value })
    expect(buildAnswerRequest(definition, model).kind).toBe('invalid')
  })
  it('multiple selection is a set for dirty; clearing and snapshot independence are preserved', () => {
    const { definition, model } = setup()
    model.values[Q[3]!] = { type: 'multiple_choice', optionKeys: [O[2]!, O[3]!] }
    const baseline = answerBaseline(model), result = ready(buildAnswerRequest(definition, model))
    model.values[Q[3]!] = { type: 'multiple_choice', optionKeys: [O[3]!, O[2]!] }
    expect(answerDirty(model, baseline)).toBe(false)
    model.values[Q[3]!] = { type: 'multiple_choice', optionKeys: [] }
    expect(answerDirty(model, baseline)).toBe(true)
    expect(result.body.answers[0]?.value).toEqual([O[2], O[3]])
    expect(baseline.values[Q[3]!]).toEqual({ type: 'multiple_choice', optionKeys: [O[2], O[3]] })
  })
  it('omission-aware map locates request index, missing Question ID and multi index; unknown paths stay summary', () => {
    const { definition, model } = setup()
    model.values[Q[3]!] = { type: 'multiple_choice', optionKeys: [O[2]!, O[3]!] }
    const result = ready(buildAnswerRequest(definition, model))
    const paths = ['answers[0].value[1]', `questions.${Q[0]}`, 'answers[1].value', `questions.${uuid(999)}`, 'answers[0].value[8]', 'answers[0].unknown']
    const located = locateDetails(paths.map(errorDetail), result.map)
    expect(located.map(d => d.targetKey)).toEqual([Q[3], Q[0], undefined, undefined, undefined, undefined])
    expect(located[0]?.suffix).toBe('.value[1]')
    model.values[Q[0]!] = { type: 'text', raw: '後續' }
    expect(locateDetails([errorDetail(paths[0]!)], result.map)[0]?.targetKey).toBe(Q[3])
  })
  it('Preview supports local keys and independent empty sessions, but formal builder refuses missing IDs', () => {
    const editor = addQuestion(createEditor('合成').definition, 'single_choice', ids())
    const preview = answerDefinition(editor), first = emptyAnswers(preview), second = emptyAnswers(preview), q = preview.questions[0]!
    first.model.values[q.key] = { type: 'single_choice', optionKey: q.options[0]!.key }
    expect(validateAnswers(preview, first.model).kind).toBe('valid')
    expect(buildAnswerRequest(preview, first.model).kind).toBe('invalid')
    expect(second.model.values[q.key]).toEqual({ type: 'single_choice', optionKey: undefined })
    editor.questions[0]!.options[0]!.label = '後續變更'
    expect(preview.questions[0]?.options[0]?.label).toBe('選項 1')
    expect(Object.isFrozen(preview.questions[0]?.config)).toBe(true)
  })
  it('rejects missing Option IDs and unknown model questions instead of leaking keys into formal Body', () => {
    const editor = loadEditor(form()).definition
    Object.assign(editor.questions[2]!.options[0]!, { serverId: undefined })
    const definition = answerDefinition(editor), { model } = emptyAnswers(definition)
    expect(buildAnswerRequest(definition, model).kind).toBe('invalid')
    const normal = setup()
    normal.model.values.foreign = { type: 'text', raw: 'wrong' }
    expect(buildAnswerRequest(normal.definition, normal.model).kind).toBe('invalid')
  })
  it('incomplete Rating has no invented bound or valid trial answer', () => {
    const q = form().questions[4]!, definition = savedAnswerDefinition(form([{ ...q, type: 'rating', config: {} }]))
    const { model } = emptyAnswers(definition)
    expect(validateAnswers(definition, model).kind).toBe('invalid')
  })
})
