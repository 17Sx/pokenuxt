import type { NamedAPIResource } from 'pokenode-ts'
import { describe, expect, it } from 'vitest'
import { addPokemon } from './useWishlist'

const pikachu: NamedAPIResource = {
  name: 'pikachu',
  url: 'https://pokeapi.co/api/v2/pokemon/25/',
}

const bulbasaur: NamedAPIResource = {
  name: 'bulbasaur',
  url: 'https://pokeapi.co/api/v2/pokemon/1/',
}

describe('addPokemon', () => {
  it('ajoute un pokemon à la liste', () => {
    const wishlist: NamedAPIResource[] = []

    addPokemon(wishlist, pikachu)

    expect(wishlist).toEqual([pikachu])
  })

  it('n’ajoute pas de doublon', () => {
    const wishlist: NamedAPIResource[] = [pikachu]

    addPokemon(wishlist, pikachu)

    expect(wishlist).toHaveLength(1)
    expect(wishlist).toEqual([pikachu])
  })

  it('ajoute plusieurs pokemons différents', () => {
    const wishlist: NamedAPIResource[] = []

    addPokemon(wishlist, pikachu)
    addPokemon(wishlist, bulbasaur)

    expect(wishlist).toEqual([pikachu, bulbasaur])
  })
})
