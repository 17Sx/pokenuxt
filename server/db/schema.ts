import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Example table, replace with the real schema
export const favorites = pgTable('favorites', {
  id: uuid().primaryKey().defaultRandom(),
  cardId: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
})
