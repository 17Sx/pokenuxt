const SPRITES =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
const SIZES = [96, 128, 256]
const WEEK = 60 * 60 * 24 * 7

// Official artwork first, the small game sprite when a form has none.
async function fetchSprite(id: string) {
  for (const path of [`other/official-artwork/${id}.png`, `${id}.png`]) {
    try {
      const body = await $fetch<ArrayBuffer>(`${SPRITES}/${path}`, {
        responseType: 'arrayBuffer',
      })
      return Buffer.from(body)
    } catch {
      // Try the next source.
    }
  }
  throw createError({ statusCode: 404, statusMessage: 'Sprite not found' })
}

// Sprites never change: each one is dithered once, then served from the cache.
// The PNG is cached as base64, since the cache stores text.
const ditheredSprite = defineCachedFunction(
  async (id: string, size: number) =>
    ditherSprite(await fetchSprite(id), size).toString('base64'),
  {
    name: 'sprite',
    maxAge: WEEK,
    swr: true,
    getKey: (id: string, size: number) => `${id}-${size}`,
  },
)

// Serves the Pokémon's artwork, dithered to white dots: /api/sprite/25?s=128
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const size = Number(getQuery(event).s ?? 128)
  if (!/^\d+$/.test(id) || !SIZES.includes(size)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid sprite' })
  }
  const png = Buffer.from(await ditheredSprite(id, size), 'base64')
  setResponseHeaders(event, {
    'content-type': 'image/png',
    'cache-control': `public, max-age=${WEEK}, immutable`,
  })
  return png
})
