import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let db: ReturnType<typeof drizzle<typeof schema>> | undefined

// Lazy so the app builds and boots without DATABASE_URL
export function useDb() {
  if (!db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    db = drizzle(neon(url), { schema, casing: 'snake_case' })
  }
  return db
}

export { schema }
