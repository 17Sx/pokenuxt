import { describe, expect, it, vi } from 'vitest'
import { pokemonRoutes } from './pokemon-routes'

const api = (body: unknown, status = 200) =>
  vi.fn(async () => Response.json(body, { status }))

describe('pokemonRoutes', () => {
  it('fait une route par Pokémon listé par l’API', async () => {
    const fetcher = api({
      results: [{ name: 'bulbasaur' }, { name: 'mr-mime' }],
    })

    expect(
      await pokemonRoutes(
        'https://api.test/',
        fetcher as unknown as typeof fetch,
      ),
    ).toEqual(['/pokemon/bulbasaur', '/pokemon/mr-mime'])
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.test/pokeapi/pokemon?limit=10000',
    )
  })

  it('ignore les noms invalides et les doublons', async () => {
    const fetcher = api({
      results: [
        { name: 'pikachu' },
        { name: 'pikachu' },
        { name: '../secret' },
        { name: 'Pikachu' },
        { name: 25 },
        null,
      ],
    })

    expect(
      await pokemonRoutes(
        'https://api.test',
        fetcher as unknown as typeof fetch,
      ),
    ).toEqual(['/pokemon/pikachu'])
  })

  it('échoue si l’API répond par une erreur', async () => {
    const fetcher = api({ error: 'pokeapi_error' }, 502)

    await expect(
      pokemonRoutes('https://api.test', fetcher as unknown as typeof fetch),
    ).rejects.toThrow('answered 502')
  })

  it('échoue si l’API ne liste aucun Pokémon', async () => {
    const fetcher = api({ results: [] })

    await expect(
      pokemonRoutes('https://api.test', fetcher as unknown as typeof fetch),
    ).rejects.toThrow('listed no Pokémon')
  })
})
