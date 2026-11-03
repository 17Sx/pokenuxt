import { zValidator } from '@hono/zod-validator'
import { Hono, type Context } from 'hono'
import { z } from 'zod'
import { pokemonId, pokemonSchema } from '../lib/pokemon'
import type { Wishlist } from '../lib/wishlist'
import { fail } from '../i18n'

// Any request that doesn't match the schema gets the same answer.
function invalid(result: { success: boolean }, c: Context) {
  if (!result.success) return fail(c, 'invalid_request', 400)
}

const idSchema = z.object({ id: z.string().regex(/^\d{1,6}$/) })

/**
 * GET / · POST / { name, url } · DELETE /:id, where id is the Pokémon's
 * number: DELETE /wishlist/25 removes Pikachu.
 */
export function wishlistRoutes(wishlist: Wishlist) {
  return new Hono()
    .get('/', async (c) => c.json({ items: await wishlist.list() }))
    .post('/', zValidator('json', pokemonSchema, invalid), async (c) => {
      const pokemon = c.req.valid('json')
      if (!(await wishlist.add(pokemon))) {
        return fail(c, 'already_in_wishlist', 409)
      }
      return c.json({ item: { id: pokemonId(pokemon), ...pokemon } }, 201)
    })
    .delete('/:id', zValidator('param', idSchema, invalid), async (c) => {
      if (!(await wishlist.remove(Number(c.req.valid('param').id)))) {
        return fail(c, 'not_in_wishlist', 404)
      }
      return c.body(null, 204)
    })
}
