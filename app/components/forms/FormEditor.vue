<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { Form, FormError } from '@nuxt/ui'
import type { EditorDefinition } from '../../domain/models'
import type { QuestionType } from '../../domain/api/form'
import { addQuestion, removeQuestion, addOption, removeOption, reorderQuestions, reorderOptions, changeQuestionType, changeVariant } from '../../domain/editor'
import { validateDraft } from '../../domain/definition-validation'
import { formatTaipei } from '../../utils/datetime'
import { stringifyExactJson } from '../../utils/exact-json'
import { statusLabels } from '../../domain/form-read'
const props = defineProps<{ mode: 'new' | 'edit' }>()
const { state, controller, management, dirty, operation, auth, id, inputDisabled, canWrite } = useFormEditor(props.mode)
const definition = computed(() => state.session?.definition)
const form = useTemplateRef<Form<EditorDefinition>>('form')
const managementView = useTemplateRef<{ begin: (command: 'publish') => void }>('managementView')
// Vue unwraps exposed refs on component instances; unref supports both runtime and public Form types.
const errors = computed(() => unref(form.value?.errors) ?? [])
const preview = ref(false), previewRun = ref(0)
const pendingType = ref<{ key: string; type: QuestionType }>()
const announce = ref('')
const toast = useToast()
const focus = useDialogFocus(() => document.querySelector<HTMLElement>('main h1'))
const visibilityLabels = { owner_only: '建立者', respondents: '填答者', public: '所有人' }
function validation(): FormError[] {
  if (!state.session) return []
  const result = validateDraft(state.session.definition, state.session.baseline)
  return result.kind === 'invalid' ? result.issues.map(i => ({ name: `${i.targetKey}.${i.field}`, message: i.message })) : []
}
function focusField(name?: string) {
  if (!name) return
  const target = [...document.querySelectorAll<HTMLElement>('[data-editor-field]')].find(el => el.dataset.editorField === name && !el.matches(':disabled'))
  target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'center' })
}
watch(() => state.issues, async issues => { await nextTick(); form.value?.setErrors(issues.map(i => ({ name: `${i.targetKey}.${i.field}`, message: i.message }))) })
async function save() { focus.capture(); await controller.save() }
async function closeError() { await controller.closeError(); await focus.restore(); const issue = state.issues[0]; if (issue) focusField(`${issue.targetKey}.${issue.field}`) }
function change(update: (d: EditorDefinition) => EditorDefinition) { if (definition.value) controller.update(update(definition.value)) }
function type(key: string, target: QuestionType, confirmed = false) {
  if (!definition.value || inputDisabled.value) return
  const result = changeQuestionType(definition.value, key, target, confirmed)
  if (result.kind === 'confirmation-required') { focus.capture(); pendingType.value = { key, type: target } }
  else if (result.kind === 'changed') controller.update(result.definition)
}
async function confirmType(yes: boolean) {
  const pending = pendingType.value; pendingType.value = undefined
  if (yes && pending) type(pending.key, pending.type, true)
  await focus.restore()
}
const questions = computed({ get: () => [...(definition.value?.questions ?? [])], set: q => change(d => reorderQuestions(d, q.map(q => q.key))) })
async function move(key: string, direction: number, optionKey?: string) {
  if (!definition.value || inputDisabled.value) return
  const items = optionKey ? definition.value.questions.find(q => q.key === key)!.options : definition.value.questions
  const keys = items.map(i => i.key), index = keys.indexOf(optionKey ?? key), target = index + direction
  if (target < 0 || target >= keys.length) return
  ;[keys[index], keys[target]] = [keys[target]!, keys[index]!]
  const active = document.activeElement as HTMLElement | null, label = active?.getAttribute('aria-label')
  change(d => optionKey ? reorderOptions(d, key, keys) : reorderQuestions(d, keys))
  announce.value = `${optionKey ? '選項' : '題目'}已移至第 ${target + 1} 位`
  await nextTick()
  const card = document.querySelector<HTMLElement>(`[${optionKey ? 'data-option-key' : 'data-question-key'}="${optionKey ?? key}"]`)
  const buttons = [...(card?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
  const button = buttons.find(b => b.textContent === active?.textContent && !b.disabled)
    ?? buttons.find(b => ['↑', '↓'].includes(b.textContent ?? '') && !b.disabled)
    ?? buttons.find(b => !b.disabled)
  if (label && button) button.focus()
}
function openPreview() { focus.capture(); previewRun.value++; preview.value = true }
async function closePreview() { preview.value = false; await focus.restore() }
async function copy() {
  if (!definition.value) return
  const d = definition.value
  try { await navigator.clipboard.writeText(stringifyExactJson({ title: d.title, description: d.description, responseMode: d.responseMode, responseIdentity: d.responseIdentity, resultVisibility: d.resultVisibility, deadlineInput: d.deadlineInput, questions: d.questions })); toast.add({ title: '已複製本地內容' }) }
  catch { toast.add({ title: '無法自動複製，請選取欄位內容複製。', color: 'warning' }) }
}
async function reload() { focus.capture(); if (id.value) await management.reload() }
</script>
<template>
  <section class="mx-auto max-w-240 space-y-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold" tabindex="-1">{{ mode === 'new' && !id ? '建立表單' : '編輯表單' }} <span v-if="definition || mode === 'new'" class="text-sm font-normal">{{ definition && 'status' in definition.metadata ? statusLabels[definition.metadata.status] : '草稿' }}</span></h1>
      <div v-if="definition" class="flex flex-wrap gap-2"><UButton color="neutral" variant="outline" @click="openPreview">預覽</UButton><UButton v-if="id" color="neutral" variant="outline" :disabled="state.checking || operation.state.value.loading" @click="reload">重新載入表單</UButton></div>
    </div>
    <AuthGate v-if="!definition && (auth.state.value.outcome === 'unknown' || auth.state.value.phase !== 'settled' || (mode === 'new' && auth.state.value.outcome === 'disabled'))" />
    <p v-if="state.checking" role="status">正在核對資料…</p>
    <div v-else-if="mode === 'edit' && !definition && !state.readError && auth.state.value.outcome === 'authenticated'" class="space-y-2"><p role="status">尚未取得表單現況；請於操作結束後重新載入。</p><UButton color="neutral" variant="outline" :disabled="operation.state.value.loading" @click="controller.load(String($route.params.formId), true)">重新載入表單現況</UButton></div>
    <FeedbackReadError v-if="state.readError" :presentation="state.readError" :retrying="state.checking" @retry="controller.load(String($route.params.formId))" />
    <template v-if="definition">
      <p class="break-words">建立者：{{ definition.metadata.creatorDisplayName }}</p>
      <p role="status">{{ !id ? '尚未保存' : dirty.dirty.value ? '有未保存變更' : '已保存' }}</p>
      <div v-if="!canWrite" class="space-y-3 rounded-lg border border-amber-300 p-4" role="status"><p>本地內容已保留供查看或複製；目前不能保存。恢復保存前，請重新核對登入身分與表單權限。</p><UButton color="neutral" variant="outline" :disabled="state.checking || management.busy.value" @click="management.verify()">核對登入與保存資格</UButton><UButton color="neutral" variant="outline" @click="copy">複製本地內容</UButton></div>
      <div v-if="operation.state.value.needsReconciliation && operation.state.value.phase === 'unknown'" class="space-y-2 rounded-lg border border-amber-300 p-4" role="alert"><p>{{ id ? '保存結果不明，請重新載入並核對目前表單後再保存。' : '建立結果不明。請至我的表單核對；再次保存可能建立重複表單。' }}</p><UButton v-if="!id" to="/forms" color="neutral" variant="outline">前往我的表單核對</UButton></div>
      <details v-if="'id' in definition.metadata" class="break-words text-sm text-gray-600"><summary>表單次要資訊</summary><p>UUID：{{ definition.metadata.id }}</p><p>建立：{{ formatTaipei(definition.metadata.createdAt) }}</p><p>更新：{{ formatTaipei(definition.metadata.updatedAt) }}</p></details>
      <UForm ref="form" :state="definition" :validate="validation" class="space-y-5" @submit="save" @error="event => focusField(event.errors[0]?.name)">
        <FormsEditorField v-model="definition.title" name="form.title" label="表單標題" :disabled="inputDisabled" />
        <FormsEditorField v-model="definition.description" name="form.description" label="表單說明" multiline :disabled="inputDisabled" />
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField name="form.responseMode"><label for="response-mode" class="mb-1 block">填答次數</label><select id="response-mode" v-model="definition.responseMode" class="editor-control" :disabled="inputDisabled" data-editor-field="form.responseMode"><option value="single">每人一次</option><option value="multiple">可多次填答</option></select></UFormField>
          <UFormField name="form.responseIdentity"><label for="response-identity" class="mb-1 block">填答身分</label><select id="response-identity" v-model="definition.responseIdentity" class="editor-control" :disabled="inputDisabled" data-editor-field="form.responseIdentity"><option value="anonymous">匿名</option><option value="identified">具名</option></select></UFormField>
          <FormsEditorField v-model="definition.deadlineInput" name="form.submissionDeadlineAt" label="截止日期時間（台北；未設定可留空）" placeholder="YYYY-MM-DD HH:mm:ss" :disabled="inputDisabled" />
          <UFormField v-if="!id" name="form.resultVisibility"><label for="visibility" class="mb-1 block">結果可見範圍（必選）</label><select id="visibility" v-model="definition.resultVisibility" class="editor-control" :disabled="inputDisabled" data-editor-field="form.resultVisibility"><option :value="undefined">請選擇</option><option v-for="(label, value) in visibilityLabels" :key="value" :value="value">{{ label }}</option></select></UFormField>
          <FormsResultVisibilityControl v-else :value="management.state.selected ?? definition.resultVisibility" :disabled="!management.controller.canManage || management.busy.value || management.visibilityState.value.blocked" :pending="management.pendingPolicy.value === 'visibility'" :unknown="management.visibilityState.value.needsReconciliation" @change="management.controller.visibility($event)" />
        </div>
        <ul v-if="errors.length" class="space-y-1 rounded-lg border border-red-300 p-3" aria-label="欄位錯誤摘要"><li v-for="(error, index) in errors" :key="index"><button type="button" class="text-left text-red-700 underline" @click="focusField(error.name)">{{ error.message }}</button></li></ul>
        <p class="sr-only" aria-live="polite">{{ announce }}</p>
        <VueDraggable v-model="questions" handle=".question-handle" :disabled="inputDisabled" :animation="150" class="space-y-5">
          <FormsQuestionEditor v-for="(q, index) in questions" :key="q.key" :question="q" :index="index" :total="questions.length" :disabled="inputDisabled" @type="type(q.key, $event)" @variant="change(d => changeVariant(d, q.key, $event))" @move="move(q.key, $event)" @remove="change(d => removeQuestion(d, q.key))" @add-option="change(d => addOption(d, q.key))" @remove-option="change(d => removeOption(d, q.key, $event))" @move-option="(key, direction) => move(q.key, direction, key)" @order-options="change(d => reorderOptions(d, q.key, $event))" />
        </VueDraggable>
        <UButton type="button" color="neutral" variant="outline" :disabled="inputDisabled" @click="change(d => addQuestion(d))">新增題目</UButton>
      </UForm>
      <FormsFormManagement v-if="id" ref="managementView" :manager="management" hide-publish @closed="focusField(state.issues[0] ? `${state.issues[0].targetKey}.${state.issues[0].field}` : undefined)" />
      <div class="editor-save-bar fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:p-0"><div class="flex gap-3"><UButton class="flex-1 justify-center md:flex-none" :disabled="inputDisabled || operation.state.value.blocked || (!!id && !dirty.dirty.value)" :loading="operation.state.value.loading" @click="form?.submit()">{{ id ? '保存' : '保存草稿' }}</UButton><UButton v-if="id" :disabled="!management.controller.allowed('publish')" @click="managementView?.begin('publish')">發布</UButton></div><p v-if="id && controller.dirty" class="mt-1 text-sm text-gray-600">請先保存後再發布。</p></div>
    </template>
    <FeedbackActionErrorDialog v-if="state.error" :open="true" :presentation="state.error" managed-focus @close="closeError" />
    <UModal v-if="pendingType" :open="true" :dismissible="false" title="切換題型" description="切換後會移除所有選項，是否繼續？" :content="{ onCloseAutoFocus: (event: Event) => event.preventDefault() }" @update:open="value => { if (!value) confirmType(false) }"><template #footer><UButton color="neutral" variant="outline" @click="confirmType(false)">取消</UButton><UButton color="error" @click="confirmType(true)">確認切換</UButton></template></UModal>
    <FormsFormPreviewDialog v-if="preview && definition" :key="previewRun" :definition="definition" @close="closePreview" />
  </section>
</template>
