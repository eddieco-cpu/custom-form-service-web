<script setup lang="ts">
import type { ErrorPresentation } from '../../domain/error-presentation'
defineProps<{ presentation: ErrorPresentation; retrying?: boolean }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <section role="alert" class="space-y-3 rounded-lg border border-gray-300 p-4">
    <p>{{ presentation.message }}</p>
    <ul v-if="presentation.details.length">
      <li v-for="(detail, index) in presentation.details" :key="index">{{ detail.path }}：{{ detail.message }}</li>
    </ul>
    <UButton :loading="retrying" :disabled="retrying" @click="$emit('retry')">重試</UButton>
  </section>
</template>
