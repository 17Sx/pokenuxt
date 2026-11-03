import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/create-app'
import { connect } from '../src/db'
import { migrate } from '../src/migrations'
import { createPostgresWishlist } from '../src/postgres-wishlist'
import { bulbasaur, pikachu, post } from './helpers'

// A throwaway database only, never DATABASE_URL: each test empties the table.
const url = process.env.TEST_DATABASE_URL

describe.skipIf(!url)('wishlist sur Postgres', () => {
  const sql = connect(url ?? '', 2)
  const wishlist = createPostgresWishlist(sql)
  const app = createApp({ wishlist })

  beforeAll(async () => {
    await migrate(sql)
  })

  beforeEach(async () => {
    await sql`truncate wishlist_items`
  })

  afterAll(async () => {
    await sql.end()
  })

  it('renvoie une liste vide au départ', async () => {
    expect(await wishlist.list()).toEqual([])
  })

  it('ajoute et relit dans l’ordre d’ajout', async () => {
    expect(await wishlist.add(pikachu)).toBe(true)
    expect(await wishlist.add(bulbasaur)).toBe(true)

    expect(await wishlist.list()).toEqual([
      { id: 25, ...pikachu },
      { id: 1, ...bulbasaur },
    ])
  })

  it('refuse un doublon', async () => {
    await wishlist.add(pikachu)

    expect(await wishlist.add(pikachu)).toBe(false)
    expect(await wishlist.list()).toHaveLength(1)
  })

  it('retire un Pokémon par son numéro', async () => {
    await wishlist.add(pikachu)

    expect(await wishlist.remove(25)).toBe(true)
    expect(await wishlist.remove(25)).toBe(false)
    expect(await wishlist.list()).toEqual([])
  })

  it('passe par les routes de l’API', async () => {
    expect((await app.request('/wishlist', post(pikachu))).status).toBe(201)
    expect((await app.request('/wishlist', post(pikachu))).status).toBe(409)
    expect(await (await app.request('/wishlist')).json()).toEqual({
      items: [{ id: 25, ...pikachu }],
    })
    expect(
      (await app.request('/wishlist/25', { method: 'DELETE' })).status,
    ).toBe(204)
    expect(
      (await app.request('/wishlist/25', { method: 'DELETE' })).status,
    ).toBe(404)
  })

  it('peut rejouer les migrations sans rien refaire', async () => {
    expect(await migrate(sql)).toEqual([])
  })
})
