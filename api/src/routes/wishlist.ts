import { zValidator } from '@hono/zod-validator'
import { Hono, type Context } from 'hono'
import { z } from 'zod'
import { pokemonId, pokemonSchema } from '../lib/pokemon'
import type { Wishlist } from '../lib/wishlist'

// Any request that doesn't match the schema gets the same answer.
function invalid(result: { success: boolean }, c: Context) {
  if (!result.success) return c.json({ error: 'invalid_request' }, 400)
}

const idSchema = z.object({ id: z.string().regex(/^\d{1,6}$/) })

/**
 * GET / · POST / { name, url } · DELETE /:id, where id is the Pokémon's
 * number: DELETE /wishlist/25 removes Pikachu.
 */
export function wishlistRoutes(wishlist: Wishlist) {
  return new Hono()
    .get('/', (c) => c.json({ items: wishlist.list() }))
    .post('/', zValidator('json', pokemonSchema, invalid), (c) => {
      const pokemon = c.req.valid('json')
      if (!wishlist.add(pokemon)) {
        return c.json({ error: 'already_in_wishlist' }, 409)
      }
      return c.json({ item: { id: pokemonId(pokemon), ...pokemon } }, 201)
    })
    .delete('/:id', zValidator('param', idSchema, invalid), (c) => {
      if (!wishlist.remove(Number(c.req.valid('param').id))) {
        return c.json({ error: 'not_in_wishlist' }, 404)
      }
      return c.body(null, 204)
    })
}
