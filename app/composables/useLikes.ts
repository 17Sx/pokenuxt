import type { NamedAPIResource } from 'pokenode-ts'

type LikesResponse = { items: NamedAPIResource[] }

/** Loads the liked Pokémon from the API. An unreachable API gives none. */
export async function fetchLikes() {
  try {
    const { items } = await $fetch<LikesResponse>(useApiUrl()('likes'))
    return items
  } catch {
    return []
  }
}

// The likes live in the API and, like the wishlist, are shared by every
// visitor. The page loads them once (see plugins/likes.ts), and each toggle
// updates them right away, then puts them back if the API refuses.
export function useLikes() {
  const likes = useState<NamedAPIResource[]>('likes', () => [])
  // What the API answered when the last change failed, in the site's language.
  const error = useState<string | null>('likes-error', () => null)
  const { $i18n } = useNuxtApp()
  const url = useApiUrl()

  const headers = () => ({ 'accept-language': $i18n.locale.value })

  function failed(cause: unknown) {
    const message = (cause as { data?: { message?: string } }).data?.message
    error.value = message ?? $i18n.t('likes.failed')
  }

  const isLiked = (pokemon: NamedAPIResource) =>
    likes.value.some((p) => p.name === pokemon.name)

  async function like(pokemon: NamedAPIResource) {
    if (isLiked(pokemon)) return
    likes.value = [...likes.value, pokemon]
    error.value = null
    try {
      await $fetch(url('likes'), {
        method: 'POST',
        headers: headers(),
        body: { name: pokemon.name, url: pokemon.url },
      })
    } catch (cause) {
      // 409: already liked on the server, so the list is right.
      if ((cause as { statusCode?: number }).statusCode === 409) return
      likes.value = likes.value.filter((p) => p.name !== pokemon.name)
      failed(cause)
    }
  }

  async function unlike(pokemon: NamedAPIResource) {
    const before = likes.value
    likes.value = before.filter((p) => p.name !== pokemon.name)
    error.value = null
    try {
      await $fetch(url(`likes/${pokemonId(pokemon)}`), {
        method: 'DELETE',
        headers: headers(),
      })
    } catch (cause) {
      // 404: already unliked on the server, so the list is right.
      if ((cause as { statusCode?: number }).statusCode === 404) return
      likes.value = before
      failed(cause)
    }
  }

  return { likes, error, like, unlike, isLiked }
}
