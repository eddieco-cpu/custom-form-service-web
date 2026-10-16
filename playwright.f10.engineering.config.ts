import { defineConfig } from '@playwright/test'
import base from './playwright.config'

const label = process.env.F10_CASE_LABEL ?? 'E03-unlabelled'
const root = `output/playwright/v1-acceptance/v1-f10-20261016-01`
const mode = process.env.F1_SMOKE_MODE ?? 'preview'
export default defineConfig({
  ...base,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: `${root}/raw/${label}-results.json` }]],
  outputDir: `${root}/artifacts/${label}`,
  use: { ...base.use, trace: 'off', video: 'off', screenshot: 'off' },
  webServer: {
    command: mode === 'static' ? 'node scripts/static-smoke-server.mjs' : `npm run ${mode === 'dev' ? 'dev' : 'preview'}`,
    url: 'http://localhost:3000', reuseExistingServer: false, timeout: 120_000,
    env: { HOST: '127.0.0.1', PORT: '3000' },
  },
})
