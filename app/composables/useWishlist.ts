import type { NamedAPIResource } from 'pokenode-ts'

type WishlistResponse = { items: NamedAPIResource[] }

/** Loads the visitor's wishlist from the API. An unreachable API gives an empty list. */
export async function fetchWishlist() {
  try {
    const { items } = await useRequestFetch()<WishlistResponse>('/api/wishlist')
    return items
  } catch {
    return []
  }
}

// The wishlist lives in the API, in one array shared by every visitor. The
// page loads it once on the server (see plugins/wishlist.ts), and each change
// updates the list right away, then puts it back if the API refuses.
export function useWishlist() {
  const wishlist = useState<NamedAPIResource[]>('wishlist', () => [])

  const isInWishlist = (pokemon: NamedAPIResource) =>
    wishlist.value.some((p) => p.name === pokemon.name)

  async function addPokemon(pokemon: NamedAPIResource) {
    if (isInWishlist(pokemon)) return
    wishlist.value = [...wishlist.value, pokemon]
    try {
      await $fetch('/api/wishlist', {
        method: 'POST',
        body: { name: pokemon.name, url: pokemon.url },
      })
    } catch (error) {
      // 409: already in the wishlist on the server, so the list is right.
      if ((error as { statusCode?: number }).statusCode === 409) return
      wishlist.value = wishlist.value.filter((p) => p.name !== pokemon.name)
    }
  }

  async function removePokemon(pokemon: NamedAPIResource) {
    const before = wishlist.value
    wishlist.value = before.filter((p) => p.name !== pokemon.name)
    try {
      await $fetch(`/api/wishlist/${pokemonId(pokemon)}`, { method: 'DELETE' })
    } catch (error) {
      // 404: already gone on the server, so the list is right.
      if ((error as { statusCode?: number }).statusCode === 404) return
      wishlist.value = before
    }
  }

  return { wishlist, addPokemon, removePokemon, isInWishlist }
}
