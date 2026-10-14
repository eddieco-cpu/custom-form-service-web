<script setup lang="ts">
import type { FormDetailDto } from '../../domain/api/form'
defineProps<{ form: FormDetailDto }>()
const labels = { text: '文字', number: '數字', single_choice: '單選', multiple_choice: '多選', rating: '評分' }
</script>
<template>
  <section class="space-y-4" aria-label="表單題目">
    <article v-for="(q, i) in form.questions" :key="q.id" class="space-y-3 rounded-lg border border-gray-200 p-4 [overflow-wrap:anywhere]">
      <h3 class="whitespace-pre-wrap font-semibold">{{ i + 1 }}. {{ q.title }} <span class="text-sm font-normal">（{{ labels[q.type] }}{{ q.required ? '／必填' : '' }}）</span></h3>
      <p v-if="q.description" class="whitespace-pre-wrap">{{ q.description }}</p>
      <ul v-if="q.options.length" class="list-inside list-disc"><li v-for="o in q.options" :key="o.id" class="whitespace-pre-wrap">{{ o.label }}</li></ul>
      <p v-if="'min' in q.config || 'max' in q.config" class="text-sm text-gray-600">範圍：{{ 'min' in q.config ? String(q.config.min) : '未設定' }} ～ {{ 'max' in q.config ? String(q.config.max) : '未設定' }}</p>
    </article>
  </section>
</template>
