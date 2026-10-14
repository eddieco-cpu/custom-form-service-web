import type { ApiResult } from './api/result'
import { cloneExact } from '../utils/exact-json'

export type OperationPolicy = 'delta' | 'visibility' | 'lifecycle' | 'delete' | 'create' | 'response-single' | 'response-multiple' | 'profile' | 'register' | 'login' | 'logout'
export type OperationPhase = 'idle' | 'pending' | 'succeeded' | 'failed' | 'unknown' | 'reconciled'
export type RequestSemantics = 'read' | 'write'
const hardLockPolicies: readonly OperationPolicy[] = ['delta', 'visibility', 'lifecycle', 'delete', 'profile']
export interface OperationSnapshot { readonly phase: OperationPhase; readonly loading: boolean; readonly needsReconciliation: boolean; readonly duplicateRisk: boolean; readonly blocked: boolean }
export class WriteCoordinator {
  private leases = new Map<string, { lease: symbol; policy?: OperationPolicy }>()
  private revisions = new Map<string, number>()
  private deniedPermissions = new Map<string, number>()
  private uncertain = new Map<string, Set<OperationPolicy>>()
  private listeners = new Map<string, Set<() => void>>()
  acquire(key: string, policy?: OperationPolicy): (() => void) | undefined {
    if (this.leases.has(key)) return undefined
    const lease = Symbol(key); this.leases.set(key, { lease, policy })
    this.revisions.set(key, (this.revisions.get(key) ?? 0) + 1); this.notify(key)
    return () => { if (this.leases.get(key)?.lease === lease) { this.leases.delete(key); this.notify(key) } }
  }
  busy(key: string): boolean { return this.leases.has(key) }
  activePolicy(key: string): OperationPolicy | undefined { return this.leases.get(key)?.policy }
  anyUnknown(key: string): boolean { return !!this.uncertain.get(key)?.size }
  requiresFormCheck(key: string): boolean { const policies = this.uncertain.get(key); return !!policies?.has('delete') || !!policies?.has('lifecycle') }
  denyPermission(key: string, sessionRevision: number): void {
    this.deniedPermissions.set(key, sessionRevision)
    this.revisions.set(key, (this.revisions.get(key) ?? 0) + 1); this.notify(key)
  }
  permissionDenied(key: string, sessionRevision: number): boolean { return this.deniedPermissions.get(key) === sessionRevision }
  confirmPermission(key: string): void { this.deniedPermissions.delete(key); this.notify(key) }
  // A GET started before a write stays stale after pending ends. A GET started
  // during a write cannot establish a reliable post-write baseline either.
  captureRead(key: string): () => boolean {
    const revision = this.revisions.get(key) ?? 0, startedIdle = !this.busy(key)
    return () => startedIdle && !this.busy(key) && revision === (this.revisions.get(key) ?? 0)
  }
  subscribe(key: string, changed: () => void): () => void {
    const listeners = this.listeners.get(key) ?? new Set()
    listeners.add(changed); this.listeners.set(key, listeners)
    return () => { listeners.delete(changed); if (!listeners.size) this.listeners.delete(key) }
  }
  private notify(key: string): void { this.listeners.get(key)?.forEach(changed => changed()) }
  markUnknown(key: string, policy: OperationPolicy): void {
    const policies = this.uncertain.get(key) ?? new Set()
    policies.add(policy); this.uncertain.set(key, policies); this.notify(key)
  }
  needsReconciliation(key: string, policy: OperationPolicy): boolean {
    const policies = this.uncertain.get(key)
    return !!policies?.has(policy) || (!!policies?.has('delete') && ['delta', 'visibility', 'lifecycle'].includes(policy))
      || (policy === 'lifecycle' && !!policies?.has('delta')) || (policy === 'delta' && !!policies?.has('lifecycle'))
  }
  // Only successful current-resource adoption may release the shared gate.
  reconciled(key: string): void { this.uncertain.delete(key); this.notify(key) }
}
export function isUnknownWrite(result: ApiResult<unknown>, semantics: RequestSemantics): boolean {
  return semantics === 'write' && ((result.kind === 'api-error' && result.status >= 500)
    || (result.kind === 'contract-error' && result.sent)
    || (result.kind === 'transport-error' && result.sent))
}

