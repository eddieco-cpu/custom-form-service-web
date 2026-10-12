<script setup lang="ts">
const props = defineProps<{ mode: 'form' | 'edit' }>()
const { state, loading, auth, owner, refresh, reader } = useFormDetail(props.mode)
const focus = useDialogFocus(() => document.querySelector<HTMLElement>('main h1'))
async function reload() { focus.capture(); await refresh() }
async function close() { await reader.closeAuth(); await focus.restore() }
</script>
<template>
  <section :class="['mx-auto space-y-5', mode === 'edit' ? 'max-w-240' : 'max-w-200']">
    <div class="flex flex-wrap items-center justify-between gap-3"><h1 class="text-2xl font-semibold">{{ mode === 'edit' ? '編輯表單' : '表單' }}</h1><UButton v-if="state.data" color="neutral" variant="outline" :loading="loading" :disabled="loading" @click="reload">重新載入表單</UButton></div>
    <AuthGate v-if="auth.outcome === 'unknown' || auth.phase !== 'settled'" />
    <p v-else-if="auth.outcome === 'anonymous'" role="status">需要有效登入身分。</p>
    <template v-else>
      <p v-if="loading" role="status">正在載入表單…</p>
      <FeedbackReadError v-if="state.error" :presentation="state.error" :retrying="loading" @retry="reload" />
      <p v-if="state.data && state.error" class="text-sm text-gray-600">重新載入未成功，以下保留先前取得的資料。</p>
      <FormsFormRootInfo v-if="state.data" :form="state.data" :owner="owner" />
      <p v-if="state.data" class="rounded-lg border border-gray-200 p-4 text-sm text-gray-600">{{ mode === 'edit' ? '編輯器與保存／發布／管理功能尚未完成。' : '題型顯示、填答、本人答案與管理功能尚未完成。' }}</p>
    </template>
    <FeedbackActionErrorDialog v-if="state.dialog" :open="true" :presentation="state.dialog" managed-focus @close="close" />
  </section>
</template>
