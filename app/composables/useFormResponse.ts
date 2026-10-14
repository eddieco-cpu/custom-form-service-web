import { ResponsePageController, responsePageState } from '../domain/response-page'
import type { ResponsePageState } from '../domain/response-page'
import { loadEditor } from '../domain/editor'
import { answerDirty } from '../domain/answer'
import { formService } from '../services/form'
import { responseService } from '../services/response'

export function useFormResponse(mode: 'form' | 'edit') {
  const route = useRoute(), router = useRouter(), auth = useAuth()
  const state = reactive(responsePageState()) as ResponsePageState
  const resource = () => route.fullPath, id = () => String(route.params.formId ?? ''), key = () => `form:${id().toLowerCase()}`
  const single = useOperationState('response-single', key), multiple = useOperationState('response-multiple', key), formOperation = useOperationState('delta', key)
  const operation = computed(() => state.form?.responseMode === 'multiple' ? multiple : single)
  const formScope = useRequestScope(resource, () => auth.state.value.sessionRevision), latestScope = useRequestScope(resource, () => auth.state.value.sessionRevision), submitScope = useRequestScope(resource, () => auth.state.value.sessionRevision)
  const revision = ref(0), now = ref(BigInt(Date.now()) * 10000n)
  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => { timer = setInterval(() => { now.value = BigInt(Date.now()) * 10000n }, 1000) })
  onUnmounted(() => clearInterval(timer))
  watch([() => state.form, () => state.model], () => { revision.value++ }, { deep: true, flush: 'sync' })
  const dirty = useDirtyScope({ isDirty: () => !!state.model && !!state.baseline && answerDirty(state.model, state.baseline), revision: () => revision.value,
    captureContext: () => formOperation.operation.value!.captureRead(), needsReconciliation: () => { void operation.value.state.value; void formOperation.state.value; return operation.value.operation.value!.anyUnknown || operation.value.state.value.duplicateRisk || formOperation.operation.value!.anyUnknown } })
  useActiveDirtyScope().register(dirty)
  const authorize = (confirmed = false) => { const permit = dirty.authorizeAction('response-page', confirmed ? () => true : undefined); return permit ? () => revision.value === permit.revision : undefined }
  const controller = new ResponsePageController(state, {
    auth: () => auth.state.value, authSession: auth.session, resource, id, mode, now: () => now.value, revision: () => revision.value,
    formScope: formScope.scope, latestScope: latestScope.scope, submitScope: submitScope.scope,
    formService: formService(useRuntimeConfig().public.apiBaseUrl), responseService: responseService(useRuntimeConfig().public.apiBaseUrl),
    operation: () => operation.value.operation.value!, formOperation: () => formOperation.operation.value!,
    authorize, finishDiscard: dirty.finishAction,
    confirmLatest: () => window.confirm('載入最近一次答案將取代目前輸入，是否繼續？'),
    confirmDuplicate: () => window.confirm('先前提交結果尚未確認，再次提交可能新增重複填答紀錄，是否繼續？'),
    navigate: (target, replace) => replace ? router.replace(target) : router.push(target),
  })
  const management = useFormManagement({
    saved: () => state.form ? loadEditor(state.form).baseline.definition : undefined, eligible: () => controller.owner && !state.unavailable,
    dirty: () => dirty.dirty.value, revision: () => revision.value,
    adopt: dto => controller.adoptManagement(dto), clear: () => controller.clear(),
    deny: () => { if (management.state.unavailable) state.unavailable = true }, issues: issues => { state.issues = issues },
    authorize, finishDiscard: dirty.finishAction, reload: async () => { await controller.load(true) },
    verify: async () => await controller.verifyPermission() && controller.owner,
  })
  watch(() => auth.state.value.sessionRevision, () => controller.authChanged(), { flush: 'sync' })
  watch(resource, (next, old) => { if (next !== old) { controller.contextChanged(); if (id()) void controller.load() } }, { flush: 'sync' })
  watch([() => auth.state.value.phase, () => auth.state.value.outcome, () => formOperation.state.value.loading], () => {
    if (!state.form && !state.readError && auth.state.value.phase === 'settled' && ['authenticated', 'disabled'].includes(auth.state.value.outcome)) void controller.load()
  }, { immediate: true })
  onBeforeUnmount(() => controller.dispose())
  const track = () => { void operation.value.state.value; void formOperation.state.value; void now.value }
  return { state, controller, management, dirty, auth, operation, loading: formScope.loading,
    canSubmit: computed(() => { track(); return controller.canSubmit }), canLatest: computed(() => { track(); return controller.canLatest }),
    readonly: computed(() => { track(); return controller.readonly }), inputDisabled: computed(() => { track(); return controller.inputDisabled }),
    needsReconciliation: computed(() => { track(); return controller.needsReconciliation }),
  }
}
