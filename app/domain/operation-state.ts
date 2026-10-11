import type { ApiResult } from './api/result'
import { cloneExact } from '../utils/exact-json'

export type OperationPolicy = 'delta' | 'visibility' | 'lifecycle' | 'delete' | 'create' | 'response-single' | 'response-multiple' | 'profile' | 'register' | 'login' | 'logout'
export type OperationPhase = 'idle' | 'pending' | 'succeeded' | 'failed' | 'unknown' | 'reconciled'
export interface OperationSnapshot { readonly phase: OperationPhase; readonly loading: boolean; readonly needsReconciliation: boolean; readonly duplicateRisk: boolean; readonly blocked: boolean }
export class WriteCoordinator {
  private leases = new Map<string, symbol>()
  acquire(key: string): (() => void) | undefined {
    if (this.leases.has(key)) return undefined
    const lease = Symbol(key); this.leases.set(key, lease)
    return () => { if (this.leases.get(key) === lease) this.leases.delete(key) }
  }
  busy(key: string): boolean { return this.leases.has(key) }
}
export function isUnknownWrite(result: ApiResult<unknown>): boolean {
  return (result.kind === 'api-error' && result.status >= 500)
    || (result.kind === 'contract-error' && result.sent)
    || (result.kind === 'transport-error' && result.sent)
}

export class OperationState {
  private phase: OperationPhase = 'idle'
  private loading = false
  private unknown = false
  private duplicateRisk = false
  private revision = 0
  constructor(readonly policy: OperationPolicy, private readonly coordinator: WriteCoordinator, private readonly leaseKey: string, private readonly changed: (value: OperationSnapshot) => void = () => {}) {}
  get snapshot(): OperationSnapshot {
    const hardLock = ['delta', 'visibility', 'lifecycle', 'delete', 'profile'].includes(this.policy)
    return Object.freeze({ phase: this.phase, loading: this.loading, needsReconciliation: this.unknown, duplicateRisk: this.duplicateRisk, blocked: this.loading || (this.unknown && hardLock) })
  }
  private emit(): void { this.changed(this.snapshot) }
  // Reconciliation is explicit: callers must first obtain and adopt a reliable current resource.
  reconcile(adopt: () => boolean, isCurrent: () => boolean): boolean {
    if (this.loading || !isCurrent() || !adopt() || !isCurrent()) return false
    this.unknown = false; this.phase = 'reconciled'; this.emit()
    // Latest/list lookup cannot prove which unknown multiple/create operation completed.
    return true
  }
  invalidate(): void { this.revision++ }
  async run<S, T>(source: S, send: (snapshot: S) => Promise<ApiResult<T>>, isCurrent: () => boolean, confirmDuplicate: () => boolean = () => false): Promise<ApiResult<T> | { readonly kind: 'blocked' } | { readonly kind: 'stale' }> {
    if (!isCurrent() || this.snapshot.blocked || (this.duplicateRisk && !confirmDuplicate())) return { kind: 'blocked' }
    const release = this.coordinator.acquire(this.leaseKey)
    if (!release) return { kind: 'blocked' }
    const revision = this.revision
    this.loading = true; this.phase = 'pending'; this.emit()
    let result: ApiResult<T>
    try {
      let snapshot: S
      try { snapshot = cloneExact(source) }
      catch { result = { kind: 'local-error', message: '無法建立送出快照。', sent: false }; return result }
      try { result = await send(snapshot) }
      catch { result = { kind: 'transport-error', reason: 'network', sent: true } }
      if (revision !== this.revision || !isCurrent()) return { kind: 'stale' }
      if (isUnknownWrite(result)) {
        this.phase = 'unknown'; this.unknown = true
        if (this.policy === 'response-multiple' || this.policy === 'create') this.duplicateRisk = true
      }
      else if (result.kind === 'success') { this.phase = 'succeeded'; this.unknown = false; this.duplicateRisk = false }
      else this.phase = 'failed'
      return result
    }
    finally {
      if (this.phase === 'pending') this.phase = revision === this.revision && isCurrent() ? 'failed' : 'idle'
      this.loading = false; release(); this.emit()
    }
  }
}
