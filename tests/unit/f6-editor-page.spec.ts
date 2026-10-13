import { describe, it, expect, vi } from 'vitest'
import { EditorPageController, editorPageState } from '../../app/domain/editor-page'
import { AuthSession, initialAuthState } from '../../app/domain/auth-state'
import { RequestScope } from '../../app/domain/request-scope'
import { OperationState, WriteCoordinator } from '../../app/domain/operation-state'
import { loadEditor, addQuestion, addOption } from '../../app/domain/editor'
import { ratingInput } from '../../app/domain/rating-input'
import type { ApiResult } from '../../app/domain/api/result'
import type { formService } from '../../app/services/form'
import { form, uuid } from '../fixtures/f5/payloads'
const user = { id: uuid(51), email: 'f6-unit@example.test', displayName: '合成建立者', avatarUrl: null }
const success = <T>(value: T, status = 200): ApiResult<T> => ({ kind: 'success', status, value })
const failure = (code: string, status = 401) => ({ kind: 'api-error', status, error: { code, message: '合成失敗' } } as const)
function setup(saved = false) {
  const state = editorPageState(), a = initialAuthState(), me = vi.fn(async () => success(user)), auth = new AuthSession(a, me)
  auth.login(user)
  let resource = '/forms/new', permit = true, discard = true
  const scope = new RequestScope(() => resource, () => a.sessionRevision), coordinator = new WriteCoordinator()
  const create = new OperationState('create', coordinator, 'page'), delta = new OperationState('delta', coordinator, 'page')
  const service = { list: vi.fn<ReturnType<typeof formService>['list']>(), detail: vi.fn<ReturnType<typeof formService>['detail']>(async () => success(form())), create: vi.fn<ReturnType<typeof formService>['create']>(async () => success(form(), 201)), update: vi.fn<ReturnType<typeof formService>['update']>(async () => success(form())) }
  const navigate = vi.fn(async () => {}), toast = vi.fn(), confirmDuplicate = vi.fn(() => true), confirmAccount = vi.fn(() => true)
  const controller = new EditorPageController(state, { auth: () => a, authSession: auth, scope, service,
    operation: saved => saved ? delta : create, resource: () => resource, path: () => resource,
    authorize: () => discard ? () => permit : undefined, finishDiscard: vi.fn(), confirmDuplicate, confirmAccount, navigate, toast })
  if (saved) { state.session = loadEditor(form()); state.contentUserId = user.id; state.permission = { userId: user.id, revision: a.sessionRevision, resource } }
  else controller.initializeNew()
  const ready = () => { state.session!.definition.title = '合成標題'; state.session!.definition.resultVisibility = 'public' }
  return { state, a, me, auth, scope, service, create, delta, controller, navigate, toast, confirmDuplicate, confirmAccount, ready,
    context: (path: string) => { resource = path }, permit: (value: boolean) => { permit = value }, discard: (value: boolean) => { discard = value } }
}
describe('F6 editor page transitions', () => {
  it('new initialization is local and invalid/noop definition never sends', async () => {
    const t = setup(); expect(t.state.session!.definition.questions).toEqual([]); expect(t.service.create).not.toHaveBeenCalled()
    await t.controller.save(); expect(t.state.issues.length).toBeGreaterThan(0); expect(t.service.create).not.toHaveBeenCalled()
    const s = setup(true); await s.controller.save(); expect(s.service.update).not.toHaveBeenCalled()
  })
  it('Create adopts Server IDs and baseline; later save uses delta with no temporary key', async () => {
    const t = setup(); t.ready(); t.controller.update(addQuestion(t.state.session!.definition)); t.state.session!.definition.questions[0]!.title = '新題'
    await t.controller.save(); expect(t.controller.dirty).toBe(false); expect(t.controller.id).toBe(uuid(50)); expect(t.navigate).toHaveBeenCalledWith(`/forms/${uuid(50)}/edit`, false)
    t.controller.update(addOption(t.state.session!.definition, uuid(3))); t.state.session!.definition.questions[2]!.options.at(-1)!.label = '新增選項'
    await t.controller.save(); const sent = t.service.update.mock.calls[0]!
    expect(JSON.stringify(sent)).not.toContain('tmp_'); expect(t.controller.dirty).toBe(false)
  })
  it('locks inputs/duplicate submit while pending and snapshots the payload', async () => {
    const t = setup(); t.ready(); let resolve!: (r: ApiResult<ReturnType<typeof form>>) => void
    t.service.create.mockImplementation(() => new Promise(r => { resolve = r }))
    const pending = t.controller.save(); expect(t.controller.inputDisabled).toBe(true)
    await t.controller.save(); t.state.session!.definition.title = '意外變動'
    expect(t.service.create).toHaveBeenCalledTimes(1); expect(t.service.create.mock.calls[0]?.[0]).toMatchObject({ title: '合成標題' })
    resolve(success(form(), 201)); await pending; expect(t.controller.inputDisabled).toBe(false)
  })
  it('stale success never adopts/navigates/toasts and loading is released', async () => {
    const t = setup(); t.ready(); let resolve!: (r: ApiResult<ReturnType<typeof form>>) => void
    t.service.create.mockImplementation(() => new Promise(r => { resolve = r }))
    const pending = t.controller.save(); t.context('/away'); t.scope.invalidate(); resolve(success(form(), 201)); await pending
    expect(t.controller.id).toBeUndefined(); expect(t.navigate).not.toHaveBeenCalled(); expect(t.toast).not.toHaveBeenCalled(); expect(t.create.snapshot.loading).toBe(false)
  })
  it('switching resource during a read starts the new read and stale finally cannot clear its loading', async () => {
    const t = setup(true); let oldResolve!: (r: ApiResult<ReturnType<typeof form>>) => void, newResolve!: (r: ApiResult<ReturnType<typeof form>>) => void
    t.service.detail.mockImplementationOnce(() => new Promise(r => { oldResolve = r })).mockImplementationOnce(() => new Promise(r => { newResolve = r }))
    const old = t.controller.load(uuid(50)); t.context(`/forms/${uuid(55)}/edit`); t.controller.contextChanged()
    const current = t.controller.load(uuid(55)); expect(t.state.checking).toBe(true)
    oldResolve(success(form())); await old; expect(t.state.checking).toBe(true); expect(t.state.session).toBeNull()
    newResolve(success({ ...form(), id: uuid(55) })); await current; expect(t.state.checking).toBe(false); expect(t.controller.id).toBe(uuid(55))
  })
  it.each([false, true])('Auth lapse preserves local input but cancels write eligibility (saved=%s)', async saved => {
    const t = setup(saved); t.ready(); const local = t.state.session
    const send = saved ? t.service.update : t.service.create; send.mockResolvedValue(failure('AUTH_TOKEN_EXPIRED'))
    await t.controller.save(); expect(t.state.session).toBe(local); expect(t.controller.canWrite).toBe(false); expect(t.a.outcome).toBe('anonymous')
    await t.controller.closeError(); expect(t.navigate).toHaveBeenCalledTimes(1)
    // Router cancel is independent of Auth. Logging in by itself cannot restore the old grant.
    t.auth.login(user); t.controller.authChanged(); expect(t.controller.canWrite).toBe(false)
    await t.controller.save(); expect(send).toHaveBeenCalledTimes(1)
    await t.controller.verifyPermission(); expect(t.me).toHaveBeenCalledTimes(1); expect(t.controller.canWrite).toBe(true)
    expect(t.service.detail).toHaveBeenCalledTimes(saved ? 1 : 0)
  })
  it('new account change requires fresh me plus explicit consent, without creating or discarding input', async () => {
    const t = setup(); t.ready(); t.auth.login({ ...user, id: uuid(52) }); t.controller.authChanged()
    t.me.mockResolvedValue(success({ ...user, id: uuid(52), displayName: '新帳號' })); t.confirmAccount.mockReturnValueOnce(false)
    await t.controller.verifyPermission(); expect(t.controller.canWrite).toBe(false); expect(t.state.session!.definition.title).toBe('合成標題')
    await t.controller.verifyPermission(); expect(t.controller.canWrite).toBe(true); expect(t.state.session!.definition.metadata.creatorDisplayName).toBe('新帳號'); expect(t.service.create).not.toHaveBeenCalled()
  })
  it('edit account change cannot use old Owner grant and preserves content when access is denied', async () => {
    const t = setup(true); t.ready(); const local = t.state.session
    t.auth.login({ ...user, id: uuid(52) }); t.controller.authChanged(); t.me.mockResolvedValue(success({ ...user, id: uuid(52) }))
    t.service.detail.mockResolvedValue(failure('FORM_NOT_FOUND', 404)); await t.controller.verifyPermission()
    expect(t.controller.canWrite).toBe(false); expect(t.state.session).toBe(local); await t.controller.save(); expect(t.service.update).not.toHaveBeenCalled()
  })
  it('PATCH unknown only unlocks after a permitted current GET adoption; cancel/failed GET retains lock', async () => {
    const t = setup(true); t.ready(); t.service.update.mockResolvedValue({ kind: 'transport-error', reason: 'timeout', sent: true })
    await t.controller.save(); expect(t.delta.snapshot.blocked).toBe(true); const local = t.state.session
    t.discard(false); await t.controller.load(uuid(50), true); expect(t.service.detail).not.toHaveBeenCalled()
    t.discard(true); t.service.detail.mockResolvedValue(failure('INTERNAL_SERVER_ERROR', 500)); await t.controller.load(uuid(50), true)
    expect(t.state.session).toBe(local); expect(t.delta.snapshot.blocked).toBe(true)
    t.service.detail.mockResolvedValue(success(form())); await t.controller.load(uuid(50), true)
    expect(t.delta.snapshot.blocked).toBe(false); expect(t.controller.dirty).toBe(false)
  })
  it('a rejected reload permit cannot adopt even after a GET response', async () => {
    const t = setup(true); t.ready(); const local = t.state.session; t.permit(false)
    await t.controller.load(uuid(50), true); expect(t.state.session).toBe(local)
  })
  it('Create unknown requires every retry confirmation and list lookup is not success', async () => {
    const t = setup(); t.ready(); t.service.create.mockResolvedValue({ kind: 'contract-error', status: 201, sent: true, message: 'missing IDs' })
    await t.controller.save(); expect(t.create.snapshot.duplicateRisk).toBe(true); expect(t.controller.id).toBeUndefined()
    t.confirmDuplicate.mockReturnValueOnce(false); await t.controller.save(); expect(t.service.create).toHaveBeenCalledTimes(1)
    await t.controller.save(); expect(t.service.create).toHaveBeenCalledTimes(2); expect(t.confirmDuplicate).toHaveBeenCalledTimes(2)
  })
  it.each([false, true])('wrong Owner success is uncertain, never a saved baseline (saved=%s)', async saved => {
    const t = setup(saved); t.ready(); (saved ? t.service.update : t.service.create).mockResolvedValue(success({ ...form(), userId: uuid(99) }, saved ? 200 : 201))
    await t.controller.save(); expect((saved ? t.delta : t.create).snapshot.needsReconciliation).toBe(true); expect(t.controller.dirty).toBe(true); expect(t.toast).not.toHaveBeenCalled()
  })
  it('FORM_NOT_EDITABLE candidate GET does not overwrite dirty input', async () => {
    const t = setup(true); t.ready(); const local = t.state.session; t.service.update.mockResolvedValue(failure('FORM_NOT_EDITABLE', 409))
    t.service.detail.mockResolvedValue(success({ ...form(), status: 'published' })); await t.controller.save()
    expect(t.state.session).toBe(local); expect(t.controller.canWrite).toBe(false); expect(t.navigate).not.toHaveBeenCalled()
    await t.controller.load(uuid(50), true); expect(t.navigate).toHaveBeenCalledWith(`/forms/${uuid(50)}`, true)
  })
})
describe('F6 rating interaction', () => {
  it('focus leaves undefined, score 0 is answered, optional clear resets and readonly never writes', () => {
    expect(ratingInput(undefined, { kind: 'focus' }, 0, 100)).toBeUndefined()
    expect(ratingInput(undefined, { kind: 'score', score: 0 }, 0, 100)).toBe(0)
    expect(ratingInput(0, { kind: 'clear' }, 0, 100)).toBeUndefined()
    expect(ratingInput(5, { kind: 'clear' }, 0, 100, true)).toBe(5)
    expect(ratingInput(undefined, { kind: 'score', score: 5 }, 0, 100, false, true)).toBeUndefined()
    for (const score of [-1, 101, 0.5, NaN]) expect(ratingInput(3, { kind: 'score', score }, 0, 100)).toBe(3)
  })
})
