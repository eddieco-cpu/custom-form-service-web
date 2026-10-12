import { defineConfig } from '@playwright/test'
import base from './playwright.f3.config'
export default defineConfig({ ...base,
  testMatch: 'f3-browser.spec.ts',
  reporter: [['list'], ['json', { outputFile: 'output/playwright/f3/fixture-results.json' }]],
  webServer: { command: 'node node_modules/nuxt/bin/nuxt.mjs dev tests/fixtures/f3/browser --host localhost --port 3000', url: 'http://localhost:3000/f3-public', reuseExistingServer: false, timeout: 120_000 },
})
