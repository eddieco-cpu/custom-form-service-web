import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'

const mode = process.env.F10_MODE ?? 'live'
const attempt = process.env.F10_ATTEMPT ?? 'a1'
const channel = process.env.F10_CHANNEL
const root = 'output/playwright/v1-acceptance/v1-f10-20261016-01'
const fixture = ['f2', 'f3', 'f4', 'f6', 'f9'].includes(mode)
const fixtureCommand = mode === 'f2'
  ? 'node node_modules/nuxt/bin/nuxt.mjs dev tests/fixtures/f2/browser --host localhost --port 3000'
  : `node output/playwright/${mode}/harness-output/server/index.mjs`
const match: Record<string, string[]> = {
  built: ['f6-browser.spec.ts', 'f7-browser.spec.ts', 'f8-browser.spec.ts', 'f9-browser.spec.ts'],
  f2: ['f2-common.spec.ts'], f3: ['f3-browser.spec.ts', 'f3-corrections.spec.ts', 'f3-reconciliation.spec.ts'],
  f4: ['f4-browser.spec.ts'], f6: ['f6-browser.spec.ts'], f9: ['f9-browser.spec.ts'],
}
export default defineConfig({
  testDir: mode === 'live' ? resolve(root, 'tools') : './tests/e2e',
  testMatch: mode === 'live' ? `${process.env.F10_SUITE ?? 'canonical'}.spec.mjs` : match[mode] ?? [],
  workers: 1, fullyParallel: false, retries: 0,
  timeout: mode === 'live' ? 1_800_000 : 90_000,
  reporter: [['list'], ['json', { outputFile: `${root}/raw/${mode}-${channel ?? 'chromium'}-${attempt}-results.json` }]],
  outputDir: `${root}/artifacts/${mode}-${channel ?? 'chromium'}-${attempt}`,
  use: { baseURL: 'http://localhost:3000', actionTimeout: 12_000, trace: 'off', video: 'off', screenshot: 'off' },
  projects: [{ name: channel ?? 'chromium', use: { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) } }],
  webServer: {
    command: fixture ? fixtureCommand : 'npm run preview',
    url: mode === 'f2' ? 'http://localhost:3000/scope/a' : 'http://localhost:3000/login',
    reuseExistingServer: false, timeout: 120_000, env: { HOST: '127.0.0.1', PORT: '3000' },
  },
})
