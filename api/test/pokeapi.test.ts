import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/create-app'

function appWith(fetcher: (url: string) => Promise<Response>) {
  const fetch = vi.fn(fetcher)
  return {
    fetch,
    app: createApp({ fetch: fetch as unknown as typeof globalThis.fetch }),
  }
}

const ok = (body: unknown) => async () => Response.json(body)

describe('GET /pokeapi/*', () => {
  it('relaie la réponse de PokéAPI', async () => {
    const { app, fetch } = appWith(ok({ name: 'pikachu' }))

    const response = await app.request('/pokeapi/pokemon/25')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ name: 'pikachu' })
    expect(fetch).toHaveBeenCalledWith('https://pokeapi.co/api/v2/pokemon/25')
    expect(response.headers.get('cache-control')).toContain('s-maxage=86400')
  })

  it('ne transmet que limit et offset', async () => {
    const { app, fetch } = appWith(ok({ results: [] }))

    await app.request('/pokeapi/pokemon?limit=20&offset=40&foo=bar')

    expect(fetch).toHaveBeenCalledWith(
      'https://pokeapi.co/api/v2/pokemon?limit=20&offset=40',
    )
  })

  it('garde les réponses en cache', async () => {
    const { app, fetch } = appWith(ok({ name: 'pikachu' }))

    await app.request('/pokeapi/pokemon/25')
    const second = await app.request('/pokeapi/pokemon/25')

    expect(await second.json()).toEqual({ name: 'pikachu' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('renvoie un 404 pour un Pokémon inconnu, sans le mettre en cache', async () => {
    const { app, fetch } = appWith(
      async () => new Response('Not Found', { status: 404 }),
    )

    expect((await app.request('/pokeapi/pokemon/99999')).status).toBe(404)
    expect((await app.request('/pokeapi/pokemon/99999')).status).toBe(404)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('renvoie un 502 quand PokéAPI est en panne ou injoignable', async () => {
    const down = appWith(async () => new Response('', { status: 500 }))
    expect((await down.app.request('/pokeapi/pokemon/25')).status).toBe(502)

    const unreachable = appWith(async () => {
      throw new TypeError('fetch failed')
    })
    expect((await unreachable.app.request('/pokeapi/pokemon/25')).status).toBe(
      502,
    )
  })

  it.each([
    ['un chemin qui remonte', '/pokeapi/pokemon/..%2F..%2Fsecret'],
    ['des caractères interdits', '/pokeapi/pokemon/25;drop'],
    ['un limit qui n’est pas un nombre', '/pokeapi/pokemon?limit=abc'],
  ])('refuse %s', async (_, path) => {
    const { app, fetch } = appWith(ok({}))

    expect((await app.request(path)).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
})
