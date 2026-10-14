import { defineConfig } from '@playwright/test'
import base from './playwright.f3.config'
const mode = process.env.F7_MODE ?? 'built'
const channel = process.env.F7_CHANNEL
const label = [mode, channel, process.env.F7_RUN_LABEL].filter(Boolean).join('-')
export default defineConfig({ ...base,
  projects: channel ? [{ name: channel, use: { ...base.projects![0]!.use, channel } }] : base.projects,
  testMatch: mode === 'live' ? 'f7-live.spec.ts' : 'f7-browser.spec.ts',
  reporter: [['list'], ['json', { outputFile: `output/playwright/f7/${label}-results.json` }]],
  outputDir: `output/playwright/f7/${label}-artifacts`,
  webServer: { command: 'npm run preview', url: 'http://localhost:3000/login', reuseExistingServer: false, timeout: 120_000 },
})
