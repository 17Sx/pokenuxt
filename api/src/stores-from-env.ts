import type { AppOptions } from './create-app'
import { connect } from './db'
import { createMemoryLikes } from './lib/likes'
import { createMemoryWishlist } from './lib/wishlist'
import { createPostgresLikes } from './postgres-likes'
import { createPostgresWishlist } from './postgres-wishlist'

/**
 * The wishlist and the likes, in Postgres when DATABASE_URL is set. Without
 * it, memory, so local development and tests need no database; production
 * refuses to start without one.
 */
export function storesFromEnv(
  env = process.env,
): Required<Pick<AppOptions, 'wishlist' | 'likes'>> {
  if (env.DATABASE_URL) {
    const sql = connect(env.DATABASE_URL)
    return {
      wishlist: createPostgresWishlist(sql),
      likes: createPostgresLikes(sql),
    }
  }
  if (env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production')
  }
  console.warn(
    'DATABASE_URL is not set: the wishlist and likes are kept in memory.',
  )
  return { wishlist: createMemoryWishlist(), likes: createMemoryLikes() }
}
