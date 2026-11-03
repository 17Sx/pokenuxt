import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  checkFolder,
  compareLocale,
  keysOf,
  placeholders,
} from './check-i18n.mjs'

const en = {
  home: { title: 'Every Pokémon.', intro: '{count} Pokémon' },
  wishlist: { add: 'Add {name}', remove: 'Remove {name}' },
}

describe('placeholders', () => {
  it('trouve les variables, triées et sans doublon', () => {
    expect(placeholders('{name} et { count } puis {name}')).toEqual([
      'count',
      'name',
    ])
    expect(placeholders('Aucune variable')).toEqual([])
  })
})

describe('keysOf', () => {
  it('liste toutes les clés avec leur chemin', () => {
    expect(keysOf(en)).toEqual([
      'home.title',
      'home.intro',
      'wishlist.add',
      'wishlist.remove',
    ])
  })
})

describe('compareLocale', () => {
  it('ne trouve rien quand la langue est complète', () => {
    const fr = {
      home: { title: 'Tous les Pokémon.', intro: '{count} Pokémon' },
      wishlist: { add: 'Ajouter {name}', remove: 'Retirer {name}' },
    }

    expect(compareLocale(en, fr)).toEqual([])
  })

  it('signale les clés manquantes, y compris tout un groupe', () => {
    expect(
      compareLocale(en, { home: { title: 'Titre', intro: '{count}' } }),
    ).toEqual([
      { problem: 'missing', key: 'wishlist.add' },
      { problem: 'missing', key: 'wishlist.remove' },
    ])
  })

  it('signale les clés en trop', () => {
    const fr = { ...en, home: { ...en.home, bonus: 'x' }, old: { a: 'b' } }

    expect(compareLocale(en, fr)).toEqual([
      { problem: 'extra', key: 'home.bonus' },
      { problem: 'extra', key: 'old.a' },
    ])
  })

  it('signale un texte à la place d’un groupe', () => {
    expect(compareLocale(en, { ...en, wishlist: 'Wishlist' })).toEqual([
      {
        problem: 'type',
        key: 'wishlist',
        detail: 'string instead of group',
      },
    ])
  })

  it('signale un texte vide', () => {
    const fr = { ...en, home: { ...en.home, title: '  ' } }

    expect(compareLocale(en, fr)).toEqual([
      { problem: 'empty', key: 'home.title' },
    ])
  })

  it('signale une variable renommée ou oubliée', () => {
    const fr = {
      ...en,
      home: { ...en.home, intro: '{total} Pokémon' },
      wishlist: { ...en.wishlist, add: 'Ajouter' },
    }

    expect(compareLocale(en, fr)).toEqual([
      {
        problem: 'placeholders',
        key: 'home.intro',
        detail: '{total} instead of {count}',
      },
      {
        problem: 'placeholders',
        key: 'wishlist.add',
        detail: 'none instead of {name}',
      },
    ])
  })
})

describe('checkFolder', () => {
  let folder: string

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  function write(files: Record<string, string>) {
    folder = mkdtempSync(join(tmpdir(), 'locales-'))
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(folder, name), content)
    }
  }

  it('compare chaque fichier à en.json', () => {
    write({
      'en.json': JSON.stringify(en),
      'fr.json': JSON.stringify(en),
      'es.json': JSON.stringify({ home: en.home }),
    })

    const results = checkFolder(folder)

    expect(
      results.map((r) => [r.file.split('/').pop(), r.issues?.length]),
    ).toEqual([
      ['es.json', 2],
      ['fr.json', 0],
    ])
  })

  it('signale un JSON invalide sans planter', () => {
    write({ 'en.json': JSON.stringify(en), 'fr.json': '{ "home": ' })

    const [result] = checkFolder(folder)

    expect(result?.error).toMatch(/^is not valid JSON/)
  })

  it('signale l’absence de en.json', () => {
    write({ 'fr.json': '{}' })

    expect(checkFolder(folder)[0]?.error).toBe(
      'is missing: it is the reference',
    )
  })
})
