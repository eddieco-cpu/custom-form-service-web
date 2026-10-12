<script setup lang="ts">
const props = defineProps<{ url?: string | null }>()
const failed = ref(false)
watch(() => props.url, () => { failed.value = false })
</script>
<template>
  <span class="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-gray-600">
    <img v-if="url && !failed" :src="url" alt="使用者頭像" class="size-full object-cover" @error="failed = true">
    <UIcon v-else name="i-lucide-user-round" class="size-5" aria-label="預設頭像" />
  </span>
</template>
