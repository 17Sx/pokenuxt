import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import type { Sql, TransactionSql } from 'postgres'

/** db/migrations/: 000_init.sql, 001_likes.sql, … */
export const MIGRATIONS = new URL('../../db/migrations/', import.meta.url)

const NAME = /^(\d{3})_[a-z0-9_]+\.sql$/

// Any number will do, as long as nothing else locks with it: every
// transaction of a run takes it, so two runs at once apply each file once.
const LOCK = 7_301_802

export type Migration = { name: string; checksum: string; sql: string }

type Applied = { name: string; checksum: string | null }

/** Refuses to go on: nothing more is applied once one of these is thrown. */
export class MigrationError extends Error {
  name = 'MigrationError'
}

/** The SHA-256 of a file, which must never change once it has been applied. */
export function checksumOf(sql: string) {
  return createHash('sha256').update(sql).digest('hex')
}

/** Every NNN_name.sql in the folder, in order. Anything else there is a mistake. */
export function readMigrations(dir: URL = MIGRATIONS): Migration[] {
  const names = readdirSync(dir).filter((file) => !file.startsWith('.'))
  const numbers = new Map<string, string>()
  for (const name of names) {
    const number = name.match(NAME)?.[1]
    if (!number) {
      throw new MigrationError(
        `${name} isn't named NNN_name.sql, like 001_likes.sql.`,
      )
    }
    const other = numbers.get(number)
    if (other) {
      throw new MigrationError(`${other} and ${name} have the same number.`)
    }
    numbers.set(number, name)
  }
  return names.sort().map((name) => {
    const sql = readFileSync(new URL(name, dir), 'utf8')
    return { name, checksum: checksumOf(sql), sql }
  })
}

async function lock(tx: TransactionSql) {
  await tx`select pg_advisory_xact_lock(${LOCK})`
}

/**
 * schema_migrations: one row per file applied, with its checksum. The first
 * runner kept no checksum and called the first file init.sql: its rows get
 * the new name and the checksum of the file as it is now.
 */
async function prepare(sql: Sql, migrations: Migration[]) {
  await sql.begin(async (tx) => {
    await lock(tx)
    await tx`
      create table if not exists schema_migrations (
        name text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `
    // On Supabase, public tables are open to its REST API until RLS is on.
    await tx`alter table schema_migrations enable row level security`
    await tx`alter table schema_migrations add column if not exists checksum text`
    await tx`
      update schema_migrations set name = '000_init.sql'
      where name = 'init.sql'
    `
    const legacy = await tx<Applied[]>`
      select name from schema_migrations where checksum is null
    `
    for (const { name } of legacy) {
      const file = migrations.find((m) => m.name === name)
      if (!file) continue
      await tx`
        update schema_migrations set checksum = ${file.checksum}
        where name = ${name}
      `
    }
  })
}

/** Refuses a database whose history doesn't match the files. */
function check(migrations: Migration[], applied: Applied[]) {
  const files = new Map(migrations.map((m) => [m.name, m]))
  for (const { name, checksum } of applied) {
    const file = files.get(name)
    if (!file) {
      throw new MigrationError(
        `${name} was applied to the database but isn't in db/migrations/.`,
      )
    }
    if (file.checksum !== checksum) {
      throw new MigrationError(
        `${name} was changed after it was applied. Put the change in a new migration.`,
      )
    }
  }

  const done = new Set(applied.map((a) => a.name))
  const last = [...done].sort().at(-1)
  const late = migrations.find(
    (m) => last && m.name < last && !done.has(m.name),
  )
  if (late) {
    throw new MigrationError(
      `${late.name} comes before ${last}, which is already applied. Give it a later number.`,
    )
  }
}

/**
 * Applies the migrations this database doesn't have yet, in order, each in
 * its own transaction. Returns their names: none when it's up to date.
 */
export async function migrate(sql: Sql, dir: URL = MIGRATIONS) {
  const migrations = readMigrations(dir)
  await prepare(sql, migrations)
  check(
    migrations,
    await sql<Applied[]>`select name, checksum from schema_migrations`,
  )

  const ran: string[] = []
  for (const migration of migrations) {
    const applied = await sql.begin(async (tx) => {
      await lock(tx)
      // Another run may have applied it while this one waited for the lock.
      const [row] = await tx<Applied[]>`
        select name, checksum from schema_migrations
        where name = ${migration.name}
      `
      if (row) {
        check([migration], [row])
        return false
      }
      await tx.unsafe(migration.sql)
      await tx`
        insert into schema_migrations (name, checksum)
        values (${migration.name}, ${migration.checksum})
      `
      return true
    })
    if (applied) ran.push(migration.name)
  }
  return ran
}
