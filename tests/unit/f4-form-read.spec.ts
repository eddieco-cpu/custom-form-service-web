import { describe, expect, it, vi } from 'vitest'
import { FormReadController, alignPage, detailLocation, formReadError, summaryLocation } from '../../app/domain/form-read'
import type { FormReadState } from '../../app/domain/form-read'
import { RequestScope } from '../../app/domain/request-scope'
import { AuthSession, initialAuthState } from '../../app/domain/auth-state'
import type { ApiResult } from '../../app/domain/api/result'
import { formService, formsPath } from '../../app/services/form'
import { detail, ids, owner, other } from '../fixtures/f4/payloads'

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes }); return { promise, resolve } }
const ok = (value: string): ApiResult<string> => ({ kind: 'success', status: 200, value })
const failure = (code = 'AUTH_TOKEN_EXPIRED'): ApiResult<string> => ({ kind: 'api-error', status: code.startsWith('AUTH_') ? 401 : 500, error: { code, message: 'Synthetic' } })
function harness() {
  let key = 'a'; let path = '/forms/a?q=one#target'; let loading = false
  const auth = initialAuthState(); const session = new AuthSession(auth, async () => ({ kind: 'success', status: 200, value: owner })); session.login(owner)
  const state: FormReadState<string> = { data: null, error: null, dialog: null }
  const scope = new RequestScope(() => key, () => auth.sessionRevision, value => { loading = value })
  const navigate = vi.fn(async (_location: unknown) => {})
  const invalidate = vi.fn((error: Exclude<ApiResult<string>, { kind: 'success' }>) => { session.invalidate(error); reader.contextChanged() })
  const reader = new FormReadController(state, scope, { key: () => key, path: () => path, sessionRevision: () => auth.sessionRevision, invalidate, navigate })
  function change(kind: string) {
    if (kind === 'key') { key = 'b'; path = '/forms/b' }
    if (kind === 'query') key = key === 'page=2' ? 'page=1&status=draft' : 'page=2'
    if (kind === 'route') path = '/forms/a?q=two#target'
    if (kind === 'session') session.login(other)
    if (kind === 'dispose') reader.dispose()
    else reader.contextChanged()
  }
  return { reader, scope, state, auth, navigate, invalidate, change, loading: () => loading }
}

describe('F4 read contract and routing', () => {
  it('sends only fixed pagination/status query fields', () => {
    expect(formsPath({ page: 1 })).toBe('/forms?page=1&pageSize=10')
    expect(formsPath({ page: 2, status: 'closed' })).toBe('/forms?page=2&pageSize=10&status=closed')
    expect(() => formsPath({ page: 0 })).toThrow()
  })
  it.each([
    [1, 0, true, 1, false, false], [3, 0, true, 1, false, false],
    [1, 1, true, 1, false, false], [2, 2, true, 2, false, false],
    [3, 2, true, 2, true, false], [2, 1, false, 2, false, true],
  ] as const)('aligns page %s / %s with reload budget %s', (page, totalPages, budget, expected, reload, exhausted) => {
    expect(alignPage({ page, totalPages, pageSize: 10, totalItems: totalPages * 10 }, budget)).toEqual({ page: expected, reload, exhausted })
  })
  it.each(['draft', 'published', 'closed'] as const)('routes %s using fresh detail and actual owner ID', status => {
    const form = detail(status)
    expect(summaryLocation(form.id, status)).toBe(`/forms/${form.id}${status === 'draft' ? '/edit' : ''}`)
    expect(detailLocation(form, owner.id, 'form')).toBe(status === 'draft' ? `/forms/${form.id}/edit` : null)
    expect(detailLocation(form, owner.id, 'edit')).toBe(status === 'draft' ? null : `/forms/${form.id}`)
    if (status === 'draft') expect(() => detailLocation(form, other.id, 'edit')).toThrow()
    else expect(detailLocation(form, other.id, 'edit')).toBe(`/forms/${form.id}`)
  })
  it('maps only formId validation to invalid link, retaining details', () => {
    const result = { kind: 'api-error', status: 400, error: { code: 'VALIDATION_ERROR', message: 'Query invalid', details: [{ path: 'formId', code: 'INVALID_VALUE', message: 'UUID' }] } } as const
    expect(formReadError(result)).toMatchObject({ message: '連結無效', details: result.error.details })
    expect(formReadError({ ...result, error: { ...result.error, details: [{ ...result.error.details[0], path: 'page' }] } }).message).toBe('Query invalid')
  })
  it('uses real service/client lossless decode, preserves datetime, signal and rejects wrong resource', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.credentials).toBe('include'); expect(init?.signal).toBeInstanceOf(AbortSignal)
      return new Response(JSON.stringify(detail('published')) .replace('"questions":[]', '"questions":[{"id":"88888888-8888-4888-8888-888888888888","type":"number","title":"精確限制","description":null,"required":false,"sortOrder":7,"config":{"min":0.12345678901234567890123456789},"options":[]}]'), { status: 200 })
    })
    vi.stubGlobal('fetch', fetcher)
    try {
      const service = formService('http://localhost:5000/api/v1')
      const result = await service.detail(ids.published, new AbortController().signal)
      expect(result.kind).toBe('success')
      if (result.kind === 'success') {
        expect(result.value.createdAt).toBe('2026-10-10T01:02:03.1234567Z')
        const question = result.value.questions[0]
        expect(question?.type).toBe('number')
        if (question?.type === 'number') expect(question.config.min?.toString()).toBe('0.12345678901234567890123456789')
      }
      expect((await service.detail(ids.closed)).kind).toBe('contract-error')
    }
    finally { vi.unstubAllGlobals() }
  })
})

