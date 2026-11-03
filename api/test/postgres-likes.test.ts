import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/create-app'
import { connect } from '../src/db'
import { migrate } from '../src/migrations'
import { createPostgresLikes } from '../src/postgres-likes'
import { bulbasaur, pikachu, post } from './helpers'

// A throwaway database only, never DATABASE_URL: each test empties the table.
const url = process.env.TEST_DATABASE_URL

describe.skipIf(!url)('likes sur Postgres', () => {
  const sql = connect(url ?? '', 2)
  const likes = createPostgresLikes(sql)
  const app = createApp({ likes })

  beforeAll(async () => {
    await migrate(sql)
  })

  beforeEach(async () => {
    await sql`truncate likes`
  })

  afterAll(async () => {
    await sql.end()
  })

  it('like et relit dans l’ordre', async () => {
    expect(await likes.add(pikachu)).toBe(true)
    expect(await likes.add(bulbasaur)).toBe(true)

    expect(await likes.list()).toEqual([
      { id: 25, ...pikachu },
      { id: 1, ...bulbasaur },
    ])
  })

  it('ne like pas deux fois', async () => {
    await likes.add(pikachu)

    expect(await likes.add(pikachu)).toBe(false)
    expect(await likes.list()).toHaveLength(1)
  })

  it('retire un like par le numéro du Pokémon', async () => {
    await likes.add(pikachu)

    expect(await likes.remove(25)).toBe(true)
    expect(await likes.remove(25)).toBe(false)
    expect(await likes.list()).toEqual([])
  })

  it('passe par les routes de l’API', async () => {
    expect((await app.request('/likes', post(pikachu))).status).toBe(201)
    expect((await app.request('/likes', post(pikachu))).status).toBe(409)
    expect(await (await app.request('/likes')).json()).toEqual({
      items: [{ id: 25, ...pikachu }],
    })
    expect((await app.request('/likes/25', { method: 'DELETE' })).status).toBe(
      204,
    )
    expect((await app.request('/likes/25', { method: 'DELETE' })).status).toBe(
      404,
    )
  })
})
