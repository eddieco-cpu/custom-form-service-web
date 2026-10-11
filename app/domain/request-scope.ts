export interface RequestTicket { readonly generation: number; readonly signal: AbortSignal; readonly isCurrent: () => boolean }
export type ScopedResult<T> = { readonly kind: 'current'; readonly value: T } | { readonly kind: 'error'; readonly error: unknown } | { readonly kind: 'stale' }

export class RequestScope {
  private generation = 0
  private active?: { ticket: RequestTicket; controller: AbortController }
  private disposed = false
  constructor(private readonly resource: () => string, private readonly session: () => number, private readonly changed: (loading: boolean) => void = () => {}) {}

  begin(): RequestTicket {
    if (this.disposed) throw new Error('Disposed request scope')
    this.invalidate()
    const resource = this.resource(); const session = this.session(); const generation = this.generation
    const controller = new AbortController()
    const ticket: RequestTicket = { generation, signal: controller.signal, isCurrent: () => !this.disposed && generation === this.generation && resource === this.resource() && session === this.session() }
    this.active = { ticket, controller }; this.changed(true)
    return ticket
  }
  invalidate(): void { this.generation++; this.active?.controller.abort(); this.active = undefined; this.changed(false) }
  finish(ticket: RequestTicket): void { if (this.active?.ticket === ticket) { this.active = undefined; this.changed(false) } }
  dispose(): void { this.disposed = true; this.invalidate() }

  async run<T>(load: (signal: AbortSignal) => Promise<T>, apply: (value: T) => void, onError?: (error: unknown) => void): Promise<ScopedResult<T>> {
    const ticket = this.begin()
    try {
      const value = await load(ticket.signal)
      if (!ticket.isCurrent()) return { kind: 'stale' }
      apply(value)
      return { kind: 'current', value }
    }
    catch (error) { if (!ticket.isCurrent()) return { kind: 'stale' }; onError?.(error); return { kind: 'error', error } }
    finally { this.finish(ticket) }
  }
}
