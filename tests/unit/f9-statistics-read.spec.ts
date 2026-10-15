import { describe, expect, it, vi } from 'vitest'
import type { ApiResult } from '../../app/domain/api/result'
import type { UserDto } from '../../app/domain/api/user'
import type { StatisticsDto } from '../../app/domain/api/statistics'
import { AuthSession, initialAuthState } from '../../app/domain/auth-state'
import { RequestScope } from '../../app/domain/request-scope'
import { StatisticsReadController, statisticsReadError } from '../../app/domain/statistics-read'
import type { StatisticsReadState } from '../../app/domain/statistics-read'
import { statistics, uuid } from '../fixtures/f9/payloads'
const user: UserDto = { id: uuid(71), email: 'f9-unit@example.test', displayName: '合成', avatarUrl: null }
const ok = <T>(value: T): ApiResult<T> => ({ kind: 'success', status: 200, value })
const fail = (code: string, status = 401): ApiResult<never> => ({ kind: 'api-error', status, error: { code, message: '合成錯誤' } })
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { resolve, promise } }
function setup(me: () => Promise<ApiResult<UserDto>> = async () => ok(user)) {
  let path = `/forms/${uuid(50)}/statistics?x=1#result`, revision = 0
  const state: StatisticsReadState = { data: null, error: null, dialog: null }, changes: boolean[] = []
  const scope = new RequestScope(() => path, () => revision, loading => changes.push(loading))
  const session = new AuthSession(initialAuthState(), me), navigate = vi.fn(async () => {})
  const reader = new StatisticsReadController(state, scope, { path: () => path, revision: () => revision, invalidate: e => session.invalidate(e), navigate })
  const reload = vi.fn()
  session.subscribe(change => { if (change.source !== 'bootstrap') revision++; if (reader.credentialChanged(change)) reload() })
  return { state, reader, scope, session, navigate, reload, changes, path: () => path, move: () => { path = `/forms/${uuid(60)}/statistics`; reader.contextChanged() } }
}
describe('F9 U02 separate bootstrap, credential epochs and current read effects', () => {
  for (const outcome of [ok(user), fail('AUTH_REQUIRED'), fail('AUTH_USER_DISABLED', 403), { kind: 'transport-error', reason: 'network', sent: true } as const]) {
    it.each([true, false])(`public read is independent of me ${outcome.kind} ${outcome.kind === 'api-error' ? outcome.status : ''}; stats first=%s`, async first => {
      const me = deferred<ApiResult<UserDto>>(), stats = deferred<ApiResult<StatisticsDto>>(), s = setup(() => me.promise)
      const bootstrap = s.session.initialize(), read = s.reader.read(() => stats.promise)
      if (first) { stats.resolve(ok(statistics())); await read; me.resolve(outcome); await bootstrap }
      else { me.resolve(outcome); await bootstrap; expect(s.state.error).toBeNull(); expect(s.changes.at(-1)).toBe(true); stats.resolve(ok(statistics())); await read }
      expect(s.state.data?.title).toBe('F9 合成統計'); expect(s.navigate).not.toHaveBeenCalled(); expect(s.reload).not.toHaveBeenCalled()
    })
  }
  it.each(['login', 'logout', 'verify', 'invalidate', 'profile'] as const)('clears private data only for true %s changes and preserves reason', async action => {
    const s = setup(async () => ok({ ...user, id: uuid(72) })), events: unknown[] = []
    s.session.login(user); s.reload.mockClear(); s.session.subscribe(e => events.push(e))
    await s.reader.read(async () => ok(statistics(true)))
    if (action === 'login') s.session.login({ ...user, id: uuid(72) })
    else if (action === 'logout') s.session.logout()
    else if (action === 'verify') await s.session.verify()
    else if (action === 'invalidate') s.session.invalidate(fail('AUTH_REQUIRED') as Exclude<ApiResult<UserDto>, { kind: 'success' }>)
    else s.session.profile({ ...user, id: uuid(72) })
    expect(s.state.data).toBeNull(); expect(events).toEqual([{ source: 'credential-change', reason: action }])
    expect(s.reload).toHaveBeenCalledTimes(action === 'logout' ? 0 : 1)
  })
  it('same-ID Profile rename does not clear or refetch; obsolete bootstrap cannot report a change', async () => {
    const me = deferred<ApiResult<UserDto>>(), s = setup(() => me.promise), events: unknown[] = []
    s.session.subscribe(e => events.push(e)); const boot = s.session.initialize(); s.session.login(user)
    await s.reader.read(async () => ok(statistics(true))); s.session.profile({ ...user, displayName: '新名' })
    me.resolve(fail('AUTH_REQUIRED')); await boot
    expect(s.state.data).not.toBeNull(); expect(events).toEqual([{ source: 'credential-change', reason: 'login' }])
  })
  for (const oldResult of [ok(statistics(true)), fail('AUTH_REQUIRED'), fail('STATISTICS_ACCESS_DENIED', 403)]) {
    it.each(['route', 'session', 'retry', 'dispose'] as const)(`late ${oldResult.kind} never changes a new context (%s) or its finally`, async event => {
      const s = setup(), a = deferred<ApiResult<StatisticsDto>>(), b = deferred<ApiResult<StatisticsDto>>()
      const first = s.reader.read(() => a.promise)
      if (event === 'route') s.move()
      if (event === 'session') s.session.login(user)
      if (event === 'dispose') s.reader.dispose()
      const second = s.reader.read(() => b.promise)
      a.resolve(oldResult); await first
      expect(s.state.data).toBeNull(); expect(s.state.error).toBeNull(); expect(s.navigate).not.toHaveBeenCalled()
      if (event !== 'dispose') expect(s.changes.at(-1)).toBe(true)
      b.resolve(ok({ ...statistics(), title: 'B' })); await second
      expect(s.state.data?.title).toBe(event === 'dispose' ? undefined : 'B')
    })
  }
  it.each(['AUTH_REQUIRED', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED'])('own %s redirects once, keeps full path and never reload loops', async code => {
    const s = setup(); await s.reader.read(async () => fail(code))
    expect(s.navigate).toHaveBeenCalledExactlyOnceWith({ path: '/login', query: { redirect: s.path() } })
    expect(s.reload).not.toHaveBeenCalled(); expect(s.state.data).toBeNull()
  })
  it('manual refresh retracts names before pending; Auth dialog closes once and external login revokes navigation', async () => {
    const s = setup(); await s.reader.read(async () => ok(statistics(true)))
    const pending = deferred<ApiResult<StatisticsDto>>(), read = s.reader.read(() => pending.promise, true)
    expect(s.state.data).toBeNull(); pending.resolve(fail('AUTH_REQUIRED')); await read
    expect(s.state.dialog?.kind).toBe('auth'); expect(s.navigate).not.toHaveBeenCalled(); expect(s.reload).not.toHaveBeenCalled()
    await s.reader.closeAuth(); await s.reader.closeAuth(); expect(s.navigate).toHaveBeenCalledTimes(1)
    const other = setup(); await other.reader.read(async () => ok(statistics(true))); await other.reader.read(async () => fail('AUTH_REQUIRED'), true)
    other.session.login(user); await other.reader.closeAuth(); expect(other.navigate).not.toHaveBeenCalled()
  })
  it('retry failure cannot keep old names or leave loading pending; details survive', async () => {
    const s = setup(); await s.reader.read(async () => ok(statistics(true)))
    await s.reader.read(async () => ({ kind: 'transport-error', reason: 'timeout', sent: true }), true)
    expect(s.state).toMatchObject({ data: null, error: { kind: 'read-failure' } }); expect(s.changes.at(-1)).toBe(false)
    const detail = { path: 'formId', code: 'INVALID_VALUE', message: '原明細' }
    expect(statisticsReadError({ kind: 'api-error', status: 400, error: { code: 'VALIDATION_ERROR', message: '原錯誤', details: [detail] } })).toMatchObject({ message: '連結無效', details: [detail] })
    expect(statisticsReadError(fail('STATISTICS_ACCESS_DENIED', 403) as Exclude<ApiResult<never>, { kind: 'success' }>).message).toBe('您沒有查看此統計的權限')
  })
})
