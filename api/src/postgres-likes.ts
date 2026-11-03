import type { Sql } from 'postgres'
import type { Like, Likes } from './lib/likes'
import type { Pokemon } from './lib/pokemon'
import { pokemonId } from './lib/pokemon'

/** The likes in the likes table, from db/migrations/001_likes.sql. */
export function createPostgresLikes(sql: Sql): Likes {
  return {
    async list() {
      const rows = await sql<Like[]>`
        select id, name, url from likes order by liked_at, id
      `
      return rows.map(({ id, name, url }) => ({ id, name, url }))
    },
    async add(pokemon: Pokemon) {
      const rows = await sql`
        insert into likes (id, name, url)
        values (${pokemonId(pokemon)}, ${pokemon.name}, ${pokemon.url})
        on conflict do nothing
        returning id
      `
      return rows.length > 0
    },
    async remove(id: number) {
      const rows = await sql`delete from likes where id = ${id} returning id`
      return rows.length > 0
    },
  }
}