describe('F4 controller side effects and Auth flow ownership', () => {
  for (const change of ['key', 'session', 'dispose']) {
    it.each([ok('OLD'), failure(), failure('INTERNAL_SERVER_ERROR')])(`ignores late $kind after ${change}, including Auth/navigation/finally`, async result => {
      const h = harness(); const old = deferred<ApiResult<string>>(); const next = deferred<ApiResult<string>>()
      const adopt = vi.fn()
      const first = h.reader.read(() => old.promise, false, adopt)
      h.change(change)
      const second = change === 'dispose' ? undefined : h.reader.read(() => next.promise)
      old.resolve(result); await first
      expect(h.state.data).toBeNull(); expect(h.state.error).toBeNull(); expect(h.invalidate).not.toHaveBeenCalled(); expect(h.navigate).not.toHaveBeenCalled(); expect(adopt).not.toHaveBeenCalled()
      expect(h.auth.outcome).toBe('authenticated')
      expect(h.loading()).toBe(change !== 'dispose')
      if (second) { next.resolve(ok('CURRENT')); await second; expect(h.state.data).toBe('CURRENT'); expect(h.loading()).toBe(false) }
    })
  }
  it('retains a reliable snapshot on read failure, then manual retry replaces it', async () => {
    const h = harness(); await h.reader.read(async () => ok('SAVED'))
    await h.reader.read(async () => ({ kind: 'transport-error', reason: 'timeout', sent: true }), true)
    expect(h.state).toMatchObject({ data: 'SAVED', error: { kind: 'read-failure', placement: 'page' }, dialog: null })
    expect(h.loading()).toBe(false)
    await h.reader.read(async () => ok('FRESH'), true)
    expect(h.state).toEqual({ data: 'FRESH', error: null, dialog: null })
  })
  it.each(['AUTH_REQUIRED', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED'])('first %s navigates after own revision invalidation', async code => {
    const h = harness(); await h.reader.read(async () => failure(code))
    expect(h.auth.outcome).toBe('anonymous')
    expect(h.navigate).toHaveBeenCalledExactlyOnceWith({ path: '/login', query: { redirect: '/forms/a?q=one#target' } })
    expect(h.loading()).toBe(false)
  })
  it('manual Auth keeps the Dialog outside invalidated resource scope until close', async () => {
    const h = harness(); await h.reader.read(async () => ok('PRIVATE'))
    await h.reader.read(async () => failure(), true)
    expect(h.state.data).toBeNull(); expect(h.state.dialog?.kind).toBe('auth'); expect(h.auth.user).toBeNull()
    expect(h.navigate).not.toHaveBeenCalled(); expect(h.loading()).toBe(false)
    await h.reader.closeAuth()
    expect(h.navigate).toHaveBeenCalledTimes(1); expect(h.state.dialog).toBeNull()
  })
  it.each(['key', 'session', 'dispose'])('revokes an adopted Auth flow on external %s', async change => {
    const h = harness(); await h.reader.read(async () => ok('PRIVATE')); await h.reader.read(async () => failure(), true)
    h.change(change); await h.reader.closeAuth()
    expect(h.navigate).not.toHaveBeenCalled(); expect(h.state.dialog).toBeNull()
  })
  it('disabled resource failure retains User and never initiates logout/login', async () => {
    const h = harness(); await h.reader.read(async () => ({ kind: 'api-error', status: 403, error: { code: 'AUTH_USER_DISABLED', message: 'Disabled' } }))
    expect(h.auth.user?.id).toBe(owner.id); expect(h.state.error?.kind).toBe('disabled')
    expect(h.invalidate).not.toHaveBeenCalled(); expect(h.navigate).not.toHaveBeenCalled()
  })
})

