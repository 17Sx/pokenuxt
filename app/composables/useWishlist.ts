import type { NamedAPIResource } from 'pokenode-ts'

const STORAGE_KEY = 'pokenuxt-wishlist'

export function addPokemon(
  list: NamedAPIResource[],
  pokemon: NamedAPIResource,
): void {
  if (list.some((p) => p.name === pokemon.name)) return
  list.push(pokemon)
}

export function useWishlist() {
  const wishlist = useState<NamedAPIResource[]>('wishlist', () => [])
  const ready = useState('wishlist-ready', () => false)

  if (import.meta.client && !ready.value) {
    ready.value = true

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        wishlist.value = JSON.parse(stored) as NamedAPIResource[]
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    watch(
      wishlist,
      (value) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      },
      { deep: true },
    )
  }

  const removePokemon = (pokemon: NamedAPIResource) => {
    wishlist.value = wishlist.value.filter((p) => p.name !== pokemon.name)
  }

  const isInWishlist = (pokemon: NamedAPIResource) =>
    wishlist.value.some((p) => p.name === pokemon.name)

  return {
    wishlist,
    addPokemon: (pokemon: NamedAPIResource) =>
      addPokemon(wishlist.value, pokemon),
    removePokemon,
    isInWishlist,
  }
}
