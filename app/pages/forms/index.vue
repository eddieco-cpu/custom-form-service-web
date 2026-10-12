<script setup lang="ts">
import type { FormStatus } from '../../domain/api/form'
import FormsList from '../../components/forms/FormsList.vue'
definePageMeta({ middleware: 'auth' })
const { state, loading, auth, query, notice, filter, page, refresh, reader } = useFormsList()
const focus = useDialogFocus(() => document.querySelector<HTMLElement>('main h1'))
async function reload() { focus.capture(); await refresh() }
async function close() { await reader.closeAuth(); await focus.restore() }
function changeFilter(event: Event) { filter((event.target as HTMLSelectElement).value as FormStatus || undefined) }
</script>
<template>
  <section class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3"><h1 class="text-2xl font-semibold">我的表單</h1><UButton to="/forms/new">建立表單</UButton></div>
    <AuthGate v-if="auth.outcome === 'unknown' || auth.phase !== 'settled'" />
    <p v-else-if="auth.outcome === 'anonymous'" role="status">需要有效登入身分。</p>
    <template v-else>
      <div class="flex flex-wrap items-center gap-3">
        <label for="forms-status" class="text-sm">狀態篩選</label>
        <select id="forms-status" :value="query.status ?? ''" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" @change="changeFilter"><option value="">全部</option><option value="draft">草稿</option><option value="published">已發布</option><option value="closed">已關閉</option></select>
        <UButton color="neutral" variant="outline" :loading="loading" :disabled="loading" @click="reload">刷新</UButton>
      </div>
      <p class="text-sm text-gray-600">按刷新取得最新資料。時間以台北時區顯示。</p>
      <p v-if="loading" role="status">正在載入表單清單…</p>
      <p v-if="notice" role="status">{{ notice }}</p>
      <FeedbackReadError v-if="state.error" :presentation="state.error" :retrying="loading" @retry="reload" />
      <p v-if="state.data && state.error" class="text-sm text-gray-600">刷新未成功，以下保留先前取得的資料，尚未更新。</p>
      <template v-if="state.data">
        <FormsList v-if="state.data.items.length" :items="state.data.items" />
        <UCard v-else><p>{{ state.data.pagination.totalItems !== 0 ? '目前頁沒有表單，請按刷新重新對齊。' : query.status ? '目前條件沒有表單。' : '尚未建立表單。' }}</p><UButton v-if="!query.status && state.data.pagination.totalItems === 0" to="/forms/new" class="mt-3">建立第一份表單</UButton></UCard>
        <nav class="flex flex-wrap items-center gap-3" aria-label="表單分頁"><UButton color="neutral" variant="outline" :disabled="query.page <= 1" @click="page(query.page - 1)">上一頁</UButton><span>第 {{ query.page }} 頁 · 共 {{ state.data.pagination.totalPages }} 頁／{{ state.data.pagination.totalItems }} 筆</span><UButton color="neutral" variant="outline" :disabled="query.page >= state.data.pagination.totalPages" @click="page(query.page + 1)">下一頁</UButton></nav>
      </template>
    </template>
    <FeedbackActionErrorDialog v-if="state.dialog" :open="true" :presentation="state.dialog" managed-focus @close="close" />
  </section>
</template>
