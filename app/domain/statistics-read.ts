import type { ApiResult } from './api/result'
import type { StatisticsDto } from './api/statistics'
import type { AuthChange, AuthFailure } from './auth-state'
import { isSessionFailure } from './auth-state'
import { presentError } from './error-presentation'
import type { ErrorPresentation } from './error-presentation'
import type { RequestScope } from './request-scope'
import { loginLocation } from '../utils/redirect'

export interface StatisticsReadState {
  data: StatisticsDto | null
  error: ErrorPresentation | null
  dialog: ErrorPresentation | null
}
export function statisticsReadError(result: Exclude<ApiResult<unknown>, { kind: 'success' }>): ErrorPresentation {
  const presentation = presentError(result, 'statistics')
  if (result.kind === 'api-error') {
    if (result.error.code === 'VALIDATION_ERROR' && result.error.details?.some(detail => detail.path === 'formId')) return { ...presentation, message: '連結無效' }
    if (result.error.code === 'STATISTICS_ACCESS_DENIED') return { ...presentation, message: '您沒有查看此統計的權限' }
  }
  return presentation
}
interface StatisticsEffects {
  path: () => string
  revision: () => number
  invalidate: (failure: AuthFailure) => void
  navigate: (location: ReturnType<typeof loginLocation>) => Promise<unknown>
}
export class StatisticsReadController {
  private generation = 0
  private disposed = false
  private invalidating = false
  private authFlow?: { generation: number; path: string; revision: number }
  constructor(readonly state: StatisticsReadState, private readonly scope: RequestScope, private readonly effects: StatisticsEffects) {}
  contextChanged(): void {
    this.scope.invalidate()
    this.state.data = null; this.state.error = null
    if (!this.invalidating) { this.generation++; this.authFlow = undefined; this.state.dialog = null }
  }
  credentialChanged(change: AuthChange): boolean {
    if (change.source === 'bootstrap') return false
    this.contextChanged()
    return !this.disposed && !this.invalidating && change.reason !== 'logout'
  }
  dispose(): void { this.disposed = true; this.contextChanged() }
  async read(load: (signal: AbortSignal) => Promise<ApiResult<StatisticsDto>>, manual = false): Promise<void> {
    if (this.disposed || this.state.dialog) return
    const showDialog = manual && this.state.data !== null
    const ticket = this.scope.begin()
    this.state.data = null; this.state.error = null
    try {
      const result = await load(ticket.signal)
      if (!ticket.isCurrent()) return
      if (result.kind === 'success') this.state.data = result.value
      else if (isSessionFailure(result)) {
        const flow = { generation: ++this.generation, path: this.effects.path(), revision: this.effects.revision() }
        this.authFlow = flow
        this.state.dialog = showDialog ? { ...statisticsReadError(result), placement: 'dialog' } : null
        this.invalidating = true
        try { this.effects.invalidate(result) } finally { this.invalidating = false }
        flow.revision = this.effects.revision()
        if (!this.state.dialog && this.current(flow)) await this.effects.navigate(loginLocation(flow.path))
      }
      else this.state.error = statisticsReadError(result)
    }
    catch {
      if (ticket.isCurrent()) this.state.error = statisticsReadError({ kind: 'contract-error', status: 200, sent: true, message: '無法確認統計讀取結果。' })
    }
    finally { this.scope.finish(ticket) }
  }
  private current(flow: NonNullable<StatisticsReadController['authFlow']>): boolean {
    return !this.disposed && flow.generation === this.generation && flow.path === this.effects.path() && flow.revision === this.effects.revision()
  }
  async closeAuth(): Promise<void> {
    const flow = this.authFlow
    this.state.dialog = null; this.authFlow = undefined
    if (flow && this.current(flow)) await this.effects.navigate(loginLocation(flow.path))
  }
}
