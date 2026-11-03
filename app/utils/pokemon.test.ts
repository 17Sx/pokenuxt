import type { PokemonSpecies } from 'pokenode-ts'
import { describe, expect, it } from 'vitest'
import { speciesIn } from './pokemon'

const entry = (language: string, text: string) => ({
  language: { name: language, url: '' },
  text,
})

const species = {
  names: [
    { name: 'Pikachu', language: { name: 'en', url: '' } },
    { name: 'Pikachu', language: { name: 'fr', url: '' } },
    { name: 'ピカチュウ', language: { name: 'ja', url: '' } },
  ],
  genera: [
    { genus: 'Mouse Pokémon', language: { name: 'en', url: '' } },
    { genus: 'Pokémon Souris', language: { name: 'fr', url: '' } },
    { genus: 'Maus-Pokémon', language: { name: 'de', url: '' } },
  ],
  flavor_text_entries: [
    { flavor_text: 'old en', ...entry('en', '') },
    { flavor_text: 'old fr', ...entry('fr', '') },
    { flavor_text: 'de', ...entry('de', '') },
    { flavor_text: 'new en', ...entry('en', '') },
    { flavor_text: 'new fr', ...entry('fr', '') },
  ],
  moves: new Array(500).fill({}),
} as unknown as PokemonSpecies

describe('speciesIn', () => {
  const result = speciesIn(species, ['en', 'fr'])

  it('ne garde que les langues du site', () => {
    expect(result.names.map((n) => n.language.name)).toEqual(['en', 'fr'])
    expect(result.genera.map((g) => g.genus)).toEqual([
      'Mouse Pokémon',
      'Pokémon Souris',
    ])
  })

  it('ne garde que la dernière description de chaque langue', () => {
    expect(result.flavor_text_entries.map((f) => f.flavor_text)).toEqual([
      'new en',
      'new fr',
    ])
  })

  it('ne garde que les champs affichés', () => {
    expect(Object.keys(result).sort()).toEqual([
      'flavor_text_entries',
      'genera',
      'names',
    ])
  })
})
