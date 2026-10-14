import type { AuthState, AuthSession } from './auth-state'
import { isSessionFailure } from './auth-state'
import type { FormDetailDto } from './api/form'
import type { ApiResult } from './api/result'
import type { AnswerModel, AnswerDefinition, AnswerBaseline } from './answer'
import { savedAnswerDefinition, emptyAnswers, answerBaseline, answerDirty, buildAnswerRequest } from './answer'
import { mapReceipt, requireSubmittedReceipt } from './response-mapping'
import { cloneExact } from '../utils/exact-json'
import { parseInstant } from '../utils/datetime'
import { loginLocation } from '../utils/redirect'
import type { FieldIssue } from './models'
import { detailLocation, formReadError } from './form-read'
import { locateDetails, presentError } from './error-presentation'
import type { ErrorPresentation } from './error-presentation'
import type { RequestScope } from './request-scope'
import type { OperationState } from './operation-state'
import type { formService } from '../services/form'
import type { responseService } from '../services/response'

export interface ResponsePageState {
  form: FormDetailDto | null; definition: AnswerDefinition | null; model: AnswerModel | null; baseline: AnswerBaseline | null
  permission: { userId: string; revision: number; resource: string } | null
  knownSubmitted: boolean; localOnly: boolean; submittedAt: string | null; success: boolean
  checking: boolean; latestLoading: boolean; unavailable: boolean; deadlineDenied: boolean
  issues: readonly FieldIssue[]; error: ErrorPresentation | null; readError: ErrorPresentation | null; candidate: FormDetailDto | null
  errorRevision: number
}
export const responsePageState = (): ResponsePageState => ({ form: null, definition: null, model: null, baseline: null, permission: null,
  knownSubmitted: false, localOnly: false, submittedAt: null, success: false, checking: false, latestLoading: false, unavailable: false, deadlineDenied: false,
  issues: [], error: null, readError: null, candidate: null, errorRevision: 0 })
