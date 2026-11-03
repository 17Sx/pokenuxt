import type { Sql } from 'postgres'
import type { Pokemon } from './lib/pokemon'
import { pokemonId } from './lib/pokemon'
import type { Wishlist, WishlistItem } from './lib/wishlist'

/** The wishlist in the wishlist_items table, from db/init.sql. */
export function createPostgresWishlist(sql: Sql): Wishlist {
  return {
    async list() {
      const rows = await sql<WishlistItem[]>`
        select id, name, url from wishlist_items order by added_at, id
      `
      return rows.map(({ id, name, url }) => ({ id, name, url }))
    },
    async add(pokemon: Pokemon) {
      const rows = await sql`
        insert into wishlist_items (id, name, url)
        values (${pokemonId(pokemon)}, ${pokemon.name}, ${pokemon.url})
        on conflict do nothing
        returning id
      `
      return rows.length > 0
    },
    async remove(id: number) {
      const rows = await sql`
        delete from wishlist_items where id = ${id} returning id
      `
      return rows.length > 0
    },
  }
}
