import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  ssr: false,
  nitro: { preset: 'node-server' },
  modules: ['@nuxt/ui', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  typescript: { strict: true },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-Hant' },
      title: '自建表單',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  runtimeConfig: {
    // Local default only. Docker requires a valid public HTTPS runtime override.
    public: { apiBaseUrl: 'http://localhost:5000/api/v1' },
  },
  ui: { fonts: false, colorMode: false },
  icon: {
    provider: 'none',
    fallbackToApi: false,
    serverBundle: false,
    clientBundle: {
      scan: true,
      icons: ['lucide:info', 'lucide:x', 'lucide:circle-check', 'lucide:loader-circle', 'lucide:user-round', 'lucide:menu'],
    },
  },
})
