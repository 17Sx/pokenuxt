// What the deploy checks once a release is live: the API, the server-rendered
// front on Vercel and the generated one on CloudFront. Pages are read as raw
// HTML, the way a crawler or curl sees them, without running any JavaScript.

export type Check = {
  name: string
  url: string
  status: number
  /** Sent with the request, like a cookie to pick the language. */
  headers?: Record<string, string>
  /** Where a redirect points, as a path. */
  location?: string
  title?: string
  h1?: string
  lang?: string
  /** Text the body must contain. */
  contains?: string[]
  /** A response header and the value it must have. */
  header?: [name: string, value: string]
}

export type Response = {
  status: number
  headers: Headers
  body: string
}

export type Sites = {
  api?: string
  /** The server-rendered front, on Vercel. */
  ssr?: string
  /** The generated front, on S3 and CloudFront. */
  ssg?: string
  /** The commit the release was built from, which version.json must name. */
  version?: string
}

const base = (url: string) => url.replace(/\/+$/, '')

const decode = (text: string) =>
  text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

const text = (html: string) => decode(html.replace(/<[^>]*>/g, '')).trim()

const firstTag = (html: string, tag: string) => {
  const inner = html.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'),
  )
  return inner?.[1] === undefined ? undefined : text(inner[1])
}

export const titleOf = (html: string) => firstTag(html, 'title')

export const h1Of = (html: string) => firstTag(html, 'h1')

export const langOf = (html: string) =>
  html.match(/<html[^>]*\slang="([^"]*)"/i)?.[1]

/** What is wrong with a response, or nothing when it is as expected. */
export function problems(check: Check, response: Response): string[] {
  const found: string[] = []
  const expect = (what: string, wanted: string, got: string | undefined) => {
    if (got !== wanted) found.push(`${what}: wanted "${wanted}", got "${got}"`)
  }

  if (response.status !== check.status) {
    found.push(`status: wanted ${check.status}, got ${response.status}`)
    return found
  }
  if (check.location !== undefined) {
    const location = response.headers.get('location') ?? undefined
    expect(
      'location',
      check.location,
      location && new URL(location, check.url).pathname,
    )
  }
  if (check.header) {
    const [name, value] = check.header
    expect(name, value, response.headers.get(name) ?? undefined)
  }
  if (check.title !== undefined)
    expect('title', check.title, titleOf(response.body))
  if (check.h1 !== undefined) expect('h1', check.h1, h1Of(response.body))
  if (check.lang !== undefined)
    expect('lang', check.lang, langOf(response.body))
  for (const piece of check.contains ?? []) {
    if (!response.body.includes(piece)) found.push(`body: no "${piece}"`)
  }
  return found
}

function pageChecks(site: string, kind: 'SSR' | 'SSG'): Check[] {
  return [
    {
      name: `${kind} home`,
      url: `${site}/`,
      status: 200,
      title: 'PokéNuxt',
      lang: 'fr',
    },
    {
      name: `${kind} Pikachu`,
      url: `${site}/pokemon/pikachu`,
      status: 200,
      title: 'Pikachu — PokéNuxt',
      h1: 'Pikachu',
      lang: 'fr',
      contains: ['#0025', 'Électrik'],
    },
    {
      name: `${kind} Bulbizarre`,
      url: `${site}/pokemon/bulbasaur`,
      status: 200,
      title: 'Bulbizarre — PokéNuxt',
      h1: 'Bulbizarre',
      contains: ['#0001', 'Plante', 'Poison'],
    },
    {
      name: `${kind} unknown Pokémon`,
      url: `${site}/pokemon/missingno`,
      status: 404,
    },
  ]
}

const versionCheck = (name: string, site: string, version: string): Check => ({
  name,
  url: `${site}/version.json`,
  status: 200,
  contains: [`"commit":"${version}"`],
})

/** Every check for the sites given. A site left out is not checked. */
export function checksFor({ api, ssr, ssg, version }: Sites): Check[] {
  const checks: Check[] = []

  if (api) {
    api = base(api)
    checks.push(
      {
        name: 'API health',
        url: `${api}/health`,
        status: 200,
        contains: ['"ok":true'],
      },
      {
        name: 'API PokéAPI proxy',
        url: `${api}/pokeapi/pokemon/pikachu`,
        status: 200,
        contains: ['"name":"pikachu"'],
      },
      { name: 'API wishlist', url: `${api}/wishlist`, status: 200 },
      { name: 'API likes', url: `${api}/likes`, status: 200 },
      { name: 'API unknown route', url: `${api}/nope`, status: 404 },
    )
    for (const site of [ssr, ssg].filter(Boolean).map((s) => base(s!))) {
      checks.push({
        name: `API lets ${new URL(site).host} in`,
        url: `${api}/health`,
        status: 200,
        headers: { origin: site },
        header: ['access-control-allow-origin', site],
      })
    }
  }

  if (ssr) {
    ssr = base(ssr)
    checks.push(
      ...pageChecks(ssr, 'SSR'),
      // Rendered for each request: the language cookie changes the HTML.
      {
        name: 'SSR in English',
        url: `${ssr}/pokemon/bulbasaur`,
        status: 200,
        headers: { cookie: 'pokenuxt-lang=en' },
        title: 'Bulbasaur — PokéNuxt',
        lang: 'en',
        contains: ['Grass'],
      },
      {
        name: 'SSR number redirect',
        url: `${ssr}/pokemon/25`,
        status: 301,
        location: '/pokemon/pikachu',
      },
    )
    if (version) checks.push(versionCheck('SSR version', ssr, version))
  }

  if (ssg) {
    ssg = base(ssg)
    checks.push(...pageChecks(ssg, 'SSG'), {
      name: 'SSG Pikachu payload',
      url: `${ssg}/pokemon/pikachu/_payload.json`,
      status: 200,
      contains: ['pikachu'],
    })
    if (version) checks.push(versionCheck('SSG version', ssg, version))
  }

  return checks
}
