import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e', testMatch: 'f2-common.spec.ts', workers: 1,
  timeout: 60_000,
  reporter: [['list'], ['json', { outputFile: 'output/playwright/f2/browser-results.json' }]],
  outputDir: 'output/playwright/f2/browser-artifacts',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node node_modules/nuxt/bin/nuxt.mjs dev tests/fixtures/f2/browser --host localhost --port 3000',
    url: 'http://localhost:3000/scope/a', reuseExistingServer: false, timeout: 120_000,
  },
})
