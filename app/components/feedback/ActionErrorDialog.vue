<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ErrorPresentation } from '../../domain/error-presentation'
const props = defineProps<{ open: boolean; presentation: ErrorPresentation; managedFocus?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const closed = ref(false)
watch(() => props.open, value => { if (value) closed.value = false })
function close() { if (!closed.value) { closed.value = true; emit('close') } }
function closeAutoFocus(event: Event) { if (props.managedFocus) event.preventDefault() }
</script>

<template>
  <UModal :open="open" :dismissible="false" :content="{ onCloseAutoFocus: closeAutoFocus }" title="操作訊息" :description="presentation.message" @update:open="value => { if (!value) close() }">
    <template #body>
      <ul v-if="presentation.details.length" class="space-y-2 break-words">
        <li v-for="(detail, index) in presentation.details" :key="index">{{ detail.path }}：{{ detail.message }}</li>
      </ul>
    </template>
    <template #footer><UButton @click="close">關閉</UButton></template>
  </UModal>
</template>
