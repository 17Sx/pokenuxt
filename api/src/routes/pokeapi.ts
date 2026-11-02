import type { Handler } from 'hono'
import { createCache } from '../lib/cache'

const POKEAPI = 'https://pokeapi.co/api/v2'
const DAY = 60 * 60 * 24
// PokéAPI's fair use policy asks clients to cache what they fetch. Responses
// are kept a day here and on the CDN, and served stale while they refresh.
const CACHE_CONTROL = `public, max-age=3600, s-maxage=${DAY}, stale-while-revalidate=${DAY * 7}`
const QUERY_KEYS = ['limit', 'offset']

/** Proxies https://pokeapi.co/api/v2/<path>: GET /pokeapi/pokemon/25 */
export function pokeapiHandler(fetcher: typeof fetch): Handler {
  const cache = createCache<string>({ ttl: DAY * 1000, max: 500 })

  return async (c) => {
    const path = c.req.path.slice('/pokeapi/'.length)
    if (!/^[\w\-/]+$/.test(path) || path.includes('..')) {
      return c.json({ error: 'invalid_path' }, 400)
    }

    // Only the paging parameters go through, so the cache can't be filled
    // with variants of the same request.
    const query = new URLSearchParams()
    for (const key of QUERY_KEYS) {
      const value = c.req.query(key)
      if (value !== undefined) {
        if (!/^\d{1,5}$/.test(value)) {
          return c.json({ error: 'invalid_query' }, 400)
        }
        query.set(key, value)
      }
    }
    const search = query.size ? `?${query}` : ''
    const key = path + search

    let body = cache.get(key)
    if (body === undefined) {
      let response: Response
      try {
        response = await fetcher(`${POKEAPI}/${path}${search}`)
      } catch {
        return c.json({ error: 'pokeapi_unreachable' }, 502)
      }
      if (!response.ok) {
        return response.status === 404
          ? c.json({ error: 'not_found' }, 404)
          : c.json({ error: 'pokeapi_error' }, 502)
      }
      body = await response.text()
      cache.set(key, body)
    }

    return c.body(body, 200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': CACHE_CONTROL,
    })
  }
}
