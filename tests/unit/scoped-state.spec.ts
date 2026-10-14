import { describe, expect, it, vi } from 'vitest'
import { RequestScope } from '../../app/domain/request-scope'
import { OperationState, WriteCoordinator } from '../../app/domain/operation-state'
import { DirtyScope } from '../../app/domain/dirty-scope'
import { ExactNumber } from '../../app/utils/exact-number'
import type { ApiResult } from '../../app/domain/api/result'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const success: ApiResult<string> = { kind: 'success', status: 200, value: 'saved' }
const unknown: ApiResult<string> = { kind: 'transport-error', reason: 'timeout', sent: true }
describe('request ownership', () => {
  it('ignores late data/errors and old finally cannot clear new loading', async () => {
    let loading = false
    const scope = new RequestScope(() => 'a', () => 1, value => { loading = value })
    const old = deferred<string>(); const next = deferred<string>(); const apply = vi.fn(); const error = vi.fn()
    const first = scope.run(() => old.promise, apply, error)
    const second = scope.run(() => next.promise, apply, error)
    old.reject(new Error('late error'))
    expect(await first).toEqual({ kind: 'stale' }); expect(loading).toBe(true)
    expect(error).not.toHaveBeenCalled()
    next.resolve('current'); expect(await second).toEqual({ kind: 'current', value: 'current' })
    expect(apply).toHaveBeenCalledExactlyOnceWith('current'); expect(loading).toBe(false)
  })
  it.each(['resource', 'session', 'unmount'])('invalidates %s even when fetch ignores abort', async (kind) => {
    let resource = 'a'; let session = 1
    const scope = new RequestScope(() => resource, () => session)
    const pending = deferred<string>(); const apply = vi.fn()
    const result = scope.run(() => pending.promise, apply)
    if (kind === 'resource') resource = 'b'
    if (kind === 'session') session++
    if (kind === 'unmount') scope.dispose()
    pending.resolve('old'); expect(await result).toEqual({ kind: 'stale' }); expect(apply).not.toHaveBeenCalled()
  })
})
describe('write lifecycle', () => {
  it.each([
    unknown,
    { kind: 'api-error', status: 500, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Synthetic' } } as const,
    { kind: 'contract-error', status: 200, message: 'Synthetic malformed response', sent: true } as const,
  ])('shares Delta uncertainty across same-Form saves/publish: $kind', async (result) => {
    const coordinator = new WriteCoordinator()
    const delta = new OperationState('delta', coordinator, 'form:a')
    const publishChanged = vi.fn()
    const publish = new OperationState('lifecycle', coordinator, 'form:a', publishChanged)
    await delta.run({}, async () => result, () => true)
    expect(coordinator.busy('form:a')).toBe(false) // The lease is released; the gate must remain.
    expect(publish.snapshot).toMatchObject({ blocked: true, needsReconciliation: true })
    expect(publishChanged).toHaveBeenLastCalledWith(publish.snapshot)
    const anotherSave = new OperationState('delta', coordinator, 'form:a')
    const send = vi.fn(async () => success)
    expect(await publish.run({}, send, () => true)).toEqual({ kind: 'blocked' })
    expect(await anotherSave.run({}, send, () => true)).toEqual({ kind: 'blocked' })
    expect(send).not.toHaveBeenCalled()
    expect(delta.reconcile(() => false, () => true)).toBe(false) // Cancelled adoption.
    expect(publish.reconcile(() => true, () => false)).toBe(false) // Stale read.
    let current = true
    expect(publish.reconcile(() => { current = false; return true }, () => current)).toBe(false)
    expect(publish.snapshot.blocked).toBe(true)
    expect(publish.reconcile(() => true, () => true)).toBe(true)
    expect(delta.snapshot).toMatchObject({ phase: 'reconciled', blocked: false, needsReconciliation: false })
    expect(anotherSave.snapshot.blocked).toBe(false)
    expect(await publish.run({}, send, () => true)).toEqual(success)
  })
  it('does not extend Delta uncertainty to unrelated scopes or clear it on another operation success', async () => {
    const coordinator = new WriteCoordinator(); const delta = new OperationState('delta', coordinator, 'form:a')
    await delta.run({}, async () => unknown, () => true)
    const visibility = new OperationState('visibility', coordinator, 'form:a')
    const otherForm = new OperationState('lifecycle', coordinator, 'form:b')
    expect(await visibility.run({}, async () => success, () => true)).toEqual(success)
    expect(await otherForm.run({}, async () => success, () => true)).toEqual(success)
    expect(delta.snapshot.blocked).toBe(true)
    const disposed = vi.fn(); const oldPublish = new OperationState('lifecycle', coordinator, 'form:a', disposed)
    oldPublish.dispose(); delta.reconcile(() => true, () => true)
    expect(disposed).not.toHaveBeenCalled()
  })
  it('locks same Form, permits another Form, snapshots before async, releases on all exits', async () => {
    const coordinator = new WriteCoordinator()
    const a = new OperationState('delta', coordinator, 'form:a')
    const visibility = new OperationState('visibility', coordinator, 'form:a')
    const b = new OperationState('delta', coordinator, 'form:b')
    const pending = deferred<ApiResult<string>>()
    const send = vi.fn((_snapshot: { title: string; value: ExactNumber }) => pending.promise)
    const source = { title: 'before', value: ExactNumber.from('9007199254740993') }
    const first = a.run(source, send, () => true)
    source.title = 'after'
    expect(send.mock.calls[0]?.[0]).toEqual({ title: 'before', value: source.value })
    expect(await a.run(source, send, () => true)).toEqual({ kind: 'blocked' })
    expect(await visibility.run(source, send, () => true)).toEqual({ kind: 'blocked' })
    expect(await b.run(source, async () => success, () => true)).toEqual(success)
    pending.resolve(success); await first
    expect(a.snapshot.loading).toBe(false); expect(coordinator.busy('form:a')).toBe(false)
    expect(await visibility.run(source, async () => success, () => true)).toEqual(success)
  })
  it('keeps unknown lock across rejected/cancelled/stale reconciliation, unlocks only adoption', async () => {
    const op = new OperationState('delta', new WriteCoordinator(), 'form:a')
    expect(await op.run({}, async () => unknown, () => true)).toEqual(unknown)
    expect(op.snapshot).toMatchObject({ loading: false, blocked: true, needsReconciliation: true })
    expect(op.reconcile(() => false, () => true)).toBe(false)
    expect(op.reconcile(() => true, () => false)).toBe(false)
    expect(op.snapshot.blocked).toBe(true)
    expect(op.reconcile(() => true, () => true)).toBe(true)
    expect(op.snapshot.blocked).toBe(false)
  })
  it('Latest/list adoption does not clear multiple/create duplicate risk', async () => {
    for (const policy of ['create', 'response-multiple'] as const) {
      const op = new OperationState(policy, new WriteCoordinator(), policy)
      await op.run({}, async () => unknown, () => true)
      op.reconcile(() => true, () => true)
      expect(op.snapshot.duplicateRisk).toBe(true)
      const send = vi.fn(async () => success)
      expect(await op.run({}, send, () => true)).toEqual({ kind: 'blocked' })
      expect(send).not.toHaveBeenCalled()
      expect(await op.run({}, send, () => true, () => true)).toEqual(success)
    }
  })
  it('does not apply stale outcomes; local snapshot errors release loading and lease', async () => {
    const coordinator = new WriteCoordinator(); const op = new OperationState('delete', coordinator, 'a')
    const pending = deferred<ApiResult<string>>(); const first = op.run({}, () => pending.promise, () => true)
    op.invalidate(); pending.resolve(unknown)
    expect(await first).toEqual({ kind: 'stale' }); expect(op.snapshot.needsReconciliation).toBe(false)
    expect(op.snapshot.loading).toBe(false); expect(coordinator.busy('a')).toBe(false)
    expect(await op.run(new Date(), async () => success, () => true)).toMatchObject({ kind: 'local-error', sent: false })
    expect(op.snapshot.loading).toBe(false); expect(coordinator.busy('a')).toBe(false)
  })
})
describe('discard permits', () => {
  it.each([false, true])('completed logout cleanup transfers its %s dirty permit once to the intended navigation', dirty => {
    const scope = new DirtyScope(); scope.update(dirty, 1)
    const ask = vi.fn(() => true), permit = scope.authorize('logout', ask)!
    expect(ask).toHaveBeenCalledTimes(dirty ? 1 : 0)
    expect(scope.completeNavigation(permit, '/login', () => { scope.update(dirty, 2); return () => true })).toBe(true)
    expect(scope.valid(permit)).toBe(false)
    expect(scope.allowNavigation('/login', ask)).toBe(true); expect(ask).toHaveBeenCalledTimes(dirty ? 1 : 0)
    expect(scope.completeNavigation(permit, '/login', () => () => true)).toBe(false)
    scope.clear(); scope.update(true, 3); expect(scope.allowNavigation('/another', ask)).toBe(true); expect(ask).toHaveBeenCalledTimes(dirty ? 2 : 1)
  })
  it('external content changes before completion prohibit cleanup, and later changes reject the reserved navigation without reauthorizing', () => {
    const scope = new DirtyScope(); scope.update(true, 1)
    const permit = scope.authorize('logout', () => true)!, cleanup = vi.fn(() => () => true)
    scope.update(true, 2); expect(scope.completeNavigation(permit, '/login', cleanup)).toBe(false); expect(cleanup).not.toHaveBeenCalled()
    const fresh = scope.authorize('logout', () => true)!
    expect(scope.completeNavigation(fresh, '/login', () => { scope.update(false, 3); return () => true })).toBe(true)
    scope.update(true, 4); const ask = vi.fn(() => true)
    expect(scope.allowNavigation('/login', ask)).toBe(false); expect(ask).not.toHaveBeenCalled()
    scope.clear(); expect(scope.allowNavigation('/login', ask)).toBe(true); expect(ask).toHaveBeenCalledTimes(1)
  })
  it.each(['session', 'request', 'write'] as const)('external %s changes reject completed logout navigation without a second confirmation', change => {
    const scope = new DirtyScope(), coordinator = new WriteCoordinator(); scope.update(true, 1)
    let session = 1
    const requests = new RequestScope(() => '/form', () => session), form = new OperationState('delta', coordinator, 'form:a')
    const permit = scope.authorize('logout', () => true)!, readCurrent = form.captureRead()
    expect(scope.completeNavigation(permit, '/login', () => { session++; scope.update(false, 2); const ticket = requests.begin(); return () => ticket.isCurrent() && readCurrent() })).toBe(true)
    if (change === 'session') session++
    if (change === 'request') requests.begin()
    if (change === 'write') coordinator.acquire('form:a', 'visibility')!()
    const ask = vi.fn(() => true); expect(scope.allowNavigation('/login', ask)).toBe(false); expect(ask).not.toHaveBeenCalled()
  })
  it('a failed completion does not create a navigation permit or allow its old action to run twice', () => {
    const scope = new DirtyScope(); scope.update(true, 1)
    const permit = scope.authorize('logout', () => true)!, cleanup = vi.fn(() => undefined)
    expect(scope.completeNavigation(permit, '/login', cleanup)).toBe(false)
    expect(scope.completeNavigation(permit, '/login', cleanup)).toBe(false); expect(cleanup).toHaveBeenCalledTimes(1)
    const ask = vi.fn(() => false); expect(scope.allowNavigation('/login', ask)).toBe(false); expect(ask).toHaveBeenCalledTimes(1)
  })
  it('cancel blocks; redirect shares one permit; next navigation/action asks again', () => {
    const scope = new DirtyScope(); scope.update(true, 1)
    expect(scope.allowNavigation('/b', () => false)).toBe(false)
    const ask = vi.fn(() => true)
    expect(scope.allowNavigation('/redirect', ask)).toBe(true)
    expect(scope.allowNavigation('/redirect', ask)).toBe(true); expect(ask).toHaveBeenCalledTimes(1)
    scope.clear(); expect(scope.allowNavigation('/c', ask)).toBe(true); expect(ask).toHaveBeenCalledTimes(2)
    const action = scope.authorize('logout', ask)!
    expect(scope.bindNavigation(action, '/login')).toBe(true)
    scope.update(true, 2); expect(scope.valid(action)).toBe(false)
    expect(scope.allowNavigation('/login', () => false)).toBe(false)
    scope.update(false, 2); expect(scope.allowNavigation('/login', () => false)).toBe(true)
  })
})
