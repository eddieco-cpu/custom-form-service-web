import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'
import base from '../../../../nuxt.config'
const rootFile = (path: string) => fileURLToPath(new URL(`../../../../${path}`, import.meta.url))
export default defineNuxtConfig({
  ...base, srcDir: rootFile('app'), css: [rootFile('app/assets/css/main.css')],
  buildDir: rootFile('output/playwright/f6/harness-nuxt'),
  nitro: { output: { dir: rootFile('output/playwright/f6/harness-output') } },
  hooks: { 'pages:extend': pages => { pages.push({ name: 'f6-renderer-harness', path: '/f6-renderer', file: rootFile('tests/fixtures/f6/browser/renderer.vue') }, { name: 'f6-scope-harness', path: '/f6-scope/:formId', file: rootFile('tests/fixtures/f6/browser/scope.vue') }) } },
})
