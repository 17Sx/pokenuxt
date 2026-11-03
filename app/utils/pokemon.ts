import type { NamedAPIResource, PokemonSpecies } from 'pokenode-ts'

/** Highest number in the national Pokédex. Forms come after, from 10001. */
export const LAST_NATIONAL_ID = 1025

/** The number at the end of a PokéAPI URL: .../pokemon/25/ → 25 */
export function pokemonId(resource: NamedAPIResource) {
  return Number(resource.url.match(/\/(\d+)\/?$/)?.[1])
}

export function pokemonResource(name: string, id: number): NamedAPIResource {
  return { name, url: `https://pokeapi.co/api/v2/pokemon/${id}/` }
}

/** 25 → 0025 */
export function dexNumber(id: number) {
  return String(id).padStart(4, '0')
}

/** mr-mime → Mr Mime */
export function pokemonLabel(name: string) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Only what a Pokémon page shows of its species, in the site's languages:
 * names, categories, and the latest description in each.
 */
export function speciesIn(species: PokemonSpecies, languages: string[]) {
  const wanted = (entry: { language: { name: string } }) =>
    languages.includes(entry.language.name)
  const latest = new Map<
    string,
    PokemonSpecies['flavor_text_entries'][number]
  >()
  for (const entry of species.flavor_text_entries.filter(wanted)) {
    latest.set(entry.language.name, entry)
  }
  return {
    names: species.names.filter(wanted),
    genera: species.genera.filter(wanted),
    flavor_text_entries: [...latest.values()],
  }
}
