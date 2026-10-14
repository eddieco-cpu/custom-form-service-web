import type { FormDetailDto, FormStatus, SummaryPageDto } from './api/form'
import type { ApiResult } from './api/result'
import type { AuthFailure } from './auth-state'
import { isSessionFailure } from './auth-state'
import { presentError } from './error-presentation'
import type { ErrorPresentation } from './error-presentation'
import type { RequestScope, RequestTicket } from './request-scope'
import { loginLocation } from '../utils/redirect'

export const statusLabels: Record<FormStatus, string> = { draft: '草稿', published: '已發布', closed: '已關閉' }
export const modeLabels = { single: '單次填答', multiple: '可多次填答' }
export const identityLabels = { anonymous: '匿名', identified: '具名' }
export const visibilityLabels = { owner_only: '僅建立者', respondents: '填答者', public: '所有人' }
export const summaryLocation = (id: string, status: FormStatus) => `/forms/${encodeURIComponent(id)}${status === 'draft' ? '/edit' : ''}`
export function detailLocation(form: FormDetailDto, userId: string | undefined, mode: 'form' | 'edit'): string | null {
  if (form.status === 'draft') {
    if (userId !== form.userId) throw new Error('Draft ownership could not be confirmed')
    return mode === 'form' ? summaryLocation(form.id, 'draft') : null
  }
  return mode === 'edit' ? summaryLocation(form.id, form.status) : null
}
export function alignPage(pagination: SummaryPageDto['pagination'], mayReload: boolean) {
  if (pagination.totalPages === 0) return { page: 1, reload: false, exhausted: false }
  if (pagination.page > pagination.totalPages) return { page: mayReload ? pagination.totalPages : pagination.page, reload: mayReload, exhausted: !mayReload }
  return { page: pagination.page, reload: false, exhausted: false }
}
export function formReadError(result: Exclude<ApiResult<unknown>, { kind: 'success' }>): ErrorPresentation {
  const presentation = presentError(result, 'read')
  return result.kind === 'api-error' && result.error.code === 'VALIDATION_ERROR' && result.error.details?.some(detail => detail.path === 'formId')
    ? { ...presentation, message: '連結無效' } : presentation
}

export interface FormReadState<T> { data: T | null; error: ErrorPresentation | null; dialog: ErrorPresentation | null }
export type ReadAuthPresentation = 'dialog' | 'redirect'
interface ReadEffects {
  path: () => string
  key: () => string
  sessionRevision: () => number
  invalidate: (error: AuthFailure) => void
  navigate: (location: string | ReturnType<typeof loginLocation>) => Promise<unknown>
}

// The request ticket guards adoption; an adopted Auth failure owns a separate
// page flow because invalidating Auth deliberately invalidates its own ticket.
export class FormReadController<T> {
  private flowGeneration = 0
  private disposed = false
  private invalidatingAuth = false
  private authFlow?: { generation: number; path: string; key: string; revision: number }
  constructor(readonly state: FormReadState<T>, private readonly scope: RequestScope, private readonly effects: ReadEffects) {}

  contextChanged(): void {
    this.scope.invalidate()
    this.state.data = null; this.state.error = null
    if (!this.invalidatingAuth) { this.flowGeneration++; this.authFlow = undefined; this.state.dialog = null }
  }
  dispose(): void { this.disposed = true; this.contextChanged() }
  captureAuthPresentation(manual: boolean): ReadAuthPresentation {
    return manual && this.state.data !== null ? 'dialog' : 'redirect'
  }
  async read(load: (signal: AbortSignal) => Promise<ApiResult<T>>, manual = false, adopt?: (value: T, ticket: RequestTicket) => void | Promise<void>, authPresentation = this.captureAuthPresentation(manual), fresh: () => boolean = () => true): Promise<void> {
    if (this.disposed || this.state.dialog) return
    const ticket = this.scope.begin()
    this.state.error = null
    try {
      const result = await load(ticket.signal)
      if (!ticket.isCurrent() || !fresh()) return
      if (result.kind === 'success') {
        if (adopt) await adopt(result.value, ticket)
        else this.state.data = result.value
      }
      else if (isSessionFailure(result)) {
        const flow = { generation: ++this.flowGeneration, path: this.effects.path(), key: this.effects.key(), revision: this.effects.sessionRevision() }
        this.authFlow = flow
        this.state.dialog = authPresentation === 'dialog' ? { ...formReadError(result), placement: 'dialog' } : null
        this.invalidatingAuth = true
        try { this.effects.invalidate(result) }
        finally { this.invalidatingAuth = false }
        flow.revision = this.effects.sessionRevision()
        if (!this.state.dialog && this.flowIsCurrent(flow)) await this.effects.navigate(loginLocation(flow.path))
      }
      else this.state.error = formReadError(result)
    }
    catch {
      if (ticket.isCurrent() && fresh()) this.state.error = formReadError({ kind: 'contract-error', status: 200, message: '無法確認讀取結果。', sent: true })
    }
    finally { this.scope.finish(ticket) }
  }
  private flowIsCurrent(flow: NonNullable<FormReadController<T>['authFlow']>): boolean {
    return !this.disposed && flow.generation === this.flowGeneration && flow.path === this.effects.path()
      && flow.key === this.effects.key() && flow.revision === this.effects.sessionRevision()
  }
  async closeAuth(): Promise<void> {
    const flow = this.authFlow
    this.state.dialog = null; this.authFlow = undefined
    if (flow && this.flowIsCurrent(flow)) await this.effects.navigate(loginLocation(flow.path))
  }
}
