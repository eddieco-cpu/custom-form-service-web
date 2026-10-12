import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../../app/services/api-client'
import { decodeCount, decodeError, decodeFormDetail, decodeReceipt, decodeStatistics, decodeSummaryPage, decodeUser } from '../../app/domain/api/decoders'
import { presentError, locateDetails } from '../../app/domain/error-presentation'
import { isUnknownWrite } from '../../app/domain/operation-state'
import { parseExactJson } from '../../app/utils/exact-json'
import { ExactNumber } from '../../app/utils/exact-number'
import { bigInteger, errorText, formId, formText, instant, optionId, receiptText, statisticsText } from '../fixtures/f2/payloads'

const baseUrl = 'http://localhost:5000/api/v1'
const read = { path: '/fixture', method: 'GET' as const, expectedStatus: 200 as const, decode: decodeCount }
describe('direct-resource client (mock fetch)', () => {
  afterEach(() => vi.useRealTimers())
  it('includes credentials, serializes exact numbers, and decodes direct receipt', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(receiptText(bigInteger), { status: 201 }))
    const client = createApiClient({ baseUrl, fetch: fetcher })
    const result = await client({ ...read, method: 'POST', expectedStatus: 201, decode: decodeReceipt, body: { value: ExactNumber.from(bigInteger) } })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0]?.[0]).toBe(`${baseUrl}/fixture`)
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include', body: `{"value":${bigInteger}}`, headers: { 'Content-Type': 'application/json' } })
    expect(result.kind).toBe('success')
    if (result.kind === 'success') expect((result.value.answers[0]?.value as ExactNumber).token).toBe(bigInteger)
  })
  it('handles 204 without reading the body', async () => {
    const response = new Response(null, { status: 204 }); const text = vi.spyOn(response, 'text')
    const client = createApiClient({ baseUrl, fetch: vi.fn(async () => response) })
    expect(await client({ ...read, method: 'DELETE', expectedStatus: 204, decode: () => undefined })).toEqual({ kind: 'success', status: 204, value: undefined })
    expect(text).not.toHaveBeenCalled()
  })
  it('accepts typed request interfaces and classifies failed 204 decoders as contract failures', async () => {
    interface TypedRequest { readonly displayName: string }
    const body: TypedRequest = { displayName: '合成姓名' }
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }))
    const result = await createApiClient({ baseUrl, fetch: fetcher })({ ...read, method: 'PATCH', expectedStatus: 204, body, decode: () => { throw new Error('wrong decoder') } })
    expect(result).toMatchObject({ kind: 'contract-error', status: 204, sent: true })
    expect(fetcher.mock.calls[0]?.[1]?.body).toBe('{"displayName":"合成姓名"}')
  })
  it.each([400, 401, 403, 404, 409, 500])('retains status/Envelope and never routes or retries %s', async (status) => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(errorText(), { status }))
    const result = await createApiClient({ baseUrl, fetch: fetcher })(read)
    expect(result).toMatchObject({ kind: 'api-error', status, error: { code: 'VALIDATION_ERROR' } })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each(['', '<html>error</html>', '{"data":{"count":1}}', '{"count":"1"}', '{"count":null}', '{"count":2147483648}'])('fails contract instead of inventing data: %s', async (body) => {
    const client = createApiClient({ baseUrl, fetch: vi.fn(async () => new Response(body)) })
    expect(await client(read)).toMatchObject({ kind: 'contract-error', status: 200, sent: true })
  })
  it('rejects local lossy body and base escape before any fetch', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const client = createApiClient({ baseUrl, fetch: fetcher })
    for (const path of ['//evil.test', '/../../outside']) {
      expect(await client({ ...read, path })).toMatchObject({ kind: 'local-error', sent: false })
    }
    expect(await client({ ...read, method: 'POST', body: { value: 0.1 } })).toMatchObject({ kind: 'local-error', sent: false })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('times out body reads, aborts signal, finishes timer, and retries zero times', async () => {
    vi.useFakeTimers()
    const response = new Response('{"count":1}'); vi.spyOn(response, 'text').mockImplementation(() => new Promise(() => {}))
    const fetcher = vi.fn<typeof fetch>(async () => response)
    const promise = createApiClient({ baseUrl, fetch: fetcher })(read)
    await vi.advanceTimersByTimeAsync(30000)
    expect(await promise).toEqual({ kind: 'transport-error', reason: 'timeout', sent: true })
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0); expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('network and abort results distinguish sent from never dispatched', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => { throw new Error('network') })
    const client = createApiClient({ baseUrl, fetch: fetcher })
    expect(await client(read)).toEqual({ kind: 'transport-error', reason: 'network', sent: true })
    const controller = new AbortController(); controller.abort()
    expect(await client({ ...read, signal: controller.signal })).toEqual({ kind: 'transport-error', reason: 'abort', sent: false })
    expect(fetcher).toHaveBeenCalledTimes(1)
    const pendingFetch = vi.fn<typeof fetch>(() => new Promise(() => {})); const aborter = new AbortController()
    const pending = createApiClient({ baseUrl, fetch: pendingFetch })({ ...read, signal: aborter.signal }); aborter.abort()
    expect(await pending).toEqual({ kind: 'transport-error', reason: 'abort', sent: true })
  })
})
describe('DTO / contextual errors', () => {
  it.each([
    { kind: 'transport-error', reason: 'timeout', sent: true } as const,
    { kind: 'transport-error', reason: 'network', sent: true } as const,
    { kind: 'contract-error', status: 200, message: 'Synthetic malformed body', sent: true } as const,
    { kind: 'api-error', status: 500, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Synthetic' } } as const,
  ])('Latest failure is a retryable read, not an unknown write: $kind', (result) => {
    expect(isUnknownWrite(result, 'read')).toBe(false)
    expect(isUnknownWrite(result, 'write')).toBe(true)
    expect(presentError(result, 'latest')).toMatchObject({ kind: 'read-failure', placement: 'dialog', message: '載入失敗，請手動重試。' })
    expect(presentError(result, 'action').kind).toBe('unknown-result')
  })
  it.each([['AUTH_REQUIRED', 'auth', 401], ['AUTH_USER_DISABLED', 'disabled', 403]] as const)('Latest retains %s routing classification', (code, kind, status) => {
    expect(presentError({ kind: 'api-error', status, error: { code, message: 'Synthetic' } }, 'latest').kind).toBe(kind)
  })
  it.each([
    ['text', '{"variant":"textarea","minLength":1,"maxLength":100}', '"😀文字"', '"😀文字"'],
    ['number', '{"min":0,"max":9007199254740993}', '9007199254740993', '9007199254740993'],
    ['rating', '{"variant":"range","min":0,"max":100}', '0', '0'],
    ['single_choice', '{"variant":"select"}', `"${optionId}"`, '"yes"'],
    ['multiple_choice', '{"variant":"multi_select"}', `["${optionId}"]`, '"yes"'],
  ])('decodes %s definition / receipt / statistic without changing semantics', (type, config, answer, statValue) => {
    const choice = type.endsWith('choice')
    const definition = formText().replace('"type":"number"', `"type":"${type}"`)
      .replace(/"config":\{[^}]+\}/, `"config":${config}`)
      .replace('"options":[]', choice ? `"options":[{"id":"${optionId}","label":"合成選項","value":"yes","sortOrder":0}]` : '"options":[]')
    const question = decodeFormDetail(parseExactJson(definition)).questions[0]
    expect(question?.type).toBe(type)
    const value = decodeReceipt(parseExactJson(receiptText(answer))).answers[0]?.value
    if (type === 'rating' || type === 'number') expect((value as ExactNumber).token).toBe(answer)
    else expect(value).toEqual(JSON.parse(answer))
    const statistics = statisticsText(statValue).replace('"type":"number"', `"type":"${type}"`)
      .replace('"statistics":[{', choice ? `"statistics":[{"optionId":"${optionId}","label":"合成選項",` : '"statistics":[{')
    const item = decodeStatistics(parseExactJson(statistics)).questions[0]?.statistics[0]
    if (type === 'number') expect((item?.value as ExactNumber).token).toBe(statValue)
    else expect(item?.value).toEqual(JSON.parse(statValue))
  })
  it('validates resource nullable, enums, raw config, page and zero count', () => {
    expect(decodeUser(parseExactJson(`{"id":"${formId}","email":"synthetic@example.test","displayName":"合成姓名","avatarUrl":null}`)).avatarUrl).toBeNull()
    const form = decodeFormDetail(parseExactJson(formText().replace('"type":"number"', '"type":"rating"').replace(/"config":\{[^}]+\}/, '"config":{}')))
    expect(form.questions[0]?.config).toEqual({}); expect(form.questions[0]?.sortOrder).toBe(7)
    expect(decodeCount(parseExactJson('{"count":0}'))).toEqual({ count: 0 })
    expect(decodeSummaryPage(parseExactJson('{"items":[],"pagination":{"page":3,"pageSize":10,"totalItems":0,"totalPages":0}}')).pagination.page).toBe(3)
    expect(() => decodeFormDetail(parseExactJson(formText().replace('"status":"draft"', '"status":"other"')))).toThrow()
    expect(() => decodeFormDetail(parseExactJson(formText().replace('"config":{', '"config":{"variant":"input",')))).toThrow()
    expect(() => decodeUser(parseExactJson(`{"id":"${formId}","email":"a","displayName":"b"}`))).toThrow()
    expect(instant).toContain('.1234567')
  })
  it('preserves anonymous absence / identified empty array and rejects null/missing roots', () => {
    const anonymous = decodeStatistics(parseExactJson(statisticsText())).questions[0]?.statistics[0]
    expect(Object.hasOwn(anonymous ?? {}, 'respondents')).toBe(false)
    const identified = decodeStatistics(parseExactJson(statisticsText('0', ',"respondents":[]').replaceAll('"count":1', '"count":0')))
    expect(identified.questions[0]?.statistics[0]?.respondents).toEqual([])
    expect(() => decodeStatistics(parseExactJson(statisticsText('0', ',"respondents":null')))).toThrow()
    expect(() => decodeStatistics(parseExactJson(statisticsText().replace('"submissionDeadlineAt":null,', '')))).toThrow()
    expect(() => decodeError(parseExactJson('{"error":{"code":"x","message":"m","details":null}}'))).toThrow()
  })
  it('different contexts keep Auth, normal no-response, statistics and form absence distinct', () => {
    const error = (code: string, status = 401) => ({ kind: 'api-error' as const, status, error: decodeError(parseExactJson(errorText(code))) })
    expect(presentError(error('AUTH_INVALID_CREDENTIALS'), 'login').kind).toBe('credentials')
    expect(presentError(error('AUTH_REQUIRED'), 'bootstrap').kind).toBe('bootstrap-auth')
    expect(presentError(error('AUTH_REQUIRED'), 'action').kind).toBe('auth')
    expect(presentError(error('AUTH_USER_DISABLED', 403), 'action').kind).toBe('disabled')
    expect(presentError(error('RESPONSE_NOT_FOUND', 404), 'latest').kind).toBe('no-response')
    expect(presentError(error('FORM_NOT_FOUND', 404), 'read').kind).toBe('not-found')
    expect(presentError(error('STATISTICS_ACCESS_DENIED', 403), 'statistics').kind).toBe('access-denied')
    expect(presentError(error('INTERNAL_SERVER_ERROR', 500), 'action').kind).toBe('unknown-result')
    expect(presentError(error('INTERNAL_SERVER_ERROR', 500), 'read').kind).toBe('read-failure')
    expect(presentError(error('FUTURE_CODE', 400), 'action').knownCode).toBe(false)
  })
  it('maps immutable request positions by namespace, preserving unmapped details', () => {
    const details = decodeError(parseExactJson(errorText())).details ?? []
    const located = locateDetails(details, { namespace: 'delta', paths: { 'questions[0]': 'screen-question-3' } })
    expect(located[0]).toMatchObject({ targetKey: 'screen-question-3', suffix: '.config.min', namespace: 'delta' })
    expect(located[1]?.targetKey).toBeUndefined(); expect(located[1]?.detail.message).toBe('保留未知位置')
    expect(locateDetails(details, { namespace: 'publish', paths: { 'questions[0]': 'saved-first-question' } })[0]?.targetKey).toBe('saved-first-question')
    expect(locateDetails([{ path: `questions.${formId}`, code: 'REQUIRED_FIELD', message: 'missing' }], { namespace: 'answer', paths: { [`questions.${formId}`]: 'required-question-key' } })[0]?.targetKey).toBe('required-question-key')
  })
})
