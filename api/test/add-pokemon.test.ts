import { describe, expect, it } from 'vitest'
import type { Pokemon } from '../src/lib/pokemon'
import { addPokemon, removePokemon } from '../src/lib/wishlist'
import { bulbasaur, pikachu } from './helpers'

describe('addPokemon', () => {
  it('ajoute un pokemon à la liste', () => {
    const wishlist: Pokemon[] = []

    expect(addPokemon(wishlist, pikachu)).toBe(true)

    expect(wishlist).toEqual([pikachu])
  })

  it('n’ajoute pas de doublon', () => {
    const wishlist: Pokemon[] = [pikachu]

    expect(addPokemon(wishlist, pikachu)).toBe(false)

    expect(wishlist).toHaveLength(1)
    expect(wishlist).toEqual([pikachu])
  })

  it('ajoute plusieurs pokemons différents', () => {
    const wishlist: Pokemon[] = []

    addPokemon(wishlist, pikachu)
    addPokemon(wishlist, bulbasaur)

    expect(wishlist).toEqual([pikachu, bulbasaur])
  })
})

describe('removePokemon', () => {
  it('retire le Pokémon qui a ce numéro', () => {
    const wishlist: Pokemon[] = [pikachu, bulbasaur]

    expect(removePokemon(wishlist, 25)).toBe(true)

    expect(wishlist).toEqual([bulbasaur])
  })

  it('ne touche à rien quand le numéro n’est pas dans la liste', () => {
    const wishlist: Pokemon[] = [pikachu]

    expect(removePokemon(wishlist, 150)).toBe(false)

    expect(wishlist).toEqual([pikachu])
  })
})
