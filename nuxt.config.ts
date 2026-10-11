import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/ui', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  typescript: { strict: true },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-Hant' },
      title: 'V1 Frontend 工程基礎',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  runtimeConfig: {
    public: { apiBaseUrl: 'http://localhost:5000/api/v1' },
  },
  ui: { fonts: false, colorMode: false },
  icon: {
    provider: 'none',
    fallbackToApi: false,
    serverBundle: false,
    clientBundle: {
      scan: true,
      icons: ['lucide:info', 'lucide:x', 'lucide:circle-check', 'lucide:loader-circle'],
    },
  },
})
