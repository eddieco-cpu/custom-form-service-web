<script setup lang="ts">
withDefaults(defineProps<{ name: string; label: string; disabled?: boolean; multiline?: boolean; numeric?: boolean; placeholder?: string; rows?: number; hideLabel?: boolean }>(), { rows: 3, placeholder: undefined })
const value = defineModel<string>({ required: true })
</script>
<template>
  <UFormField v-slot="{ error }" :name="name" :error="false">
    <label :for="name" :class="hideLabel ? 'sr-only' : 'mb-1 block text-sm font-medium'">{{ label }}</label>
    <textarea v-if="multiline" :id="name" v-model="value" :data-editor-field="name" :readonly="disabled" :aria-disabled="disabled" :aria-invalid="!!error" :aria-describedby="error ? `${name}-error` : undefined" :rows="rows" class="editor-control resize-y" :placeholder="placeholder" />
    <input v-else :id="name" v-model="value" :data-editor-field="name" :readonly="disabled" :aria-disabled="disabled" :aria-invalid="!!error" :aria-describedby="error ? `${name}-error` : undefined" type="text" :inputmode="numeric ? 'decimal' : undefined" class="editor-control" :placeholder="placeholder">
    <p v-if="error" :id="`${name}-error`" class="mt-1 text-sm text-red-700">{{ error }}</p>
  </UFormField>
</template>
