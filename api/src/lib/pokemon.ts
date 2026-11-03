import { z } from 'zod'

/** A Pokémon as PokéAPI lists it: { name, url }. */
export const pokemonSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]{1,100}$/),
  url: z.string().regex(/^https:\/\/pokeapi\.co\/api\/v2\/pokemon\/\d+\/?$/),
})

export type Pokemon = z.infer<typeof pokemonSchema>

/** The Pokémon's number, from its URL: .../pokemon/25/ → 25 */
export function pokemonId(pokemon: Pokemon) {
  return Number(pokemon.url.match(/\/(\d+)\/?$/)![1])
}
