<script setup lang="ts">
import type { FormSummaryDto } from '../../domain/api/form'
import { statusLabels, modeLabels, identityLabels, visibilityLabels, summaryLocation } from '../../domain/form-read'
import { formatTaipei } from '../../utils/datetime'
defineProps<{ items: readonly FormSummaryDto[] }>()
</script>
<template>
  <table class="hidden w-full table-fixed text-left md:table" aria-label="我的表單清單">
    <thead><tr class="border-b border-gray-300 text-sm text-gray-600"><th class="w-1/4 p-3">標題／狀態</th><th class="w-1/4 p-3">填答設定／人數</th><th class="w-1/4 p-3">結果範圍／截止時間</th><th class="w-1/4 p-3">建立／更新時間</th></tr></thead>
    <tbody><tr v-for="item in items" :key="item.id" class="border-b border-gray-200 align-top [overflow-wrap:anywhere]">
      <td class="space-y-2 p-3"><NuxtLink :to="summaryLocation(item.id, item.status)" class="whitespace-pre-wrap text-blue-700 underline">{{ item.title }}</NuxtLink><div><UBadge color="neutral" variant="subtle">{{ statusLabels[item.status] }}</UBadge></div></td>
      <td class="space-y-1 p-3"><p>{{ modeLabels[item.responseMode] }} · {{ identityLabels[item.responseIdentity] }}</p><p>不同填答者：{{ item.count }} 人</p></td>
      <td class="space-y-1 p-3"><p>{{ visibilityLabels[item.resultVisibility] }}</p><p>截止：{{ item.submissionDeadlineAt === null ? '未設定' : formatTaipei(item.submissionDeadlineAt) }}</p></td>
      <td class="space-y-1 p-3 text-sm"><p>建立：{{ formatTaipei(item.createdAt) }}</p><p>更新：{{ formatTaipei(item.updatedAt) }}</p></td>
    </tr></tbody>
  </table>
  <ul class="space-y-4 md:hidden" aria-label="我的表單卡片">
    <li v-for="item in items" :key="item.id">
      <UCard class="[overflow-wrap:anywhere]">
        <NuxtLink :to="summaryLocation(item.id, item.status)" class="whitespace-pre-wrap font-medium text-blue-700 underline">{{ item.title }}</NuxtLink>
        <div class="my-3"><UBadge color="neutral" variant="subtle">{{ statusLabels[item.status] }}</UBadge></div>
        <dl class="space-y-2 text-sm">
          <div><dt class="text-gray-600">填答模式／身分</dt><dd>{{ modeLabels[item.responseMode] }} · {{ identityLabels[item.responseIdentity] }}</dd></div>
          <div><dt class="text-gray-600">不同填答者人數</dt><dd>{{ item.count }} 人</dd></div>
          <div><dt class="text-gray-600">結果可見性</dt><dd>{{ visibilityLabels[item.resultVisibility] }}</dd></div>
          <div><dt class="text-gray-600">截止時間</dt><dd>{{ item.submissionDeadlineAt === null ? '未設定' : formatTaipei(item.submissionDeadlineAt) }}</dd></div>
          <div><dt class="text-gray-600">建立時間</dt><dd>{{ formatTaipei(item.createdAt) }}</dd></div>
          <div><dt class="text-gray-600">更新時間</dt><dd>{{ formatTaipei(item.updatedAt) }}</dd></div>
        </dl>
      </UCard>
    </li>
  </ul>
</template>
