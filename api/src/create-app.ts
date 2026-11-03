import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { pokeapiHandler } from './routes/pokeapi'
import { spriteHandler } from './routes/sprite'
import { wishlistRoutes } from './routes/wishlist'
import { createMemoryWishlist, type Wishlist } from './lib/wishlist'
import { fail } from './i18n'

export type AppOptions = {
  /** A fresh, empty one in memory by default. */
  wishlist?: Wishlist
  /** Used for PokéAPI and sprites. Tests pass a fake one. */
  fetch?: typeof fetch
  /** Sites whose pages may call the API from the browser. */
  origins?: string[]
  log?: boolean
}

/** CORS_ORIGINS, comma-separated, or the local front by default. */
export function originsFromEnv(env = process.env) {
  const origins = env.CORS_ORIGINS?.split(',').map((o) => o.trim())
  return origins?.filter(Boolean).length
    ? origins.filter(Boolean)
    : ['http://localhost:3000']
}

export function createApp({
  wishlist = createMemoryWishlist(),
  fetch: fetcher = fetch,
  origins = originsFromEnv(),
  log = false,
}: AppOptions = {}) {
  const app = new Hono()
  if (log) app.use(logger())
  // The front calls the API from the browser. No cookies are involved, so
  // credentials stay off and only the listed origins are allowed.
  app.use(
    cors({
      origin: origins,
      allowMethods: ['GET', 'POST', 'DELETE'],
      allowHeaders: ['content-type', 'accept-language'],
      maxAge: 3600,
    }),
  )
  // Sprites are shown on the front's own domain: let other origins load them.
  app.use(secureHeaders({ crossOriginResourcePolicy: 'cross-origin' }))
  // A wishlist entry is { name, url }: nothing bigger is ever needed.
  app.use(
    '/wishlist/*',
    bodyLimit({
      maxSize: 1024,
      onError: (c) => fail(c, 'body_too_large', 413),
    }),
  )

  app.get('/health', (c) => c.json({ ok: true }))
  app.get('/pokeapi/*', pokeapiHandler(fetcher))
  app.get('/sprite/:id', spriteHandler(fetcher))
  app.route('/wishlist', wishlistRoutes(wishlist))

  app.notFound((c) => fail(c, 'not_found', 404))
  app.onError((error, c) => {
    // Malformed JSON bodies end up here, as a 400 from the validator.
    if (error instanceof HTTPException) {
      return fail(
        c,
        error.status === 400 ? 'invalid_request' : 'request_failed',
        error.status,
      )
    }
    console.error(error)
    return fail(c, 'internal_error', 500)
  })

  return app
}
