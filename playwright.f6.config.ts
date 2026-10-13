import { defineConfig } from '@playwright/test'
import base from './playwright.f3.config'
const mode = process.env.F6_MODE ?? 'fixture'
const channel = process.env.F6_CHANNEL
const label = channel ? `${mode}-${channel}` : mode
export default defineConfig({ ...base,
  projects: channel ? [{ name: channel, use: { ...base.projects![0]!.use, channel } }] : base.projects,
  testMatch: mode === 'live' ? 'f6-live.spec.ts' : 'f6-browser.spec.ts',
  reporter: [['list'], ['json', { outputFile: `output/playwright/f6/${label}-results.json` }]],
  outputDir: `output/playwright/f6/${label}-artifacts`,
  webServer: {
    command: mode === 'fixture' ? 'node node_modules/nuxt/bin/nuxt.mjs dev tests/fixtures/f6/browser --host localhost --port 3000' : 'npm run preview',
    url: 'http://localhost:3000/login', reuseExistingServer: false, timeout: 120_000,
  },
})
