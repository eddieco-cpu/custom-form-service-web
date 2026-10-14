<script setup lang="ts">
import type { ResultVisibility } from '../../domain/api/form'
defineProps<{ value?: ResultVisibility; disabled: boolean; pending: boolean; unknown: boolean }>()
const emit = defineEmits<{ change: [value: ResultVisibility] }>()
const labels = { owner_only: '僅建立者', respondents: '填答者', public: '所有人' } as const
const instance = useId()
</script>
<template>
  <fieldset :disabled="disabled" class="space-y-2" :aria-busy="pending">
    <legend class="font-medium">結果可見範圍</legend>
    <label v-for="(label, key) in labels" :key="key" class="mr-4 inline-flex items-center gap-2"><input type="radio" :name="instance" :value="key" :checked="value === key" @change="emit('change', key)">{{ label }}</label>
    <p class="text-sm text-gray-600">切換後立即保存，其他表單定義須另按保存。</p>
    <p v-if="pending" role="status">正在更新結果可見性…</p>
    <p v-if="unknown" role="status" class="text-amber-700">待重新確認；目前顯示最後已知值，請重新載入表單核對。</p>
  </fieldset>
</template>
