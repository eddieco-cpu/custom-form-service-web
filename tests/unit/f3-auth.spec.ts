import { describe, it, expect, vi } from 'vitest'
import { AuthSession, initialAuthState } from '../../app/domain/auth-state'
import { loginRequest, registerRequest, profileRequest, loginSchema, registerSchema, profileSchema, profileDirty } from '../../app/domain/auth-input'
import { safeRedirect } from '../../app/utils/redirect'
import type { ApiResult } from '../../app/domain/api/result'
import type { UserDto } from '../../app/domain/api/user'
const user: UserDto = { id: '11111111-1111-4111-8111-111111111111', email: 'unit@example.test', displayName: '姓名', avatarUrl: null }
const ok = (value = user): ApiResult<UserDto> => ({ kind: 'success', status: 200, value })
const failure = (code: string, status = 401): ApiResult<UserDto> => ({ kind: 'api-error', status, error: { code, message: 'test' } })
function deferred() { let resolve!: (result: ApiResult<UserDto>) => void; const promise = new Promise<ApiResult<UserDto>>(r => { resolve = r }); return { promise, resolve } }

describe('F3 session and generations', () => {
  it('shares the first Promise and keeps settled null across SPA navigation', async () => {
    const pending = deferred(); const load = vi.fn(() => pending.promise)
    const session = new AuthSession(initialAuthState(), load)
    const a = session.initialize(); const b = session.initialize()
    expect(a).toBe(b); expect(load).toHaveBeenCalledTimes(1)
    pending.resolve(failure('AUTH_REQUIRED')); await a
    await session.initialize(); expect(load).toHaveBeenCalledTimes(1); expect(session.state.user).toBeNull()
  })
  it.each(['AUTH_REQUIRED', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED'])('settles formal %s as anonymous', async code => {
    const session = new AuthSession(initialAuthState(), async () => failure(code)); await session.initialize()
    expect(session.state.outcome).toBe('anonymous'); expect(session.state.phase).toBe('settled')
  })
  it.each([
    failure('AUTH_USER_DISABLED', 403), failure('INTERNAL_SERVER_ERROR', 500),
    { kind: 'transport-error', reason: 'network', sent: true } as const,
    { kind: 'transport-error', reason: 'timeout', sent: true } as const,
    { kind: 'contract-error', status: 200, sent: true, message: 'malformed' } as const,
  ])('retains old presentation on disabled/unknown and never retries implicitly ($kind)', async result => {
    const load = vi.fn(async () => result)
    const session = new AuthSession(initialAuthState(), load); session.login(user)
    await session.verify(); await session.initialize()
    expect(session.state.user).toEqual(user); expect(session.state.outcome).toBe(result.kind === 'api-error' && result.status === 403 ? 'disabled' : 'unknown')
    expect(load).toHaveBeenCalledTimes(1)
  })
  it.each(['login', 'logout', 'profile'] as const)('late bootstrap cannot overwrite %s and settled navigation does not await it', async action => {
    const pending = deferred(); const session = new AuthSession(initialAuthState(), () => pending.promise)
    const old = session.initialize()
    if (action === 'logout') session.logout()
    else session[action]({ ...user, displayName: 'new' })
    await session.initialize() // Must resolve even while obsolete bootstrap is still pending.
    pending.resolve(ok({ ...user, displayName: 'old' })); await old
    expect(session.state.user?.displayName).toBe(action === 'logout' ? undefined : 'new')
  })
  it('only the latest explicit candidate may be adopted; profile keeps the session revision', async () => {
    const a = deferred(); const b = deferred(); const load = vi.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
    const session = new AuthSession(initialAuthState(), load); session.login(user)
    const first = session.candidate(); const second = session.candidate()
    b.resolve(ok({ ...user, displayName: 'latest' })); const current = await second
    expect(current.adopt()).toBe(true)
    a.resolve(ok()); const old = await first; expect(old.adopt()).toBe(false)
    const revision = session.state.sessionRevision; session.profile({ ...user, displayName: 'saved' })
    expect(session.state.sessionRevision).toBe(revision); expect(session.state.user?.displayName).toBe('saved')
  })
  it('a different User returned by PATCH advances the session revision (shared Cookie changed in another tab)', () => {
    const session = new AuthSession(initialAuthState(), async () => ok())
    session.login(user); const revision = session.state.sessionRevision
    session.profile({ ...user, id: '22222222-2222-4222-8222-222222222222' })
    expect(session.state.sessionRevision).toBe(revision + 1)
  })
})

describe('F3 redirect', () => {
  it.each(['/', '/profile?from=x#name', '/forms', '/forms/new', '/forms/invalid-id/edit?x=1', '/forms/11111111-1111-4111-8111-111111111111/statistics#result'])('keeps known route %s', path => expect(safeRedirect(path, 'http://localhost:3000')).toBe(path))
  it.each(['https://evil.test/profile', '//evil.test', '/\\evil.test', '/%5cevil.test', '/%2f%2fevil.test', '/profile%2funknown', '/profile?x=%zz', '/%00profile', '/login', '/login?redirect=/profile', '/unknown', '/forms/a/unknown', '', ['/profile'], null])('rejects %j', path => expect(safeRedirect(path, 'http://localhost:3000')).toBe('/'))
})

describe('F3 input semantics', () => {
  it.each(['a@localhost', '"a b"@example.test', '中文@example.test', 'İ@example.test', 'a@@example.test'])('allows %s through basic registration gate for final server validation', email => {
    expect(registerSchema.safeParse({ email, displayName: '測試', password: 'x'.repeat(10) }).success).toBe(true)
  })
  it.each([9, 10, 128, 129])('uses Code Points for password length %i without trimming', length => {
    expect(registerSchema.safeParse({ email: 'a@localhost', displayName: '測試', password: '🧪'.repeat(length) }).success).toBe(length >= 10 && length <= 128)
  })
  it.each([100, 101])('uses Code Points for name length %i', length => expect(profileSchema.safeParse({ displayName: '🧪'.repeat(length) }).success).toBe(length <= 100))
  it('login does not apply register email/password constraints and builders whitelist keys', () => {
    const source = { email: '\u0085 A@EXAMPLE.TEST \u0085', password: ' x ', displayName: '\u0085 名稱 \u0085', id: 'must-not-send' }
    expect(loginSchema.safeParse(source).success).toBe(true)
    expect(loginRequest(source)).toEqual({ email: 'a@example.test', password: ' x ' })
    expect(registerRequest(source)).toEqual({ email: 'a@example.test', password: ' x ', displayName: '名稱' })
    expect(profileRequest(source)).toEqual({ displayName: '名稱' })
    expect(loginRequest({ email: ' İ@EXAMPLE.TEST ', password: 'x' }).email).toBe('İ@EXAMPLE.TEST')
  })
  it('normalized no-op and editing back to baseline are clean', () => {
    expect(profileDirty(' 名稱\u0085', '名稱')).toBe(false)
    expect(profileDirty('新名稱', '名稱')).toBe(true)
    expect(profileDirty('名稱', '名稱')).toBe(false)
  })
})
