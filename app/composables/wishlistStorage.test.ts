import type { NamedAPIResource } from 'pokenode-ts'
import { beforeEach, describe, expect, it } from 'vitest'
import { readWishlist, saveWishlist, STORAGE_KEY } from './useWishlist'

// A localStorage stand-in, since tests run in Node.
class MemoryStorage {
  private items = new Map<string, string>()

  getItem(key: string) {
    return this.items.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.items.set(key, value)
  }

  removeItem(key: string) {
    this.items.delete(key)
  }
}

// A storage that refuses everything, like a blocked or full localStorage.
const brokenStorage = {
  getItem(): string | null {
    throw new Error('SecurityError')
  },
  setItem() {
    throw new Error('QuotaExceededError')
  },
  removeItem() {
    throw new Error('SecurityError')
  },
}

const pikachu: NamedAPIResource = {
  name: 'pikachu',
  url: 'https://pokeapi.co/api/v2/pokemon/25/',
}

const bulbasaur: NamedAPIResource = {
  name: 'bulbasaur',
  url: 'https://pokeapi.co/api/v2/pokemon/1/',
}

let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
})

describe('saveWishlist', () => {
  it('enregistre la liste en JSON', () => {
    saveWishlist(storage, [pikachu, bulbasaur])

    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual([
      pikachu,
      bulbasaur,
    ])
  })

  it('relit exactement ce qui a été enregistré', () => {
    saveWishlist(storage, [pikachu, bulbasaur])

    expect(readWishlist(storage)).toEqual([pikachu, bulbasaur])
  })

  it('enregistre une liste vide', () => {
    saveWishlist(storage, [pikachu])
    saveWishlist(storage, [])

    expect(readWishlist(storage)).toEqual([])
  })

  it('ne plante pas quand le stockage refuse l’écriture', () => {
    expect(() => saveWishlist(brokenStorage, [pikachu])).not.toThrow()
  })
})

describe('readWishlist', () => {
  it('renvoie une liste vide quand rien n’est enregistré', () => {
    expect(readWishlist(storage)).toEqual([])
  })

  it('renvoie une liste vide quand la valeur est une chaîne vide', () => {
    storage.setItem(STORAGE_KEY, '')

    expect(readWishlist(storage)).toEqual([])
  })

  it.each([
    ['du texte', 'pas du json'],
    ['un JSON tronqué', '[{"name":"pikachu","url":'],
    ['un objet', '{"name":"pikachu"}'],
    ['null', 'null'],
    ['un nombre', '42'],
    ['une chaîne JSON', '"pikachu"'],
  ])(
    'ne plante pas avec %s, renvoie une liste vide et nettoie le stockage',
    (_, value) => {
      storage.setItem(STORAGE_KEY, value)

      expect(() => readWishlist(storage)).not.toThrow()
      expect(readWishlist(storage)).toEqual([])
      expect(storage.getItem(STORAGE_KEY)).toBeNull()
    },
  )

  it('garde les Pokémon valides et ignore les entrées corrompues', () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([pikachu, 42, null, { name: 'mew' }, 'eevee', bulbasaur]),
    )

    expect(readWishlist(storage)).toEqual([pikachu, bulbasaur])
  })

  it('ne plante pas quand le stockage est inaccessible', () => {
    expect(() => readWishlist(brokenStorage)).not.toThrow()
    expect(readWishlist(brokenStorage)).toEqual([])
  })
})
