import { fileURLToPath } from 'node:url'
import base from '../../../../nuxt.config'

const rootFile = (path: string) => fileURLToPath(new URL(`../../../../${path}`, import.meta.url))
export default defineNuxtConfig({
  ...base,
  css: [rootFile('app/assets/css/main.css')],
  buildDir: rootFile('output/playwright/f2/harness-nuxt'),
  nitro: { output: { dir: rootFile('output/playwright/f2/harness-output') } },
  alias: { '@f2': rootFile('app') },
})