export class OperationState {
  private phase: OperationPhase = 'idle'
  private loading = false
  private unknown = false
  private duplicateRisk = false
  private revision = 0
  private readonly unsubscribe: () => void
  constructor(readonly policy: OperationPolicy, private readonly coordinator: WriteCoordinator, private readonly leaseKey: string, private readonly changed: (value: OperationSnapshot) => void = () => {}) {
    this.unsubscribe = coordinator.subscribe(leaseKey, () => {
      if (this.phase === 'unknown' && !this.snapshot.needsReconciliation) this.phase = 'reconciled'
      this.emit()
    })
  }
  get snapshot(): OperationSnapshot {
    const hardLock = hardLockPolicies.includes(this.policy)
    const needsReconciliation = hardLock ? this.coordinator.needsReconciliation(this.leaseKey, this.policy) : this.unknown
    const loading = this.loading || this.coordinator.busy(this.leaseKey)
    return Object.freeze({ phase: this.phase, loading, needsReconciliation, duplicateRisk: this.duplicateRisk, blocked: loading || (needsReconciliation && hardLock) })
  }
  get activePolicy(): OperationPolicy | undefined { return this.coordinator.activePolicy(this.leaseKey) }
  get anyUnknown(): boolean { return this.coordinator.anyUnknown(this.leaseKey) || this.unknown }
  get requiresFormCheck(): boolean { return this.coordinator.requiresFormCheck(this.leaseKey) }
  captureRead(): () => boolean { return this.coordinator.captureRead(this.leaseKey) }
  denyPermission(sessionRevision: number): void { this.coordinator.denyPermission(this.leaseKey, sessionRevision) }
  permissionDenied(sessionRevision: number): boolean { return this.coordinator.permissionDenied(this.leaseKey, sessionRevision) }
  confirmPermission(): void { this.coordinator.confirmPermission(this.leaseKey) }
  private emit(): void { this.changed(this.snapshot) }
  // Reconciliation is explicit: callers must first obtain and adopt a reliable current resource.
  reconcile(adopt: () => boolean, isCurrent: () => boolean): boolean {
    if (this.loading || this.coordinator.busy(this.leaseKey) || !isCurrent() || !adopt() || !isCurrent()) return false
    this.unknown = false; this.phase = 'reconciled'
    if (hardLockPolicies.includes(this.policy)) this.coordinator.reconciled(this.leaseKey)
    this.emit()
    // Latest/list lookup cannot prove which unknown multiple/create operation completed.
    return true
  }
  invalidate(): void { this.revision++ }
  // Response uncertainty belongs to the page's verified respondent context;
  // ending that context must not clear any shared management reconciliation gate.
  resetResponseContext(): void {
    if (this.policy !== 'response-single' && this.policy !== 'response-multiple') return
    this.invalidate(); this.unknown = false; this.duplicateRisk = false; this.phase = 'idle'; this.emit()
  }
  dispose(): void { this.invalidate(); this.unsubscribe() }
  async run<S, T>(source: S, send: (snapshot: S) => Promise<ApiResult<T>>, isCurrent: () => boolean, confirmDuplicate: () => boolean = () => false): Promise<ApiResult<T> | { readonly kind: 'blocked' } | { readonly kind: 'stale' }> {
    if (!isCurrent() || this.snapshot.blocked || (this.duplicateRisk && !confirmDuplicate())) return { kind: 'blocked' }
    const release = this.coordinator.acquire(this.leaseKey, this.policy)
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
      if (isUnknownWrite(result, 'write')) {
        this.phase = 'unknown'
        if (hardLockPolicies.includes(this.policy)) this.coordinator.markUnknown(this.leaseKey, this.policy)
        else this.unknown = true
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
