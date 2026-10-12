<script setup lang="ts">
import { other, ids } from '../payloads'
defineOptions({ name: 'F4SessionHarness' })
definePageMeta({ middleware: 'auth' })
const { session } = useAuth()
</script>
<template>
  <div class="space-y-4">
    <aside aria-label="合成競態控制"><UButton @click="session.profile(other)">合成切換身分</UButton><UButton :to="`/f4-session/${ids.closed}`">合成切換 Form ID</UButton></aside>
    <FormsFormReadPage mode="form" />
  </div>
</template>
