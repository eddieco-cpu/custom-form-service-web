<script setup lang="ts">
import type { FormErrorEvent, Form } from '@nuxt/ui'
import { userService } from '../services/user'
import { profileDirty, profileRequest, profileSchema } from '../domain/auth-input'
import { isSessionFailure } from '../domain/auth-state'
import { presentError } from '../domain/error-presentation'
import type { ErrorPresentation } from '../domain/error-presentation'
import { loginLocation } from '../utils/redirect'
definePageMeta({ middleware: 'auth' })
const { state, session, busy } = useAuth()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const service = userService(useRuntimeConfig().public.apiBaseUrl)
const input = reactive({ displayName: state.value.user?.displayName ?? '' })
const baseline = ref(state.value.user?.displayName ?? '')
const ready = ref(!!state.value.user && state.value.outcome === 'authenticated')
const form = useTemplateRef<Form<typeof input>>('form')
const nameControl = useTemplateRef('nameControl')
const error = shallowRef<ErrorPresentation>()
const readError = shallowRef<ErrorPresentation>()
const checking = ref(false)
const { scope } = useRequestScope(() => route.fullPath, () => state.value.sessionRevision)
// Advance only after adopting a reliable baseline, never just because Auth
// invalidation changes the revision while unresolved data is still on screen.
const profileKey = ref(`profile:${state.value.sessionRevision}`)
const operation = useOperationState('profile', () => profileKey.value)
const dialogFocus = useDialogFocus(() => document.querySelector<HTMLElement>('main button[data-profile-reconcile]'))
const dirty = useDirtyScope({ isDirty: () => ready.value && profileDirty(input.displayName, baseline.value), revision: () => input.displayName, needsReconciliation: () => operation.state.value.needsReconciliation })
useActiveDirtyScope().register(dirty)
watch(() => state.value.user, user => {
  if (!ready.value && user && state.value.outcome === 'authenticated') {
    input.displayName = user.displayName; baseline.value = user.displayName; ready.value = true
    profileKey.value = `profile:${state.value.sessionRevision}`
  }
})
const disabled = computed(() => busy.value || checking.value || state.value.outcome === 'anonymous')
async function focusError(event: FormErrorEvent) { await nextTick(); if (event.errors.some(error => error.name === 'displayName')) { nameControl.value?.inputRef?.focus(); nameControl.value?.inputRef?.scrollIntoView({ block: 'center' }) } }
async function save() {
  if (disabled.value || !ready.value || !profileDirty(input.displayName, baseline.value)) return
  dialogFocus.capture()
  const ticket = scope.begin()
  busy.value = true
  try {
    const result = await operation.operation.value!.run(profileRequest(input), body => service.update(body), ticket.isCurrent)
    if (result.kind === 'blocked' || result.kind === 'stale' || !ticket.isCurrent()) return
    if (result.kind === 'success') {
      input.displayName = result.value.displayName; baseline.value = result.value.displayName
      session.profile(result.value)
      profileKey.value = `profile:${state.value.sessionRevision}`
      toast.add({ title: '個人資訊已更新', color: 'success' })
    }
    else {
      error.value = presentError(result, 'action')
      form.value?.setErrors(error.value.details.filter(detail => detail.path === 'displayName').map(detail => ({ name: detail.path, message: detail.message })))
      if (isSessionFailure(result)) session.invalidate(result)
    }
  }
  finally { busy.value = false; scope.finish(ticket) }
}
async function closeError() {
  const authError = error.value?.kind === 'auth'; error.value = undefined
  if (authError) await router.replace(loginLocation(route.fullPath))
  await dialogFocus.restore()
}
async function reconcile() {
  if (disabled.value) return
  dialogFocus.capture()
  const ticket = scope.begin()
  checking.value = true; readError.value = undefined
  try {
    const candidate = await session.candidate()
    const current = () => ticket.isCurrent() && candidate.isCurrent()
    if (!current()) return
    const result = candidate.result
    if (result.kind === 'success') {
      dirty.replaceData('profile-reconcile', () => {
        const adopted = operation.operation.value!.reconcile(() => {
          if (!current()) return false
          input.displayName = result.value.displayName; baseline.value = result.value.displayName
          return true
        }, current)
        // Adoption may change identity and invalidate this page ticket. Complete the
        // verified baseline transition before advancing the shared session revision.
        if (adopted && candidate.adopt()) profileKey.value = `profile:${state.value.sessionRevision}`
      })
    }
    else if (isSessionFailure(result)) { error.value = presentError(result, 'read'); session.invalidate(result) }
    else { readError.value = presentError(result, 'read') }
  }
  finally { checking.value = false; scope.finish(ticket) }
}
</script>
<template>
  <section class="mx-auto max-w-160 space-y-5">
    <h1 class="text-2xl font-semibold">個人資訊</h1>
    <AuthGate v-if="!ready" />
    <UCard v-else>
      <div class="mb-5 flex items-start gap-4"><UserAvatar :url="state.user?.avatarUrl" /><dl class="min-w-0 space-y-2 break-words"><dt class="text-sm text-gray-600">User ID</dt><dd>{{ state.user?.id }}</dd><dt class="text-sm text-gray-600">Email</dt><dd>{{ state.user?.email }}</dd></dl></div>
      <UForm ref="form" :loading-auto="false" :schema="profileSchema" :state="input" :validate-on="['input']" class="space-y-5" @submit="save" @error="focusError">
        <UFormField label="姓名" name="displayName" required><UInput ref="nameControl" v-model="input.displayName" autocomplete="name" class="w-full" :disabled="disabled" /></UFormField>
        <UButton type="submit" :loading="busy" :disabled="disabled || operation.state.value.blocked || !profileDirty(input.displayName, baseline)">保存</UButton>
      </UForm>
      <p v-if="operation.state.value.needsReconciliation" class="mt-4 text-sm text-gray-600">保存結果尚未確認，請核對目前個人資訊後再保存。</p>
      <UButton v-if="operation.state.value.needsReconciliation" data-profile-reconcile color="neutral" variant="outline" class="mt-3" :loading="checking" :disabled="disabled" @click="reconcile">核對目前個人資訊</UButton>
      <FeedbackReadError v-if="readError" class="mt-4" :presentation="readError" :retrying="checking" @retry="reconcile" />
    </UCard>
    <FeedbackActionErrorDialog v-if="error" :open="true" :presentation="error" managed-focus @close="closeError" />
  </section>
</template>
