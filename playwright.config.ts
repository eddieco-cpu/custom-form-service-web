import { defineConfig, devices } from '@playwright/test'

const mode = process.env.F1_SMOKE_MODE ?? 'preview'
const command = mode === 'static'
  ? 'node scripts/static-smoke-server.mjs'
  : `npm run ${mode === 'dev' ? 'dev' : 'preview'}`

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'foundation-smoke.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [['list'], ['json', { outputFile: 'output/playwright/results.json' }]],
  outputDir: 'output/playwright/artifacts',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command,
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
