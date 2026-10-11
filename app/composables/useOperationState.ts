import { getCurrentInstance, onUnmounted, shallowRef, watch } from 'vue'
import { OperationState, WriteCoordinator } from '../domain/operation-state'
import type { OperationPolicy, OperationSnapshot } from '../domain/operation-state'
const appCoordinators = new WeakMap<object, WriteCoordinator>()

export function useOperationState(policy: OperationPolicy, leaseKey: () => string) {
  const app = getCurrentInstance()?.appContext.app
  if (!app) throw new Error('useOperationState requires a component scope')
  let coordinator = appCoordinators.get(app)
  if (!coordinator) { coordinator = new WriteCoordinator(); appCoordinators.set(app, coordinator) }
  const state = shallowRef<OperationSnapshot>({ phase: 'idle', loading: false, needsReconciliation: false, duplicateRisk: false, blocked: false })
  const operation = shallowRef<OperationState>()
  const create = (key: string) => {
    operation.value?.invalidate()
    const next = new OperationState(policy, coordinator, key, value => { if (operation.value === next) state.value = value })
    operation.value = next; state.value = next.snapshot
  }
  create(leaseKey())
  watch(leaseKey, create, { flush: 'sync' })
  onUnmounted(() => operation.value?.invalidate())
  return { operation, state }
}
