<script setup lang="ts">
import type { StatisticsItemView } from '../../domain/statistics-view'
defineProps<{ item: StatisticsItemView }>()
</script>
<template>
  <li data-statistics-item class="space-y-2 rounded-md bg-gray-50 p-3">
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <p data-statistics-value class="min-w-0 flex-1 whitespace-pre-wrap">{{ item.label }}</p>
      <span data-statistics-item-count class="shrink-0 text-sm text-gray-600">{{ item.count }} 人</span>
    </div>
    <div v-if="item.respondents !== undefined" data-statistics-respondents>
      <p class="text-sm text-gray-600">填答者</p>
      <ul class="space-y-1"><li v-for="respondent in item.respondents" :key="respondent.id" data-statistics-respondent class="whitespace-pre-wrap">{{ respondent.displayName }}</li></ul>
    </div>
  </li>
</template>
