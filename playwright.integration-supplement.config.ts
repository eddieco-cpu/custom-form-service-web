import { defineConfig } from '@playwright/test'
import base from './playwright.f3.config'
const label = process.env.SUPPLEMENT_LABEL ?? 'browser'

export default defineConfig({
  ...base,
  testMatch: ['integration-supplement.spec.ts', 'f6-live.spec.ts', 'f7-live.spec.ts', 'f8-live.spec.ts'],
  timeout: 180_000,
  reporter: [['list'], ['json', { outputFile: `output/playwright/integration-supplement/${label}-results.json` }]],
  outputDir: `output/playwright/integration-supplement/${label}-artifacts`,
  webServer: { command: 'npm run preview', url: 'http://localhost:3000/login', reuseExistingServer: false, timeout: 120_000 },
})
