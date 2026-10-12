<script setup lang="ts">
defineOptions({ name: 'PublicHarness' })
// Synthetic public loader proves independent progress; this is not Statistics integration.
const value = ref('載入中')
onMounted(async () => {
  const result = await fetch('http://localhost:5000/api/v1/f3-public-fixture')
  value.value = await result.text()
})
</script>
<template><section><h1>公開測試頁</h1><p data-testid="public-result">{{ value }}</p></section></template>
