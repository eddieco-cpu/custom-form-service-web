import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'
import base from '../../../../nuxt.config'
const rootFile = (path: string) => fileURLToPath(new URL(`../../../../${path}`, import.meta.url))
export default defineNuxtConfig({
  ...base, srcDir: rootFile('app'), css: [rootFile('app/assets/css/main.css')],
  buildDir: rootFile('output/playwright/f4/harness-nuxt'),
  nitro: { output: { dir: rootFile('output/playwright/f4/harness-output') } },
  hooks: { 'pages:extend': pages => { pages.push({ name: 'f4-session-harness', path: '/f4-session/:formId', file: rootFile('tests/fixtures/f4/browser/session.vue') }) } },
})
