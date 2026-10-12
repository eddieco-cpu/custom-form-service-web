import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({ ...base,
  testMatch: ['foundation-smoke.spec.ts', 'f3-corrections.spec.ts'],
  outputDir: 'output/playwright/f3-corrections/built-artifacts',
  reporter: [['list'], ['json', { outputFile: 'output/playwright/f3-corrections/built-results.json' }]],
  use: { ...base.use, trace: 'off' },
})
