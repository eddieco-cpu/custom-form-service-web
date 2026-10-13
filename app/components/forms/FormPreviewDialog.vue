<script setup lang="ts">
import { answerDefinition, emptyAnswers } from '../../domain/answer'
import { editorSnapshot } from '../../domain/editor'
import type { EditorDefinition } from '../../domain/models'
const props = defineProps<{ definition: EditorDefinition }>()
const emit = defineEmits<{ close: [] }>()
const snapshot = editorSnapshot(props.definition)
const projection = answerDefinition(snapshot)
const answers = reactive(emptyAnswers(projection).model)
const body = useTemplateRef('body')
onMounted(() => { if (body.value) body.value.scrollTop = 0 })
</script>
<template>
  <UModal :open="true" title="預覽" description="試填內容僅供本次預覽，不會保存。" :content="{ onEscapeKeyDown: (event: Event) => event.preventDefault() }" :ui="{ content: 'preview-dialog', body: 'min-h-0 flex-1 overflow-y-auto', header: 'shrink-0', footer: 'shrink-0' }" @update:open="value => { if (!value) emit('close') }">
    <template #body>
      <div ref="body" class="space-y-5" data-preview-body>
        <h2 class="whitespace-pre-wrap break-words text-xl font-semibold">{{ snapshot.title || '（暫無內容）' }}</h2>
        <p class="break-words">建立者：{{ snapshot.metadata.creatorDisplayName }}</p>
        <p v-if="snapshot.description" class="whitespace-pre-wrap break-words">{{ snapshot.description }}</p>
        <p class="text-sm text-gray-600">{{ snapshot.responseMode === 'single' ? '每人一次' : '可多次填答' }} · {{ snapshot.responseIdentity === 'anonymous' ? '匿名' : '具名' }} · 截止時間：{{ snapshot.deadlineInput || '未設定' }}（台北）</p>
        <p class="text-sm text-gray-600">結果可見範圍：{{ snapshot.resultVisibility ? ({ owner_only: '建立者', respondents: '填答者', public: '所有人' })[snapshot.resultVisibility] : '尚未選擇' }}</p>
        <p v-if="!projection.questions.length">尚未設定題目</p>
        <FormsFormRenderer :definition="projection" :model="answers" preview />
      </div>
    </template>
    <template #footer><UButton @click="emit('close')">關閉預覽</UButton></template>
  </UModal>
</template>
