import { describe, expect, it } from 'vitest'
import { ExactNumber, exactInteger, numberCandidate, withinBounds } from '../../app/utils/exact-number'
import { cloneExact, parseExactJson, stringifyExactJson } from '../../app/utils/exact-json'
import { decodeFormDetail, decodeReceipt, decodeStatistics } from '../../app/domain/api/decoders'
import { bigInteger, formText, longDecimal, receiptText, statisticsText } from '../fixtures/f2/payloads'

describe('F2 exact number feasibility gate (synthetic)', () => {
  it.each([bigInteger, longDecimal, '1e80', '1e-101', '1e400', '-1e401', '1e131071', '1e-16383', '0e1073741823'])('round-trips unquoted %s without native numbers', (token) => {
    const exact = ExactNumber.from(token)
    const body = stringifyExactJson({ value: exact })
    expect(body).toBe(`{"value":${token}}`) // Fixed wire expectation, not self-comparison only.
    const parsed = parseExactJson(body) as { value: ExactNumber }
    expect(parsed.value.token).toBe(token)
    const snapshot = cloneExact(parsed)
    expect(snapshot).not.toBe(parsed)
    expect(snapshot.value.token).toBe(token)
    expect(stringifyExactJson(snapshot)).toBe(body)
    for (const decoderText of [formText(token), receiptText(token), statisticsText(token)]) {
      expect(decoderText).toContain(token)
    }
    const form = decodeFormDetail(parseExactJson(formText(token)))
    const question = form.questions[0]
    expect(question?.type).toBe('number')
    if (question?.type === 'number') expect(question.config.min?.token).toBe(token)
    expect((decodeReceipt(parseExactJson(receiptText(token))).answers[0]?.value as ExactNumber).token).toBe(token)
    const stats = decodeStatistics(parseExactJson(statisticsText(token)))
    const q = stats.questions[0]
    if (q?.type !== 'number') throw new Error('Expected number question')
    expect(q.statistics[0]?.value.token).toBe(token)
  })
  it.each([['1', '1.0'], ['1.0', '1e0'], ['-0', '0'], ['1000e-3', '1']])('numeric equality %s = %s', (a, b) => {
    expect(ExactNumber.from(a).equals(ExactNumber.from(b))).toBe(true)
  })
  it.each([
    [bigInteger, '9007199254740994'], ['1e80', `1${'0'.repeat(79)}1`], ['0', '1e-101'],
    ['1e400', '1e401'], ['-1e401', '-1e400'], ['-2', '-1'], ['0.1', '0.1000000000000000000001'],
  ])('fixed expected order %s < %s', (a, b) => {
    expect(ExactNumber.from(a).compare(ExactNumber.from(b))).toBe(-1)
    expect(ExactNumber.from(b).compare(ExactNumber.from(a))).toBe(1)
  })
  it('compares inclusive bounds precisely and distinguishes unanswered from zero', () => {
    const min = ExactNumber.from('0.1'); const max = ExactNumber.from('0.1000000000000000000001')
    expect(withinBounds(min, min, max)).toBe(true); expect(withinBounds(max, min, max)).toBe(true)
    expect(withinBounds(ExactNumber.from('0.0999999999999999999999'), min, max)).toBe(false)
    expect(withinBounds(ExactNumber.from('0.1000000000000000000002'), min, max)).toBe(false)
    expect(() => decodeFormDetail(parseExactJson(formText().replace(`"min":${longDecimal}`, `"min":0.2,"max":0.1`)))).toThrow()
    expect(numberCandidate('')).toBeUndefined(); expect(numberCandidate('0')?.token).toBe('0')
  })
  it.each(['01', '+1', '.1', '1.', '1e', 'NaN', 'Infinity', '1,2', '1e131072', '1e-16384', '0e1073741824', '0e-1073741824', '0.00e-16382'])('rejects invalid or capacity-exceeding %s', (token) => {
    expect(() => ExactNumber.from(token)).toThrow()
  })
  it('checks original fractional capacity before trimming trailing zeros', () => {
    expect(ExactNumber.from('1.00e-16381').token).toBe('1.00e-16381')
    expect(() => ExactNumber.from('1.00e-16382')).toThrow()
  })
  it('only converts validated native integers; prevents accidental lossy serialization', () => {
    expect(exactInteger(ExactNumber.from('2147483647'))).toBe(2147483647)
    expect(exactInteger(ExactNumber.from('100'), 0, 100)).toBe(100)
    for (const token of ['2147483648', '-1', '1.0', '1e0']) expect(() => exactInteger(ExactNumber.from(token))).toThrow()
    expect(() => stringifyExactJson({ value: 0.1 })).toThrow()
    expect(() => Number(ExactNumber.from(bigInteger))).toThrow()
    expect(() => JSON.stringify({ value: ExactNumber.from(bigInteger) })).toThrow()
    expect(() => decodeFormDetail(parseExactJson(formText('"1"')))).toThrow()
    expect(() => decodeReceipt(parseExactJson(receiptText('null')))).toThrow()
    expect(() => decodeStatistics(parseExactJson(statisticsText('"1"')))).toThrow()
  })
})
