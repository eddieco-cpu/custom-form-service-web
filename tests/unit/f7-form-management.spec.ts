import { describe, it, expect, vi } from 'vitest'
import { FormManagementController, managementState, mergeVisibility } from '../../app/domain/form-management'
import { EditorPageController, editorPageState } from '../../app/domain/editor-page'
import { AuthSession, initialAuthState } from '../../app/domain/auth-state'
import { OperationState, WriteCoordinator } from '../../app/domain/operation-state'
import { RequestScope } from '../../app/domain/request-scope'
import { loadEditor, editorDirty, addQuestion } from '../../app/domain/editor'
import { form, uuid } from '../fixtures/f5/payloads'
import type { ApiResult } from '../../app/domain/api/result'
import type { FormDetailDto, FormStatus } from '../../app/domain/api/form'
import { stringifyExactJson } from '../../app/utils/exact-json'
const user = { id: uuid(51), email: 'f7-unit@example.test', displayName: '合成建立者', avatarUrl: null }
const ok = <T>(value: T, status = 200): ApiResult<T> => ({ kind: 'success', status, value })
const fail = (code: string, status = 400): ApiResult<never> => ({ kind: 'api-error', status, error: { code, message: '合成錯誤' } })
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }
function setup(status: FormStatus = 'draft') {
  const a = initialAuthState(), me = vi.fn(async () => ok(user)), auth = new AuthSession(a, me); auth.login(user)
  const e = editorPageState(); e.session = loadEditor({ ...form(), status }); let rev = 0, resource = '/forms/unit/edit', permission = true, discard = true
  e.permission = { userId: user.id, revision: a.sessionRevision, resource }
  const coordinator = new WriteCoordinator(), policies = ['delta', 'visibility', 'lifecycle', 'delete'] as const
  const ops = Object.fromEntries(policies.map(p => [p, new OperationState(p, coordinator, 'form:unit')])) as Record<typeof policies[number], OperationState>
  const scope = () => new RequestScope(() => resource, () => a.sessionRevision)
  const service = {
    publish: vi.fn(async () => ok({ ...form(), status: 'published' as const })), close: vi.fn(async () => ok({ ...form(), status: 'closed' as const })),
    remove: vi.fn(async (): Promise<ApiResult<undefined>> => ok(undefined, 204)), visibility: vi.fn(async (): Promise<ApiResult<FormDetailDto>> => ok({ ...form(), status, resultVisibility: 'public' })),
    count: vi.fn(async () => ok({ count: 0 })), detail: vi.fn(async (): Promise<ApiResult<FormDetailDto>> => ok(form())),
    create: vi.fn(async () => ok(form(), 201)), update: vi.fn(async () => ok(form())),
  }
  const state = managementState(), issues = vi.fn(), clear = vi.fn(() => { e.session = null; rev++ }), navigate = vi.fn(async () => {}), toast = vi.fn()
  const authorize = vi.fn(() => discard ? () => true : undefined), reload = vi.fn(async () => {})
  const manager = new FormManagementController(state, {
    auth: () => a, authSession: auth, resource: () => resource, revision: () => rev,
    saved: () => e.session?.baseline.definition, eligible: () => permission && a.outcome === 'authenticated' && !!e.session && e.session.definition.metadata && 'userId' in e.session.definition.metadata && e.session.definition.metadata.userId === a.user?.id,
    dirty: () => !!e.session && editorDirty(e.session.definition, e.session.baseline),
    adopt: (dto, policy) => { e.session = policy === 'visibility' ? mergeVisibility(e.session!, dto) : loadEditor(dto); rev++ }, clear,
    deny: () => { permission = false }, issues, authorize, finishDiscard: vi.fn(), reload,
    operation: p => ops[p as keyof typeof ops], writeScope: scope(), countScope: scope(), candidateScope: scope(), service, navigate, toast,
  })
  const editor = new EditorPageController(e, { auth: () => a, authSession: auth, scope: scope(), service,
    operation: () => ops.delta, resource: () => resource, path: () => resource, authorize: () => () => true, finishDiscard: vi.fn(),
    confirmDuplicate: () => true, confirmAccount: () => true, navigate, toast })
  return { a, auth, me, e, editor, manager, state, ops, coordinator, service, issues, clear, navigate, toast, authorize, reload,
    edit: (title: string) => { e.session!.definition.title = title; rev++ }, discard: (v: boolean) => { discard = v }, context: () => { resource = '/away' } }
}
describe('F7 management behavior', () => {
  it.each(['draft', 'published', 'closed'] as const)('Owner %s qualification follows lifecycle', status => {
    const t = setup(status); expect(t.manager.allowed('delete')).toBe(true)
    expect(t.manager.allowed('publish')).toBe(status === 'draft'); expect(t.manager.allowed('close')).toBe(status === 'published')
    t.auth.login({ ...user, id: uuid(52) }); expect(t.manager.allowed('delete')).toBe(false)
  })
  it('dirty publication sends nothing, clean publication confirms and pushes a frozen resource', async () => {
    const t = setup(); t.edit('未保存'); t.manager.begin('publish'); expect(t.state.confirmation).toBeNull(); expect(t.service.publish).not.toHaveBeenCalled()
    t.edit(form().title); t.manager.begin('publish'); await t.manager.confirm(false); expect(t.service.publish).not.toHaveBeenCalled()
    t.manager.begin('publish'); await t.manager.confirm(true); expect(t.service.publish).toHaveBeenCalledTimes(1)
    expect(t.navigate).toHaveBeenCalledWith(`/forms/${uuid(50)}`, false); expect(t.e.session!.definition.metadata).toMatchObject({ status: 'published' })
  })
  it('confirmation revision and Session changes revoke the old command', async () => {
    const t = setup(); t.manager.begin('delete'); t.edit('新的編輯'); await t.manager.confirm(true); expect(t.service.remove).not.toHaveBeenCalled()
    t.manager.begin('delete'); t.auth.login(user); await t.manager.confirm(true); expect(t.service.remove).not.toHaveBeenCalled()
  })
  it('Visibility preserves edits during pending, baseline, exact config, keys and microsecond deadline', async () => {
    const t = setup(); t.edit('B'); t.e.session = { ...t.e.session!, definition: addQuestion(t.e.session!.definition) }; const original = t.e.session.baseline.definition
    const held = deferred<ApiResult<FormDetailDto>>(); t.service.visibility.mockReturnValue(held.promise)
    const pending = t.manager.visibility('public'); expect(t.ops.delta.snapshot.loading).toBe(true); expect(t.manager.allowed('delete')).toBe(false)
    t.edit('C'); held.resolve(ok({ ...form(), resultVisibility: 'public', creatorDisplayName: '新名稱', updatedAt: '2026-10-14T01:00:00Z' })); await pending
    expect(t.e.session!.definition.title).toBe('C'); expect(t.e.session!.definition.questions).toHaveLength(6)
    expect(t.e.session!.baseline.definition.title).toBe(original.title); expect(t.e.session!.baseline.definition.questions).toEqual(original.questions)
    expect(t.e.session!.definition.deadlineSource).toEqual(original.deadlineSource); expect(t.e.session!.baseline.definition.metadata).toMatchObject({ creatorDisplayName: '新名稱' })
    expect(editorDirty(t.e.session!.definition, t.e.session!.baseline)).toBe(true); expect(t.state.selected).toBe('public')
    expect(stringifyExactJson(t.e.session!.baseline.definition.questions)).toContain('9007199254740993.1234567890123456789')
  })
  it('policy no-op never sends, explicit failure and unknown keep definition and restore selection', async () => {
    const t = setup(); await t.manager.visibility('respondents'); expect(t.service.visibility).not.toHaveBeenCalled()
    t.edit('保留'); t.service.visibility.mockResolvedValue(fail('VALIDATION_ERROR')); await t.manager.visibility('public')
    expect(t.state.selected).toBe('respondents'); expect(t.e.session!.definition.title).toBe('保留')
    t.service.visibility.mockResolvedValue({ kind: 'transport-error', reason: 'timeout', sent: true }); await t.manager.visibility('public')
    expect(t.ops.visibility.snapshot.blocked).toBe(true); expect(t.e.session!.definition.title).toBe('保留')
    await t.manager.visibility('owner_only'); expect(t.service.visibility).toHaveBeenCalledTimes(2)
  })
  it('a policy success does not reconcile an unknown Delta; Publish and save stay gated', async () => {
    const t = setup(); t.coordinator.markUnknown('form:unit', 'delta'); await t.manager.visibility('public')
    expect(t.ops.delta.snapshot.blocked).toBe(true); expect(t.manager.allowed('publish')).toBe(false)
  })
  it('Publish maps full saved definition indices and preserves unknown details', async () => {
    const t = setup(); t.service.publish.mockResolvedValue({ kind: 'api-error', status: 400, error: { code: 'FORM_NOT_PUBLISHABLE', message: '不能發布', details: [
      { path: 'questions[2].options[1].label', code: 'INVALID_OPTION', message: '完整第三題' }, { path: 'unknown.path', code: 'INVALID_VALUE', message: '未知明細' },
    ] } })
    t.manager.begin('publish'); await t.manager.confirm(true)
    expect(t.issues).toHaveBeenCalledWith([{ targetKey: form().questions[2]!.options[1]!.id, field: 'label', message: '完整第三題' }]); expect(t.state.error!.details).toHaveLength(2)
  })
  it('Delete authorizes once only after confirmation, 204 clears then replaces', async () => {
    const t = setup(); t.edit('未保存'); t.manager.begin('delete'); await t.manager.confirm(false); expect(t.authorize).not.toHaveBeenCalled()
    t.manager.begin('delete'); await t.manager.confirm(true); expect(t.authorize).toHaveBeenCalledTimes(1); expect(t.authorize).toHaveBeenCalledWith(true)
    expect(t.clear).toHaveBeenCalledTimes(1); expect(t.navigate).toHaveBeenCalledWith('/forms', true)
  })
  it('unknown Delete locks all writes and does not clear, navigate or toast', async () => {
    const t = setup(); t.service.remove.mockResolvedValue({ kind: 'transport-error', reason: 'network', sent: true })
    t.manager.begin('delete'); await t.manager.confirm(true)
    expect(t.ops.delta.snapshot.blocked).toBe(true); expect(t.ops.visibility.snapshot.blocked).toBe(true); expect(t.clear).not.toHaveBeenCalled(); expect(t.navigate).not.toHaveBeenCalled(); expect(t.toast).not.toHaveBeenCalled()
  })
  it('old Form GET after a successful policy write cannot overwrite policy or baseline', async () => {
    const t = setup(), held = deferred<ApiResult<FormDetailDto>>(); t.service.detail.mockReturnValue(held.promise)
    const old = t.editor.load(uuid(50)); await t.manager.visibility('public'); held.resolve(ok({ ...form(), title: '舊 GET' })); await old
    expect(t.e.session!.baseline.definition.title).toBe(form().title); expect(t.e.session!.definition.resultVisibility).toBe('public')
  })
  it.each(['visibility', 'lifecycle', 'delete'] as const)('old GET after unknown %s cannot adopt or reconcile', async policy => {
    const t = setup(), held = deferred<ApiResult<FormDetailDto>>(); t.service.detail.mockReturnValue(held.promise)
    const old = t.editor.load(uuid(50)); await t.ops[policy].run({}, async () => ({ kind: 'transport-error', reason: 'network', sent: true }), () => true)
    held.resolve(ok({ ...form(), title: '舊 GET' })); await old
    expect(t.e.session!.baseline.definition.title).toBe(form().title); expect(t.ops[policy].snapshot.needsReconciliation).toBe(true)
    const fresh = t.ops.delta.captureRead(); expect(t.ops.delta.reconcile(() => true, fresh)).toBe(true); expect(t.ops[policy].snapshot.needsReconciliation).toBe(false)
  })
  it('old qualification me cannot adopt Session after a write; old qualification Form cannot rebase', async () => {
    const t = setup(), me = deferred<ApiResult<typeof user>>(); t.me.mockReturnValue(me.promise)
    const old = t.editor.verifyPermission(), revision = t.a.sessionRevision
    await t.ops.visibility.run({}, async () => ok(form()), () => true); me.resolve(ok(user)); await old
    expect(t.a.sessionRevision).toBe(revision); expect(t.e.permission).toBeNull()
    t.me.mockResolvedValue(ok(user)); const get = deferred<ApiResult<FormDetailDto>>(); t.service.detail.mockReturnValue(get.promise)
    const next = t.editor.verifyPermission(); await vi.waitFor(() => expect(t.service.detail).toHaveBeenCalledTimes(1))
    await t.ops.lifecycle.run({}, async () => ({ kind: 'transport-error', reason: 'timeout', sent: true }), () => true)
    get.resolve(ok({ ...form(), title: '晚回資格 GET' })); await next
    expect(t.e.session!.definition.title).toBe(form().title); expect(t.ops.lifecycle.snapshot.blocked).toBe(true); expect(t.e.permission).toBeNull()
  })
  it('current authoritative 404 after unknown Delete discards and clears the gate without a second permit', async () => {
    const t = setup(); t.edit('本地保留'); t.coordinator.markUnknown('form:unit', 'delete'); t.service.detail.mockResolvedValue(fail('FORM_NOT_FOUND', 404))
    await t.editor.load(uuid(50), true); expect(t.e.session).toBeNull(); expect(t.e.readError!.kind).toBe('not-found'); expect(t.ops.delete.snapshot.needsReconciliation).toBe(false)
  })
  it('same Form serializes all writes and a GET captured during pending stays stale', async () => {
    const t = setup(), hold = deferred<ApiResult<FormDetailDto>>(), first = t.ops.visibility.run({}, () => hold.promise, () => true)
    const during = t.ops.delta.captureRead(); const send = vi.fn(async () => ok(form()))
    await t.ops.lifecycle.run({}, send, () => true); expect(send).not.toHaveBeenCalled(); hold.resolve(ok(form())); await first
    expect(during()).toBe(false); expect(t.ops.delta.snapshot.loading).toBe(false)
  })
  it('Count is explicit, zero is success, repeats read and stale late result is ignored', async () => {
    const t = setup('published'); expect(t.service.count).not.toHaveBeenCalled(); await t.manager.count(); expect(t.state.count).toBe(0)
    t.service.count.mockResolvedValue(ok({ count: 2 })); await t.manager.count(); expect(t.state.count).toBe(2); expect(t.service.count).toHaveBeenCalledTimes(2)
    const h = deferred<ApiResult<{ count: number }>>(); t.service.count.mockReturnValue(h.promise); const pending = t.manager.count()
    t.manager.begin('close'); await t.manager.confirm(true); h.resolve(ok({ count: 99 })); await pending
    expect(t.state.count).toBeNull(); expect(t.navigate).not.toHaveBeenCalled(); expect(t.e.session!.definition.metadata).toMatchObject({ status: 'closed' })
  })
  it('Count failure is a read failure, preserves old count and never acquires an unknown lock', async () => {
    const t = setup('published'); await t.manager.count(); t.service.count.mockResolvedValue(fail('INTERNAL_SERVER_ERROR', 500)); await t.manager.count()
    expect(t.state.count).toBe(0); expect(t.state.countStale).toBe(true); expect(t.state.error!.kind).toBe('read-failure'); expect(t.manager.unknown).toBe(false)
  })
  it('management denial revokes ability; stale write on changed resource has no effects', async () => {
    const t = setup(); t.service.visibility.mockResolvedValue(fail('FORM_ACCESS_DENIED', 403)); await t.manager.visibility('public'); expect(t.manager.canManage).toBe(false)
    const s = setup(), h = deferred<ApiResult<FormDetailDto>>(); s.service.visibility.mockReturnValue(h.promise); const p = s.manager.visibility('public'); s.context(); h.resolve(ok(form())); await p
    expect(s.toast).not.toHaveBeenCalled(); expect(s.e.session!.definition.resultVisibility).toBe('respondents')
  })
  it.each(['AUTH_REQUIRED', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED'])('management %s closing owns the current login flow', async code => {
    const t = setup(); t.edit('dirty'); t.service.visibility.mockResolvedValue(fail(code, 401)); await t.manager.visibility('public')
    expect(t.a.outcome).toBe('anonymous'); expect(t.state.error!.kind).toBe('auth'); await t.manager.closeError(); expect(t.navigate).toHaveBeenCalledTimes(1)
  })
  it('denial survives a new page operation and normal GET reconciliation until explicit identity verification', async () => {
    const t = setup(); t.service.visibility.mockResolvedValue(fail('FORM_ACCESS_DENIED', 403)); await t.manager.visibility('public')
    const next = new OperationState('visibility', t.coordinator, 'form:unit'); const fresh = next.captureRead()
    expect(next.permissionDenied(t.a.sessionRevision)).toBe(true); next.reconcile(() => true, fresh); expect(next.permissionDenied(t.a.sessionRevision)).toBe(true)
    await t.editor.load(uuid(50), true); expect(t.editor.canWrite).toBe(false)
    await t.editor.verifyPermission(); expect(next.permissionDenied(t.a.sessionRevision)).toBe(false); expect(t.editor.canWrite).toBe(true)
  })
  it('permission denial invalidates an already pending qualification/read even without a mutation', () => {
    const t = setup(), fresh = t.ops.visibility.captureRead(); t.ops.visibility.denyPermission(t.a.sessionRevision); expect(fresh()).toBe(false)
    expect(t.ops.visibility.permissionDenied(t.a.sessionRevision + 1)).toBe(false)
  })
})
