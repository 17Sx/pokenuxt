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
  // What the API answered when the last change failed, in the site's language.
  const error = useState<string | null>('wishlist-error', () => null)
  const { $i18n } = useNuxtApp()

  const headers = () => ({ 'accept-language': $i18n.locale.value })

  function failed(cause: unknown) {
    const message = (cause as { data?: { message?: string } }).data?.message
    error.value = message ?? $i18n.t('wishlist.failed')
  }

  const isInWishlist = (pokemon: NamedAPIResource) =>
    wishlist.value.some((p) => p.name === pokemon.name)

  async function addPokemon(pokemon: NamedAPIResource) {
    if (isInWishlist(pokemon)) return
    wishlist.value = [...wishlist.value, pokemon]
    error.value = null
    try {
      await $fetch('/api/wishlist', {
        method: 'POST',
        headers: headers(),
        body: { name: pokemon.name, url: pokemon.url },
      })
    } catch (cause) {
      // 409: already in the wishlist on the server, so the list is right.
      if ((cause as { statusCode?: number }).statusCode === 409) return
      wishlist.value = wishlist.value.filter((p) => p.name !== pokemon.name)
      failed(cause)
    }
  }

  async function removePokemon(pokemon: NamedAPIResource) {
    const before = wishlist.value
    wishlist.value = before.filter((p) => p.name !== pokemon.name)
    error.value = null
    try {
      await $fetch(`/api/wishlist/${pokemonId(pokemon)}`, {
        method: 'DELETE',
        headers: headers(),
      })
    } catch (cause) {
      // 404: already gone on the server, so the list is right.
      if ((cause as { statusCode?: number }).statusCode === 404) return
      wishlist.value = before
      failed(cause)
    }
  }

  return { wishlist, error, addPokemon, removePokemon, isInWishlist }
}
