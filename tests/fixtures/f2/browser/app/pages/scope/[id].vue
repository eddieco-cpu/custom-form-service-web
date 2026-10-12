<script setup lang="ts">
import { createApiClient } from '@f2/services/api-client'
import { decodeCount, decodeFormDetail, decodeReceipt, decodeStatistics } from '@f2/domain/api/decoders'
import { ExactNumber } from '@f2/utils/exact-number'
import { useRequestScope } from '@f2/composables/useRequestScope'
import { useOperationState } from '@f2/composables/useOperationState'
import { useDirtyScope } from '@f2/composables/useDirtyScope'
import { presentError } from '@f2/domain/error-presentation'
import type { ErrorPresentation } from '@f2/domain/error-presentation'
import ActionErrorDialog from '@f2/components/feedback/ActionErrorDialog.vue'
import ReadError from '@f2/components/feedback/ReadError.vue'

definePageMeta({ key: 'f2-scope' })
defineOptions({ name: 'F2ScopeFixture' })
const route = useRoute()
const client = createApiClient({ baseUrl: useRuntimeConfig().public.apiBaseUrl })
const session = ref(1)
const raw = ref('baseline'); const baseline = ref('baseline')
const readValue = ref('none'); const readError = ref<ErrorPresentation>()
const modal = ref(false); const closeCount = ref(0)
const actionError = ref<ErrorPresentation>({ kind: 'generic', placement: 'dialog', message: 'Synthetic', details: [], knownCode: false })
const gate = ref('not run')
const completedReads = ref(0); const readOutcome = ref('none')
const completedReconciles = ref(0); const reconcileOutcome = ref('none'); const reconciling = ref(false)
const completedLatest = ref(0); const latestOutcome = ref('none')
const writeObservations = useState('f2-write-observations', () => ({ completed: 0, outcome: 'none', effects: 0 }))
const { scope, loading } = useRequestScope(() => String(route.params.id), () => session.value)
const write = useOperationState('delta', () => `form:${String(route.params.id)}`)
const visibility = useOperationState('visibility', () => `form:${String(route.params.id)}`)
const publish = useOperationState('lifecycle', () => `form:${String(route.params.id)}`)
const dirty = useDirtyScope({ isDirty: () => raw.value !== baseline.value, revision: () => raw.value, needsReconciliation: () => write.state.value.needsReconciliation })
async function runGate() {
  const token = raw.value
  let value: ExactNumber
  try { value = ExactNumber.from(token) }
  catch { gate.value = 'local-invalid'; return }
  const receipt = await client({ path: '/fixture-receipt', method: 'POST', expectedStatus: 201, decode: decodeReceipt, body: { value } })
  const form = await client({ path: '/fixture-form', method: 'GET', expectedStatus: 200, decode: decodeFormDetail })
  const stats = await client({ path: '/fixture-statistics', method: 'GET', expectedStatus: 200, decode: decodeStatistics })
  if (receipt.kind === 'success' && form.kind === 'success' && stats.kind === 'success') {
    const answer = receipt.value.answers[0]?.value
    const config = form.value.questions[0]?.config as { min?: ExactNumber }
    const item = stats.value.questions[0]?.statistics[0] as { value?: ExactNumber }
    gate.value = `${(answer as ExactNumber).token}|${config.min?.token}|${item.value?.token}|${ExactNumber.from('1e80').compare(ExactNumber.from('1' + '0'.repeat(79) + '1'))}`
  } else gate.value = 'failed'
}
async function load(path: string) {
  readError.value = undefined
  // Deliberately omit abort to exercise ownership even when a transport completes late.
  const outcome = await scope.run(() => client({ path, method: 'GET', expectedStatus: 200, decode: decodeCount }), result => {
    if (result.kind === 'success') readValue.value = String(result.value.count)
    else readError.value = presentError(result, 'read')
  })
  // Test-only completion observation; business callbacks remain guarded by RequestScope.
  completedReads.value++; readOutcome.value = outcome.kind
}
async function save(kind: 'delta' | 'visibility' | 'publish' = 'delta') {
  const currentResource = String(route.params.id); const currentSession = session.value
  const isCurrent = () => currentResource === String(route.params.id) && currentSession === session.value
  const target = kind === 'publish' ? publish.operation.value : kind === 'visibility' ? visibility.operation.value : write.operation.value
  if (!target) return
  const path = kind === 'publish' ? '/fixture-publish' : kind === 'visibility' ? '/fixture-visibility' : '/fixture-write'
  const result = await target.run({ title: raw.value }, body => client({ path, method: kind === 'publish' ? 'POST' : 'PATCH', expectedStatus: 200, decode: decodeCount, body }), isCurrent)
  writeObservations.value.completed++; writeObservations.value.outcome = result.kind
  if (result.kind === 'blocked' || result.kind === 'stale') return
  writeObservations.value.effects++
  if (result.kind === 'success') baseline.value = raw.value
  else { actionError.value = presentError(result, 'action'); modal.value = true }
}
async function reconcile() {
  reconciling.value = true; reconcileOutcome.value = 'pending'
  const id = String(route.params.id); const version = session.value
  const isCurrent = () => id === String(route.params.id) && version === session.value
  try {
    const result = await scope.run(() => client({ path: '/fixture-reconcile', method: 'GET', expectedStatus: 200, decode: decodeCount }), () => {})
    if (result.kind !== 'current' || !isCurrent()) { reconcileOutcome.value = 'stale'; return }
    if (result.value.kind !== 'success') { reconcileOutcome.value = 'read-failure'; return }
    const adopted = write.operation.value?.reconcile(() => dirty.replaceData('reconcile', () => { baseline.value = raw.value = 'adopted' }), isCurrent)
    reconcileOutcome.value = adopted ? 'adopted' : 'not-adopted'
  }
  finally { completedReconciles.value++; reconciling.value = false }
}
async function latest() {
  const result = await scope.run(() => client({ path: '/fixture-latest', method: 'GET', expectedStatus: 200, decode: decodeReceipt }), result => {
    if (result.kind === 'success') { latestOutcome.value = 'success'; return }
    actionError.value = presentError(result, 'latest'); latestOutcome.value = actionError.value.kind; modal.value = true
  })
  if (result.kind === 'current') completedLatest.value++
}
async function actionNavigate() {
  const permit = dirty.authorizeAction('delete')
  if (permit) await dirty.navigateWithPermit(permit, '/redirect')
}
function close() { modal.value = false; closeCount.value++ }
</script>

