import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeStatistics } from '../../app/domain/api/decoders'
import { statisticsView } from '../../app/domain/statistics-view'
import { statisticsService } from '../../app/services/statistics'
import { parseExactJson, stringifyExactJson } from '../../app/utils/exact-json'
import { statistics, largeStatistics, respondents, uuid, longText } from '../fixtures/f9/payloads'
const decode = (value: unknown) => decodeStatistics(parseExactJson(stringifyExactJson(value)))
afterEach(() => vi.unstubAllGlobals())
describe('F9 U01 independent display expectations and service boundary', () => {
  it('uses only one credentialed GET, no Body, and rejects another resource', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(stringifyExactJson(statistics())))
    vi.stubGlobal('fetch', fetcher)
    expect((await statisticsService('http://localhost:5000/api/v1').read(uuid(50))).kind).toBe('success')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0]).toMatchObject(['http://localhost:5000/api/v1/forms/' + uuid(50) + '/statistics', { method: 'GET', credentials: 'include' }])
    expect(fetcher.mock.calls[0]?.[1]).not.toHaveProperty('body')
    expect((await statisticsService('http://localhost:5000/api/v1').read('bad/id')).kind).toBe('contract-error')
    expect(fetcher.mock.calls[1]?.[0]).toContain('/bad%2Fid/statistics')
  })
  it('retains all nine root meanings, nullable fields and exact numeric tokens', () => {
    const dto = decode(statistics(true)), view = statisticsView(dto)
    expect(Object.keys(dto)).toHaveLength(9)
    expect(view).toMatchObject({ formId: uuid(50), title: 'F9 合成統計', description: '根說明\n第二行', creatorDisplayName: '合成建立者', count: 2, mode: '可多次填答', visibility: '所有人', deadline: '2026-12-31 18:30:00' })
    expect(dto.submissionDeadlineAt).toBe('2026-12-31T10:30:00.1234567Z')
    expect(view.questions.map(q => q.type)).toEqual(['文字', '數字', '單選', '多選', '評分'])
    expect(view.questions[0]!.items.map(i => i.label)).toEqual(['<script>window.fake = 1</script>\nCase', 'case'])
    expect(view.questions[1]!.items.map(i => i.label)).toEqual(['9007199254740992', '9007199254740993'])
    expect(view.questions[2]!.items.map(i => [i.key, i.label, i.count])).toEqual([[uuid(11), '同標籤', 2], [uuid(12), '同標籤', 0]])
    expect(view.questions[2]!.items[0]!.respondents).toEqual(respondents)
    expect(view.questions[3]!.items.map(i => i.count)).toEqual([2, 2])
    expect(view.questions[4]!.items.map(i => [i.label, i.count])).toEqual([['0', 2], ['1', 0], ['2', 0]])
    expect(statisticsView({ ...dto, description: null, submissionDeadlineAt: null, responseMode: 'single', resultVisibility: 'owner_only' })).toMatchObject({ description: null, deadline: '未設定', mode: '單次填答', visibility: '僅建立者' })
  })
  it.each([false, true])('keeps zero success and anonymous omission / identified empty lists (%s)', identified => {
    const view = statisticsView(decode(statistics(identified, true)))
    expect(view.count).toBe(0); expect(view.questions).toHaveLength(5)
    expect(view.questions.map(q => q.items.length)).toEqual([0, 0, 2, 2, 3])
    for (const q of view.questions) for (const item of q.items) {
      expect(item.count).toBe(0)
      expect(Object.hasOwn(item, 'respondents')).toBe(identified)
      if (identified) expect(item.respondents).toEqual([])
    }
  })
  it('never truncates questions, distributions, rating range, names or multiline Code Points', () => {
    const view = statisticsView(decode(largeStatistics()))
    expect(view.questions).toHaveLength(30); expect(view.questions[0]!.items).toHaveLength(200)
    expect(view.questions[1]!.items.map(i => i.label)).toEqual(Array.from({ length: 101 }, (_, i) => String(i)))
    expect(view.questions[2]!.items[0]!.respondents).toHaveLength(120)
    expect([...longText]).toHaveLength(2000)
    expect(view.questions[2]!.items[0]!.label).toBe(longText)
  })
  it.each(['missing-root', 'null-people', 'mixed-people', 'bad-count', 'duplicate-people', 'unknown-root', 'bad-type'])('rejects unreliable %s', variant => {
    const dto = parseExactJson(stringifyExactJson(statistics(true))) as Record<string, unknown>
    const questions = dto.questions as { type: unknown; statistics: Record<string, unknown>[] }[]
    if (variant === 'missing-root') delete dto.creatorDisplayName
    if (variant === 'null-people') questions[0]!.statistics[0]!.respondents = null
    if (variant === 'mixed-people') delete questions[0]!.statistics[0]!.respondents
    if (variant === 'bad-count') dto.count = '2'
    if (variant === 'duplicate-people') questions[2]!.statistics[0]!.respondents = [respondents[0], respondents[0]]
    if (variant === 'unknown-root') dto.responseIdentity = 'identified'
    if (variant === 'bad-type') questions[0]!.type = 'unknown'
    expect(() => decodeStatistics(dto)).toThrow()
  })
})
