import { computed, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { DirtyScope } from '../domain/dirty-scope'
import type { DiscardPermit } from '../domain/dirty-scope'

export interface DirtyScopeOptions { readonly isDirty: () => boolean; readonly revision: () => unknown; readonly needsReconciliation?: () => boolean }
export function useDirtyScope(options: DirtyScopeOptions) {
  const router = useRouter()
  const scope = new DirtyScope()
  const dirty = computed(() => options.isDirty() || (options.needsReconciliation?.() ?? false))
  const ask = () => window.confirm('離開或取代目前資料將丟棄未保存內容，是否繼續？')
  const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
  const stop = watch([dirty, options.revision], ([value, revision]) => {
    scope.update(value, revision)
    window.removeEventListener('beforeunload', beforeUnload)
    if (value) window.addEventListener('beforeunload', beforeUnload)
  }, { immediate: true, flush: 'sync' })
  // A mounted page scope owns this guard; it covers leave AND same-component updates.
  // Root redirectedFrom identifies the single navigation chain; afterEach removes its permit.
  const removeGuard = router.beforeEach((to, from) => to.fullPath === from.fullPath || scope.allowNavigation(to.redirectedFrom?.fullPath ?? to.fullPath, ask))
  const removeAfter = router.afterEach(() => scope.clear())
  const removeError = router.onError(() => scope.clear())
  onUnmounted(() => { stop(); removeGuard(); removeAfter(); removeError(); scope.clear(); window.removeEventListener('beforeunload', beforeUnload) })
  return {
    dirty,
    authorizeAction: (actionId: string) => scope.authorize(actionId, ask),
    finishAction: () => scope.clear(),
    async navigateWithPermit(permit: DiscardPermit, target: RouteLocationRaw, replace = false) {
      if (!scope.bindNavigation(permit, router.resolve(target).fullPath)) return false
      try { return !(await (replace ? router.replace(target) : router.push(target))) }
      finally { scope.clear() }
    },
    replaceData(actionId: string, apply: () => void): boolean {
      const permit = scope.authorize(actionId, ask)
      if (!permit) return false
      try { if (!scope.valid(permit)) return false; apply(); return true }
      finally { scope.clear() }
    },
  }
}
