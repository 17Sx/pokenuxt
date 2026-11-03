import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // bun run test:coverage. The entry points only wire the app to Lambda,
    // a local server or the migrations, and the deploy checks them live.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/lambda.ts', 'src/serve.ts', 'src/migrate.ts'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
})
