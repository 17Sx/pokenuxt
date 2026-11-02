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

/**
 * The wishlist: one array in memory, shared by every visitor. It is emptied
 * when the server restarts, and each server instance has its own.
 */
export function createWishlist() {
  const items: Pokemon[] = []

  return {
    list: () =>
      items.map((pokemon) => ({ id: pokemonId(pokemon), ...pokemon })),
    add: (pokemon: Pokemon) => addPokemon(items, pokemon),
    remove: (id: number) => removePokemon(items, id),
  }
}

export type Wishlist = ReturnType<typeof createWishlist>
