import { connect } from './db'
import { createMemoryWishlist, type Wishlist } from './lib/wishlist'
import { createPostgresWishlist } from './postgres-wishlist'

/**
 * Postgres when DATABASE_URL is set. Without it, memory, so local development
 * and tests need no database; production refuses to start without one.
 */
export function wishlistFromEnv(env = process.env): Wishlist {
  if (env.DATABASE_URL) return createPostgresWishlist(connect(env.DATABASE_URL))
  if (env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production')
  }
  console.warn('DATABASE_URL is not set: the wishlist is kept in memory.')
  return createMemoryWishlist()
}
