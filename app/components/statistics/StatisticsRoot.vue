<script setup lang="ts">
import type { StatisticsView } from '../../domain/statistics-view'
defineProps<{ view: StatisticsView }>()
</script>
<template>
  <section class="space-y-4 rounded-lg border border-gray-200 bg-white p-4" aria-label="統計根資訊">
    <h2 class="text-xl font-semibold whitespace-pre-wrap">{{ view.title }}</h2>
    <p v-if="view.description !== null" class="whitespace-pre-wrap">{{ view.description }}</p>
    <p class="whitespace-pre-wrap">建立者：{{ view.creatorDisplayName }}</p>
    <dl class="grid gap-3 sm:grid-cols-2">
      <div><dt class="text-sm text-gray-600">不同填答者人數</dt><dd data-statistics-count class="text-xl font-semibold">{{ view.count }} 人</dd></div>
      <div><dt class="text-sm text-gray-600">填答模式</dt><dd>{{ view.mode }}</dd></div>
      <div><dt class="text-sm text-gray-600">結果範圍</dt><dd>{{ view.visibility }}</dd></div>
      <div><dt class="text-sm text-gray-600">表定截止時間（台北時間）</dt><dd>{{ view.deadline }}</dd></div>
    </dl>
    <p v-if="view.count === 0">尚無填答</p>
  </section>
</template>
