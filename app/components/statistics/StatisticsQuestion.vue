<script setup lang="ts">
import type { StatisticsQuestionView } from '../../domain/statistics-view'
defineProps<{ question: StatisticsQuestionView }>()
</script>
<template>
  <section :data-statistics-question="question.key" class="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
    <p class="text-sm text-gray-600">第 {{ question.number }} 題 · {{ question.type }}</p>
    <h3 class="font-semibold whitespace-pre-wrap">{{ question.title }}</h3>
    <p v-if="question.description !== null" class="whitespace-pre-wrap">{{ question.description }}</p>
    <p data-statistics-question-count class="text-sm text-gray-600">本題填答人數：{{ question.count }} 人</p>
    <ul v-if="question.items.length" class="space-y-2"><StatisticsItem v-for="item in question.items" :key="item.key" :item="item" /></ul>
    <p v-else class="text-gray-600">尚無作答</p>
  </section>
</template>
