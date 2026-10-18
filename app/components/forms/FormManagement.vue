<script setup lang="ts">
import type { useFormManagement } from '../../composables/useFormManagement'
import type { ManagementCommand } from '../../domain/form-management'
const props = defineProps<{ manager: ReturnType<typeof useFormManagement>; showVisibility?: boolean; hidePublish?: boolean }>()
const emit = defineEmits<{ closed: [] }>()
const { state, controller, busy, unknown, visibilityState } = props.manager
const focus = useDialogFocus(() => document.querySelector<HTMLElement>('main h1'))
const status = computed(() => controller.metadata?.status)
const labels = { publish: '發布表單', close: '關閉表單', delete: '刪除表單' }
const description = computed(() => state.confirmation?.command === 'publish' ? '發布後表單定義將凍結，僅結果可見性可另調整。'
  : state.confirmation?.command === 'close' ? '關閉後停止收件，且不能重新開啟。關閉後才能查看統計結果，查看資格依「結果可見範圍」設定。'
    : `刪除後將永遠無法再查看此表單、填答內容及統計結果，也無法恢復。${controller.unknown || controller.dirty ? '未保存或待核對的本地內容將一併丟棄。' : ''}`)
function begin(command: ManagementCommand) { focus.capture(); controller.begin(command) }
defineExpose({ begin })
async function confirm(value: boolean) { await controller.confirm(value); await focus.restore() }
async function close() { await controller.closeError(); await focus.restore(); emit('closed') }
async function copy() {
  await controller.copy(window.location.origin, url => navigator.clipboard.writeText(url))
}
const visibilityExplanation = computed(() => ({ owner_only: '僅建立者', respondents: '建立者及填答者', public: '所有人' })[controller.saved?.resultVisibility ?? 'owner_only'])
</script>
<template>
  <div class="space-y-4 rounded-lg border border-gray-200 p-4" aria-label="表單管理">
    <p v-if="busy" role="status">正在處理表單操作…</p>
    <FormsResultVisibilityControl v-if="showVisibility && controller.canManage" :value="state.selected ?? controller.saved?.resultVisibility" :disabled="busy || visibilityState.blocked" :pending="manager.pendingPolicy.value === 'visibility'" :unknown="visibilityState.needsReconciliation" @change="controller.visibility($event)" />
    <div v-if="unknown || state.unavailable" class="space-y-2" role="alert"><p>操作結果或表單現況需重新核對；請重新載入表單。</p><UButton color="neutral" variant="outline" :disabled="busy" @click="manager.reload">重新載入並核對</UButton></div>
    <div v-if="state.denied" class="space-y-2"><p>目前管理資格已被否定，請核對登入身分與表單權限。</p><UButton color="neutral" variant="outline" :disabled="busy" @click="manager.verify">核對登入與管理資格</UButton></div>
    <template v-if="controller.canManage">
      <div class="flex flex-wrap gap-3">
        <UButton v-if="status === 'draft' && !hidePublish" :disabled="!controller.allowed('publish')" @click="begin('publish')">發布</UButton>
        <div v-if="status === 'published'" class="max-w-md space-y-2"><UButton :disabled="!controller.allowed('close')" @click="begin('close')">關閉表單以查看統計</UButton><p class="text-sm text-gray-600">關閉後停止收件，才能查看統計結果；此操作無法復原，也無法重新開啟收件。</p></div>
        <div class="max-w-md space-y-2"><UButton color="error" variant="outline" :disabled="!controller.allowed('delete')" @click="begin('delete')">刪除表單</UButton><p class="text-sm text-gray-600">刪除後將無法再查看表單、填答內容及統計結果，也無法恢復。</p></div>
      </div>
      <p v-if="status === 'draft' && !hidePublish && !controller.allowed('publish') && !busy && !unknown" class="text-sm text-gray-600">請先保存後再發布。</p>
      <div v-if="status === 'published'" class="space-y-2"><UButton color="neutral" variant="outline" :loading="state.countLoading" :disabled="state.countLoading || busy" @click="controller.count()">查看填答人數</UButton><p v-if="state.count !== null">不同填答者人數：{{ state.count }}<span v-if="state.countStale">（本次未更新）</span></p></div>
      <div v-if="status === 'published' || status === 'closed'" class="space-y-2"><UButton color="neutral" variant="outline" @click="copy">{{ status === 'closed' ? '複製統計連結' : '複製填答連結，傳給填答的人' }}</UButton><p class="text-sm text-gray-600">{{ status === 'closed' ? `查看資格：${visibilityExplanation}${unknown ? '（待重新確認）' : ''}` : '將連結傳給你希望填答的人；對方開啟連結並登入後即可填寫。已截止的表單不可提交。' }}</p></div>
    </template>
    <div v-if="state.fallbackUrl" class="space-y-2"><p>無法自動複製，請選取完整連結手動複製。</p><input aria-label="完整分享連結" :value="state.fallbackUrl" readonly class="editor-control" @focus="($event.target as HTMLInputElement).select()"><UButton color="neutral" variant="outline" @click="state.fallbackUrl = null">取消手動複製</UButton></div>
    <UModal v-if="state.confirmation" :open="true" :dismissible="false" :title="labels[state.confirmation.command]" :description="description" :content="{ onCloseAutoFocus: (event: Event) => event.preventDefault() }" @update:open="value => { if (!value) confirm(false) }"><template #footer><UButton color="neutral" variant="outline" @click="confirm(false)">取消</UButton><UButton :color="state.confirmation.command === 'delete' ? 'error' : 'primary'" :disabled="busy" @click="confirm(true)">確認{{ state.confirmation.command === 'publish' ? '發布' : state.confirmation.command === 'close' ? '關閉' : '刪除' }}</UButton></template></UModal>
    <FeedbackActionErrorDialog v-if="state.error" :open="true" :presentation="state.error" managed-focus @close="close" />
  </div>
</template>
