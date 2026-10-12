import { defineConfig } from '@playwright/test'
import base from './playwright.f3-fixture.config'

export default defineConfig({ ...base,
  testMatch: ['f3-browser.spec.ts', 'f3-reconciliation.spec.ts', 'f3-corrections.spec.ts'],
  outputDir: 'output/playwright/f3-corrections/artifacts',
  reporter: [['list'], ['json', { outputFile: 'output/playwright/f3-corrections/results.json' }]],
})
