import { tcgdexEn } from './tcgdex'

// Pictures TCGdex lacks (booster packs, energy-only sets) come from the TCGplayer
// catalogue, mirrored daily by tcgcsv.com (no key needed, a User-Agent is required)
const TCGCSV = 'https://tcgcsv.com/tcgplayer/3'
const HEADERS = {
  'User-Agent': 'pokenuxt/0.1 (+https://github.com/17Sx/pokenuxt)',
}
const DAY = 24 * 60 * 60 * 1000

interface Group {
  groupId: number
  name: string
  abbreviation: string | null
  publishedOn: string
}

interface Product {
  productId: number
  name: string
  extendedData?: Array<{ name: string; value: string }>
}

const productImage = (product: Product) =>
  `https://tcgplayer-cdn.tcgplayer.com/product/${product.productId}_in_1000x1000.jpg`

export interface PackArt {
  image: string
  name: string
}

let groups: { at: number; value: Promise<Group[]> } | undefined
const products = new Map<number, Promise<Product[]>>()
const arts = new Map<string, { at: number; value: Promise<PackArt | null> }>()

function loadGroups() {
  if (!groups || Date.now() - groups.at > DAY) {
    const value = $fetch<{ results: Group[] }>(`${TCGCSV}/groups`, {
      headers: HEADERS,
    }).then((res) => res.results)
    groups = { at: Date.now(), value }
    value.catch(() => {
      groups = undefined
    })
  }
  return groups.value
}

function loadProducts(groupId: number) {
  let value = products.get(groupId)
  if (!value) {
    value = $fetch<{ results: Product[] }>(`${TCGCSV}/${groupId}/products`, {
      headers: HEADERS,
    }).then((res) => res.results)
    products.set(groupId, value)
    value.catch(() => products.delete(groupId))
  }
  return value
}

// "SWSH07: Evolving Skies" and "EX Evolving Skies" both become "evolving skies", "&" reads as "and"
const normalize = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^[a-z0-9&.]{1,8}\s*(?::|-)\s+/, '')
    .replace(/^ex\s+/, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const days = (a: string, b: string) =>
  Math.abs(Date.parse(a) - Date.parse(b)) / DAY

// Abbreviations collide between eras (BST is both Battle Styles and Battle Stadium),
// so every signal adds up and the best score wins
function scoreGroup(
  group: Group,
  set: { name: string; abbreviation?: string; releaseDate?: string },
) {
  const groupName = normalize(group.name)
  const setName = normalize(set.name)
  let score = 0
  if (groupName === setName) score += 100
  else if (groupName.includes(setName) || setName.includes(groupName))
    score += 30
  if (
    set.abbreviation &&
    group.abbreviation?.toLowerCase() === set.abbreviation.toLowerCase()
  )
    score += 50
  if (set.releaseDate) {
    const gap = days(group.publishedOn, set.releaseDate)
    if (gap < 1) score += 40
    else if (gap < 10) score += 20
    // Era openers are named differently ("Sun & Moon" is "SM Base Set" on TCGplayer)
    if (gap < 1 && groupName.endsWith('base set')) score += 25
  }
  return score
}

const isBoosterPack = (product: Product) =>
  /booster pack/i.test(product.name) &&
  !/code card|case|display|box|bundle|blister|collection|lot|sleeved/i.test(
    product.name,
  )

// Plain "X Booster Pack" first, then variants such as [Unlimited Edition] before [1st Edition]
const packRank = (product: Product) =>
  (product.name.includes('[') ? 2 : 0) + (/1st/i.test(product.name) ? 1 : 0)

async function resolve(setId: string): Promise<PackArt | null> {
  const set = await tcgdexEn.set.get(setId)
  if (!set) return null
  const { abbreviation } = set as typeof set & {
    abbreviation?: { official?: string }
  }
  const target = {
    name: set.name,
    abbreviation: abbreviation?.official,
    releaseDate: set.releaseDate,
  }

  const best = (await loadGroups())
    .map((group) => ({ group, score: scoreGroup(group, target) }))
    .filter(({ score }) => score >= 60)
    .sort((a, b) => b.score - a.score)[0]
  if (!best) return null

  const pack = (await loadProducts(best.group.groupId))
    .filter(isBoosterPack)
    .sort((a, b) => packRank(a) - packRank(b))[0]
  if (!pack) return null

  return {
    image: productImage(pack),
    name: pack.name,
  }
}

export function packArtFor(setId: string) {
  let art = arts.get(setId)
  if (!art || Date.now() - art.at > DAY) {
    // A network error is not cached, so the next request tries again
    const value = resolve(setId).catch(() => {
      arts.delete(setId)
      return null
    })
    art = { at: Date.now(), value }
    arts.set(setId, art)
  }
  return art.value
}

// Basic energy sets (sve, mee) have no pictures on TCGdex. TCGplayer numbers them
// the same way, so "sve-002" is "Basic Fire Energy - 002"
const ENERGY_GROUPS: Record<string, string> = { sve: 'SVE', mee: 'MEE' }

export async function energyImageFor(setId: string, localId: string) {
  const abbreviation = ENERGY_GROUPS[setId]
  if (!abbreviation) return null
  try {
    const group = (await loadGroups()).find(
      (group) => group.abbreviation === abbreviation,
    )
    if (!group) return null
    const number = Number.parseInt(localId, 10)
    const energy = (await loadProducts(group.groupId)).find(
      (product) =>
        !/holo/i.test(product.name) &&
        Number.parseInt(
          product.extendedData?.find((data) => data.name === 'Number')?.value ??
            '',
          10,
        ) === number,
    )
    return energy ? productImage(energy) : null
  } catch {
    return null
  }
}
