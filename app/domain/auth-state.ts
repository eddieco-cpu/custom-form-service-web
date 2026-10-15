import type { UserDto } from './api/user'
import type { ApiResult } from './api/result'

export type AuthFailure = Exclude<ApiResult<UserDto>, { kind: 'success' }>
export interface AuthState {
  user: UserDto | null
  phase: 'idle' | 'pending' | 'settled'
  outcome: 'unknown' | 'authenticated' | 'anonymous' | 'disabled'
  error: AuthFailure | null
  sessionRevision: number
}
export const initialAuthState = (): AuthState => ({ user: null, phase: 'idle', outcome: 'unknown', error: null, sessionRevision: 0 })
export interface AuthChange {
  readonly source: 'bootstrap' | 'credential-change'
  readonly reason: 'verify' | 'login' | 'logout' | 'invalidate' | 'profile'
}
export function isSessionFailure(result: ApiResult<unknown>): boolean {
  return result.kind === 'api-error' && ['AUTH_REQUIRED', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED'].includes(result.error.code)
}

// The promise and generation belong to this App, never to serialized User data.
export class AuthSession {
  private generation = 0
  private initialization?: Promise<void>
  private readonly listeners = new Set<(change: AuthChange) => void>()
  constructor(readonly state: AuthState, private readonly getMe: () => Promise<ApiResult<UserDto>>) {}
  subscribe(listener: (change: AuthChange) => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  private notify(source: AuthChange['source'], reason: AuthChange['reason']): void {
    for (const listener of this.listeners) listener({ source, reason })
  }

  initialize(): Promise<void> {
    if (this.state.phase === 'settled') return Promise.resolve()
    if (this.initialization) return this.initialization
    this.state.phase = 'pending'
    const pending = this.verify('bootstrap').then(() => {})
    this.initialization = pending
    void pending.finally(() => { if (this.initialization === pending) this.initialization = undefined })
    return pending
  }
  async candidate(source: AuthChange['source'] = 'credential-change') {
    const generation = ++this.generation
    const revision = this.state.sessionRevision
    const isCurrent = () => generation === this.generation && revision === this.state.sessionRevision
    const result = await this.getMe()
    return { result, isCurrent, adopt: () => { if (!isCurrent()) return false; this.applyRead(result, source); return true } }
  }
  async verify(source: AuthChange['source'] = 'credential-change'): Promise<boolean> {
    const candidate = await this.candidate(source)
    return candidate.adopt()
  }
  private applyRead(result: ApiResult<UserDto>, source: AuthChange['source']): void {
    this.state.phase = 'settled'
    if (result.kind === 'success') {
      const changed = this.state.user?.id !== result.value.id || this.state.outcome !== 'authenticated'
      if (changed) this.state.sessionRevision++
      this.state.user = result.value; this.state.outcome = 'authenticated'; this.state.error = null
      if (changed) this.notify(source, 'verify')
    }
    else if (isSessionFailure(result)) this.invalidate(result, source)
    else {
      this.state.error = result
      this.state.outcome = result.kind === 'api-error' && result.error.code === 'AUTH_USER_DISABLED' ? 'disabled' : 'unknown'
    }
  }
  login(user: UserDto): void {
    this.generation++; this.state.sessionRevision++
    this.state.user = user; this.state.phase = 'settled'; this.state.outcome = 'authenticated'; this.state.error = null
    this.notify('credential-change', 'login')
  }
  profile(user: UserDto): void {
    this.generation++
    const changed = this.state.user?.id !== user.id
    if (changed) this.state.sessionRevision++
    this.state.user = user; this.state.phase = 'settled'; this.state.outcome = 'authenticated'; this.state.error = null
    if (changed) this.notify('credential-change', 'profile')
  }
  logout(): void {
    this.clear()
    this.notify('credential-change', 'logout')
  }
  private clear(): void {
    this.generation++; this.state.sessionRevision++
    this.state.user = null; this.state.phase = 'settled'; this.state.outcome = 'anonymous'; this.state.error = null
  }
  invalidate(error: AuthFailure, source: AuthChange['source'] = 'credential-change'): void {
    this.clear(); this.state.error = error
    this.notify(source, 'invalidate')
  }
}
