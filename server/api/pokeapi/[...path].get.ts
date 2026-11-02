const POKEAPI = 'https://pokeapi.co/api/v2'
const DAY = 60 * 60 * 24

// Proxies https://pokeapi.co/api/v2/<path>. PokéAPI's fair use policy asks
// clients to cache what they fetch: responses are kept for a day, like the
// max-age PokéAPI sends, and refreshed in the background after that.
export default defineCachedEventHandler(
  async (event) => {
    const path = getRouterParam(event, 'path') ?? ''
    if (!/^[\w\-/]+$/.test(path) || path.includes('..')) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
    }
    try {
      return await $fetch(`${POKEAPI}/${path}`, { query: getQuery(event) })
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode ?? 502
      throw createError({ statusCode, statusMessage: 'PokéAPI request failed' })
    }
  },
  { name: 'pokeapi', maxAge: DAY, swr: true, getKey: (event) => event.path },
)
