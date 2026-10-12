import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e', testMatch: ['f3-live.spec.ts', 'f3-email-live.spec.ts', 'f3-reconciliation.spec.ts'], workers: 1, timeout: 60_000,
  reporter: [['list'], ['json', { outputFile: 'output/playwright/f3/browser-results.json' }]],
  outputDir: 'output/playwright/f3/artifacts',
  use: { baseURL: 'http://localhost:3000', trace: 'off', screenshot: 'off', actionTimeout: 10_000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run dev', url: 'http://localhost:3000/login', reuseExistingServer: false, timeout: 120_000 },
})
