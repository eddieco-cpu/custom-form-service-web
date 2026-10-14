<script setup lang="ts">
import type { FormDetailDto } from '../../domain/api/form'
import { statusLabels, modeLabels, identityLabels, visibilityLabels } from '../../domain/form-read'
import { formatTaipei, parseInstant } from '../../utils/datetime'
const props = defineProps<{ form: FormDetailDto; owner: boolean }>()
const now = ref(BigInt(Date.now()) * 10000n)
// Only the local deadline hint updates; this never polls the API or alters status.
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => { now.value = BigInt(Date.now()) * 10000n }, 1000) })
onUnmounted(() => clearInterval(timer))
const expired = computed(() => props.form.status === 'published' && props.form.submissionDeadlineAt !== null && now.value >= parseInstant(props.form.submissionDeadlineAt).ticks)
</script>
<template>
  <UCard>
    <div class="space-y-4 [overflow-wrap:anywhere]">
      <h2 class="whitespace-pre-wrap text-xl font-semibold">{{ form.title }}</h2>
      <p class="whitespace-pre-wrap text-sm text-gray-600">建立者：{{ form.creatorDisplayName }}</p>
      <p v-if="form.description !== null && form.description !== ''" class="whitespace-pre-wrap">{{ form.description }}</p>
      <div class="flex flex-wrap gap-2"><UBadge color="neutral" variant="subtle">{{ statusLabels[form.status] }}</UBadge><UBadge v-if="expired" color="warning" variant="subtle">已截止</UBadge></div>
      <dl class="grid gap-3 sm:grid-cols-2">
        <div><dt class="text-sm text-gray-600">填答模式</dt><dd>{{ modeLabels[form.responseMode] }}</dd></div>
        <div><dt class="text-sm text-gray-600">填答身分</dt><dd>{{ identityLabels[form.responseIdentity] }}</dd></div>
        <div><dt class="text-sm text-gray-600">結果可見性</dt><dd>{{ visibilityLabels[form.resultVisibility] }}</dd></div>
        <div><dt class="text-sm text-gray-600">截止時間</dt><dd>{{ form.submissionDeadlineAt === null ? '未設定' : formatTaipei(form.submissionDeadlineAt) }}</dd></div>
      </dl>
      <p class="text-sm text-gray-600">時間以台北時區顯示。表單定義唯讀；結果可見範圍可由建立者調整。</p>
      <dl v-if="owner" class="space-y-2 border-t border-gray-200 pt-4 text-sm text-gray-600" aria-label="表單次要資訊">
        <div><dt>表單 ID</dt><dd>{{ form.id }}</dd></div>
        <div><dt>建立時間</dt><dd>{{ formatTaipei(form.createdAt) }}</dd></div>
        <div><dt>更新時間</dt><dd>{{ formatTaipei(form.updatedAt) }}</dd></div>
      </dl>
    </div>
  </UCard>
</template>
