import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { pokemonId, pokemonSchema } from '../lib/pokemon'
import type { Likes } from '../lib/likes'
import { fail } from '../i18n'
import { idSchema, invalid } from './validation'

/**
 * GET / · POST / { name, url } · DELETE /:id, where id is the Pokémon's
 * number: DELETE /likes/25 unlikes Pikachu.
 */
export function likesRoutes(likes: Likes) {
  return new Hono()
    .get('/', async (c) => c.json({ items: await likes.list() }))
    .post('/', zValidator('json', pokemonSchema, invalid), async (c) => {
      const pokemon = c.req.valid('json')
      if (!(await likes.add(pokemon))) {
        return fail(c, 'already_liked', 409)
      }
      return c.json({ item: { id: pokemonId(pokemon), ...pokemon } }, 201)
    })
    .delete('/:id', zValidator('param', idSchema, invalid), async (c) => {
      if (!(await likes.remove(Number(c.req.valid('param').id)))) {
        return fail(c, 'not_liked', 404)
      }
      return c.body(null, 204)
    })
}
