import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { pokeapiHandler } from './routes/pokeapi'
import { spriteHandler } from './routes/sprite'
import { wishlistRoutes } from './routes/wishlist'
import { createWishlist, type Wishlist } from './lib/wishlist'

export type AppOptions = {
  /** A fresh, empty one by default. */
  wishlist?: Wishlist
  /** Used for PokéAPI and sprites. Tests pass a fake one. */
  fetch?: typeof fetch
  log?: boolean
}

export function createApp({
  wishlist = createWishlist(),
  fetch: fetcher = fetch,
  log = false,
}: AppOptions = {}) {
  const app = new Hono()
  if (log) app.use(logger())

  app.get('/health', (c) => c.json({ ok: true }))
  app.get('/pokeapi/*', pokeapiHandler(fetcher))
  app.get('/sprite/:id', spriteHandler(fetcher))
  app.route('/wishlist', wishlistRoutes(wishlist))

  app.notFound((c) => c.json({ error: 'not_found' }, 404))
  app.onError((error, c) => {
    // Malformed JSON bodies end up here, as a 400 from the validator.
    if (error instanceof HTTPException) {
      return c.json(
        { error: error.status === 400 ? 'invalid_request' : error.message },
        error.status,
      )
    }
    console.error(error)
    return c.json({ error: 'internal_error' }, 500)
  })

  return app
}
