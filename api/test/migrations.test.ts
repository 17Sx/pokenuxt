import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import postgres, { type Sql } from 'postgres'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { connect } from '../src/db'
import {
  checksumOf,
  migrate,
  MigrationError,
  readMigrations,
} from '../src/migrations'

/** A folder of migrations for one test. Returns it, and a way to change it. */
function folder(files: Record<string, string>) {
  const path = mkdtempSync(join(tmpdir(), 'migrations-'))
  const write = (more: Record<string, string>) => {
    for (const [name, sql] of Object.entries(more)) {
      writeFileSync(join(path, name), sql)
    }
  }
  write(files)
  const remove = (name: string) => rmSync(join(path, name))
  return { dir: pathToFileURL(`${path}/`), write, remove }
}

describe('readMigrations', () => {
  it('lit les fichiers dans l’ordre, avec leur checksum', () => {
    const { dir } = folder({
      '010_c.sql': 'select 3',
      '000_a.sql': 'select 1',
      '002_b.sql': 'select 2',
    })

    expect(readMigrations(dir)).toEqual([
      { name: '000_a.sql', checksum: checksumOf('select 1'), sql: 'select 1' },
      { name: '002_b.sql', checksum: checksumOf('select 2'), sql: 'select 2' },
      { name: '010_c.sql', checksum: checksumOf('select 3'), sql: 'select 3' },
    ])
  })

  it.each([
    ['sans numéro', 'init.sql'],
    ['avec un numéro trop court', '1_likes.sql'],
    ['avec des majuscules', '001_Likes.sql'],
    ['qui n’est pas du SQL', '001_likes.txt'],
  ])('refuse un fichier %s', (_, name) => {
    const { dir } = folder({ '000_a.sql': 'select 1', [name]: 'select 2' })

    expect(() => readMigrations(dir)).toThrow(MigrationError)
  })

  it('refuse deux fichiers avec le même numéro', () => {
    const { dir } = folder({ '001_a.sql': 'select 1', '001_b.sql': 'select 2' })

    expect(() => readMigrations(dir)).toThrow(/same number/)
  })

  it('trouve les migrations du dépôt', () => {
    expect(readMigrations().map((m) => m.name)).toEqual([
      '000_init.sql',
      '001_likes.sql',
    ])
  })
})

// A throwaway database only, never DATABASE_URL. Each test gets a schema of
// its own, dropped afterwards, so the tables it makes never meet another's.
const url = process.env.TEST_DATABASE_URL

