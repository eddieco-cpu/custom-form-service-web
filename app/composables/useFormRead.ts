import type { FormReadState } from '../domain/form-read'
import { FormReadController } from '../domain/form-read'

export function useFormRead<T>(resource: () => string) {
  const { state: auth, session } = useAuth()
  const route = useRoute()
  const router = useRouter()
  const state = shallowReactive<FormReadState<T>>({ data: null, error: null, dialog: null })
  const { scope, loading } = useRequestScope(resource, () => auth.value.sessionRevision)
  const reader = new FormReadController(state, scope, {
    path: () => route.fullPath, key: resource, sessionRevision: () => auth.value.sessionRevision,
    invalidate: error => session.invalidate(error), navigate: location => router.replace(location),
  })
  watch([resource, () => auth.value.sessionRevision], () => reader.contextChanged(), { flush: 'sync' })
  onBeforeUnmount(() => reader.dispose())
  const canRead = computed(() => auth.value.phase === 'settled' && ['authenticated', 'disabled'].includes(auth.value.outcome))
  return { state, reader, loading, canRead, auth }
}
