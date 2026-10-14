<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()
</script>
<template>
  <UModal :open="true" :dismissible="false" title="提交成功" description="本次答案已成功提交。" :content="{ onCloseAutoFocus: (event: Event) => event.preventDefault() }" @update:open="value => { if (!value) emit('close') }"><template #footer><UButton @click="emit('close')">完成</UButton></template></UModal>
</template>
