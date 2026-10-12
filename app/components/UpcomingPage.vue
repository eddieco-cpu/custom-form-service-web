<script setup lang="ts">defineProps<{ title: string }>()</script>
<template><AuthGate><section class="space-y-4"><h1 class="text-2xl font-semibold">{{ title }}</h1><p class="text-gray-600">此頁功能尚未完成，將於後續輪次提供。</p><UButton to="/" color="neutral" variant="outline">回首頁</UButton></section></AuthGate></template>
