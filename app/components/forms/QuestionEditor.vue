<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { EditorQuestion } from '../../domain/models'
import type { QuestionType } from '../../domain/api/form'
import { effectiveVariant, isChoice } from '../../domain/editor'
defineProps<{ index: number; total: number; disabled: boolean }>()
const question = defineModel<EditorQuestion>('question', { required: true })
const emit = defineEmits<{ type: [value: QuestionType]; variant: [value: string]; move: [direction: number]; remove: []; addOption: []; removeOption: [key: string]; moveOption: [key: string, direction: number]; orderOptions: [keys: string[]] }>()
const types = { text: '文字', number: '數字', single_choice: '單選', multiple_choice: '多選', rating: '評分' }
const variants = computed(() => ({ text: ['input', 'textarea'], number: [], single_choice: ['radio', 'select'], multiple_choice: ['checkbox', 'multi_select'], rating: ['stars', 'range'] })[question.value.type])
const config = computed(() => question.value.config as Record<string, string | undefined>)
const numericFields = computed(() => question.value.type === 'text' ? ['minLength', 'maxLength'] : ['number', 'rating'].includes(question.value.type) ? ['min', 'max'] : [])
const fieldLabels: Record<string, string> = { minLength: '最小長度', maxLength: '最大長度', min: '最小值', max: '最大值' }
const variantLabels: Record<string, string> = { input: '短文字', textarea: '長文字', radio: '單選按鈕', select: '下拉選單', checkbox: '核取方塊', multi_select: '多選選單', stars: '星級', range: '滑桿' }
const orderedOptions = computed({ get: () => [...question.value.options], set: values => emit('orderOptions', values.map(o => o.key)) })
function typeChange(event: Event) { const select = event.target as HTMLSelectElement; const value = select.value as QuestionType; select.value = question.value.type; emit('type', value) }
</script>
<template>
  <article class="space-y-4 rounded-xl border border-gray-200 bg-white p-4" :data-question-key="question.key">
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="question-handle touch-none p-2" :disabled="disabled" :aria-label="`拖曳題目 ${index + 1}`">⠿</button>
      <h2 class="font-semibold">題目 {{ index + 1 }}</h2>
      <label class="sr-only" :for="`${question.key}.type`">題型 {{ index + 1 }}</label>
      <select :id="`${question.key}.type`" :value="question.type" :disabled="disabled" class="editor-control w-auto!" :data-editor-field="`${question.key}.type`" @change="typeChange"><option v-for="(label, type) in types" :key="type" :value="type">{{ label }}</option></select>
      <UButton color="neutral" variant="outline" :disabled="disabled || index === 0" :aria-label="`題目 ${index + 1} 上移`" @click="emit('move', -1)">↑</UButton>
      <UButton color="neutral" variant="outline" :disabled="disabled || index === total - 1" :aria-label="`題目 ${index + 1} 下移`" @click="emit('move', 1)">↓</UButton>
      <UButton color="error" variant="ghost" :disabled="disabled" :aria-label="`刪除題目 ${index + 1}`" @click="emit('remove')">刪題</UButton>
    </div>
    <FormsEditorField v-model="question.title" :name="`${question.key}.title`" :label="`題目 ${index + 1} 標題`" :disabled="disabled" />
    <FormsEditorField v-model="question.description" :name="`${question.key}.description`" :label="`題目 ${index + 1} 說明`" multiline :disabled="disabled" />
    <label class="flex items-center gap-2"><input v-model="question.required" type="checkbox" :disabled="disabled" :data-editor-field="`${question.key}.required`">必填</label>
    <div v-if="variants.length" class="space-y-1"><label :for="`${question.key}.config.variant`">呈現方式</label><select :id="`${question.key}.config.variant`" :data-editor-field="`${question.key}.config.variant`" :value="effectiveVariant(question)" :disabled="disabled" class="editor-control" @change="emit('variant', ($event.target as HTMLSelectElement).value)"><option v-for="variant in variants" :key="variant" :value="variant">{{ variantLabels[variant] }}</option></select></div>
    <FormsEditorField v-if="['text', 'number'].includes(question.type)" :model-value="config.placeholder ?? ''" :name="`${question.key}.config.placeholder`" label="輸入提示（未設定可留空）" :disabled="disabled" @update:model-value="config.placeholder = $event" />
    <div class="grid gap-4 sm:grid-cols-2"><FormsEditorField v-for="field in numericFields" :key="field" :model-value="config[field] ?? ''" :name="`${question.key}.config.${field}`" :label="`${fieldLabels[field]}（未設定可留空）`" numeric :disabled="disabled" @update:model-value="config[field] = $event" /></div>
    <template v-if="isChoice(question.type)">
      <VueDraggable v-model="orderedOptions" handle=".option-handle" :disabled="disabled" :animation="150" class="space-y-3">
        <div v-for="(option, oi) in orderedOptions" :key="option.key" class="flex min-w-0 flex-wrap items-end gap-2" :data-option-key="option.key">
          <button type="button" class="option-handle touch-none p-2" :disabled="disabled" :aria-label="`拖曳選項 ${oi + 1}`">⠿</button>
          <FormsEditorField v-model="option.label" class="min-w-0 flex-1 basis-40" :name="`${option.key}.label`" :label="`選項 ${oi + 1}`" :disabled="disabled" />
          <UButton color="neutral" variant="outline" :disabled="disabled || oi === 0" :aria-label="`選項 ${oi + 1} 上移`" @click="emit('moveOption', option.key, -1)">↑</UButton>
          <UButton color="neutral" variant="outline" :disabled="disabled || oi === orderedOptions.length - 1" :aria-label="`選項 ${oi + 1} 下移`" @click="emit('moveOption', option.key, 1)">↓</UButton>
          <UButton color="error" variant="ghost" :disabled="disabled" :aria-label="`刪除選項 ${oi + 1}`" @click="emit('removeOption', option.key)">刪除</UButton>
        </div>
      </VueDraggable>
      <UButton color="neutral" variant="outline" :disabled="disabled" @click="emit('addOption')">增加選項</UButton>
    </template>
  </article>
</template>
