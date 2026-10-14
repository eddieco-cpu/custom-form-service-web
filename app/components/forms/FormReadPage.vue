<script setup lang="ts">
import { formatTaipei } from '../../utils/datetime'
const props = defineProps<{ mode: 'form' | 'edit' }>()
const { state, controller, management, auth, operation, loading, canSubmit, canLatest, readonly, inputDisabled, needsReconciliation } = useFormResponse(props.mode)
const renderer = useTemplateRef('renderer')
const focus = useDialogFocus(() => document.querySelector<HTMLElement>('main h1'))
async function submit() { focus.capture(); await controller.submit(); await nextTick(); if (state.issues.length && !state.error) renderer.value?.focusIssue(state.issues[0]!.targetKey) }
async function latest() { focus.capture(); await controller.latest() }
async function closeError() { const issue = state.issues[0]; await controller.closeError(); if (!state.error) { await focus.restore(); if (issue) renderer.value?.focusIssue(issue.targetKey) } }
async function closeSuccess() { state.success = false; await focus.restore() }
</script>
<template>
  <section class="mx-auto max-w-200 space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3"><h1 class="text-2xl font-semibold">{{ mode === 'edit' ? '編輯表單' : '表單' }}</h1><UButton v-if="state.form || auth.state.value.outcome === 'authenticated'" color="neutral" variant="outline" :loading="loading" :disabled="loading || operation.state.value.loading || state.latestLoading" @click="management.reload">重新載入表單</UButton></div>
    <AuthGate v-if="!state.form && (auth.state.value.outcome === 'unknown' || auth.state.value.phase !== 'settled')" />
    <p v-if="loading" role="status">正在載入表單…</p>
    <FeedbackReadError v-if="state.readError" :presentation="state.readError" :retrying="loading" @retry="management.reload" />
    <template v-if="state.form">
      <FormsFormRootInfo :form="state.form" :owner="controller.owner && !management.controller.denied" />
      <p v-if="state.unavailable" role="alert">表單現況已變更，請重新載入表單核對。以下本地內容仍可查看或複製。</p>
      <p v-if="state.localOnly" role="status" class="text-amber-800">以下保留本地輸入；已提交答案可按「查看我的填答」載入。</p>
      <p v-if="state.knownSubmitted && state.form.responseMode === 'single'" role="status">此單次表單已知提交完成。</p>
      <p v-if="state.submittedAt" class="text-sm text-gray-600">最近一次提交：{{ formatTaipei(state.submittedAt) }}</p>
      <div v-if="!controller.hasPermission" class="space-y-2"><p>需要重新核對登入身分與填答資格；本地內容保留供查看或複製。</p><UButton color="neutral" variant="outline" :disabled="state.checking || operation.state.value.loading" @click="controller.verifyPermission()">核對登入與填答資格</UButton></div>
      <div v-if="needsReconciliation" class="space-y-2" role="alert"><p>操作結果尚待核對；提交結果請主動查看我的填答。可多次填答的再次提交可能新增重複紀錄。</p></div>
      <UForm v-if="state.definition && state.model" :state="state.model.values" class="space-y-5" @submit="submit">
        <FormsFormRenderer ref="renderer" v-model:model="state.model" :definition="state.definition" :readonly="readonly" :disabled="inputDisabled" :issues="state.issues" />
        <div class="flex flex-wrap gap-3"><UButton v-if="state.form.status === 'published' && !controller.expired && !state.knownSubmitted" type="submit" :loading="operation.state.value.loading && operation.operation.value?.activePolicy?.startsWith('response-')" :disabled="!canSubmit">提交表單</UButton><UButton color="neutral" variant="outline" :loading="state.latestLoading" :disabled="!canLatest" @click="latest">查看我的填答</UButton></div>
      </UForm>
      <NuxtLink v-if="state.form.status === 'closed' && ((controller.owner && !management.controller.denied) || state.form.resultVisibility !== 'owner_only')" :to="`/forms/${state.form.id}/statistics`" class="inline-block text-blue-700 underline">查看統計</NuxtLink>
    </template>
    <FormsFormManagement v-if="state.form || management.state.error" :manager="management" show-visibility />
    <FeedbackActionErrorDialog v-if="state.error" :key="state.errorRevision" :open="true" :presentation="state.error" managed-focus @close="closeError" />
    <FormsFormSubmitSuccessDialog v-if="state.success" @close="closeSuccess" />
  </section>
</template>
