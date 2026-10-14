import { describe, it, expect, vi } from 'vitest'
import { ResponsePageController, responsePageState } from '../../app/domain/response-page'
import { mapReceipt, requireSubmittedReceipt } from '../../app/domain/response-mapping'
import { savedAnswerDefinition, emptyAnswers, buildAnswerRequest, answerDirty, answerBaseline } from '../../app/domain/answer'
import { decodeReceipt } from '../../app/domain/api/decoders'
import { AuthSession, initialAuthState } from '../../app/domain/auth-state'
import { OperationState, WriteCoordinator } from '../../app/domain/operation-state'
import { RequestScope } from '../../app/domain/request-scope'
import { ExactNumber } from '../../app/utils/exact-number'
import { parseExactJson, stringifyExactJson, cloneExact } from '../../app/utils/exact-json'
import { form, uuid, Q, O } from '../fixtures/f5/payloads'
import type { ApiResult } from '../../app/domain/api/result'
import type { ReceiptDto, SubmitRequest } from '../../app/domain/api/response'
import type { FormDetailDto, FormStatus } from '../../app/domain/api/form'
import type { responseService } from '../../app/services/response'
const user = { id: uuid(51), email: 'f8-unit@example.test', displayName: '合成填答者', avatarUrl: null }
const ok = <T>(value: T, status = 200): ApiResult<T> => ({ kind: 'success', status, value })
const fail = (code: string, status = 400): ApiResult<never> => ({ kind: 'api-error', status, error: { code, message: '合成錯誤' } })
const receipt = (answers: unknown = [], formId = uuid(50)): ReceiptDto => decodeReceipt(parseExactJson(stringifyExactJson({ id: uuid(80), formId, submittedAt: '2026-10-14T10:00:00.1234567Z', answers })))
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }
function setup(mode: 'single' | 'multiple' = 'single', status: FormStatus = 'published') {
  const authState = initialAuthState(), me = vi.fn(async () => ok(user)), authSession = new AuthSession(authState, me); authSession.login(user)
  const dto: FormDetailDto = { ...form(), status, responseMode: mode, submissionDeadlineAt: null }
  const state = responsePageState(), coordinator = new WriteCoordinator(), op = new OperationState(`response-${mode}`, coordinator, 'form:unit'), formOp = new OperationState('delta', coordinator, 'form:unit')
  let resource = '/forms/unit', revision = 0, now = BigInt(Date.now()) * 10000n, discard = true, replace = true, duplicate = true
  const scope = () => new RequestScope(() => resource, () => authState.sessionRevision)
  const service = {
    submit: vi.fn<ReturnType<typeof responseService>['submit']>(async (_id, body) => ok(receipt(body.answers), 201)),
    latest: vi.fn<ReturnType<typeof responseService>['latest']>(async () => ok(receipt())),
  }
  const forms = { detail: vi.fn(async (): Promise<ApiResult<FormDetailDto>> => ok(dto)) }
  const authorize = vi.fn(() => discard ? () => true : undefined), confirmLatest = vi.fn(() => replace), confirmDuplicate = vi.fn(() => duplicate), navigate = vi.fn(async () => {})
  const controller = new ResponsePageController(state, { auth: () => authState, authSession, resource: () => resource, id: () => dto.id, now: () => now, revision: () => revision, mode: 'form',
    formScope: scope(), latestScope: scope(), submitScope: scope(), formService: forms, responseService: service, operation: () => op, formOperation: () => formOp,
    authorize, finishDiscard: vi.fn(), confirmLatest, confirmDuplicate, navigate })
  const edit = (key: string, input: NonNullable<typeof state.model>['values'][string]) => { state.model!.values[key] = input; revision++ }
  return { state, dto, controller, authState, authSession, service, forms, me, op, formOp, coordinator, navigate, authorize, confirmLatest, confirmDuplicate, edit,
    discard: (value: boolean) => { discard = value }, replace: (value: boolean) => { replace = value }, duplicate: (value: boolean) => { duplicate = value },
    now: (value: bigint) => { now = value }, context: () => { resource = '/away'; revision++ } }
}
describe('F8 Definition-aware complete Receipt', () => {
  const definition = savedAnswerDefinition(form())
  it('maps reordered five types with exact values, Option IDs, Rating zero and missing optional blank', () => {
    const mapped = mapReceipt(definition, receipt([
      { questionId: Q[4], value: 0 }, { questionId: Q[3], value: [O[3], O[2]] }, { questionId: Q[2], value: O[0] },
      { questionId: Q[1], value: ExactNumber.from('9007199254740993.1234567890123456789') }, { questionId: Q[0], value: '😀\n完整文字' },
    ]), uuid(50))
    expect(mapped.values[Q[4]!]).toEqual({ type: 'rating', value: 0 })
    expect(mapped.values[Q[1]!]).toMatchObject({ raw: '9007199254740993.1234567890123456789' })
    expect(mapped.values[Q[2]!]).toEqual({ type: 'single_choice', optionKey: O[0] })
    const next = mapReceipt(definition, receipt([{ questionId: Q[4], value: 0 }]), uuid(50))
    expect(next.values[Q[0]!]).toEqual({ type: 'text', raw: '' }); expect(next.values[Q[3]!]).toEqual({ type: 'multiple_choice', optionKeys: [] })
    expect(answerDirty(next, answerBaseline(next))).toBe(false)
  })
  it.each([
    [{ questionId: uuid(999), value: 'unknown' }], [{ questionId: Q[0], value: 1 }], [{ questionId: Q[0], value: '' }], [{ questionId: Q[0], value: ' raw ' }],
    [{ questionId: Q[1], value: '123' }], [{ questionId: Q[1], value: -1 }], [{ questionId: Q[4], value: 6 }], [{ questionId: Q[4], value: ExactNumber.from('1.2') }],
    [{ questionId: Q[2], value: O[2] }], [{ questionId: Q[3], value: [O[2], O[2]] }], [{ questionId: Q[3], value: [] }], [{ questionId: Q[3], value: [O[0]] }],
  ])('rejects malformed/mismatched complete receipt case %# without partial adoption', (...answers) => { expect(() => mapReceipt(definition, receipt(answers), uuid(50))).toThrow() })
  it('rejects missing required, wrong form and duplicate question at the decoder boundary', () => {
    const required = savedAnswerDefinition({ ...form(), questions: form().questions.map(q => ({ ...q, required: true })) })
    expect(() => mapReceipt(required, receipt(), uuid(50))).toThrow()
    expect(() => mapReceipt(definition, receipt([], uuid(99)), uuid(50))).toThrow()
    expect(() => receipt([{ questionId: Q[0], value: 'A' }, { questionId: Q[0], value: 'B' }])).toThrow()
  })
  it.each(['1', '1.0', '1e0', '0', '9007199254740993', '0.12345678901234567890123456789'])('round trips precise JSON token %s and validates submitted semantic equality', token => {
    const input = emptyAnswers(definition).model; input.values[Q[1]!] = { type: 'number', raw: token }
    const built = buildAnswerRequest(definition, input); expect(built.kind).toBe('ready'); if (built.kind !== 'ready') return
    const dto = receipt(built.body.answers); requireSubmittedReceipt(definition, dto, uuid(50), built.body)
    expect(stringifyExactJson(built.body)).toContain(`"value":${token}`)
    expect(mapReceipt(definition, dto, uuid(50)).values[Q[1]!]).toMatchObject({ raw: token })
  })
  it('rejects a decoded 201 whose normalized saved answers differ from the request', () => {
    const body: SubmitRequest = { answers: [{ questionId: Q[0]!, value: 'A' }] }
    expect(() => requireSubmittedReceipt(definition, receipt([{ questionId: Q[0], value: 'B' }]), uuid(50), body)).toThrow()
  })
})
describe('F8 page transitions and request isolation', () => {
  it.each(['single', 'multiple'] as const)('%s enters empty, no Latest prequery; reliable 201 preserves raw and clean', async mode => {
    const t = setup(mode); await t.controller.load(); expect(t.service.latest).not.toHaveBeenCalled(); expect(t.controller.dirty).toBe(false)
    t.edit(Q[0]!, { type: 'text', raw: '  合成 😀  ' }); await t.controller.submit()
    expect(t.state.model!.values[Q[0]!]).toEqual({ type: 'text', raw: '  合成 😀  ' }); expect(t.controller.dirty).toBe(false); expect(t.state.success).toBe(true)
    expect(t.state.knownSubmitted).toBe(mode === 'single'); t.state.success = false; expect(t.controller.canSubmit).toBe(mode === 'multiple')
    if (mode === 'multiple') { await t.controller.submit(); expect(t.service.submit).toHaveBeenCalledTimes(2) }
    t.controller.contextChanged(); await t.controller.load(); expect(t.state.knownSubmitted).toBe(false); expect(t.state.model!.values[Q[0]!]).toMatchObject({ raw: '' })
  })
  it.each(['single', 'multiple'] as const)('%s Latest obtains success before replacement confirmation; cancel preserves model/baseline', async mode => {
    const t = setup(mode); await t.controller.load(); t.edit(Q[0]!, { type: 'text', raw: '本地保留' }); const baseline = t.state.baseline
    t.service.latest.mockResolvedValue(ok(receipt([{ questionId: Q[4], value: 0 }]))); t.replace(false); await t.controller.latest()
    expect(t.confirmLatest).toHaveBeenCalledOnce(); expect(t.state.baseline).toBe(baseline); expect(t.state.model!.values[Q[0]!]).toMatchObject({ raw: '本地保留' })
    expect(t.state.knownSubmitted).toBe(mode === 'single'); expect(t.controller.dirty).toBe(true)
    t.replace(true); await t.controller.latest(); expect(t.service.latest).toHaveBeenCalledTimes(2); expect(t.state.model!.values[Q[0]!]).toMatchObject({ raw: '' }); expect(t.controller.dirty).toBe(false)
    expect(t.state.model!.values[Q[4]!]).toMatchObject({ value: 0 }); expect(t.state.submittedAt).toBe('2026-10-14T10:00:00.1234567Z')
  })
  it.each(['RESPONSE_NOT_FOUND', 'INTERNAL_SERVER_ERROR'])('%s Latest preserves input, baseline and known state', async code => {
    const t = setup(); await t.controller.load(); t.edit(Q[0]!, { type: 'text', raw: '保留' }); t.state.knownSubmitted = true
    const baseline = t.state.baseline; t.service.latest.mockResolvedValue(fail(code, code === 'RESPONSE_NOT_FOUND' ? 404 : 500)); await t.controller.latest()
    expect(t.state.knownSubmitted).toBe(true); expect(t.state.baseline).toBe(baseline); expect(t.state.error?.kind).toBe(code === 'RESPONSE_NOT_FOUND' ? 'no-response' : 'read-failure')
  })
  it('multiple unknown followed by Latest and Form GET keeps duplicate risk; cancel retry sends zero POST', async () => {
    const t = setup('multiple'); await t.controller.load(); t.service.submit.mockResolvedValue({ kind: 'transport-error', reason: 'timeout', sent: true }); await t.controller.submit()
    expect(t.op.snapshot.duplicateRisk).toBe(true); expect(t.state.error?.kind).toBe('unknown-result'); await t.controller.closeError()
    await t.controller.latest(); expect(t.op.snapshot.duplicateRisk).toBe(true); expect(t.controller.needsReconciliation).toBe(true)
    await t.controller.load(true); expect(t.op.snapshot.duplicateRisk).toBe(true); t.duplicate(false); await t.controller.submit(); expect(t.service.submit).toHaveBeenCalledTimes(1)
    t.duplicate(true); t.service.submit.mockResolvedValue(ok(receipt(), 201)); await t.controller.submit(); expect(t.op.snapshot.duplicateRisk).toBe(false)
  })
  it('single unknown can be manually retried; AlreadySubmitted freezes local values until explicit Latest', async () => {
    const t = setup(); await t.controller.load(); t.edit(Q[0]!, { type: 'text', raw: '本地' }); t.service.submit.mockResolvedValue(fail('INTERNAL_SERVER_ERROR', 500)); await t.controller.submit(); await t.controller.closeError()
    t.service.submit.mockResolvedValue(fail('RESPONSE_ALREADY_SUBMITTED', 409)); await t.controller.submit()
    expect(t.state.knownSubmitted).toBe(true); expect(t.state.localOnly).toBe(true); expect(t.controller.readonly).toBe(true); expect(t.controller.dirty).toBe(true)
    await t.controller.closeError(); t.service.latest.mockResolvedValue(ok(receipt([{ questionId: Q[0], value: 'Server' }]))); await t.controller.latest()
    expect(t.state.localOnly).toBe(false); expect(t.controller.dirty).toBe(false); expect(t.controller.needsReconciliation).toBe(false)
  })
  it('invalid decoded 201 remains unknown with old baseline and no success Dialog', async () => {
    const t = setup(); await t.controller.load(); t.edit(Q[0]!, { type: 'text', raw: 'A' }); const baseline = t.state.baseline
    t.service.submit.mockResolvedValue(ok(receipt([{ questionId: Q[0], value: 'B' }]), 201)); await t.controller.submit()
    expect(t.state.success).toBe(false); expect(t.state.baseline).toBe(baseline); expect(t.state.error?.kind).toBe('unknown-result')
  })
  it.each(['published', 'closed'] as const)('normal %s expired/Closed enters blank without navigation, Latest stays available', async status => {
    const t = setup('multiple', status); t.forms.detail.mockResolvedValue(ok({ ...t.dto, submissionDeadlineAt: '2000-01-01T00:00:00Z' })); await t.controller.load()
    expect(t.controller.canSubmit).toBe(false); expect(t.controller.canLatest).toBe(true); expect(t.navigate).not.toHaveBeenCalled()
  })
  it('deadline expires during pending but a current legitimate 201 still adopts success', async () => {
    const t = setup('multiple'), deadline = BigInt(Date.now()) * 10000n + 10000000n
    t.forms.detail.mockResolvedValue(ok({ ...t.dto, submissionDeadlineAt: new Date(Number(deadline / 10000n)).toISOString() })); await t.controller.load()
    const pending = deferred<ApiResult<ReceiptDto>>(); t.service.submit.mockReturnValue(pending.promise); const work = t.controller.submit(); t.now(deadline + 10000000n); pending.resolve(ok(receipt(), 201)); await work
    expect(t.state.success).toBe(true); expect(t.controller.readonly).toBe(true)
  })
  it.each(['AUTH_REQUIRED', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED'])('%s preserves answers and revokes grant; explicit me+Form verification restores nonOwner access', async code => {
    const t = setup(); t.forms.detail.mockResolvedValue(ok({ ...t.dto, userId: uuid(99) })); await t.controller.load(); t.edit(Q[0]!, { type: 'text', raw: '保留' })
    t.service.submit.mockResolvedValue(fail(code, 401)); await t.controller.submit(); expect(t.state.form).not.toBeNull(); expect(t.state.model!.values[Q[0]!]).toMatchObject({ raw: '保留' }); expect(t.controller.canSubmit).toBe(false)
    await t.controller.closeError(); expect(t.navigate).toHaveBeenCalledOnce(); t.discard(false); expect(await t.controller.verifyPermission()).toBe(false); expect(t.me).not.toHaveBeenCalled()
    t.discard(true); expect(await t.controller.verifyPermission()).toBe(true); expect(t.controller.canSubmit).toBe(true); expect(t.controller.owner).toBe(false)
  })
  it('disabled retains User and answers; missing form/Closed conflicts wait for explicit discard/navigation', async () => {
    const t = setup(); await t.controller.load(); t.edit(Q[0]!, { type: 'text', raw: '保留' }); t.service.submit.mockResolvedValue(fail('AUTH_USER_DISABLED', 403)); await t.controller.submit()
    expect(t.authState.user).toEqual(user); expect(t.state.error?.kind).toBe('disabled'); await t.controller.closeError(); expect(t.navigate).not.toHaveBeenCalled()
    t.service.submit.mockResolvedValue(fail('FORM_NOT_SUBMITTABLE', 409)); t.forms.detail.mockResolvedValue(ok({ ...t.dto, status: 'closed' })); await t.controller.submit(); expect(t.controller.canSubmit).toBe(false); await t.controller.closeError(); expect(t.navigate).toHaveBeenCalledWith('/', false)
  })
  it('management metadata preserves AnswerModel, baseline and dirty; owner denial is distinct from respondent eligibility', async () => {
    const t = setup(); await t.controller.load(); t.edit(Q[0]!, { type: 'text', raw: '保留' }); const model = t.state.model, baseline = t.state.baseline
    t.formOp.denyPermission(t.authState.sessionRevision); expect(t.controller.canSubmit).toBe(true)
    t.controller.adoptManagement({ ...t.dto, title: 'stale definition', resultVisibility: 'public' }); expect(t.state.model).toBe(model); expect(t.state.baseline).toBe(baseline); expect(t.state.form!.title).toBe(t.dto.title); expect(t.controller.dirty).toBe(true)
    t.controller.adoptManagement({ ...t.dto, status: 'closed' }); expect(t.controller.canSubmit).toBe(false); expect(t.state.model).toBe(model)
  })
  it.each(['lifecycle', 'delete', 'visibility'] as const)('%s unknown affects Submit only when state/existence is uncertain; Latest does not release its lock', async policy => {
    const t = setup('multiple'); await t.controller.load(); const management = new OperationState(policy, t.coordinator, 'form:unit')
    await management.run({}, async () => fail('INTERNAL_SERVER_ERROR', 500), () => true)
    expect(t.controller.canSubmit).toBe(policy === 'visibility'); await t.controller.latest(); expect(management.snapshot.needsReconciliation).toBe(true)
  })
  it.each(['submit', 'latest', 'form', 'verify'] as const)('%s late responses after context change cannot adopt/error/navigate', async action => {
    const t = setup('multiple'); await t.controller.load(); const before = cloneExact(t.state.model)
    const pending = deferred<ApiResult<ReceiptDto>>(), read = deferred<ApiResult<FormDetailDto>>(), me = deferred<ApiResult<typeof user>>()
    t.service.submit.mockReturnValue(pending.promise); t.service.latest.mockReturnValue(pending.promise); t.forms.detail.mockReturnValue(read.promise); t.me.mockReturnValue(me.promise)
    const work = action === 'submit' ? t.controller.submit() : action === 'latest' ? t.controller.latest() : action === 'form' ? t.controller.load(true) : t.controller.verifyPermission()
    t.context(); pending.resolve(ok(receipt(), 201)); read.resolve(ok(t.dto)); me.resolve(ok(user)); await work
    expect(t.state.model).toEqual(before); expect(t.state.success).toBe(false); expect(t.state.error).toBeNull(); expect(t.navigate).not.toHaveBeenCalled()
  })
  it.each(['success', 'unknown'] as const)('Latest started before a management %s stays stale after lease ends', async result => {
    const t = setup('multiple'); await t.controller.load(); t.edit(Q[0]!, { type: 'text', raw: '保留' }); const pending = deferred<ApiResult<ReceiptDto>>(); t.service.latest.mockReturnValue(pending.promise)
    const work = t.controller.latest(), manager = new OperationState('visibility', t.coordinator, 'form:unit')
    await manager.run({}, async () => result === 'success' ? ok(t.dto) : fail('INTERNAL_SERVER_ERROR', 500), () => true)
    pending.resolve(ok(receipt())); await work; expect(t.state.model!.values[Q[0]!]).toMatchObject({ raw: '保留' }); expect(t.confirmLatest).not.toHaveBeenCalled(); expect(t.state.latestLoading).toBe(false)
  })
  it('shared lease blocks concurrent Submit and management; submit freeze ends in finally', async () => {
    const t = setup(); await t.controller.load(); const pending = deferred<ApiResult<ReceiptDto>>(); t.service.submit.mockReturnValue(pending.promise); const work = t.controller.submit()
    expect(t.controller.inputDisabled).toBe(true); await t.controller.submit(); const manager = new OperationState('delete', t.coordinator, 'form:unit'), send = vi.fn(async () => ok(undefined, 204))
    expect(await manager.run({}, send, () => true)).toEqual({ kind: 'blocked' }); expect(send).not.toHaveBeenCalled(); pending.resolve(ok(receipt(), 201)); await work; t.state.success = false; expect(t.op.snapshot.loading).toBe(false)
  })
  it.each(['me', 'form'] as const)('qualification GET at %s stays stale after a management unknown; cannot clear its gate', async stage => {
    const t = setup('multiple'); await t.controller.load(); const me = deferred<ApiResult<typeof user>>(), read = deferred<ApiResult<FormDetailDto>>()
    if (stage === 'me') t.me.mockReturnValue(me.promise); else t.forms.detail.mockReturnValue(read.promise)
    const work = t.controller.verifyPermission()
    if (stage === 'form') await vi.waitFor(() => expect(t.forms.detail).toHaveBeenCalledTimes(2))
    const manager = new OperationState('lifecycle', t.coordinator, 'form:unit'); await manager.run({}, async () => fail('INTERNAL_SERVER_ERROR', 500), () => true)
    me.resolve(ok(user)); read.resolve(ok(t.dto)); expect(await work).toBe(false); expect(manager.snapshot.needsReconciliation).toBe(true); expect(t.controller.canSubmit).toBe(false)
  })
  it('verified different respondent ends local single/duplicate context without borrowing previous completion', async () => {
    const t = setup('multiple'); await t.controller.load(); t.service.submit.mockResolvedValue(fail('INTERNAL_SERVER_ERROR', 500)); await t.controller.submit(); await t.controller.closeError(); expect(t.op.snapshot.duplicateRisk).toBe(true)
    t.me.mockResolvedValue(ok({ ...user, id: uuid(52) })); expect(await t.controller.verifyPermission()).toBe(true)
    expect(t.state.permission?.userId).toBe(uuid(52)); expect(t.op.snapshot.duplicateRisk).toBe(false); expect(t.state.knownSubmitted).toBe(false); expect(t.controller.canSubmit).toBe(true)
  })
  it('reliable current Form 404 adopts missing after confirmation and releases Delete gate only', async () => {
    const t = setup(); await t.controller.load(); const manager = new OperationState('delete', t.coordinator, 'form:unit'); await manager.run({}, async () => fail('INTERNAL_SERVER_ERROR', 500), () => true)
    t.forms.detail.mockResolvedValue(fail('FORM_NOT_FOUND', 404)); t.discard(false); await t.controller.load(true); expect(t.state.form).not.toBeNull(); expect(manager.snapshot.needsReconciliation).toBe(true)
    t.discard(true); await t.controller.load(true); expect(t.state.form).toBeNull(); expect(t.state.readError?.kind).toBe('not-found'); expect(manager.snapshot.needsReconciliation).toBe(false)
  })
  it('malformed Draft ownership does not throw or grant a usable response page', async () => {
    const t = setup(); t.forms.detail.mockResolvedValue(ok({ ...t.dto, status: 'draft', userId: uuid(52) })); expect(await t.controller.load()).toBe(false)
    expect(t.state.form).toBeNull(); expect(t.state.readError?.kind).toBe('read-failure'); expect(t.controller.canSubmit).toBe(false)
  })
  it('closing a not-submittable Dialog before its status GET resolves still follows confirmed Closed flow', async () => {
    const t = setup(); await t.controller.load(); const pending = deferred<ApiResult<FormDetailDto>>()
    t.service.submit.mockResolvedValue(fail('FORM_NOT_SUBMITTABLE', 409)); t.forms.detail.mockReturnValue(pending.promise)
    const submit = t.controller.submit(); await vi.waitFor(() => expect(t.forms.detail).toHaveBeenCalledTimes(2)); const close = t.controller.closeError()
    pending.resolve(ok({ ...t.dto, status: 'closed' })); await Promise.all([submit, close]); expect(t.navigate).toHaveBeenCalledWith('/', false)
  })
  it.each(['AUTH_REQUIRED', 'FORM_NOT_FOUND', 'INTERNAL_SERVER_ERROR'])('status lookup %s is a fresh read error, not a guessed Closed result', async code => {
    const t = setup(); await t.controller.load(); t.service.submit.mockResolvedValue(fail('FORM_NOT_SUBMITTABLE', 409)); t.forms.detail.mockResolvedValue(fail(code, code === 'AUTH_REQUIRED' ? 401 : code === 'FORM_NOT_FOUND' ? 404 : 500))
    await t.controller.submit(); const revision = t.state.errorRevision; await t.controller.closeError()
    expect(t.state.errorRevision).toBe(revision + 1); expect(t.state.error?.kind).toBe(code === 'AUTH_REQUIRED' ? 'auth' : code === 'FORM_NOT_FOUND' ? 'not-found' : 'read-failure'); expect(t.navigate).not.toHaveBeenCalled()
  })
  it('manual Form/qualification read failures remain inline and keep policy lock; fresh success clears old read error', async () => {
    const t = setup('multiple'); await t.controller.load(); const policy = new OperationState('visibility', t.coordinator, 'form:unit'); await policy.run({}, async () => fail('INTERNAL_SERVER_ERROR', 500), () => true)
    t.forms.detail.mockResolvedValue(fail('INTERNAL_SERVER_ERROR', 500)); await t.controller.load(true); expect(t.state.error).toBeNull(); expect(t.state.readError?.kind).toBe('read-failure'); expect(policy.snapshot.blocked).toBe(true)
    await t.controller.verifyPermission(); expect(t.state.error).toBeNull(); expect(policy.snapshot.blocked).toBe(true)
    t.forms.detail.mockResolvedValue(ok(t.dto)); await t.controller.verifyPermission(); expect(t.state.readError).toBeNull(); expect(policy.snapshot.blocked).toBe(false)
  })
})
