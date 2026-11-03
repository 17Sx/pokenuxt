#!/usr/bin/env node
// Compares every locale file with en.json in the same folder, front and back:
//   node scripts/check-i18n.mjs                 i18n/locales and api/locales
//   node scripts/check-i18n.mjs api/locales     only the folders given
// Exits with 1 when a file has a problem, so CI fails.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const FOLDERS = ['i18n/locales', 'api/locales']
const REFERENCE = 'en.json'
const PLACEHOLDER = /\{\s*([\w.-]+)\s*\}/g

const isGroup = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const kindOf = (value) =>
  isGroup(value) ? 'group' : Array.isArray(value) ? 'list' : typeof value

/** The {placeholders} in a message, sorted: 'Add {name}' → ['name'] */
export function placeholders(text) {
  return [
    ...new Set([...text.matchAll(PLACEHOLDER)].map((match) => match[1])),
  ].sort()
}

/** Every message key under a group: { a: { b: 'x' } } → ['a.b'] */
export function keysOf(messages, prefix = '') {
  return Object.entries(messages).flatMap(([key, value]) =>
    isGroup(value) ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  )
}

/**
 * What differs between a locale and the reference, as a list of
 * { problem, key, detail }. An empty list means the locale is complete.
 */
export function compareLocale(reference, locale, prefix = '') {
  const issues = []

  for (const [key, expected] of Object.entries(reference)) {
    const path = `${prefix}${key}`
    if (!(key in locale)) {
      const missing = isGroup(expected) ? keysOf(expected, `${path}.`) : [path]
      for (const each of missing) issues.push({ problem: 'missing', key: each })
      continue
    }

    const actual = locale[key]
    if (kindOf(expected) !== kindOf(actual)) {
      issues.push({
        problem: 'type',
        key: path,
        detail: `${kindOf(actual)} instead of ${kindOf(expected)}`,
      })
    } else if (isGroup(expected)) {
      issues.push(...compareLocale(expected, actual, `${path}.`))
    } else if (typeof expected === 'string') {
      if (!actual.trim() && expected.trim()) {
        issues.push({ problem: 'empty', key: path })
        continue
      }
      const want = placeholders(expected)
      const have = placeholders(actual)
      if (want.join() !== have.join()) {
        issues.push({
          problem: 'placeholders',
          key: path,
          detail:
            `{${have.join('}, {')}} instead of {${want.join('}, {')}}`.replaceAll(
              '{}',
              'none',
            ),
        })
      }
    }
  }

  for (const [key, value] of Object.entries(locale)) {
    if (key in reference) continue
    const path = `${prefix}${key}`
    const extra = isGroup(value) ? keysOf(value, `${path}.`) : [path]
    for (const each of extra) issues.push({ problem: 'extra', key: each })
  }

  return issues
}

function readJson(file) {
  try {
    const value = JSON.parse(readFileSync(file, 'utf8'))
    if (!isGroup(value)) return { error: 'is not a JSON object' }
    return { value }
  } catch (error) {
    return { error: `is not valid JSON: ${error.message}` }
  }
}

/**
 * Checks one folder: each .json file in it against its en.json. Returns
 * [{ file, keys, issues, error }], with error set when a file can't be read.
 */
export function checkFolder(folder) {
  const referenceFile = join(folder, REFERENCE)
  if (!existsSync(referenceFile)) {
    return [{ file: referenceFile, error: 'is missing: it is the reference' }]
  }
  const reference = readJson(referenceFile)
  if (reference.error) return [{ file: referenceFile, error: reference.error }]

  const keys = keysOf(reference.value).length
  return readdirSync(folder)
    .filter((file) => file.endsWith('.json') && file !== REFERENCE)
    .sort()
    .map((name) => {
      const file = join(folder, name)
      const locale = readJson(file)
      if (locale.error) return { file, error: locale.error }
      return {
        file,
        keys,
        issues: compareLocale(reference.value, locale.value),
      }
    })
}

// Paths inside the project are shown from its root, the others in full.
function shown(path) {
  const inside = relative(ROOT, path)
  return inside.startsWith('..') ? path : inside || '.'
}

const LABELS = {
  missing: 'missing',
  extra: 'not in en.json',
  type: 'wrong type',
  empty: 'empty',
  placeholders: 'placeholders',
}

function main(args) {
  const folders = args.length
    ? args.map((folder) => resolve(folder))
    : FOLDERS.map((folder) => resolve(ROOT, folder))
  let problems = 0

  for (const folder of folders) {
    if (!existsSync(folder)) {
      console.error(`✗ ${shown(folder)} does not exist`)
      problems++
      continue
    }
    const results = checkFolder(folder)
    if (!results.length)
      console.log(`· ${shown(folder)}: only ${REFERENCE}, nothing to compare`)

    for (const { file, keys, issues, error } of results) {
      const name = shown(file)
      if (error) {
        console.error(`✗ ${name} ${error}`)
        problems++
      } else if (!issues.length) {
        console.log(`✓ ${name} matches ${REFERENCE} (${keys} keys)`)
      } else {
        console.error(
          `✗ ${name}: ${issues.length} problem${issues.length > 1 ? 's' : ''}`,
        )
        for (const { problem, key, detail } of issues) {
          console.error(
            `    ${LABELS[problem].padEnd(15)} ${key}${detail ? `  ${detail}` : ''}`,
          )
        }
        problems += issues.length
      }
    }
  }

  if (problems) {
    console.error(
      `\n${problems} problem${problems > 1 ? 's' : ''} in the locale files.`,
    )
    process.exitCode = 1
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2))
}
