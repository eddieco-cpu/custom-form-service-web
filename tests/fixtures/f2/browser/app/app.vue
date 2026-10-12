<script setup lang="ts">
// Shared test observations survive page unmount; they do not apply business results.
const writes = useState('f2-write-observations', () => ({ completed: 0, outcome: 'none', effects: 0 }))
const navigations = ref(0); const navigationOutcome = ref('none')
const removeAfter = useRouter().afterEach((_to, _from, failure) => {
  navigations.value++; navigationOutcome.value = failure ? 'cancelled' : 'navigated'
})
onUnmounted(removeAfter)
</script>
<template>
  <UApp>
    <NuxtPage />
    <output data-testid="write-observations">{{ writes.completed }}|{{ writes.outcome }}|{{ writes.effects }}</output>
    <output data-testid="navigation-observations">{{ navigations }}|{{ navigationOutcome }}</output>
  </UApp>
</template>
