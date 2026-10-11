import { onUnmounted, shallowRef, watch } from 'vue'
import { RequestScope } from '../domain/request-scope'

export function useRequestScope(resource: () => string, sessionRevision: () => number) {
  const loading = shallowRef(false)
  const scope = new RequestScope(resource, sessionRevision, value => { loading.value = value })
  watch([resource, sessionRevision], () => scope.invalidate(), { flush: 'sync' })
  onUnmounted(() => scope.dispose())
  return { loading, scope }
}
