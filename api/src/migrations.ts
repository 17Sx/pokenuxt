import { existsSync, readdirSync, readFileSync } from 'node:fs'
import type { Sql } from 'postgres'

const DB = new URL('../../db/', import.meta.url)

/** db/init.sql first, then db/migrations/*.sql in name order. */
export function migrationFiles() {
  const later = new URL('migrations/', DB)
  return [
    'init.sql',
    ...(existsSync(later)
      ? readdirSync(later)
          .filter((file) => file.endsWith('.sql'))
          .sort()
          .map((file) => `migrations/${file}`)
      : []),
  ]
}

/** Applies the files that haven't run on this database yet, each in its own transaction. */
export async function migrate(sql: Sql) {
  await sql`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `
  // On Supabase, public tables are open to its REST API until RLS is on.
  await sql`alter table schema_migrations enable row level security`
  const applied = new Set(
    (await sql<{ name: string }[]>`select name from schema_migrations`).map(
      (row) => row.name,
    ),
  )

  const ran: string[] = []
  for (const file of migrationFiles()) {
    if (applied.has(file)) continue
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(new URL(file, DB), 'utf8'))
      await tx`insert into schema_migrations (name) values (${file})`
    })
    ran.push(file)
  }
  return ran
}
