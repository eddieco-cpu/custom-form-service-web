<script setup lang="ts">
import type { FormErrorEvent, Form } from '@nuxt/ui'
import { authService } from '../services/auth'
import { loginRequest, loginSchema, registerRequest, registerSchema } from '../domain/auth-input'
import { presentError } from '../domain/error-presentation'
import type { ErrorPresentation } from '../domain/error-presentation'
import { safeRedirect } from '../utils/redirect'
definePageMeta({ middleware: 'guest' })
const { state, session, busy } = useAuth()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const service = authService(useRuntimeConfig().public.apiBaseUrl)
const tab = ref('login')
const tabs = computed(() => [{ label: '登入', value: 'login', disabled: busy.value || retrying.value }, { label: '註冊', value: 'register', disabled: busy.value || retrying.value }])
const input = reactive({ email: '', password: '', displayName: '' })
const form = useTemplateRef<Form<typeof input>>('form')
const nameControl = useTemplateRef('nameControl')
const emailControl = useTemplateRef('emailControl')
const passwordControl = useTemplateRef('passwordControl')
const error = shallowRef<ErrorPresentation>()
const retrying = ref(false)
const { scope } = useRequestScope(() => route.fullPath, () => state.value.sessionRevision)
const login = useOperationState('login', () => 'auth-write')
const register = useOperationState('register', () => 'auth-write')
watch(tab, () => { form.value?.clear(); error.value = undefined })
async function focusError(event: FormErrorEvent) {
  await nextTick()
  const controls = { displayName: nameControl.value?.inputRef, email: emailControl.value?.inputRef, password: passwordControl.value?.inputRef }
  const first = (tab.value === 'register' ? ['displayName', 'email', 'password'] : ['email', 'password']).find(name => event.errors.some(error => error.name === name))
  const element = first ? controls[first as keyof typeof controls] : undefined
  element?.focus(); element?.scrollIntoView({ block: 'center' })
}
async function submit() {
  if (busy.value || retrying.value) return
  const registering = tab.value === 'register'
  const ticket = scope.begin()
  busy.value = true
  try {
    const result = registering
      ? await register.operation.value!.run(registerRequest(input), body => service.register(body), ticket.isCurrent)
      : await login.operation.value!.run(loginRequest(input), body => service.login(body), ticket.isCurrent)
    if (result.kind === 'blocked' || result.kind === 'stale' || !ticket.isCurrent()) return
    if (result.kind === 'success') {
      if (registering) { input.email = result.value.email; input.password = ''; tab.value = 'login'; toast.add({ title: '註冊成功，請登入', color: 'success' }) }
      else { session.login(result.value); await router.replace(safeRedirect(route.query.redirect, window.location.origin)) }
    }
    else {
      error.value = presentError(result, registering ? 'register' : 'login')
      if (!registering && error.value.kind === 'disabled') error.value = { ...error.value, message: '帳號已停用，無法登入' }
      const details = error.value.details.filter(detail => ['email', 'password', 'displayName'].includes(detail.path)).map(detail => ({ name: detail.path, message: detail.message }))
      if (registering && result.kind === 'api-error' && result.error.code === 'USER_EMAIL_ALREADY_EXISTS' && !details.some(detail => detail.name === 'email')) details.push({ name: 'email', message: '此 Email 已註冊' })
      form.value?.setErrors(details)
    }
  }
  finally { busy.value = false; scope.finish(ticket) }
}
async function verify() {
  if (busy.value || retrying.value) return
  retrying.value = true
  const ticket = scope.begin()
  try {
    const candidate = await session.candidate()
    if (!ticket.isCurrent() || !candidate.isCurrent()) return
    candidate.adopt()
    if (state.value.outcome === 'authenticated') await router.replace(safeRedirect(route.query.redirect, window.location.origin))
  }
  finally { retrying.value = false; scope.finish(ticket) }
}
</script>
<template>
  <section class="mx-auto max-w-110 space-y-5">
    <h1 class="text-2xl font-semibold">帳號</h1>
    <FeedbackReadError v-if="state.error && state.outcome !== 'anonymous'" :presentation="presentError(state.error, 'bootstrap')" :retrying="retrying" @retry="verify" />
    <UCard>
      <UTabs v-model="tab" :items="tabs" :content="false" class="mb-6" />
      <UForm ref="form" :loading-auto="false" :schema="tab === 'register' ? registerSchema : loginSchema" :state="input" :validate-on="['input']" class="space-y-5" @submit="submit" @error="focusError">
        <UFormField v-if="tab === 'register'" label="姓名" name="displayName" required><UInput ref="nameControl" v-model="input.displayName" autocomplete="name" :disabled="busy || retrying" class="w-full" /></UFormField>
        <UFormField label="Email" name="email" required><UInput ref="emailControl" v-model="input.email" type="text" inputmode="email" autocomplete="username" :disabled="busy || retrying" class="w-full" /></UFormField>
        <UFormField label="密碼" name="password" required :help="tab === 'register' ? '10～128 個字元，頭尾空白會保留' : undefined"><UInput ref="passwordControl" v-model="input.password" type="password" :autocomplete="tab === 'register' ? 'new-password' : 'current-password'" :disabled="busy || retrying" class="w-full" /></UFormField>
        <UButton type="submit" block :loading="busy" :disabled="busy || retrying">{{ tab === 'register' ? '註冊' : '登入' }}</UButton>
      </UForm>
      <p v-if="login.state.value.needsReconciliation" class="mt-4 text-sm text-gray-600">登入結果尚未確認，可手動重試或核對登入狀態。</p>
      <p v-if="register.state.value.needsReconciliation" class="mt-4 text-sm text-gray-600">註冊結果尚未確認，可切至登入 Tab 用原帳密確認。</p>
      <UButton v-if="login.state.value.needsReconciliation" class="mt-3" color="neutral" variant="outline" :loading="retrying" :disabled="busy || retrying" @click="verify">核對登入狀態</UButton>
    </UCard>
    <FeedbackActionErrorDialog v-if="error" :open="true" :presentation="error" @close="error = undefined" />
  </section>
</template>