describe('F4-R1 operation Auth presentation through automatic alignment', () => {
  it('carries only the presentation through cleared query data and own Auth invalidation', async () => {
    const h = harness(); await h.reader.read(async () => ok('PAGE3 PRIVATE'))
    const presentation = h.reader.captureAuthPresentation(true)
    expect(presentation).toBe('dialog')
    await h.reader.read(async () => ok('PAGE3 SHRUNK'), true, async () => {
      h.change('query')
      expect(h.state.data).toBeNull()
      expect(h.reader.captureAuthPresentation(true)).toBe('redirect')
      await h.reader.read(async () => failure(), true, undefined, presentation)
    }, presentation)
    expect(h.state.data).toBeNull(); expect(h.auth.user).toBeNull()
    expect(h.state.dialog?.kind).toBe('auth'); expect(h.state.error).toBeNull()
    expect(h.navigate).not.toHaveBeenCalled(); expect(h.loading()).toBe(false)
    await h.reader.closeAuth()
    expect(h.navigate).toHaveBeenCalledExactlyOnceWith({ path: '/login', query: { redirect: '/forms/a?q=one#target' } })
  })
  it('retains initial automatic-read redirect policy through alignment', async () => {
    const h = harness(); const presentation = h.reader.captureAuthPresentation(false)
    await h.reader.read(async () => ok('SHRUNK'), false, async () => {
      h.change('query')
      await h.reader.read(async () => failure(), false, undefined, presentation)
    }, presentation)
    expect(h.state.dialog).toBeNull(); expect(h.auth.user).toBeNull()
    expect(h.navigate).toHaveBeenCalledExactlyOnceWith({ path: '/login', query: { redirect: '/forms/a?q=one#target' } })
  })
  it('does not turn manual retry without loaded data into a Dialog', async () => {
    const h = harness(); await h.reader.read(async () => failure('INTERNAL_SERVER_ERROR'))
    expect(h.reader.captureAuthPresentation(true)).toBe('redirect')
    await h.reader.read(async () => failure(), true)
    expect(h.state.dialog).toBeNull(); expect(h.navigate).toHaveBeenCalledTimes(1)
  })
  it('a captured Dialog policy does not leak to a later external query read', async () => {
    const h = harness(); await h.reader.read(async () => ok('PRIVATE'))
    expect(h.reader.captureAuthPresentation(true)).toBe('dialog')
    h.change('query')
    await h.reader.read(async () => failure(), true)
    expect(h.state.dialog).toBeNull(); expect(h.navigate).toHaveBeenCalledTimes(1)
  })
  for (const change of ['query', 'route', 'session', 'dispose']) {
    it(`rejects the uncancellable aligned Auth response after external ${change}`, async () => {
      const h = harness(); const old = deferred<ApiResult<string>>(); const next = deferred<ApiResult<string>>()
      await h.reader.read(async () => ok('PRIVATE'))
      const presentation = h.reader.captureAuthPresentation(true)
      const operation = h.reader.read(async () => ok('SHRUNK'), true, async () => {
        h.change('query')
        await h.reader.read(() => old.promise, true, undefined, presentation)
      }, presentation)
      // Let the successful first GET start its second GET, without relying on Abort.
      await Promise.resolve()
      expect(h.state.data).toBeNull(); expect(h.loading()).toBe(true)
      h.change(change)
      const current = change === 'dispose' ? undefined : h.reader.read(() => next.promise)
      old.resolve(failure()); await operation
      expect(h.state).toEqual({ data: null, error: null, dialog: null })
      expect(h.auth.user?.id).toBe(change === 'session' ? other.id : owner.id)
      expect(h.invalidate).not.toHaveBeenCalled(); expect(h.navigate).not.toHaveBeenCalled()
      expect(h.loading()).toBe(change !== 'dispose')
      if (current) { next.resolve(ok('CURRENT')); await current; expect(h.state.data).toBe('CURRENT'); expect(h.loading()).toBe(false) }
    })
    it(`revokes an aligned Auth Dialog after external ${change}, including late close`, async () => {
      const h = harness(); await h.reader.read(async () => ok('PRIVATE'))
      const presentation = h.reader.captureAuthPresentation(true)
      h.change('query'); await h.reader.read(async () => failure(), true, undefined, presentation)
      expect(h.state.dialog?.kind).toBe('auth')
      h.change(change); await h.reader.closeAuth()
      expect(h.state.dialog).toBeNull(); expect(h.state.data).toBeNull(); expect(h.navigate).not.toHaveBeenCalled()
    })
  }
})
