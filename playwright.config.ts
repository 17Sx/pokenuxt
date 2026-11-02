import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

export default defineConfig<ConfigOptions>({
  testDir: './e2e',
  // Each worker builds and starts its own Nuxt server, so one is enough.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
    nuxt: {
      rootDir: fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // The Hono API the front relays /api to. Locally, a running bun run dev:api
  // is reused.
  webServer: {
    command: 'bun run --cwd api start',
    url: 'http://localhost:8787/health',
    reuseExistingServer: !process.env.CI,
    env: { PORT: '8787' },
  },
})
