<script setup lang="ts">
import { presentError } from '../../domain/error-presentation'
import { loginLocation } from '../../utils/redirect'
const { state, session } = useAuth()
const route = useRoute()
const router = useRouter()
const { scope } = useRequestScope(() => route.fullPath, () => state.value.sessionRevision)
const retrying = ref(false)
async function retry() {
  if (retrying.value) return
  const ticket = scope.begin()
  retrying.value = true
  try {
    const candidate = await session.candidate()
    if (!ticket.isCurrent() || !candidate.isCurrent()) return
    candidate.adopt()
    if (state.value.outcome === 'anonymous') await router.replace(loginLocation(route.fullPath))
  }
  finally { retrying.value = false; scope.finish(ticket) }
}
</script>

<template>
  <slot v-if="state.user && state.outcome === 'authenticated'" />
  <FeedbackReadError v-else-if="state.error" :presentation="presentError(state.error, 'bootstrap')" :retrying="retrying" @retry="retry" />
  <p v-else role="status">正在確認登入狀態…</p>
</template>
