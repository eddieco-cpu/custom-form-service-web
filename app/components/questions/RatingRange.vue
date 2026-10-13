<script setup lang="ts">
import { ratingInput } from '../../domain/rating-input'
const props = defineProps<{ min: number; max: number; required?: boolean; readonly?: boolean; disabled?: boolean; name: string }>()
const value = defineModel<number | undefined>()
function score(event: Event) { value.value = ratingInput(value.value, { kind: 'score', score: Number((event.target as HTMLInputElement).value) }, props.min, props.max, props.required, props.readonly || props.disabled) }
function key(event: KeyboardEvent) { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) score(event) }
</script>
<template>
  <div class="space-y-3">
    <p aria-live="polite">{{ value === undefined ? '尚未作答' : `${value} 分` }}</p>
    <input v-if="!readonly" type="range" :aria-label="name" :min="min" :max="max" step="1" :value="value ?? min" :disabled="disabled" class="w-full" @input="score" @pointerup="score" @keyup="key">
    <UButton v-if="!readonly && !required" color="neutral" variant="outline" :disabled="disabled || value === undefined" @click="value = ratingInput(value, { kind: 'clear' }, min, max)">清除答案</UButton>
  </div>
</template>
