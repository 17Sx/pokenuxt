import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/create-app'
import { bulbasaur, pikachu, post } from './helpers'

let app: ReturnType<typeof createApp>

// Each test starts from a new, empty wishlist.
beforeEach(() => {
  app = createApp()
})

async function list() {
  return (await (await app.request('/wishlist')).json()) as {
    items: unknown[]
  }
}

describe('GET /wishlist', () => {
  it('renvoie une liste vide au départ', async () => {
    const response = await app.request('/wishlist')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ items: [] })
  })

  it('renvoie chaque Pokémon avec son numéro', async () => {
    await app.request('/wishlist', post(pikachu))

    expect(await list()).toEqual({ items: [{ id: 25, ...pikachu }] })
  })
})

describe('POST /wishlist', () => {
  it('ajoute un Pokémon', async () => {
    const response = await app.request('/wishlist', post(pikachu))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ item: { id: 25, ...pikachu } })
  })

  it('garde l’ordre d’ajout', async () => {
    await app.request('/wishlist', post(pikachu))
    await app.request('/wishlist', post(bulbasaur))

    expect(await list()).toEqual({
      items: [
        { id: 25, ...pikachu },
        { id: 1, ...bulbasaur },
      ],
    })
  })

  it('refuse un doublon avec un 409, sans l’ajouter deux fois', async () => {
    await app.request('/wishlist', post(pikachu))

    const second = await app.request('/wishlist', post(pikachu))

    expect(second.status).toBe(409)
    expect(await second.json()).toMatchObject({ error: 'already_in_wishlist' })
    expect((await list()).items).toHaveLength(1)
  })

  it('partage la même liste entre tous les visiteurs', async () => {
    await app.request('/wishlist', {
      ...post(pikachu),
      headers: { 'content-type': 'application/json', cookie: 'a=1' },
    })

    const other = await app.request('/wishlist', { headers: { cookie: 'b=2' } })

    expect(await other.json()).toEqual({ items: [{ id: 25, ...pikachu }] })
  })

  it('ne garde que le nom et l’url', async () => {
    await app.request('/wishlist', post({ ...pikachu, admin: true }))

    expect(await list()).toEqual({ items: [{ id: 25, ...pikachu }] })
  })

  it.each([
    ['du JSON invalide', '{"name":"pikachu",'],
    ['du texte', 'pas du json'],
    ['un corps vide', ''],
  ])('refuse %s avec un 400 sans planter', async (_, body) => {
    const response = await app.request('/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'invalid_request' })
    expect(await list()).toEqual({ items: [] })
  })

  it.each([
    ['un objet sans url', { name: 'pikachu' }],
    ['une liste', [pikachu]],
    ['null', null],
    ['un nom avec des majuscules', { ...pikachu, name: 'Pikachu' }],
    ['un nom vide', { ...pikachu, name: '' }],
    [
      'une url qui n’est pas PokéAPI',
      { ...pikachu, url: 'https://evil.test/25' },
    ],
    ['un nombre à la place du nom', { ...pikachu, name: 25 }],
  ])('refuse %s avec un 400', async (_, body) => {
    const response = await app.request('/wishlist', post(body))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'invalid_request' })
  })
})

describe('DELETE /wishlist/:id', () => {
  it('retire le Pokémon qui a ce numéro', async () => {
    await app.request('/wishlist', post(pikachu))
    await app.request('/wishlist', post(bulbasaur))

    const response = await app.request('/wishlist/25', { method: 'DELETE' })

    expect(response.status).toBe(204)
    expect(await list()).toEqual({ items: [{ id: 1, ...bulbasaur }] })
  })

  it('renvoie un 404 quand le Pokémon n’est pas dans la liste', async () => {
    await app.request('/wishlist', post(pikachu))

    const response = await app.request('/wishlist/150', { method: 'DELETE' })

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: 'not_in_wishlist' })
    expect((await list()).items).toHaveLength(1)
  })

  it.each([
    ['un id qui n’est pas un nombre', '/wishlist/pikachu'],
    ['un id négatif', '/wishlist/-1'],
  ])('refuse %s avec un 400', async (_, path) => {
    const response = await app.request(path, { method: 'DELETE' })

    expect(response.status).toBe(400)
  })
})