interface Effects {
  auth: () => AuthState; authSession: AuthSession; resource: () => string; id: () => string; now: () => bigint; revision: () => unknown
  mode: 'form' | 'edit'; formScope: RequestScope; latestScope: RequestScope; submitScope: RequestScope
  formService: Pick<ReturnType<typeof formService>, 'detail'>; responseService: ReturnType<typeof responseService>
  operation: () => OperationState; formOperation: () => OperationState
  authorize: () => (() => boolean) | undefined; finishDiscard: () => void; confirmLatest: () => boolean; confirmDuplicate: () => boolean
  navigate: (target: string | ReturnType<typeof loginLocation>, replace: boolean) => Promise<unknown>
}
export class ResponsePageController {
  private disposed = false
  private formGeneration = 0
  private latestGeneration = 0
  private contentSession?: { userId: string; revision: number }
  private statusCheck?: Promise<void>
  private statusFailure?: Exclude<ApiResult<FormDetailDto>, { kind: 'success' }>
  private flow?: { path: string; session: number; kind: 'auth' | 'home' | 'missing' | 'state' }
  constructor(readonly state: ResponsePageState, private readonly effects: Effects) {}
  get operation(): OperationState { return this.effects.operation() }
  get hasPermission(): boolean {
    const p = this.state.permission, a = this.effects.auth()
    return !this.disposed && !!p && a.phase === 'settled' && a.outcome === 'authenticated' && p.userId === a.user?.id && p.revision === a.sessionRevision && p.resource === this.effects.resource()
  }
  get owner(): boolean { return this.hasPermission && this.state.form?.userId === this.effects.auth().user?.id }
  get expired(): boolean { const deadline = this.state.form?.submissionDeadlineAt; return this.state.deadlineDenied || (!!deadline && this.effects.now() >= parseInstant(deadline).ticks) }
  get collecting(): boolean { return this.state.form?.status === 'published' && !this.expired && !this.state.unavailable && !this.operation.requiresFormCheck }
  get readonly(): boolean { return !this.hasPermission || !this.collecting || (this.state.form?.responseMode === 'single' && this.state.knownSubmitted) }
  get dirty(): boolean { return !!this.state.model && !!this.state.baseline && answerDirty(this.state.model, this.state.baseline) }
  get needsReconciliation(): boolean { return this.operation.anyUnknown || this.operation.snapshot.duplicateRisk || this.effects.formOperation().anyUnknown }
  get inputDisabled(): boolean { return this.state.checking || this.state.latestLoading || this.state.success || (this.operation.snapshot.loading && this.operation.activePolicy !== 'visibility') }
  get canSubmit(): boolean { return !this.readonly && !this.inputDisabled && !this.state.error && !this.operation.snapshot.blocked }
  get canLatest(): boolean { return this.hasPermission && !!this.state.definition && !this.state.unavailable && !this.state.checking && !this.state.latestLoading && !this.operation.snapshot.loading && !this.state.success && !this.state.error }
  authChanged(): void { if (!this.hasPermission) this.state.permission = null }
  contextChanged(): void {
    this.formGeneration++; this.latestGeneration++
    this.effects.formScope.invalidate(); this.effects.latestScope.invalidate(); this.effects.submitScope.invalidate()
    this.operation.resetResponseContext()
    Object.assign(this.state, responsePageState()); this.flow = undefined; this.contentSession = undefined; this.statusCheck = undefined; this.statusFailure = undefined
  }
  dispose(): void { this.disposed = true; this.contextChanged() }
  private grant(): void {
    const a = this.effects.auth()
    this.state.permission = a.outcome === 'authenticated' && a.user ? { userId: a.user.id, revision: a.sessionRevision, resource: this.effects.resource() } : null
    if (this.state.permission) this.contentSession = { userId: this.state.permission.userId, revision: this.state.permission.revision }
  }
  private initialize(dto: FormDetailDto, keepKnown = false): void {
    this.state.form = dto; this.state.definition = savedAnswerDefinition(dto)
    const empty = emptyAnswers(this.state.definition); this.state.model = empty.model; this.state.baseline = empty.baseline
    this.state.issues = []; this.state.unavailable = false; this.state.candidate = null; this.state.submittedAt = null
    this.state.knownSubmitted = keepKnown && this.state.knownSubmitted; this.state.localOnly = this.state.knownSubmitted
  }
  adoptManagement(dto: FormDetailDto): void {
    if (!this.state.form || dto.id !== this.state.form.id || dto.userId !== this.state.form.userId) throw new Error('Unexpected management form')
    const { status, creatorDisplayName, resultVisibility, createdAt, updatedAt } = dto
    this.state.form = { ...this.state.form, status, creatorDisplayName, resultVisibility, createdAt, updatedAt }
  }
  clear(): void { this.contextChanged(); this.state.unavailable = true; this.state.readError = { kind: 'not-found', placement: 'page', message: '找不到表單', details: [], knownCode: true } }
  private failure(result: Exclude<ApiResult<unknown>, { kind: 'success' }>, source: 'read' | 'action' | 'latest', readDialog = false): void {
    const presentation = source === 'read' ? formReadError(result) : presentError(result, source)
    if (source !== 'read' || (this.state.form && (readDialog || isSessionFailure(result)))) this.state.error = { ...presentation, placement: 'dialog' }
    else this.state.readError = presentation
    this.state.errorRevision++
    if (isSessionFailure(result)) {
      this.state.permission = null; this.effects.authSession.invalidate(result)
      this.flow = { kind: 'auth', path: this.effects.resource(), session: this.effects.auth().sessionRevision }
    }
    if (result.kind !== 'api-error') return
    const code = result.error.code
    if (code === 'FORM_NOT_FOUND') { this.state.unavailable = true; this.flow = { kind: 'missing', path: this.effects.resource(), session: this.effects.auth().sessionRevision } }
    if (code === 'RESPONSE_ALREADY_SUBMITTED' && this.state.form?.responseMode === 'single') { this.state.knownSubmitted = true; this.state.localOnly = true }
    if (code === 'SUBMISSION_DEADLINE_EXCEEDED') { this.state.deadlineDenied = true; this.flow = { kind: 'home', path: this.effects.resource(), session: this.effects.auth().sessionRevision } }
    if (code === 'FORM_NOT_SUBMITTABLE') { this.state.unavailable = true; this.flow = { kind: 'state', path: this.effects.resource(), session: this.effects.auth().sessionRevision } }
  }
  async load(manual = false): Promise<boolean> {
    if (this.disposed || this.state.checking || this.state.latestLoading || this.operation.snapshot.loading || !['authenticated', 'disabled'].includes(this.effects.auth().outcome)) return false
    const permit = manual ? this.effects.authorize() : () => true
    if (!permit) return false
    const hadForm = !!this.state.form, hadGrant = this.hasPermission, readCurrent = this.effects.formOperation().captureRead(), generation = ++this.formGeneration
    const ticket = this.effects.formScope.begin(); this.state.checking = true; this.state.readError = null
    try {
      const result = await this.effects.formService.detail(this.effects.id(), ticket.signal)
      if (!ticket.isCurrent() || !readCurrent() || !permit()) return false
      if (result.kind !== 'success') {
        if (manual && result.kind === 'api-error' && result.error.code === 'FORM_NOT_FOUND') { this.effects.formOperation().reconcile(() => { this.clear(); return true }, () => !this.disposed && readCurrent()); return false }
        this.failure(result, 'read')
        if (isSessionFailure(result) && !hadForm) await this.effects.navigate(loginLocation(this.effects.resource()), true)
        return false
      }
      const target = detailLocation(result.value, this.effects.auth().user?.id, this.effects.mode)
      const adopted = this.effects.formOperation().reconcile(() => { this.initialize(result.value, hadForm); if (!hadForm || hadGrant) this.grant(); return true }, () => ticket.isCurrent() && readCurrent())
      if (adopted && target) await this.effects.navigate(target, true)
      return adopted
    } catch {
      if (ticket.isCurrent() && readCurrent() && permit()) this.failure({ kind: 'contract-error', status: 200, sent: true, message: '無法確認表單現況。' }, 'read')
      return false
    } finally { if (generation === this.formGeneration) { this.state.checking = false; this.effects.finishDiscard() }; this.effects.formScope.finish(ticket) }
  }
  async verifyPermission(): Promise<boolean> {
    if (this.disposed || this.state.checking || this.state.latestLoading || this.operation.snapshot.loading) return false
    const permit = this.effects.authorize(); if (!permit) return false
    const path = this.effects.resource(), readCurrent = this.effects.formOperation().captureRead(), generation = ++this.formGeneration
    let ticket = this.effects.formScope.begin(); this.state.checking = true; this.state.readError = null
    try {
      const candidate = await this.effects.authSession.candidate()
      if (!ticket.isCurrent() || !readCurrent() || !candidate.isCurrent() || !permit()) return false
      if (candidate.result.kind !== 'success') { this.failure(candidate.result, 'read'); return false }
      const old = this.contentSession, newUser = candidate.result.value.id
      if (!candidate.adopt() || this.disposed || path !== this.effects.resource()) return false
      ticket = this.effects.formScope.begin()
      const result = await this.effects.formService.detail(this.effects.id(), ticket.signal)
      if (!ticket.isCurrent() || !readCurrent() || !permit()) return false
      if (result.kind !== 'success') { this.failure(result, 'read'); return false }
      const target = detailLocation(result.value, newUser, this.effects.mode)
      const sameContext = old?.userId === newUser && old.revision === this.effects.auth().sessionRevision
      const adopted = this.effects.formOperation().reconcile(() => { if (!sameContext) this.operation.resetResponseContext(); this.initialize(result.value, sameContext); this.grant(); return true }, () => ticket.isCurrent() && readCurrent())
      if (adopted && this.owner) this.effects.formOperation().confirmPermission()
      if (adopted && target) await this.effects.navigate(target, true)
      return adopted
    } catch {
      if (ticket.isCurrent() && readCurrent() && permit()) this.failure({ kind: 'contract-error', status: 200, sent: true, message: '無法確認填答資格。' }, 'read')
      return false
    } finally { if (generation === this.formGeneration) { this.state.checking = false; this.effects.finishDiscard() }; this.effects.formScope.finish(ticket) }
  }
  async submit(): Promise<void> {
    if (!this.canSubmit || !this.state.definition || !this.state.model || !this.state.form) return
    const definition = this.state.definition, form = this.state.form, built = buildAnswerRequest(definition, this.state.model)
    if (built.kind === 'invalid') { this.state.issues = built.issues; return }
    if (built.kind !== 'ready') return
    const submittedModel = cloneExact(this.state.model), permission = this.state.permission, revision = this.effects.revision(), ticket = this.effects.submitScope.begin()
    this.state.issues = []
    const current = () => ticket.isCurrent() && this.hasPermission && permission === this.state.permission && revision === this.effects.revision()
    try {
      const result = await this.operation.run(built.body, async body => {
        const result = await this.effects.responseService.submit(form.id, body, definition, ticket.signal)
        if (result.kind === 'success') {
          try { requireSubmittedReceipt(definition, result.value, form.id, body) }
          catch { return { kind: 'contract-error', status: 201, sent: true, message: '無法確認提交回應。' } as const }
        }
        return result
      }, current, this.effects.confirmDuplicate)
      if (result.kind === 'blocked' || result.kind === 'stale' || !current()) return
      if (result.kind === 'success') {
        this.state.model = submittedModel; this.state.baseline = answerBaseline(submittedModel)
        this.state.localOnly = false; this.state.submittedAt = result.value.submittedAt; this.state.success = true
        if (form.responseMode === 'single') this.state.knownSubmitted = true
      } else {
        this.failure(result, 'action')
        if (this.state.error) this.state.issues = locateDetails(this.state.error.details, built.map).flatMap(d => d.targetKey ? [{ targetKey: d.targetKey, field: (d.suffix ?? '').replace(/^\./, ''), message: d.detail.message }] : [])
        if (result.kind === 'api-error' && result.error.code === 'FORM_NOT_SUBMITTABLE' && ticket.isCurrent()) {
          const check = this.fetchCandidate(); this.statusCheck = check
          try { await check } finally { if (this.statusCheck === check) this.statusCheck = undefined }
        }
      }
    } finally { this.effects.submitScope.finish(ticket) }
  }
  private async fetchCandidate(): Promise<void> {
    const fresh = this.effects.formOperation().captureRead(), ticket = this.effects.formScope.begin()
    this.statusFailure = undefined
    try { const result = await this.effects.formService.detail(this.effects.id(), ticket.signal); if (ticket.isCurrent() && fresh()) { if (result.kind === 'success') this.state.candidate = result.value; else this.statusFailure = result } }
    finally { this.effects.formScope.finish(ticket) }
  }
  async latest(): Promise<void> {
    if (!this.canLatest || !this.state.form || !this.state.definition) return
    const id = this.state.form.id, definition = this.state.definition, revision = this.effects.revision(), fresh = this.operation.captureRead(), ticket = this.effects.latestScope.begin(), generation = ++this.latestGeneration
    this.state.latestLoading = true
    const current = () => ticket.isCurrent() && fresh() && this.hasPermission && revision === this.effects.revision()
    try {
      const result = await this.effects.responseService.latest(id, definition, ticket.signal)
      if (!current()) return
      if (result.kind !== 'success') { this.failure(result, 'latest'); return }
      let model: AnswerModel
      try { model = mapReceipt(definition, result.value, id) }
      catch { this.failure({ kind: 'contract-error', status: 200, sent: true, message: '無法確認本人答案。' }, 'latest'); return }
      if (this.state.form.responseMode === 'single') { this.state.knownSubmitted = true; this.state.localOnly = true }
      const accept = !this.dirty || this.effects.confirmLatest()
      if (!current()) return
      // Evidence of a single submission survives cancellation, but local content does not become Server answers.
      if (this.state.form.responseMode === 'single') this.operation.reconcile(() => true, current)
      if (!accept) return
      const apply = () => { this.state.model = model; this.state.baseline = answerBaseline(model); this.state.submittedAt = result.value.submittedAt; this.state.localOnly = false; this.state.issues = []; return true }
      // Reconciliation never clears duplicateRisk. Form/management locks are independent.
      this.operation.reconcile(apply, () => ticket.isCurrent() && fresh() && this.hasPermission)
    } finally { if (generation === this.latestGeneration) this.state.latestLoading = false; this.effects.latestScope.finish(ticket) }
  }
  async closeError(): Promise<void> {
    const flow = this.flow
    if (flow?.kind === 'state' && this.statusCheck) await this.statusCheck
    if (flow !== this.flow || this.disposed) return
    this.state.error = null; this.flow = undefined
    if (!flow || flow.path !== this.effects.resource() || flow.session !== this.effects.auth().sessionRevision || this.disposed) return
    if (flow.kind === 'state' && this.statusFailure) { const failure = this.statusFailure; this.statusFailure = undefined; this.failure(failure, 'read', true); return }
    if (flow.kind === 'auth') await this.effects.navigate(loginLocation(flow.path), true)
    else if (flow.kind === 'home' || (flow.kind === 'state' && this.state.candidate?.status === 'closed')) await this.effects.navigate('/', false)
    else if (flow.kind === 'missing') { const permit = this.effects.authorize(); try { if (permit?.()) this.clear() } finally { this.effects.finishDiscard() } }
    else if (flow.kind === 'state' && this.state.candidate) {
      const permit = this.effects.authorize()
      try { if (permit?.()) { const dto = this.state.candidate, target = detailLocation(dto, this.effects.auth().user?.id, this.effects.mode); this.initialize(dto, true); if (target) await this.effects.navigate(target, true) } }
      finally { this.effects.finishDiscard() }
    }
  }
}
