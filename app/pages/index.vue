<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { state } = useAuth()
const entries = [{ title: '建立表單', to: '/forms/new', text: '設計新的表單與題目' }, { title: '我的表單', to: '/forms', text: '查看與管理自己的表單' }, { title: '個人資訊', to: '/profile', text: '查看帳號與修改姓名' }]
</script>
<template>
  <AuthGate>
    <h1 class="mb-8 text-2xl font-semibold break-words whitespace-pre-wrap">歡迎，{{ state.user?.displayName }}</h1>
    <div class="grid gap-4 md:grid-cols-3"><UCard v-for="entry in entries" :key="entry.to"><h2 class="mb-2 text-lg font-semibold">{{ entry.title }}</h2><p class="mb-5 text-gray-600">{{ entry.text }}</p><UButton :to="entry.to">{{ entry.title }}</UButton></UCard></div>
  </AuthGate>
</template>