<template>
  <main class="p-6 space-y-4">
    <h1>F2 isolated fixture {{ route.params.id }}</h1>
    <label>合成輸入 <input v-model="raw" data-testid="raw" :disabled="write.state.value.loading" class="border p-2"></label>
    <div class="flex gap-3 flex-wrap">
      <UButton data-testid="gate" @click="runGate">精確值 gate</UButton>
      <UButton data-testid="save" :disabled="write.state.value.blocked" @click="save()">保存</UButton>
      <UButton data-testid="visibility" @click="save('visibility')">可見性</UButton>
      <UButton data-testid="publish" :disabled="publish.state.value.blocked" @click="save('publish')">發布</UButton>
      <UButton data-testid="reconcile" :disabled="reconciling" @click="reconcile">核對並採用</UButton>
      <UButton data-testid="latest" :disabled="loading" @click="latest">查看最新答案</UButton>
      <UButton data-testid="slow" @click="load('/fixture-slow')">慢讀取</UButton>
      <UButton data-testid="next" @click="load('/fixture-next')">新讀取</UButton>
      <UButton data-testid="error" @click="load('/fixture-error')">讀取錯誤</UButton>
      <UButton data-testid="session" @click="session++">更換 session</UButton>
      <UButton data-testid="clean" @click="baseline = raw">設為基準</UButton>
      <UButton data-testid="replace" @click="dirty.replaceData('replace', () => { raw = baseline = 'replaced' })">取代資料</UButton>
      <UButton data-testid="action-nav" @click="actionNavigate">動作後導航</UButton>
      <NuxtLink data-testid="other-id" :to="`/scope/${route.params.id === 'a' ? 'b' : 'a'}`">另一 Form</NuxtLink>
      <NuxtLink data-testid="away" to="/away">離頁</NuxtLink>
    </div>
    <p data-testid="gate-result">{{ gate }}</p>
    <p data-testid="read">{{ readValue }}</p>
    <p data-testid="loading">{{ String(loading) }}</p>
    <p data-testid="completed-reads">{{ completedReads }}|{{ readOutcome }}</p>
    <p data-testid="completed-reconciles">{{ completedReconciles }}|{{ reconcileOutcome }}</p>
    <p data-testid="completed-latest">{{ completedLatest }}|{{ latestOutcome }}</p>
    <p data-testid="publish-state">{{ String(publish.state.value.blocked) }}|{{ String(publish.state.value.needsReconciliation) }}</p>
    <p data-testid="write-state">{{ write.state.value.phase }}|{{ String(write.state.value.needsReconciliation) }}</p>
    <p data-testid="close-count">{{ closeCount }}</p>
    <ReadError v-if="readError" :presentation="readError" :retrying="loading" @retry="load('/fixture-next')" />
    <ActionErrorDialog :open="modal" :presentation="actionError" @close="close" />
  </main>
</template>
