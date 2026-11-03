import type { NamedAPIResource } from 'pokenode-ts'

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
