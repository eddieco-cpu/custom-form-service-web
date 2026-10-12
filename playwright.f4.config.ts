import { defineConfig } from '@playwright/test'
import base from './playwright.f3.config'
const mode = process.env.F4_MODE ?? 'fixture'
export default defineConfig({ ...base,
  testMatch: mode === 'live' ? 'f4-live.spec.ts' : 'f4-browser.spec.ts',
  reporter: [['list'], ['json', { outputFile: `output/playwright/f4/${mode}-results.json` }]],
  outputDir: `output/playwright/f4/${mode}-artifacts`,
  webServer: {
    command: mode === 'fixture' ? 'node node_modules/nuxt/bin/nuxt.mjs dev tests/fixtures/f4/browser --host localhost --port 3000' : mode === 'built' ? 'npm run preview' : 'npm run dev',
    url: 'http://localhost:3000/login', reuseExistingServer: false, timeout: 120_000,
  },
})
