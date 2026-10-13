<script setup lang="ts">
import { ratingInput } from '../../domain/rating-input'
const props = defineProps<{ min: number; max: number; required?: boolean; readonly?: boolean; disabled?: boolean; id: string; label: string }>()
const value = defineModel<number | undefined>()
function score(score: number) { value.value = ratingInput(value.value, { kind: 'score', score }, props.min, props.max, props.required, props.readonly || props.disabled) }
</script>
<template>
  <div class="space-y-3">
    <p aria-live="polite">{{ value === undefined ? '尚未作答' : `${value} 分` }}</p>
    <div v-if="!readonly && min === 0" class="flex gap-2"><input :id="`${id}-zero`" type="radio" :name="id" :checked="value === 0" :disabled="disabled" @change="score(0)"><label :for="`${id}-zero`">0 分</label></div>
    <div class="grid max-w-100 grid-cols-10 gap-1" :role="readonly ? undefined : 'radiogroup'" :aria-label="label">
      <template v-for="n in max" :key="n">
        <span v-if="readonly" :class="value !== undefined && n <= value ? 'text-amber-500' : 'text-gray-300'" class="text-center text-xl">★</span>
        <button v-else type="button" role="radio" :aria-label="`${n} 分`" :aria-checked="value === n" :disabled="disabled || n < min" :class="[value !== undefined && n <= value ? 'text-amber-500' : 'text-gray-400', n < min ? 'opacity-50' : '']" class="aspect-square rounded text-xl focus-visible:ring-2 focus-visible:ring-blue-500" @click="score(n)">★</button>
      </template>
    </div>
    <UButton v-if="!readonly && !required" color="neutral" variant="outline" :disabled="disabled || value === undefined" @click="value = ratingInput(value, { kind: 'clear' }, min, max)">清除答案</UButton>
  </div>
</template>
