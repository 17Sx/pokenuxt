import type { NamedAPIResource } from 'pokenode-ts'

export const STORAGE_KEY = 'pokenuxt-wishlist'

type WishlistStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function isResource(value: unknown): value is NamedAPIResource {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as NamedAPIResource).name === 'string' &&
    typeof (value as NamedAPIResource).url === 'string'
  )
}

/**
 * Reads the saved wishlist. Never throws: an empty, unreadable or corrupted
 * entry gives an empty list, and a corrupted entry is removed. In a list,
 * entries that aren't Pokémon are dropped and the others kept.
 */
export function readWishlist(storage: WishlistStorage): NamedAPIResource[] {
  let stored: string | null
  try {
    stored = storage.getItem(STORAGE_KEY)
  } catch {
    // Storage can be blocked, in some private windows for example.
    return []
  }
  if (!stored) return []

  try {
    const parsed: unknown = JSON.parse(stored)
    if (Array.isArray(parsed)) return parsed.filter(isResource)
  } catch {
    // Not JSON: removed below.
  }
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing more to do.
  }
  return []
}

/** Saves the wishlist. Never throws, even when the storage is full or blocked. */
export function saveWishlist(
  storage: WishlistStorage,
  list: NamedAPIResource[],
): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // The wishlist still works for this visit.
  }
}

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

  // Read localStorage once the page is hydrated, so the first client render
  // matches the server one. The watcher then lives outside any component and
  // keeps saving when you change pages.
  if (import.meta.client && !ready.value) {
    ready.value = true

    onNuxtReady(() => {
      wishlist.value = readWishlist(localStorage)

      watch(wishlist, (value) => saveWishlist(localStorage, value), {
        deep: true,
      })
    })
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
