import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'
import base from '../../../../nuxt.config'
const rootFile = (path: string) => fileURLToPath(new URL(`../../../../${path}`, import.meta.url))
export default defineNuxtConfig({
  ...base, srcDir: rootFile('app'), css: [rootFile('app/assets/css/main.css')],
  buildDir: rootFile('output/playwright/f9/harness-nuxt'),
  nitro: { output: { dir: rootFile('output/playwright/f9/harness-output') } },
  plugins: [rootFile('tests/fixtures/f9/browser/controls.client.ts')],
})
