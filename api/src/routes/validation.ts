import type { Context } from 'hono'
import { z } from 'zod'
import { fail } from '../i18n'

// Any request that doesn't match the schema gets the same answer.
export function invalid(result: { success: boolean }, c: Context) {
  if (!result.success) return fail(c, 'invalid_request', 400)
}

/** A Pokémon's number in the path: /wishlist/25, /likes/25. */
export const idSchema = z.object({ id: z.string().regex(/^\d{1,6}$/) })
