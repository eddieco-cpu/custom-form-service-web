import type { AuthState, AuthSession } from './auth-state'
import { isSessionFailure } from './auth-state'
import type { EditorDefinition, EditorSession, FieldIssue } from './models'
import type { CreateFormRequest, DraftDeltaRequest, FormDetailDto } from './api/form'
import type { ApiResult } from './api/result'
import { createEditor, editorDirty, loadEditor } from './editor'
import { buildCreateRequest, buildDraftDelta } from './definition-request'
import { locateDetails, presentError } from './error-presentation'
import type { ErrorPresentation } from './error-presentation'
import { formReadError } from './form-read'
import type { RequestScope } from './request-scope'
import type { OperationState } from './operation-state'
import type { formService } from '../services/form'
import { loginLocation } from '../utils/redirect'

export interface EditorPermission { readonly userId: string; readonly revision: number; readonly resource: string }
export interface EditorPageState {
  session: EditorSession | null; permission: EditorPermission | null; issues: readonly FieldIssue[]
  error: ErrorPresentation | null; readError: ErrorPresentation | null; checking: boolean; unavailable: boolean; contentUserId?: string
}
export const editorPageState = (): EditorPageState => ({ session: null, permission: null, issues: [], error: null, readError: null, checking: false, unavailable: false })
interface Effects {
  auth: () => AuthState; authSession: AuthSession; scope: RequestScope; service: ReturnType<typeof formService>
  operation: (saved: boolean) => OperationState; resource: () => string; path: () => string
  // A permit remains valid only while the content revision and page are unchanged.
  authorize: () => (() => boolean) | undefined; finishDiscard: () => void
  confirmDuplicate: () => boolean; confirmAccount: () => boolean
  navigate: (target: string | ReturnType<typeof loginLocation>, replace: boolean) => Promise<unknown>
  toast: (message: string) => void
}
export class EditorPageController {
  private disposed = false
  private readGeneration = 0
  private authFlow?: { path: string; revision: number }
  constructor(readonly state: EditorPageState, private readonly effects: Effects) {}
  get id(): string | undefined { const m = this.state.session?.definition.metadata; return m && 'id' in m ? m.id : undefined }
  get dirty(): boolean { return !!this.state.session && editorDirty(this.state.session.definition, this.state.session.baseline) }
  get canWrite(): boolean {
    const { permission: p, session: s, unavailable } = this.state, a = this.effects.auth()
    return !this.disposed && !unavailable && !!s && !!p && a.outcome === 'authenticated' && a.phase === 'settled'
      && p.userId === a.user?.id && p.revision === a.sessionRevision && p.resource === this.effects.resource()
      && (!('id' in s.definition.metadata) || (s.definition.metadata.userId === a.user?.id && s.definition.metadata.status === 'draft'))
  }
  get operation(): OperationState { return this.effects.operation(!!this.id) }
  get inputDisabled(): boolean { return !this.canWrite || this.state.checking || this.operation.snapshot.loading }
  authChanged(): void { if (!this.canWrite) this.state.permission = null }
  contextChanged(): void {
    this.readGeneration++; this.effects.scope.invalidate()
    this.state.session = null; this.state.permission = null; this.state.checking = false; this.state.error = null; this.state.readError = null
    this.state.issues = []; this.state.unavailable = false; this.state.contentUserId = undefined; this.authFlow = undefined
  }
  dispose(): void { this.disposed = true; this.readGeneration++; this.state.permission = null; this.effects.scope.invalidate() }
  private grant(): void {
    const a = this.effects.auth()
    this.state.permission = a.outcome === 'authenticated' && a.user ? { userId: a.user.id, revision: a.sessionRevision, resource: this.effects.resource() } : null
    if (this.state.permission) this.state.contentUserId = this.state.permission.userId
  }
  initializeNew(): void {
    const a = this.effects.auth()
    if (this.state.session || a.phase !== 'settled' || a.outcome !== 'authenticated' || !a.user) return
    this.state.session = createEditor(a.user.displayName); this.grant()
  }
  update(definition: EditorDefinition): void {
    if (!this.inputDisabled && this.state.session) this.state.session = { definition, baseline: this.state.session.baseline }
  }
  private async adopt(dto: FormDetailDto): Promise<void> {
    this.state.session = loadEditor(dto); this.state.issues = []; this.state.unavailable = false; this.grant()
    if (dto.status !== 'draft') { this.state.permission = null; await this.effects.navigate(`/forms/${dto.id}`, true) }
  }
  private handleFailure(result: Exclude<ApiResult<FormDetailDto>, { kind: 'success' }>, action: boolean): void {
    const presentation = action ? presentError(result, 'action') : formReadError(result)
    if (action || this.state.session) this.state.error = { ...presentation, placement: 'dialog' }
    else this.state.readError = presentation
    if (isSessionFailure(result)) {
      this.state.permission = null
      this.effects.authSession.invalidate(result)
      this.authFlow = { path: this.effects.path(), revision: this.effects.auth().sessionRevision }
    }
    if (result.kind === 'api-error' && ['FORM_ACCESS_DENIED', 'FORM_NOT_EDITABLE', 'FORM_NOT_FOUND'].includes(result.error.code)) {
      this.state.permission = null; this.state.unavailable = true
    }
  }
  async load(id: string, manual = false): Promise<void> {
    if (this.state.checking || this.operation.snapshot.loading) return
    const permit = manual ? this.effects.authorize() : () => true
    if (!permit) return
    const generation = ++this.readGeneration
    const ticket = this.effects.scope.begin(); this.state.checking = true; this.state.readError = null
    try {
      const result = await this.effects.service.detail(id, ticket.signal)
      if (!ticket.isCurrent() || !permit()) return
      if (result.kind === 'success') {
        const a = this.effects.auth()
        if (a.outcome !== 'authenticated' || !a.user || (result.value.status === 'draft' && result.value.userId !== a.user.id)) {
          this.handleFailure({ kind: 'contract-error', status: 200, sent: true, message: '無法確認資源權限。' }, false); return
        }
        const operation = this.effects.operation(true)
        const adopted = operation.reconcile(() => {
          this.state.session = loadEditor(result.value); this.state.issues = []; this.state.unavailable = false; this.grant(); return true
        }, ticket.isCurrent)
        if (adopted && result.value.status !== 'draft') { this.state.permission = null; await this.effects.navigate(`/forms/${id}`, true) }
      }
      else {
        this.handleFailure(result, false)
        if (isSessionFailure(result) && !this.state.session) await this.effects.navigate(loginLocation(this.effects.path()), true)
      }
    }
    finally { if (generation === this.readGeneration) { this.state.checking = false; this.effects.finishDiscard() }; this.effects.scope.finish(ticket) }
  }
  async verifyPermission(): Promise<void> {
    if (this.state.checking || this.operation.snapshot.loading || !this.state.session) return
    const oldUserId = this.state.contentUserId
    const savedId = this.id, resource = this.effects.resource(), path = this.effects.path()
    const permit = savedId ? this.effects.authorize() : () => true
    if (!permit) return
    const generation = ++this.readGeneration
    let ticket = this.effects.scope.begin(); this.state.checking = true; this.state.permission = null
    try {
      const candidate = await this.effects.authSession.candidate()
      if (!ticket.isCurrent() || !candidate.isCurrent() || !permit()) return
      if (candidate.result.kind !== 'success') { this.handleFailure(candidate.result, false); return }
      const user = candidate.result.value
      if (!savedId && oldUserId !== undefined && oldUserId !== user.id && !this.effects.confirmAccount()) return
      if (!candidate.adopt() || this.disposed || path !== this.effects.path() || resource !== this.effects.resource()) return
      // Verified Auth adoption may intentionally advance revision. Start a fresh resource ticket.
      ticket = this.effects.scope.begin()
      if (savedId) {
        const result = await this.effects.service.detail(savedId, ticket.signal)
        if (!ticket.isCurrent() || !permit()) return
        if (result.kind !== 'success') { this.handleFailure(result, false); return }
        if (result.value.userId !== user.id || result.value.status !== 'draft') {
          this.state.unavailable = true
          this.state.error = { kind: 'access-denied', placement: 'dialog', message: '目前帳號或表單狀態無法保存這份定義。', details: [], knownCode: false }; return
        }
        this.operation.reconcile(() => { this.state.session = loadEditor(result.value); this.state.issues = []; this.state.unavailable = false; this.grant(); return true }, ticket.isCurrent)
      }
      else {
        if (!ticket.isCurrent() || this.id) return
        this.state.session = { ...this.state.session, definition: { ...this.state.session.definition, metadata: { creatorDisplayName: user.displayName } } }
        this.state.unavailable = false; this.grant()
      }
    }
    finally { if (generation === this.readGeneration) { this.state.checking = false; this.effects.finishDiscard() }; this.effects.scope.finish(ticket) }
  }
  async save(): Promise<void> {
    if (this.inputDisabled || this.operation.snapshot.blocked || !this.state.session) return
    const savedId = this.id, built = savedId ? buildDraftDelta(this.state.session.definition, this.state.session.baseline) : buildCreateRequest(this.state.session.definition)
    if (built.kind === 'invalid') { this.state.issues = built.issues; return }
    if (built.kind === 'noop') return
    this.state.issues = []; const ticket = this.effects.scope.begin()
    try {
      const result = await this.operation.run(built.body, body => (savedId
        ? this.effects.service.update(savedId, body as DraftDeltaRequest, ticket.signal)
        : this.effects.service.create(body as CreateFormRequest, ticket.signal)).then(value => {
          if (value.kind === 'success' && (value.value.status !== 'draft' || value.value.userId !== this.effects.auth().user?.id)) return { kind: 'contract-error', status: savedId ? 200 : 201, sent: true, message: '無法確認保存資源。' } as const
          return value
        }), () => ticket.isCurrent() && this.canWrite, this.effects.confirmDuplicate)
      if (result.kind === 'stale' || result.kind === 'blocked' || !ticket.isCurrent()) return
      if (result.kind === 'success') {
        await this.adopt(result.value); this.effects.toast(savedId ? '已保存' : '草稿已建立')
        if (!savedId) await this.effects.navigate(`/forms/${result.value.id}/edit`, false)
      }
      else {
        this.handleFailure(result, true)
        if (this.state.error) this.state.issues = locateDetails(this.state.error.details, built.map).flatMap(d => d.targetKey ? [{ targetKey: d.targetKey, field: (d.suffix ?? '').replace(/^\./, ''), message: d.detail.message }] : [])
        if (result.kind === 'api-error' && result.error.code === 'FORM_NOT_EDITABLE' && savedId) {
          // Fetch a candidate only; the explicit reload path owns discarding the local definition.
          const candidate = await this.effects.service.detail(savedId)
          if (ticket.isCurrent() && candidate.kind === 'success') this.state.unavailable = true
        }
      }
    }
    finally { this.effects.scope.finish(ticket) }
  }
  async closeError(): Promise<void> {
    const kind = this.state.error?.kind, flow = this.authFlow
    this.state.error = null; this.authFlow = undefined
    if (kind === 'auth' && flow && flow.path === this.effects.path() && flow.revision === this.effects.auth().sessionRevision) await this.effects.navigate(loginLocation(flow.path), true)
    else if (kind === 'not-found' && this.state.session) {
      const permit = this.effects.authorize()
      if (permit?.()) { this.state.session = null; this.state.readError = { kind: 'not-found', placement: 'page', message: '找不到表單', details: [], knownCode: true } }
      this.effects.finishDiscard()
    }
  }
}
