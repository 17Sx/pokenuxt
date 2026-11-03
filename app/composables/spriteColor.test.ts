import { describe, expect, it } from 'vitest'
import { MAX_COLORED, parseColorIds, withColor } from './useSpriteColor'

describe('parseColorIds', () => {
  it('lit les numéros séparés par des points', () => {
    expect(parseColorIds('6.25.150')).toEqual([6, 25, 150])
  })

  it('renvoie une liste vide sans cookie', () => {
    expect(parseColorIds(undefined)).toEqual([])
    expect(parseColorIds(null)).toEqual([])
    expect(parseColorIds('')).toEqual([])
  })

  it('ignore ce qui n’est pas un numéro de Pokémon', () => {
    expect(parseColorIds('6.abc..-3.0.25x.150')).toEqual([6, 150])
  })

  it('ne plante pas avec un cookie corrompu', () => {
    expect(() => parseColorIds('%E0%A4%A')).not.toThrow()
    expect(parseColorIds('[1,2,3]')).toEqual([])
  })

  it('retire les doublons', () => {
    expect(parseColorIds('6.25.6')).toEqual([6, 25])
  })

  it(`garde au plus ${MAX_COLORED} Pokémon`, () => {
    const ids = Array.from({ length: MAX_COLORED + 10 }, (_, i) => i + 1)

    expect(parseColorIds(ids.join('.'))).toHaveLength(MAX_COLORED)
  })
})

describe('withColor', () => {
  it('ajoute un Pokémon en couleur', () => {
    expect(withColor([6], 25, true)).toEqual([6, 25])
  })

  it('retire un Pokémon remis en noir et blanc', () => {
    expect(withColor([6, 25], 6, false)).toEqual([25])
  })

  it('n’ajoute pas deux fois le même Pokémon', () => {
    expect(withColor([6, 25], 6, true)).toEqual([25, 6])
  })

  it('oublie les choix les plus anciens au-delà de la limite', () => {
    const full = Array.from({ length: MAX_COLORED }, (_, i) => i + 1)
    const next = withColor(full, 9999, true)

    expect(next).toHaveLength(MAX_COLORED)
    expect(next[0]).toBe(2)
    expect(next.at(-1)).toBe(9999)
  })
})
