<script setup lang="ts">
const config = useRuntimeConfig()
</script>

<template>
  <section class="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
    <div class="space-y-2">
      <p class="text-sm text-gray-500">V1 Frontend · F1</p>
      <h1 class="text-2xl font-semibold text-gray-900">工程環境已就緒</h1>
      <p class="text-gray-600">帳號與表單功能將於後續輪次提供。</p>
    </div>
    <dl class="space-y-1 text-sm">
      <dt class="text-gray-500">公開 API Base URL</dt>
      <dd data-testid="api-base-url" class="break-all font-mono text-gray-700">{{ config.public.apiBaseUrl }}</dd>
    </dl>
    <FeedbackFoundationFeedback />
  </section>
</template>
