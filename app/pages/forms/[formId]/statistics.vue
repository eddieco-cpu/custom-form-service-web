<script setup lang="ts">
const route = useRoute()
const { state, loading, view, refresh, closeAuth } = useStatistics()
const formLocation = computed(() => `/forms/${encodeURIComponent(String(route.params.formId ?? ''))}`)
</script>
<template>
  <section class="mx-auto w-full max-w-[800px] space-y-5 [overflow-wrap:anywhere]">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">表單統計</h1>
      <UButton variant="outline" :loading="loading" :disabled="loading || !!state.dialog" @click="refresh">重新載入統計</UButton>
    </div>
    <p v-if="loading" role="status">統計載入中…</p>
    <FeedbackReadError v-else-if="state.error" :presentation="state.error" @retry="refresh" />
    <template v-else-if="view">
      <StatisticsRoot :view="view" />
      <StatisticsQuestion v-for="question in view.questions" :key="question.key" :question="question" />
    </template>
    <UButton :to="formLocation" variant="outline">查看表單</UButton>
    <FeedbackActionErrorDialog v-if="state.dialog" :open="true" :presentation="state.dialog" @close="closeAuth" />
  </section>
</template>
