import { pokemonId, type Pokemon } from './pokemon'

/**
 * Adds a Pokémon unless one with the same name is already in the list.
 * Returns whether it was added.
 */
export function addPokemon(list: Pokemon[], pokemon: Pokemon): boolean {
  if (list.some((p) => p.name === pokemon.name)) return false
  list.push(pokemon)
  return true
}

/** Removes the Pokémon with this number. Returns whether it was there. */
export function removePokemon(list: Pokemon[], id: number): boolean {
  const index = list.findIndex((p) => pokemonId(p) === id)
  if (index === -1) return false
  list.splice(index, 1)
  return true
}

export type WishlistItem = Pokemon & { id: number }

/** Where the wishlist is kept: Postgres in production, memory otherwise. */
export interface Wishlist {
  list(): Promise<WishlistItem[]>
  /** False when the Pokémon is already in the wishlist. */
  add(pokemon: Pokemon): Promise<boolean>
  /** False when the Pokémon wasn't in the wishlist. */
  remove(id: number): Promise<boolean>
}

/** One array in memory, emptied when the server restarts. */
export function createMemoryWishlist(): Wishlist {
  const items: Pokemon[] = []

  return {
    list: async () =>
      items.map((pokemon) => ({ id: pokemonId(pokemon), ...pokemon })),
    add: async (pokemon) => addPokemon(items, pokemon),
    remove: async (id) => removePokemon(items, id),
  }
}
