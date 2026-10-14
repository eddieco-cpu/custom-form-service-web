import type { AuthSession, AuthState } from './auth-state'
import { isSessionFailure } from './auth-state'
import type { FormDetailDto, ResultVisibility } from './api/form'
import type { ApiResult } from './api/result'
import type { DeepReadonly, EditorDefinition, EditorSession, FieldIssue } from './models'
import { cloneExact } from '../utils/exact-json'
import { freezeSnapshot } from './editor'
import { validatePublish } from './definition-validation'
import { publishPathMap } from './error-path'
import { locateDetails, presentError } from './error-presentation'
import type { ErrorPresentation } from './error-presentation'
import type { OperationPolicy, OperationState } from './operation-state'
import type { RequestScope } from './request-scope'
import type { formService } from '../services/form'
import { loginLocation } from '../utils/redirect'

export type ManagementCommand = 'publish' | 'close' | 'delete'
export function mergeVisibility(session: EditorSession, dto: FormDetailDto): EditorSession {
  const meta = session.definition.metadata
  if (!('id' in meta) || meta.id.toLowerCase() !== dto.id.toLowerCase() || meta.userId !== dto.userId) throw new Error('Unexpected policy resource')
  const { id, userId, status, creatorDisplayName, createdAt, updatedAt } = dto
  const metadata = { id, userId, status, creatorDisplayName, createdAt, updatedAt }
  return { definition: { ...session.definition, resultVisibility: dto.resultVisibility, metadata },
    baseline: { definition: freezeSnapshot({ ...session.baseline.definition, resultVisibility: dto.resultVisibility, metadata }) } }
}
export interface ManagementState {
  error: ErrorPresentation | null; denied: boolean; unavailable: boolean
  confirmation: { command: ManagementCommand; id: string; revision: unknown; session: number; status: string } | null
  selected: ResultVisibility | undefined; count: number | null; countLoading: boolean; countStale: boolean
  fallbackUrl: string | null; candidate: FormDetailDto | null
}
export const managementState = (): ManagementState => ({ error: null, denied: false, unavailable: false, confirmation: null, selected: undefined, count: null, countLoading: false, countStale: false, fallbackUrl: null, candidate: null })
interface Effects {
  auth: () => AuthState; authSession: AuthSession; resource: () => string; revision: () => unknown
  saved: () => DeepReadonly<EditorDefinition> | undefined; eligible: () => boolean; dirty: () => boolean
  adopt: (dto: FormDetailDto, policy: 'visibility' | 'lifecycle') => void; clear: () => void; deny: () => void
  issues: (issues: readonly FieldIssue[]) => void; authorize: (confirmed?: boolean) => (() => boolean) | undefined; finishDiscard: () => void
  reload: () => Promise<void>; operation: (policy: OperationPolicy) => OperationState
  writeScope: RequestScope; countScope: RequestScope; candidateScope: RequestScope
  service: Pick<ReturnType<typeof formService>, 'publish' | 'close' | 'remove' | 'visibility' | 'count' | 'detail'>
  navigate: (target: string | ReturnType<typeof loginLocation>, replace: boolean) => Promise<unknown>; toast: (message: string) => void
}
export class FormManagementController {
  private disposed = false
  private authFlow?: { path: string; session: number }
  private countGeneration = 0
  private copyGeneration = 0
  constructor(readonly state: ManagementState, private readonly effects: Effects) {}
  get saved() { return this.effects.saved() }
  get metadata() { const m = this.saved?.metadata; return m && 'id' in m ? m : undefined }
  get denied(): boolean { return this.state.denied || this.effects.operation('visibility').permissionDenied(this.effects.auth().sessionRevision) }
  get canManage(): boolean { return !this.disposed && !this.denied && !this.state.unavailable && this.effects.eligible() }
  get busy(): boolean { return this.effects.operation('visibility').snapshot.loading }
  get unknown(): boolean { return this.effects.operation('visibility').anyUnknown }
  get dirty(): boolean { return this.effects.dirty() }
  allowed(command: ManagementCommand): boolean {
    const status = this.metadata?.status
    const policy = command === 'delete' ? 'delete' : 'lifecycle'
    return this.canManage && !!this.metadata && !this.busy && !this.effects.operation(policy).snapshot.blocked
      && (command === 'delete' || (command === 'publish' ? status === 'draft' && !this.effects.dirty() : status === 'published'))
  }
  reset(): void {
    this.invalidateCopy()
    this.countGeneration++
    this.effects.writeScope.invalidate(); this.effects.countScope.invalidate(); this.effects.candidateScope.invalidate()
    Object.assign(this.state, managementState()); this.authFlow = undefined
    this.state.denied = this.effects.operation('visibility').permissionDenied(this.effects.auth().sessionRevision)
  }
  dispose(): void { this.disposed = true; this.reset() }
  invalidateCopy(): void { this.copyGeneration++; this.state.fallbackUrl = null }
  async copy(origin: string, writeText: (url: string) => Promise<void>): Promise<void> {
    const meta = this.metadata
    if (!this.canManage || !meta || !['published', 'closed'].includes(meta.status)) return
    const generation = ++this.copyGeneration, resource = this.effects.resource(), session = this.effects.auth().sessionRevision
    const { id, status } = meta
    const url = `${origin}/forms/${id}${status === 'closed' ? '/statistics' : ''}`
    const message = status === 'closed' ? '統計連結已複製' : '填答連結已複製'
    const current = () => generation === this.copyGeneration && this.canManage && resource === this.effects.resource()
      && session === this.effects.auth().sessionRevision && id === this.metadata?.id && status === this.metadata.status
    try { await writeText(url); if (current()) { this.state.fallbackUrl = null; this.effects.toast(message) } }
    catch { if (current()) this.state.fallbackUrl = url }
  }
  reconciled(): void { this.state.unavailable = false; this.state.candidate = null; this.state.selected = this.metadata ? this.saved?.resultVisibility : undefined }
  begin(command: ManagementCommand): void {
    if (!this.allowed(command) || !this.metadata) return
    if (command === 'publish') {
      const result = validatePublish(cloneExact(this.saved!) as EditorDefinition, new Date().toISOString())
      if (result.kind === 'invalid') { this.effects.issues(result.issues); return }
    }
    this.state.confirmation = { command, id: this.metadata.id, revision: this.effects.revision(), session: this.effects.auth().sessionRevision, status: this.metadata.status }
  }
  async confirm(yes: boolean): Promise<void> {
    const c = this.state.confirmation; this.state.confirmation = null
    if (!yes || !c || c.revision !== this.effects.revision() || c.session !== this.effects.auth().sessionRevision || c.id !== this.metadata?.id || c.status !== this.metadata.status || !this.allowed(c.command)) return
    if (c.command === 'publish') {
      const valid = validatePublish(cloneExact(this.saved!) as EditorDefinition, new Date().toISOString())
      if (valid.kind === 'invalid') { this.effects.issues(valid.issues); return }
    }
    const permit = c.command === 'delete' ? this.effects.authorize(true) : () => true
    if (!permit) return
    try { await this.write(c.command, undefined, permit) }
    finally { this.effects.finishDiscard() }
  }
  async visibility(value: ResultVisibility): Promise<void> {
    if (!this.canManage || !this.metadata || this.busy || this.effects.operation('visibility').snapshot.blocked || value === this.saved?.resultVisibility) return
    const before = this.saved?.resultVisibility; this.state.selected = value
    await this.write('visibility', value)
    // Current definition edits made during policy PATCH are preserved by adoption.
    if (this.state.selected === value) this.state.selected = this.saved?.resultVisibility ?? before
  }
  private async write(command: ManagementCommand | 'visibility', value?: ResultVisibility, permit: () => boolean = () => true): Promise<void> {
    const meta = this.metadata; if (!meta) return
    const policy = command === 'publish' || command === 'close' ? 'lifecycle' : command
    const saved = this.saved!, map = command === 'publish' ? publishPathMap(saved) : undefined
    const ticket = this.effects.writeScope.begin()
    try {
      const result = await this.effects.operation(policy).run<{ id: string; value: ResultVisibility | undefined }, FormDetailDto | undefined>({ id: meta.id, value }, async input => {
        const service = this.effects.service
        const result = command === 'delete' ? await service.remove(input.id, ticket.signal)
          : command === 'publish' ? await service.publish(input.id, ticket.signal)
            : command === 'close' ? await service.close(input.id, ticket.signal) : await service.visibility(input.id, input.value!, ticket.signal)
        if (result.kind === 'success' && result.value && result.value.userId !== meta.userId) return { kind: 'contract-error', status: 200, sent: true, message: '無法確認管理資源。' } as const
        return result
      }, () => ticket.isCurrent() && this.canManage)
      if (!ticket.isCurrent() || result.kind === 'stale' || result.kind === 'blocked') return
      if (result.kind === 'success') {
        if (command === 'delete') {
          if (!permit()) return
          this.effects.operation('delete').reconcile(() => { this.effects.clear(); return true }, ticket.isCurrent)
          this.state.count = null; this.state.fallbackUrl = null
          this.effects.toast('表單已刪除'); await this.effects.navigate('/forms', true)
        }
        else if (result.value) {
          this.effects.adopt(result.value, command === 'visibility' ? 'visibility' : 'lifecycle')
          this.state.selected = result.value.resultVisibility
          if (result.value.status !== 'published') { this.effects.countScope.invalidate(); this.state.countLoading = false; this.state.count = null }
          if (command === 'visibility' && meta.status === 'draft' && result.value.status !== 'draft') this.effects.deny()
          this.effects.toast(command === 'visibility' ? '結果可見性已更新' : command === 'publish' ? '表單已發布' : '表單已關閉')
          if (command === 'publish') await this.effects.navigate(`/forms/${meta.id}`, false)
        }
      }
      else {
        this.failure(result, true)
        if (map && this.state.error) this.effects.issues(locateDetails(this.state.error.details, map).flatMap(d => d.targetKey ? [{ targetKey: d.targetKey, field: (d.suffix ?? '').replace(/^\./, ''), message: d.detail.message }] : []))
        if (result.kind === 'api-error' && ['FORM_ALREADY_PUBLISHED', 'FORM_ALREADY_CLOSED', 'FORM_INVALID_STATE_TRANSITION', 'FORM_NOT_EDITABLE', 'FORM_ACCESS_DENIED'].includes(result.error.code)) await this.fetchCandidate(meta.id)
      }
    }
    finally { this.effects.writeScope.finish(ticket) }
  }
  private failure(result: Exclude<ApiResult<unknown>, { kind: 'success' }>, write: boolean): void {
    this.state.error = { ...presentError(result, write ? 'action' : 'read'), placement: 'dialog' }
    if (isSessionFailure(result)) {
      this.effects.deny(); this.effects.authSession.invalidate(result)
      this.authFlow = { path: this.effects.resource(), session: this.effects.auth().sessionRevision }
    }
    if (result.kind === 'api-error') {
      if (result.error.code === 'FORM_ACCESS_DENIED') { this.state.denied = true; this.effects.operation('visibility').denyPermission(this.effects.auth().sessionRevision); this.effects.deny() }
      if (['FORM_NOT_FOUND', 'FORM_NOT_EDITABLE', 'FORM_ALREADY_PUBLISHED', 'FORM_ALREADY_CLOSED', 'FORM_INVALID_STATE_TRANSITION'].includes(result.error.code)) {
        this.state.unavailable = true; this.effects.deny()
      }
    }
    if (!this.canManage) this.invalidateCopy()
  }
  private async fetchCandidate(id: string): Promise<void> {
    const fresh = this.effects.operation('visibility').captureRead(), ticket = this.effects.candidateScope.begin()
    try { const r = await this.effects.service.detail(id, ticket.signal); if (ticket.isCurrent() && fresh() && r.kind === 'success') this.state.candidate = r.value }
    finally { this.effects.candidateScope.finish(ticket) }
  }
  async count(): Promise<void> {
    if (!this.canManage || this.metadata?.status !== 'published' || this.state.countLoading) return
    const id = this.metadata.id, fresh = this.effects.operation('visibility').captureRead(), ticket = this.effects.countScope.begin()
    const generation = ++this.countGeneration
    this.state.countLoading = true
    try {
      const r = await this.effects.service.count(id, ticket.signal)
      if (!ticket.isCurrent() || !fresh() || this.metadata?.status !== 'published') return
      if (r.kind === 'success') { this.state.count = r.value.count; this.state.countStale = false }
      else { this.state.countStale = this.state.count !== null; this.failure(r, false) }
    }
    finally { if (generation === this.countGeneration) this.state.countLoading = false; this.effects.countScope.finish(ticket) }
  }
  async closeError(): Promise<void> {
    const error = this.state.error, flow = this.authFlow; this.state.error = null; this.authFlow = undefined
    if (error?.kind === 'auth' && flow && flow.path === this.effects.resource() && flow.session === this.effects.auth().sessionRevision) await this.effects.navigate(loginLocation(flow.path), true)
    else if (error?.kind === 'not-found') { const permit = this.effects.authorize(); if (permit?.()) this.effects.clear(); this.effects.finishDiscard() }
    else if (error?.kind === 'conflict') await this.effects.reload()
  }
}
