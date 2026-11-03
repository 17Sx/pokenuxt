import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'app/**/*.test.ts',
      'scripts/**/*.test.ts',
      'prerender/**/*.test.ts',
    ],
    environment: 'node',
    // bun run test:coverage. Components and pages are covered by the
    // end-to-end tests, not these: only the code unit tests aim at counts.
    coverage: {
      provider: 'v8',
      include: [
        'app/utils/**/*.ts',
        'app/composables/**/*.ts',
        'prerender/**/*.ts',
        'scripts/**/*.{ts,mjs}',
      ],
      exclude: ['**/*.test.ts', 'scripts/dither-banner.ts', 'scripts/smoke.ts'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
})
