<script setup lang="ts">
import { authService } from '../services/auth'
import { presentError } from '../domain/error-presentation'
import type { ErrorPresentation } from '../domain/error-presentation'
import { loginLocation } from '../utils/redirect'
const { state, session, busy } = useAuth()
const route = useRoute()
const router = useRouter()
const dirtyBridge = useActiveDirtyScope()
const { scope } = useRequestScope(() => route.fullPath, () => state.value.sessionRevision)
const { operation } = useOperationState('logout', () => 'auth-write')
const service = authService(useRuntimeConfig().public.apiBaseUrl)
const mobileOpen = ref(false)
const menuOpen = ref(false)
const error = shallowRef<ErrorPresentation>()
const dialogFocus = useDialogFocus(() => document.querySelector<HTMLElement>('header button[aria-label="使用者選單"]'))
async function closeError() { error.value = undefined; await dialogFocus.restore() }
const navs = [
  { label: '建立表單', to: '/forms/new' }, { label: '我的表單', to: '/forms' },
  { label: '個人資訊', to: '/profile' }, { label: '首頁', to: '/' },
]
const label = computed(() => state.value.user?.displayName ?? (state.value.outcome === 'disabled' ? '登入中' : state.value.phase !== 'settled' ? '確認中' : state.value.outcome === 'anonymous' ? '未登入' : '身分未知'))
const canOpen = computed(() => !!state.value.user || state.value.outcome === 'disabled')
watch(() => route.fullPath, () => { mobileOpen.value = false; menuOpen.value = false; error.value = undefined })
async function navigate(to: string) {
  await session.initialize()
  await router.push(state.value.outcome === 'anonymous' ? loginLocation(to) : to)
}
async function logout() {
  if (busy.value) return
  dialogFocus.capture()
  const dirty = dirtyBridge.current()
  const permit = dirty?.authorizeAction('logout')
  if (dirty && !permit) return
  let ticket = scope.begin()
  const pageCurrent = dirty && permit ? dirty.captureCurrent(permit) : () => true
  const current = () => ticket.isCurrent() && pageCurrent()
  busy.value = true
  try {
    const result = await operation.value!.run({}, () => service.logout(), current)
    if (result.kind === 'stale' || result.kind === 'blocked' || !current()) return
    if (result.kind === 'success') {
      const revision = state.value.sessionRevision, path = route.fullPath
      const cleanup = () => {
        session.logout()
        if (state.value.sessionRevision !== revision + 1 || state.value.outcome !== 'anonymous' || state.value.user !== null || route.fullPath !== path) return undefined
        // The successful action owns this Session change. Its new ticket still
        // rejects subsequent external Session/path/scope changes.
        ticket = scope.begin()
        return ticket.isCurrent
      }
      if (dirty && permit) await dirty.navigateWithPermit(permit, '/login', true, cleanup)
      else if (cleanup()?.()) await router.replace('/login')
      menuOpen.value = false
    }
    else { error.value = presentError(result, 'action'); dirty?.finishAction() }
  }
  finally { busy.value = false; scope.finish(ticket); dirty?.finishAction() }
}
</script>
<template>
  <header class="fixed inset-x-0 top-0 z-30 border-b border-gray-200 bg-white">
    <div class="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 lg:h-16">
      <span class="mr-auto font-semibold text-blue-700">自建表單</span>
      <nav aria-label="主要導覽" class="hidden items-center gap-1 lg:flex"><UButton v-for="nav in navs" :key="nav.to" color="neutral" variant="ghost" @click="navigate(nav.to)">{{ nav.label }}</UButton></nav>
      <UButton class="lg:hidden" color="neutral" variant="ghost" icon="i-lucide-menu" aria-label="展開導覽" :aria-expanded="mobileOpen" @click="mobileOpen = !mobileOpen" />
      <UPopover v-if="canOpen" v-model:open="menuOpen">
        <button class="flex min-w-0 max-w-44 items-center gap-2 rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-blue-600" aria-label="使用者選單" :aria-expanded="menuOpen"><UserAvatar :url="state.user?.avatarUrl" /><span class="truncate">{{ label }}</span></button>
        <template #content><div class="w-72 max-w-[calc(100vw-32px)] space-y-2 p-3"><p class="break-words whitespace-pre-wrap">{{ label }}</p><UButton block color="neutral" variant="ghost" @click="navigate('/profile')">個人資訊</UButton><UButton block :loading="busy" :disabled="busy" color="neutral" variant="outline" @click="logout">登出</UButton></div></template>
      </UPopover>
      <div v-else class="flex items-center gap-2 text-sm text-gray-600"><UserAvatar /><span role="status">{{ label }}</span></div>
    </div>
    <nav v-if="mobileOpen" aria-label="手機導覽" class="grid border-t border-gray-100 px-4 py-2 lg:hidden"><UButton v-for="nav in navs" :key="nav.to" color="neutral" variant="ghost" @click="navigate(nav.to)">{{ nav.label }}</UButton></nav>
  </header>
  <FeedbackActionErrorDialog v-if="error" :open="true" :presentation="error" managed-focus @close="closeError" />
</template>
