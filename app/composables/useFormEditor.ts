import { EditorPageController, editorPageState } from '../domain/editor-page'
import type { EditorPageState } from '../domain/editor-page'
import { formService } from '../services/form'
import { editorDirty } from '../domain/editor'

export function useFormEditor(mode: 'new' | 'edit') {
  const route = useRoute(), router = useRouter(), toast = useToast()
  const auth = useAuth()
  const state = reactive(editorPageState()) as EditorPageState
  const resource = () => route.fullPath
  const { scope } = useRequestScope(resource, () => auth.state.value.sessionRevision)
  const pageKey = crypto.randomUUID()
  const id = computed(() => state.session && 'id' in state.session.definition.metadata ? state.session.definition.metadata.id : undefined)
  const lease = () => mode === 'edit' ? `form:${String(route.params.formId)}` : id.value ? `form:${id.value}` : `new:${pageKey}`
  const create = useOperationState('create', lease), delta = useOperationState('delta', lease)
  const operation = computed(() => id.value ? delta : create)
  // Stable content revision, independent of authentication revisions.
  const contentRevision = ref(0)
  watch(() => state.session?.definition, () => { contentRevision.value++ }, { deep: true, flush: 'sync' })
  const dirty = useDirtyScope({ isDirty: () => state.session ? editorDirty(state.session.definition, state.session.baseline) : false, revision: () => contentRevision.value, needsReconciliation: () => operation.value.state.value.needsReconciliation })
  useActiveDirtyScope().register(dirty)
  const controller = new EditorPageController(state, {
    auth: () => auth.state.value, authSession: auth.session, scope, service: formService(useRuntimeConfig().public.apiBaseUrl),
    operation: saved => (saved ? delta : create).operation.value!, resource, path: () => route.fullPath,
    authorize: () => { const permit = dirty.authorizeAction('editor-reload'); return permit ? () => contentRevision.value === permit.revision : undefined },
    finishDiscard: dirty.finishAction,
    confirmDuplicate: () => window.confirm('先前建立結果尚未確認，再次保存可能建立重複表單，是否繼續？'),
    confirmAccount: () => window.confirm('是否以目前登入帳號繼續編輯這份尚未保存的內容？'),
    navigate: (target, replace) => replace ? router.replace(target) : router.push(target), toast: title => toast.add({ title, color: 'success' }),
  })
  watch([() => auth.state.value.sessionRevision, () => auth.state.value.outcome], () => controller.authChanged(), { flush: 'sync' })
  watch(() => route.params.formId, (next, old) => { if (next !== old) { controller.contextChanged(); if (mode === 'edit') void controller.load(String(next)) } })
  watch([() => auth.state.value.phase, () => auth.state.value.outcome], () => {
    if (mode === 'new') controller.initializeNew()
    else if (!state.session && auth.state.value.phase === 'settled' && ['authenticated', 'disabled'].includes(auth.state.value.outcome)) void controller.load(String(route.params.formId))
  }, { immediate: true })
  onBeforeUnmount(() => controller.dispose())
  return { state, controller, dirty, operation, auth, id, inputDisabled: computed(() => !controller.canWrite || state.checking || operation.value.state.value.loading), canWrite: computed(() => controller.canWrite) }
}
