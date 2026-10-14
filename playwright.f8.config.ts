import { defineConfig } from '@playwright/test'
import base from './playwright.f3.config'
const mode = process.env.F8_MODE ?? 'built', channel = process.env.F8_CHANNEL
const label = [mode, channel, process.env.F8_RUN_LABEL].filter(Boolean).join('-')
export default defineConfig({ ...base,
  projects: channel ? [{ name: channel, use: { ...base.projects![0]!.use, channel } }] : base.projects,
  testMatch: mode === 'live' ? 'f8-live.spec.ts' : 'f8-browser.spec.ts',
  reporter: [['list'], ['json', { outputFile: `output/playwright/f8/${label}-results.json` }]],
  outputDir: `output/playwright/f8/${label}-artifacts`,
  webServer: { command: 'npm run preview', url: 'http://localhost:3000/login', reuseExistingServer: false, timeout: 120_000 },
})