describe.skipIf(!url)('migrate sur Postgres', () => {
  const admin = connect(url ?? '', 1)
  const opened: Sql[] = []
  let schema: string
  let sql: Sql

  function connectToSchema() {
    const db = postgres(url ?? '', {
      prepare: false,
      max: 1,
      onnotice: () => {},
      connection: { search_path: schema },
    })
    opened.push(db)
    return db
  }

  async function applied() {
    return sql<{ name: string; checksum: string; applied_at: Date }[]>`
      select name, checksum, applied_at from schema_migrations order by name
    `
  }

  async function tables() {
    const rows = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = ${schema} order by table_name
    `
    return rows.map((row) => row.table_name)
  }

  beforeEach(async () => {
    schema = `migrations_${randomUUID().replaceAll('-', '')}`
    await admin.unsafe(`create schema ${schema}`)
    sql = connectToSchema()
  })

  afterEach(async () => {
    await Promise.all(opened.splice(0).map((db) => db.end()))
    await admin.unsafe(`drop schema ${schema} cascade`)
  })

  afterAll(async () => {
    await admin.end()
  })

  it('applique les fichiers dans l’ordre et les note', async () => {
    const { dir } = folder({
      '000_numbers.sql': 'create table numbers (n integer)',
      '001_one.sql': 'insert into numbers values (1)',
    })

    expect(await migrate(sql, dir)).toEqual(['000_numbers.sql', '001_one.sql'])

    expect(await sql`select n from numbers`).toEqual([{ n: 1 }])
    expect(await applied()).toEqual([
      {
        name: '000_numbers.sql',
        checksum: checksumOf('create table numbers (n integer)'),
        applied_at: expect.any(Date),
      },
      {
        name: '001_one.sql',
        checksum: checksumOf('insert into numbers values (1)'),
        applied_at: expect.any(Date),
      },
    ])
  })

  it('ne fait rien quand tout est à jour', async () => {
    const { dir } = folder({
      '000_numbers.sql': 'create table numbers (n integer)',
      '001_one.sql': 'insert into numbers values (1)',
    })
    await migrate(sql, dir)
    const before = await applied()

    expect(await migrate(sql, dir)).toEqual([])

    expect(await applied()).toEqual(before)
    expect(await sql`select n from numbers`).toEqual([{ n: 1 }])
  })

  it('n’applique que les nouveaux fichiers', async () => {
    const { dir, write } = folder({
      '000_numbers.sql': 'create table numbers (n integer)',
    })
    await migrate(sql, dir)

    write({ '001_one.sql': 'insert into numbers values (1)' })

    expect(await migrate(sql, dir)).toEqual(['001_one.sql'])
    expect(await sql`select n from numbers`).toEqual([{ n: 1 }])
  })

  it('applique chaque fichier dans sa propre transaction', async () => {
    const { dir, write } = folder({
      '000_numbers.sql': 'create table numbers (n integer)',
      '001_broken.sql': 'create table letters (c text); select 1 / 0',
      '002_one.sql': 'insert into numbers values (1)',
    })

    await expect(migrate(sql, dir)).rejects.toThrow(/division by zero/)

    // The first one stays, the broken one leaves nothing behind, and the
    // ones after it wait.
    expect((await applied()).map((m) => m.name)).toEqual(['000_numbers.sql'])
    expect(await tables()).toEqual(['numbers', 'schema_migrations'])
    expect(await sql`select n from numbers`).toEqual([])

    // It never ran, so it can still be fixed.
    write({ '001_broken.sql': 'create table letters (c text)' })
    expect(await migrate(sql, dir)).toEqual(['001_broken.sql', '002_one.sql'])
  })

  it('refuse de continuer si une migration appliquée a changé', async () => {
    const { dir, write } = folder({
      '000_numbers.sql': 'create table numbers (n integer)',
    })
    await migrate(sql, dir)

    write({
      '000_numbers.sql': 'create table numbers (n bigint)',
      '001_one.sql': 'insert into numbers values (1)',
    })

    await expect(migrate(sql, dir)).rejects.toThrow(
      new MigrationError(
        '000_numbers.sql was changed after it was applied. Put the change in a new migration.',
      ),
    )
    expect((await applied()).map((m) => m.name)).toEqual(['000_numbers.sql'])
    expect(await sql`select n from numbers`).toEqual([])
  })

  it('refuse une migration appliquée qui n’est plus dans le dossier', async () => {
    const { dir, remove } = folder({
      '000_numbers.sql': 'create table numbers (n integer)',
      '001_one.sql': 'insert into numbers values (1)',
    })
    await migrate(sql, dir)

    remove('001_one.sql')

    await expect(migrate(sql, dir)).rejects.toThrow(/001_one.sql was applied/)
  })

  it('refuse une migration numérotée avant la dernière appliquée', async () => {
    const { dir, write } = folder({
      '000_numbers.sql': 'create table numbers (n integer)',
      '002_two.sql': 'insert into numbers values (2)',
    })
    await migrate(sql, dir)

    write({ '001_one.sql': 'insert into numbers values (1)' })

    await expect(migrate(sql, dir)).rejects.toThrow(
      /001_one.sql comes before 002_two.sql/,
    )
    expect(await sql`select n from numbers`).toEqual([{ n: 2 }])
  })

  it('n’applique qu’une fois quand deux déploiements tournent ensemble', async () => {
    const { dir } = folder({
      '000_numbers.sql': 'create table numbers (n integer)',
      '001_one.sql': 'insert into numbers values (1)',
    })

    const runs = await Promise.all([
      migrate(connectToSchema(), dir),
      migrate(connectToSchema(), dir),
    ])

    expect(runs.flat().sort()).toEqual(['000_numbers.sql', '001_one.sql'])
    expect(await sql`select n from numbers`).toEqual([{ n: 1 }])
  })

  it('reprend la table de l’ancien runner, sans checksum', async () => {
    // What production has: init.sql applied by the first runner.
    await sql`
      create table schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `
    await sql`create table numbers (n integer)`
    await sql`insert into schema_migrations (name) values ('init.sql')`
    const { dir } = folder({
      '000_init.sql': 'create table numbers (n integer)',
      '001_one.sql': 'insert into numbers values (1)',
    })

    expect(await migrate(sql, dir)).toEqual(['001_one.sql'])

    expect(await applied()).toEqual([
      {
        name: '000_init.sql',
        checksum: checksumOf('create table numbers (n integer)'),
        applied_at: expect.any(Date),
      },
      {
        name: '001_one.sql',
        checksum: checksumOf('insert into numbers values (1)'),
        applied_at: expect.any(Date),
      },
    ])
    expect(await migrate(sql, dir)).toEqual([])
  })

  it('applique les migrations du dépôt à une base vide, puis plus rien', async () => {
    expect(await migrate(sql)).toEqual(['000_init.sql', '001_likes.sql'])
    expect(await tables()).toEqual([
      'likes',
      'schema_migrations',
      'wishlist_items',
    ])

    expect(await migrate(sql)).toEqual([])
  })
})
