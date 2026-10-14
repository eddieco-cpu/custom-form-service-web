import type { DeepReadonly, EditorDefinition, FieldIssue } from '../domain/models'
import type { FormDetailDto } from '../domain/api/form'
import { FormManagementController, managementState } from '../domain/form-management'
import type { ManagementState } from '../domain/form-management'
import { formService } from '../services/form'
import type { OperationPolicy } from '../domain/operation-state'

export interface ManagementBridge {
  saved: () => DeepReadonly<EditorDefinition> | undefined; eligible: () => boolean; dirty: () => boolean; revision: () => unknown
  adopt: (dto: FormDetailDto, policy: 'visibility' | 'lifecycle') => void; clear: () => void; deny: () => void
  issues: (issues: readonly FieldIssue[]) => void; authorize: (confirmed?: boolean) => (() => boolean) | undefined
  finishDiscard: () => void; reload: () => Promise<void>; verify: () => Promise<boolean>
}
export function useFormManagement(bridge: ManagementBridge) {
  const route = useRoute(), router = useRouter(), auth = useAuth(), toast = useToast()
  const resource = () => route.fullPath
  const key = () => {
    const metadata = bridge.saved()?.metadata
    const id = route.params.formId ?? (metadata && 'id' in metadata ? metadata.id : '')
    return `form:${String(id).toLowerCase()}`
  }
  const visibility = useOperationState('visibility', key), lifecycle = useOperationState('lifecycle', key), deletion = useOperationState('delete', key)
  const operations = { visibility, lifecycle, delete: deletion }
  const writeScope = useRequestScope(resource, () => auth.state.value.sessionRevision).scope
  const countScope = useRequestScope(resource, () => auth.state.value.sessionRevision).scope
  const candidateScope = useRequestScope(resource, () => auth.state.value.sessionRevision).scope
  const state = reactive(managementState()) as ManagementState
  const controller = new FormManagementController(state, {
    ...bridge, reload, auth: () => auth.state.value, authSession: auth.session, resource, writeScope, countScope, candidateScope,
    service: formService(useRuntimeConfig().public.apiBaseUrl),
    operation: (policy: OperationPolicy) => operations[policy as keyof typeof operations]?.operation.value ?? lifecycle.operation.value!,
    navigate: (target, replace) => replace ? router.replace(target) : router.push(target), toast: title => toast.add({ title, color: 'success' }),
  })
  watch(() => route.params.formId, () => controller.reset(), { flush: 'sync' })
  watch(() => auth.state.value.sessionRevision, () => { state.confirmation = null }, { flush: 'sync' })
  watch([visibility.state, () => auth.state.value.sessionRevision], () => { state.denied = visibility.operation.value!.permissionDenied(auth.state.value.sessionRevision) }, { immediate: true, flush: 'sync' })
  onBeforeUnmount(() => controller.dispose())
  async function reload() {
    const revision = bridge.revision(), fresh = visibility.operation.value!.captureRead()
    await bridge.reload()
    if (fresh() && revision !== bridge.revision() && bridge.saved() && !visibility.operation.value!.anyUnknown) controller.reconciled()
  }
  async function verify() { if (await bridge.verify()) { visibility.operation.value!.confirmPermission(); state.denied = false; controller.reconciled() } }
  const busy = computed(() => visibility.state.value.loading)
  const unknown = computed(() => { void visibility.state.value; return visibility.operation.value!.anyUnknown })
  const pendingPolicy = computed(() => { void visibility.state.value; return visibility.operation.value!.activePolicy })
  return { state, controller, busy, unknown, pendingPolicy, reload, verify, visibilityState: visibility.state, lifecycleState: lifecycle.state, deletionState: deletion.state }
}
