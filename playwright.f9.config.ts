import { defineConfig } from '@playwright/test'
import base from './playwright.f3.config'
const mode = process.env.F9_MODE ?? 'built', channel = process.env.F9_CHANNEL
const label = [mode, channel, process.env.F9_RUN_LABEL ?? 'first'].filter(Boolean).join('-')
export default defineConfig({ ...base,
  projects: channel ? [{ name: channel, use: { ...base.projects![0]!.use, channel } }] : base.projects,
  testMatch: mode === 'live' ? 'f9-live.spec.ts' : mode === 'regression' ? ['f3-browser.spec.ts', 'f3-reconciliation.spec.ts', 'f7-browser.spec.ts', 'f8-browser.spec.ts'] : 'f9-browser.spec.ts',
  reporter: [['list'], ['json', { outputFile: `output/playwright/f9/${label}-results.json` }]],
  outputDir: `output/playwright/f9/${label}-artifacts`,
  webServer: {
    command: mode === 'harness' ? 'node output/playwright/f9/harness-output/server/index.mjs' : 'npm run preview',
    url: 'http://localhost:3000/login', reuseExistingServer: false, timeout: 120_000,
    env: { PORT: '3000', HOST: '127.0.0.1' },
  },
})
