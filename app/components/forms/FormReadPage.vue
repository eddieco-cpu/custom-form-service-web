<script setup lang="ts">
import { loadEditor } from '../../domain/editor'
const props = defineProps<{ mode: 'form' | 'edit' }>()
const { state, loading, auth, owner, refresh, reader, verify, operation } = useFormDetail(props.mode)
const content = ref(0)
watch(() => state.data, () => { content.value++ }, { flush: 'sync' })
const management = useFormManagement({
  saved: () => state.data ? loadEditor(state.data).baseline.definition : undefined, eligible: () => owner.value,
  dirty: () => false, revision: () => content.value, adopt: dto => { state.data = dto },
  clear: () => { state.data = null; state.error = { kind: 'not-found', placement: 'page', message: '找不到表單', details: [], knownCode: true } },
  deny: () => {}, issues: () => {}, authorize: () => () => true, finishDiscard: () => {}, reload: refresh, verify,
})
const focus = useDialogFocus(() => document.querySelector<HTMLElement>('main h1'))
async function reload() { focus.capture(); await management.reload() }
async function close() { await reader.closeAuth(); await focus.restore() }
</script>
<template>
  <section :class="['mx-auto space-y-5', mode === 'edit' ? 'max-w-240' : 'max-w-200']">
    <div class="flex flex-wrap items-center justify-between gap-3"><h1 class="text-2xl font-semibold">{{ mode === 'edit' ? '編輯表單' : '表單' }}</h1><UButton v-if="state.data || auth.outcome === 'authenticated'" color="neutral" variant="outline" :loading="loading" :disabled="loading || operation.state.value.loading" @click="reload">重新載入表單</UButton></div>
    <AuthGate v-if="auth.outcome === 'unknown' || auth.phase !== 'settled'" />
    <p v-else-if="auth.outcome === 'anonymous'" role="status">需要有效登入身分。</p>
    <template v-else>
      <p v-if="loading" role="status">正在載入表單…</p>
      <p v-else-if="!state.data && !state.error" role="status">尚未取得表單現況；請於操作結束後重新載入。</p>
      <FeedbackReadError v-if="state.error" :presentation="state.error" :retrying="loading" @retry="reload" />
      <p v-if="state.data && state.error" class="text-sm text-gray-600">重新載入未成功，以下保留先前取得的資料。</p>
      <FormsFormRootInfo v-if="state.data" :form="state.data" :owner="owner && !management.controller.denied" />
      <FormsFormDefinitionView v-if="state.data" :form="state.data" />
      <NuxtLink v-if="state.data?.status === 'closed' && ((owner && !management.controller.denied) || state.data.resultVisibility !== 'owner_only')" :to="`/forms/${state.data.id}/statistics`" class="inline-block text-blue-700 underline">查看統計</NuxtLink>
      <p v-if="state.data" class="text-sm text-gray-600">目前顯示表單定義；填答與查看本人答案功能尚未完成。</p>
    </template>
    <FormsFormManagement v-if="state.data || management.state.error" :manager="management" show-visibility />
    <FeedbackActionErrorDialog v-if="state.dialog" :open="true" :presentation="state.dialog" managed-focus @close="close" />
  </section>
</template>
