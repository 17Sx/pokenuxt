import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

const E2E_API = 'http://localhost:8788'
const E2E_FRONT_PORT = 3011
// The front the tests start calls this API from the browser, and the tests
// read it to reset the wishlist (e2e/api.ts).
process.env.NUXT_PUBLIC_API_BASE = E2E_API

export default defineConfig<ConfigOptions>({
  testDir: './e2e',
  // Each worker builds and starts its own Nuxt server, so one is enough.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
    // The site follows the browser's language on a first visit: the tests
    // read French, the default, unless they ask for another one.
    locale: 'fr-FR',
    nuxt: {
      rootDir: fileURLToPath(new URL('.', import.meta.url)),
      port: E2E_FRONT_PORT,
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // An API of their own: the tests empty the wishlist, so they must never
  // reach the dev API on 8787, which may use the real database.
  webServer: {
    command: 'bun run --cwd api start',
    url: `${E2E_API}/health`,
    reuseExistingServer: false,
    env: {
      PORT: '8788',
      DATABASE_URL: '',
      // @nuxt/test-utils serves the front on 127.0.0.1.
      CORS_ORIGINS: `http://127.0.0.1:${E2E_FRONT_PORT}`,
    },
  },
})
