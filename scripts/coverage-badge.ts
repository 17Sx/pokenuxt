// Turns a Vitest coverage summary into a shields.io endpoint badge, published
// next to the HTML report: bun scripts/coverage-badge.ts coverage "front"
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

type Summary = { total: { lines: { pct: number } } }

const COLORS: [min: number, color: string][] = [
  [90, 'brightgreen'],
  [80, 'green'],
  [70, 'yellowgreen'],
  [60, 'yellow'],
  [50, 'orange'],
  [0, 'red'],
]

/** https://shields.io/badges/endpoint-badge */
export function badgeFor(label: string, summary: Summary) {
  const pct = summary.total.lines.pct
  return {
    schemaVersion: 1,
    label,
    message: `${Math.floor(pct * 10) / 10}%`,
    color: COLORS.find(([min]) => pct >= min)![1],
  }
}

if (import.meta.main) {
  const [dir = 'coverage', label = 'coverage'] = process.argv.slice(2)
  const summary = JSON.parse(
    readFileSync(join(dir, 'coverage-summary.json'), 'utf8'),
  ) as Summary
  const badge = badgeFor(label, summary)
  writeFileSync(join(dir, 'badge.json'), `${JSON.stringify(badge)}\n`)
  console.log(`${label}: ${badge.message}`)
}
