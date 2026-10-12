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
export function isSessionFailure(result: ApiResult<unknown>): boolean {
  return result.kind === 'api-error' && ['AUTH_REQUIRED', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED'].includes(result.error.code)
}

// The promise and generation belong to this App, never to serialized User data.
export class AuthSession {
  private generation = 0
  private initialization?: Promise<void>
  constructor(readonly state: AuthState, private readonly getMe: () => Promise<ApiResult<UserDto>>) {}

  initialize(): Promise<void> {
    if (this.state.phase === 'settled') return Promise.resolve()
    if (this.initialization) return this.initialization
    this.state.phase = 'pending'
    const pending = this.verify().then(() => {})
    this.initialization = pending
    void pending.finally(() => { if (this.initialization === pending) this.initialization = undefined })
    return pending
  }
  async candidate() {
    const generation = ++this.generation
    const revision = this.state.sessionRevision
    const isCurrent = () => generation === this.generation && revision === this.state.sessionRevision
    const result = await this.getMe()
    return { result, isCurrent, adopt: () => { if (!isCurrent()) return false; this.applyRead(result); return true } }
  }
  async verify(): Promise<boolean> {
    const candidate = await this.candidate()
    return candidate.adopt()
  }
  private applyRead(result: ApiResult<UserDto>): void {
    this.state.phase = 'settled'
    if (result.kind === 'success') {
      if (this.state.user?.id !== result.value.id || this.state.outcome !== 'authenticated') this.state.sessionRevision++
      this.state.user = result.value; this.state.outcome = 'authenticated'; this.state.error = null
    }
    else if (isSessionFailure(result)) this.invalidate(result)
    else {
      this.state.error = result
      this.state.outcome = result.kind === 'api-error' && result.error.code === 'AUTH_USER_DISABLED' ? 'disabled' : 'unknown'
    }
  }
  login(user: UserDto): void {
    this.generation++; this.state.sessionRevision++
    this.state.user = user; this.state.phase = 'settled'; this.state.outcome = 'authenticated'; this.state.error = null
  }
  profile(user: UserDto): void {
    this.generation++
    if (this.state.user?.id !== user.id) this.state.sessionRevision++
    this.state.user = user; this.state.phase = 'settled'; this.state.outcome = 'authenticated'; this.state.error = null
  }
  logout(): void {
    this.generation++; this.state.sessionRevision++
    this.state.user = null; this.state.phase = 'settled'; this.state.outcome = 'anonymous'; this.state.error = null
  }
  invalidate(error: AuthFailure): void { this.logout(); this.state.error = error }
}
