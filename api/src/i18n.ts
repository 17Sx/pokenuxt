import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import en from '../locales/en.json'
import fr from '../locales/fr.json'

// en.json is the reference: a code missing from fr.json fails the type check.
const MESSAGES = { en, fr }

export type Locale = keyof typeof MESSAGES
export type ErrorCode = keyof typeof en.errors

/** The language the request prefers among those the API speaks, English otherwise. */
export function localeOf(header?: string | null): Locale {
  const wanted = (header ?? '')
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.trim().split(';')
      const q = params.find((param) => param.trim().startsWith('q='))
      return {
        language: tag.trim().toLowerCase().split('-')[0] ?? '',
        q: q ? Number(q.trim().slice(2)) : 1,
        index,
      }
    })
    .filter(({ language, q }) => language && q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
  const match = wanted.find(({ language }) => language in MESSAGES)
  return (match?.language as Locale | undefined) ?? 'en'
}

export function message(locale: Locale, code: ErrorCode) {
  return MESSAGES[locale].errors[code]
}

/** A JSON error: its code for programs, and a message in the request's language. */
export function fail(
  c: Context,
  code: ErrorCode,
  status: ContentfulStatusCode,
) {
  const locale = localeOf(c.req.header('accept-language'))
  return c.json({ error: code, message: message(locale, code) }, status)
}
