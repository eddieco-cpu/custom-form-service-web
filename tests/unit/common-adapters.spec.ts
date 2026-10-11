import { describe, expect, it } from 'vitest'
import { codePointLength, codePointSchema, descriptionCandidate, emailCandidate, optionalTextCandidate, passwordCandidate, trimWhiteSpace } from '../../app/utils/unicode'
import { deadlineBaseline, deadlineCandidate, formatTaipei, parseInstant, taipeiToUtc } from '../../app/utils/datetime'

describe('Unicode / candidate semantics', () => {
  it('trims only White_Space edges, preserving internal spaces, FEFF and ZWSP', () => {
    const whitespace = '\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000'
    expect(trimWhiteSpace(`${whitespace}A  B${whitespace}`)).toBe('A  B')
    expect(trimWhiteSpace(' \ufeff\u200b ')).toBe('\ufeff\u200b')
    expect(descriptionCandidate(whitespace)).toBeNull(); expect(optionalTextCandidate(whitespace)).toBeUndefined()
  })
  it('counts code points without normalization and keeps passwords byte-for-byte', () => {
    expect(codePointLength('😀')).toBe(1); expect(codePointLength('e\u0301')).toBe(2)
    expect(trimWhiteSpace('e\u0301')).toBe('e\u0301')
    expect(passwordCandidate('  😀  ')).toBe('  😀  ')
    const schema = codePointSchema(10, 128, false)
    for (const length of [9, 10, 128, 129]) expect(schema.safeParse('😀'.repeat(length)).success).toBe(length >= 10 && length <= 128)
    expect(codePointSchema(1, 1).parse(' 😀 ')).toBe('😀')
  })
  it('ASCII email lowercases while non-ASCII casing belongs to server', () => {
    expect(emailCandidate(' A+B@EXAMPLE.TEST ')).toBe('a+b@example.test')
    for (const email of ['"a b"@example.test', 'a@localhost', '使用者@EXAMPLE.TEST', 'İ@example.test']) expect(emailCandidate(` ${email} `)).toBe(email)
  })
})
describe('exact datetime / baseline', () => {
  it('retains fraction and compares offset-equivalent instants', () => {
    const iso = '2026-10-10T10:30:00.1234567Z'
    expect(parseInstant(iso).ticks).toBe(parseInstant('2026-10-10T18:30:00.1234567+08:00').ticks)
    expect(formatTaipei(iso)).toBe('2026-10-10 18:30:00')
    expect(parseInstant(iso).ticks - parseInstant('2026-10-10T10:30:00.123456Z').ticks).toBe(7n)
    const baseline = deadlineBaseline(iso)
    expect(deadlineCandidate(baseline, baseline.visible)).toEqual({ changed: false, value: iso })
    expect(deadlineCandidate(baseline, '2026-10-10 18:31:00')).toEqual({ changed: true, value: '2026-10-10T10:31:00Z' })
    expect(deadlineCandidate(baseline, baseline.visible)).toEqual({ changed: false, value: iso })
    expect(deadlineCandidate(baseline, '')).toEqual({ changed: true, value: null })
    expect(deadlineCandidate(deadlineBaseline(null), '')).toEqual({ changed: false, value: null })
  })
  it('crosses days and validates leap years without JS rollover', () => {
    expect(taipeiToUtc('2024-02-29 00:00:00')).toBe('2024-02-28T16:00:00Z')
    expect(formatTaipei('2026-12-31T20:00:00Z')).toBe('2027-01-01 04:00:00')
    for (const input of ['2023-02-29 12:00:00', '2026-04-31 12:00:00', '2026-00-01 00:00:00', '2026-10-10 24:00:00', '2026-10-10 12:60:00', '2026-10-10 12:00']) expect(() => taipeiToUtc(input)).toThrow()
    for (const iso of ['2026-02-30T00:00:00Z', '2026-10-10T10:30:00.12345678Z', '2026-10-10T10:30:00+14:01', '2026-10-10T10:30:00']) expect(() => parseInstant(iso)).toThrow()
    expect(formatTaipei('1969-12-31T23:59:59.9999999Z')).toBe('1970-01-01 07:59:59')
  })
})
