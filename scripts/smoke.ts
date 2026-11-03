// Checks a live release and fails when a critical URL doesn't answer as it
// should. The deploy and rollback workflows run it after publishing.
//
//   SMOKE_API=https://… SMOKE_SSR=https://… SMOKE_SSG=https://… \
//   SMOKE_VERSION=<commit> bun scripts/smoke.ts
//
// Each variable is optional: a site left out is not checked.
import { appendFileSync } from 'node:fs'
import { checksFor, problems, type Check } from './smoke-checks'

const ATTEMPTS = 4
const DELAY_MS = 5000
const TIMEOUT_MS = 15000

async function run(check: Check) {
  let found: string[] = []
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(check.url, {
        headers: check.headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      found = problems(check, {
        status: response.status,
        headers: response.headers,
        body: await response.text(),
      })
    } catch (error) {
      found = [`no answer: ${(error as Error).message}`]
    }
    // A CDN can still serve the previous release for a few seconds.
    if (!found.length || attempt === ATTEMPTS) break
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
  }
  return { check, found }
}

const checks = checksFor({
  api: process.env.SMOKE_API,
  ssr: process.env.SMOKE_SSR,
  ssg: process.env.SMOKE_SSG,
  version: process.env.SMOKE_VERSION,
})
if (!checks.length) {
  console.error('Nothing to check: set SMOKE_API, SMOKE_SSR or SMOKE_SSG.')
  process.exit(1)
}

const results = await Promise.all(checks.map(run))
const failed = results.filter((r) => r.found.length)

for (const { check, found } of results) {
  const mark = found.length ? '✗' : '✓'
  console.log(`${mark} ${check.name} — ${check.status} ${check.url}`)
  for (const problem of found) console.log(`    ${problem}`)
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = results.map(
    ({ check, found }) =>
      `| ${found.length ? '✗' : '✓'} | ${check.name} | ${check.status} | ${check.url} | ${found.join('; ')} |`,
  )
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      `### Smoke tests: ${results.length - failed.length}/${results.length}`,
      '',
      '| | Check | Expected | URL | Problem |',
      '| --- | --- | --- | --- | --- |',
      ...rows,
      '',
    ].join('\n'),
  )
}

console.log(`\n${results.length - failed.length}/${results.length} checks pass`)
if (failed.length) process.exit(1)
