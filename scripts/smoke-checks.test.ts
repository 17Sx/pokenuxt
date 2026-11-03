import { describe, expect, it } from 'vitest'
import {
  checksFor,
  h1Of,
  langOf,
  problems,
  titleOf,
  type Check,
} from './smoke-checks'

const page = `<!DOCTYPE html><html  lang="fr"><head><title>Pikachu — PokéNuxt</title></head>
<body><h1 class="mt-3">
  Pikachu
</h1><span>#0025</span><li>Électrik</li></body></html>`

const ok = (body = page, headers: Record<string, string> = {}) => ({
  status: 200,
  headers: new Headers(headers),
  body,
})

const pikachu: Check = {
  name: 'Pikachu',
  url: 'https://site.test/pokemon/pikachu',
  status: 200,
  title: 'Pikachu — PokéNuxt',
  h1: 'Pikachu',
  lang: 'fr',
  contains: ['#0025', 'Électrik'],
}

describe('raw HTML', () => {
  it('lit le titre, le h1 et la langue', () => {
    expect(titleOf(page)).toBe('Pikachu — PokéNuxt')
    expect(h1Of(page)).toBe('Pikachu')
    expect(langOf(page)).toBe('fr')
  })

  it('décode les entités et retire les balises', () => {
    expect(titleOf('<title>M. Mime &amp; co &#39;</title>')).toBe(
      "M. Mime & co '",
    )
    expect(h1Of('<h1><span>Mew</span>two</h1>')).toBe('Mewtwo')
  })

  it('ne trouve rien dans une page vide', () => {
    expect(titleOf('')).toBeUndefined()
    expect(h1Of('<div id="__nuxt"></div>')).toBeUndefined()
    expect(langOf('<html>')).toBeUndefined()
  })
})

describe('problems', () => {
  it('accepte une page conforme', () => {
    expect(problems(pikachu, ok())).toEqual([])
  })

  it("s'arrête au code HTTP quand il est faux", () => {
    expect(problems(pikachu, { ...ok(), status: 500 })).toEqual([
      'status: wanted 200, got 500',
    ])
  })

  it('signale un titre, un h1 et un contenu manquants', () => {
    // A page rendered only in the browser: the HTML is an empty shell.
    const shell =
      '<html lang="fr"><title>PokéNuxt</title><div id="__nuxt"></div>'

    expect(problems(pikachu, ok(shell))).toEqual([
      'title: wanted "Pikachu — PokéNuxt", got "PokéNuxt"',
      'h1: wanted "Pikachu", got "undefined"',
      'body: no "#0025"',
      'body: no "Électrik"',
    ])
  })

  it("compare la redirection et l'en-tête attendu", () => {
    const check: Check = {
      name: 'redirect',
      url: 'https://site.test/pokemon/25',
      status: 301,
      location: '/pokemon/pikachu',
      header: ['access-control-allow-origin', 'https://site.test'],
    }
    const response = (location: string, origin: string) => ({
      status: 301,
      headers: new Headers({ location, 'access-control-allow-origin': origin }),
      body: '',
    })

    expect(
      problems(
        check,
        response('https://site.test/pokemon/pikachu', 'https://site.test'),
      ),
    ).toEqual([])
    expect(problems(check, response('/pokemon/raichu', '*'))).toEqual([
      'location: wanted "/pokemon/pikachu", got "/pokemon/raichu"',
      'access-control-allow-origin: wanted "https://site.test", got "*"',
    ])
  })
})

describe('checksFor', () => {
  it("ne vérifie que les sites donnés, sans / à la fin d'URL", () => {
    const checks = checksFor({ ssg: 'https://cdn.test/' })

    expect(checks.every((c) => c.url.startsWith('https://cdn.test/'))).toBe(
      true,
    )
    expect(checks.some((c) => c.url.includes('//pokemon'))).toBe(false)
    expect(checks.some((c) => c.name.startsWith('SSR'))).toBe(false)
  })

  it("vérifie /health, une page SSR, une page SSG et le CORS de l'API", () => {
    const checks = checksFor({
      api: 'https://api.test',
      ssr: 'https://ssr.test',
      ssg: 'https://cdn.test',
    })
    const urls = checks.map((c) => `${c.status} ${c.url}`)

    expect(urls).toContain('200 https://api.test/health')
    expect(urls).toContain('200 https://ssr.test/pokemon/pikachu')
    expect(urls).toContain('200 https://cdn.test/pokemon/pikachu')
    expect(urls).toContain('404 https://cdn.test/pokemon/missingno')
    expect(urls).toContain('301 https://ssr.test/pokemon/25')
    expect(
      checks
        .filter((c) => c.header?.[0] === 'access-control-allow-origin')
        .map((c) => c.headers?.origin),
    ).toEqual(['https://ssr.test', 'https://cdn.test'])
  })

  it('vérifie la version publiée quand elle est donnée', () => {
    const checks = checksFor({
      ssr: 'https://ssr.test',
      ssg: 'https://cdn.test',
      version: 'abc123',
    })

    expect(
      checks
        .filter((c) => c.url.endsWith('/version.json'))
        .map((c) => c.contains),
    ).toEqual([['"commit":"abc123"'], ['"commit":"abc123"']])
    expect(
      checksFor({ ssg: 'https://cdn.test' }).some((c) =>
        c.url.endsWith('/version.json'),
      ),
    ).toBe(false)
  })
})
