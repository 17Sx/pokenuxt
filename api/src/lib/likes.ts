import { pokemonId, type Pokemon } from './pokemon'
import { addPokemon, removePokemon, type WishlistItem } from './wishlist'

export type Like = WishlistItem

/**
 * The Pokémon liked on the site: Postgres in production, memory otherwise.
 * There are no accounts, so like the wishlist, every visitor shares them.
 */
export interface Likes {
  list(): Promise<Like[]>
  /** False when the Pokémon is already liked. */
  add(pokemon: Pokemon): Promise<boolean>
  /** False when the Pokémon wasn't liked. */
  remove(id: number): Promise<boolean>
}

/** One array in memory, emptied when the server restarts. */
export function createMemoryLikes(): Likes {
  const items: Pokemon[] = []

  return {
    list: async () =>
      items.map((pokemon) => ({ id: pokemonId(pokemon), ...pokemon })),
    add: async (pokemon) => addPokemon(items, pokemon),
    remove: async (id) => removePokemon(items, id),
  }
}
