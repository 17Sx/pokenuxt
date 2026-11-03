import type { Handler } from 'hono'
import { createCache } from '../lib/cache'
import { ditherSprite } from '../lib/dither'
import { fail } from '../i18n'

const SPRITES =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
const SIZES = [96, 128, 256]
const WEEK = 60 * 60 * 24 * 7
// Sprites never change: browsers and the CDN keep them a week.
const CACHE_CONTROL = `public, max-age=${WEEK}, s-maxage=${WEEK}, immutable`

// Official artwork first, the small game sprite when a form has none.
async function fetchSprite(fetcher: typeof fetch, id: string) {
  for (const path of [`other/official-artwork/${id}.png`, `${id}.png`]) {
    try {
      const response = await fetcher(`${SPRITES}/${path}`)
      if (response.ok) return Buffer.from(await response.arrayBuffer())
    } catch {
      // Try the next source.
    }
  }
  return undefined
}

/**
 * Serves the Pokémon's artwork, dithered to white dots: GET /sprite/25?s=128
 * Add c=1 for dots in the artwork's colours.
 */
export function spriteHandler(fetcher: typeof fetch): Handler {
  // Each sprite is dithered once per instance, then served from memory.
  const cache = createCache<Buffer>({ ttl: WEEK * 1000, max: 1000 })

  return async (c) => {
    const id = c.req.param('id') ?? ''
    const size = Number(c.req.query('s') ?? 128)
    const color = c.req.query('c') ?? '0'
    if (
      !/^\d{1,6}$/.test(id) ||
      !SIZES.includes(size) ||
      (color !== '0' && color !== '1')
    ) {
      return fail(c, 'invalid_sprite', 400)
    }

    const key = `${id}-${size}-${color}`
    let png = cache.get(key)
    if (!png) {
      const source = await fetchSprite(fetcher, id)
      if (!source) return fail(c, 'not_found', 404)
      png = ditherSprite(source, size, color === '1')
      cache.set(key, png)
    }

    return c.body(new Uint8Array(png), 200, {
      'content-type': 'image/png',
      'cache-control': CACHE_CONTROL,
    })
  }
}
