import type { useDirtyScope } from './useDirtyScope'
type PageDirty = ReturnType<typeof useDirtyScope>
const active = new WeakMap<object, PageDirty>()
export function useActiveDirtyScope() {
  const app = useNuxtApp()
  return {
    current: () => active.get(app),
    register(dirty: PageDirty) {
      active.set(app, dirty)
      onUnmounted(() => { if (active.get(app) === dirty) active.delete(app) })
    },
  }
}
