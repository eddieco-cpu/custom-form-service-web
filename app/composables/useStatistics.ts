import { StatisticsReadController } from '../domain/statistics-read'
import type { StatisticsReadState } from '../domain/statistics-read'
import { statisticsView } from '../domain/statistics-view'
import { statisticsService } from '../services/statistics'

export function useStatistics() {
  const route = useRoute(), router = useRouter(), { session } = useAuth()
  const service = statisticsService(useRuntimeConfig().public.apiBaseUrl)
  const state = shallowReactive<StatisticsReadState>({ data: null, error: null, dialog: null })
  // Bootstrap may advance Auth's sessionRevision without changing this read's credential context.
  let credentialRevision = 0
  const { scope, loading } = useRequestScope(() => route.fullPath, () => credentialRevision)
  const reader = new StatisticsReadController(state, scope, {
    path: () => route.fullPath, revision: () => credentialRevision,
    invalidate: error => session.invalidate(error), navigate: location => router.replace(location),
  })
  const load = (manual = false) => {
    if (!/^\/forms\/[^/]+\/statistics\/?$/.test(route.path)) return Promise.resolve()
    const id = String(route.params.formId ?? '')
    return reader.read(signal => service.read(id, signal), manual)
  }
  const unsubscribe = session.subscribe(change => {
    if (change.source === 'bootstrap') return
    credentialRevision++
    if (reader.credentialChanged(change)) void load()
  })
  watch(() => route.fullPath, () => { reader.contextChanged(); void load() }, { immediate: true, flush: 'sync' })
  onBeforeUnmount(() => { unsubscribe(); reader.dispose() })
  return { state, loading, view: computed(() => state.data ? statisticsView(state.data) : null), refresh: () => load(true), closeAuth: () => reader.closeAuth() }
}
