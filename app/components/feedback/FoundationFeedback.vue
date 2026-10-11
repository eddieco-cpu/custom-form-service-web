<script setup lang="ts">
const toast = useToast()

function showToast() {
  toast.add({
    title: '本地提示測試',
    description: '僅確認工程提示容器，未呼叫業務 API。',
    color: 'success',
    icon: 'i-lucide-circle-check',
    duration: 0,
  })
}
</script>

<template>
  <div class="flex flex-wrap gap-3">
    <UButton icon="i-lucide-info" @click="showToast">顯示測試提示</UButton>
    <UModal
      title="本地對話框測試"
      description="僅確認工程對話框容器與焦點。"
    >
      <UButton color="neutral" variant="outline">開啟測試對話框</UButton>
      <template #body>
        <p>這是 F1 工程測試內容，沒有執行登入或表單操作。</p>
      </template>
    </UModal>
  </div>
</template>
