<script setup lang="ts">
import type { AnswerDefinition, AnswerModel, AnswerInput } from '../../domain/answer'
import { numberAnswer } from '../../domain/answer'
import { validateConfig } from '../../domain/definition-validation'
import type { ConfigByType } from '../../domain/api/form'
import type { FieldIssue } from '../../domain/models'
import { trimWhiteSpace } from '../../utils/unicode'
const props = defineProps<{ definition: AnswerDefinition; readonly?: boolean; disabled?: boolean; preview?: boolean; issues?: readonly FieldIssue[] }>()
const root = useTemplateRef('root')
const model = defineModel<AnswerModel>('model', { required: true })
const rendererId = useId()
function inputId(key: string) { return `${rendererId}-answer-${key}` }
function update(key: string, input: AnswerInput) { if (!props.readonly && !props.disabled) model.value.values[key] = input }
function text(key: string) { const a = model.value.values[key]; return a?.type === 'text' || a?.type === 'number' ? a.raw : '' }
function choice(key: string) { const a = model.value.values[key]; return a?.type === 'single_choice' ? a.optionKey : undefined }
function choices(key: string) { const a = model.value.values[key]; return a?.type === 'multiple_choice' ? a.optionKeys : [] }
function rating(key: string) { const a = model.value.values[key]; return a?.type === 'rating' ? a.value : undefined }
function bounds(q: AnswerDefinition['questions'][number]) { const c = validateConfig(q.type, q.config, q.key); return c.kind === 'valid' ? c.candidate as ConfigByType['rating'] : {} }
function toggle(key: string, option: string, checked: boolean) { update(key, { type: 'multiple_choice', optionKeys: checked ? [...choices(key), option] : choices(key).filter(o => o !== option) }) }
function focusIssue(key: string) {
  const article = root.value?.querySelector<HTMLElement>(`[data-renderer-key="${CSS.escape(key)}"]`)
  if (!article) return
  const control = article.querySelector<HTMLElement>('input:not([disabled]),textarea:not([disabled]),select:not([disabled]),button:not([disabled])') ?? article
  article.scrollIntoView({ block: 'center' }); control.focus({ preventScroll: true })
}
defineExpose({ focusIssue })
</script>
<template>
  <div ref="root" class="space-y-5">
    <article v-for="(q, index) in definition.questions" :key="q.key" tabindex="-1" class="min-w-0 space-y-3 rounded-lg border border-gray-200 p-4" :data-renderer-key="q.key" :aria-invalid="issues?.some(i => i.targetKey === q.key) ? 'true' : undefined" :aria-describedby="issues?.some(i => i.targetKey === q.key) ? `${inputId(q.key)}-errors` : undefined">
      <h3 class="whitespace-pre-wrap break-words font-semibold">{{ index + 1 }}. {{ q.title || (preview ? '（暫無內容）' : '') }} <span v-if="q.required" class="text-sm text-red-700">必填</span></h3>
      <p v-if="q.description" class="whitespace-pre-wrap break-words text-sm text-gray-600">{{ q.description }}</p>
      <ul v-if="issues?.some(i => i.targetKey === q.key)" :id="`${inputId(q.key)}-errors`" class="space-y-1 text-sm text-red-700" role="alert"><li v-for="(issue, i) in issues.filter(i => i.targetKey === q.key)" :key="i">{{ issue.message }}</li></ul>
      <template v-if="q.type === 'text' || q.type === 'number'">
        <p v-if="readonly" class="whitespace-pre-wrap break-words">{{ (q.type === 'text' ? !!trimWhiteSpace(text(q.key)) : text(q.key) !== '') ? text(q.key) : '尚未作答' }}</p>
        <template v-else>
          <label class="sr-only" :for="inputId(q.key)">{{ q.title || `題目 ${index + 1}` }}</label>
          <textarea v-if="q.type === 'text' && (('variant' in q.config ? q.config.variant : undefined)) === 'textarea'" :id="inputId(q.key)" :value="text(q.key)" :placeholder="'placeholder' in q.config ? q.config.placeholder : undefined" :disabled="disabled" class="editor-control" rows="3" @input="update(q.key, { type: 'text', raw: ($event.target as HTMLTextAreaElement).value })" />
          <input v-else :id="inputId(q.key)" :value="text(q.key)" type="text" :inputmode="q.type === 'number' ? 'decimal' : undefined" :placeholder="'placeholder' in q.config ? q.config.placeholder : undefined" :disabled="disabled" class="editor-control" @input="update(q.key, q.type === 'number' ? numberAnswer(($event.target as HTMLInputElement).value) : { type: 'text', raw: ($event.target as HTMLInputElement).value })">
        </template>
      </template>
      <template v-else-if="q.type === 'single_choice' || q.type === 'multiple_choice'">
        <p v-if="!q.options.length">尚未設定選項</p>
        <template v-else-if="readonly"><p v-if="!choice(q.key) && !choices(q.key).length">尚未作答</p><p v-for="o in q.options.filter(o => choice(q.key) === o.key || choices(q.key).includes(o.key))" :key="o.key" class="whitespace-pre-wrap break-words">{{ o.label }}</p></template>
        <select v-else-if="(('variant' in q.config ? q.config.variant : undefined)) === 'select' || (('variant' in q.config ? q.config.variant : undefined)) === 'multi_select'" :aria-label="q.title || `題目 ${index + 1}`" :multiple="q.type === 'multiple_choice'" :value="q.type === 'multiple_choice' ? choices(q.key) : choice(q.key) ?? ''" :disabled="disabled" class="editor-control" @change="update(q.key, q.type === 'single_choice' ? { type: 'single_choice', optionKey: ($event.target as HTMLSelectElement).value || undefined } : { type: 'multiple_choice', optionKeys: Array.from(($event.target as HTMLSelectElement).selectedOptions, o => o.value) })"><option v-if="q.type === 'single_choice'" value="">請選擇</option><option v-for="o in q.options" :key="o.key" :value="o.key">{{ o.label || '（暫無內容）' }}</option></select>
        <div v-else class="space-y-3"><label v-for="o in q.options" :key="o.key" class="flex items-start gap-2 whitespace-pre-wrap break-words"><input :type="q.type === 'single_choice' ? 'radio' : 'checkbox'" :name="inputId(q.key)" :value="o.key" :checked="q.type === 'single_choice' ? choice(q.key) === o.key : choices(q.key).includes(o.key)" :disabled="disabled" @change="q.type === 'single_choice' ? update(q.key, { type: 'single_choice', optionKey: o.key }) : toggle(q.key, o.key, ($event.target as HTMLInputElement).checked)"><span class="min-w-0">{{ o.label || '（暫無內容）' }}</span></label></div>
      </template>
      <template v-else-if="q.type === 'rating'">
        <p v-if="bounds(q).min === undefined || bounds(q).max === undefined">尚未設定完整評分範圍</p>
        <QuestionsRatingRange v-else-if="(('variant' in q.config ? q.config.variant : undefined)) === 'range'" :model-value="rating(q.key)" :min="bounds(q).min!" :max="bounds(q).max!" :name="q.title || `題目 ${index + 1}`" :required="q.required" :readonly="readonly" :disabled="disabled" @update:model-value="update(q.key, { type: 'rating', value: $event })" />
        <QuestionsRatingStars v-else :id="inputId(q.key)" :model-value="rating(q.key)" :min="bounds(q).min!" :max="bounds(q).max!" :label="q.title || `題目 ${index + 1}`" :required="q.required" :readonly="readonly" :disabled="disabled" @update:model-value="update(q.key, { type: 'rating', value: $event })" />
      </template>
    </article>
  </div>
</template>
