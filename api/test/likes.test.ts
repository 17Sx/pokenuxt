import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/create-app'
import { bulbasaur, pikachu, post } from './helpers'

let app: ReturnType<typeof createApp>

// Each test starts with nothing liked.
beforeEach(() => {
  app = createApp()
})

async function list() {
  return (await (await app.request('/likes')).json()) as { items: unknown[] }
}

describe('GET /likes', () => {
  it('renvoie une liste vide au départ', async () => {
    const response = await app.request('/likes')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ items: [] })
  })

  it('renvoie les Pokémon likés dans l’ordre, avec leur numéro', async () => {
    await app.request('/likes', post(pikachu))
    await app.request('/likes', post(bulbasaur))

    expect(await list()).toEqual({
      items: [
        { id: 25, ...pikachu },
        { id: 1, ...bulbasaur },
      ],
    })
  })
})

describe('POST /likes', () => {
  it('like un Pokémon', async () => {
    const response = await app.request('/likes', post(pikachu))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ item: { id: 25, ...pikachu } })
  })

  it('refuse un second like avec un 409, dans la langue demandée', async () => {
    await app.request('/likes', post(pikachu))

    const second = await app.request('/likes', {
      ...post(pikachu),
      headers: { 'content-type': 'application/json', 'accept-language': 'fr' },
    })

    expect(second.status).toBe(409)
    expect(await second.json()).toEqual({
      error: 'already_liked',
      message: 'Ce Pokémon est déjà liké.',
    })
    expect((await list()).items).toHaveLength(1)
  })

  it('ne touche pas à la wishlist', async () => {
    await app.request('/likes', post(pikachu))

    expect(await (await app.request('/wishlist')).json()).toEqual({ items: [] })
  })

  it.each([
    ['du JSON invalide', '{"name":"pikachu",'],
    ['un objet sans url', JSON.stringify({ name: 'pikachu' })],
    [
      'une url qui n’est pas PokéAPI',
      JSON.stringify({ ...pikachu, url: 'https://evil.test/25' }),
    ],
  ])('refuse %s avec un 400', async (_, body) => {
    const response = await app.request('/likes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'invalid_request' })
    expect(await list()).toEqual({ items: [] })
  })
})

describe('DELETE /likes/:id', () => {
  it('retire le like du Pokémon qui a ce numéro', async () => {
    await app.request('/likes', post(pikachu))
    await app.request('/likes', post(bulbasaur))

    const response = await app.request('/likes/25', { method: 'DELETE' })

    expect(response.status).toBe(204)
    expect(await list()).toEqual({ items: [{ id: 1, ...bulbasaur }] })
  })

  it('renvoie un 404 quand le Pokémon n’est pas liké', async () => {
    const response = await app.request('/likes/25', { method: 'DELETE' })

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: 'not_liked' })
  })

  it('refuse un id qui n’est pas un nombre avec un 400', async () => {
    const response = await app.request('/likes/pikachu', { method: 'DELETE' })

    expect(response.status).toBe(400)
  })
})
