import { Query } from '@tcgdex/sdk'
import type { CardResumeModel } from '@tcgdex/sdk'
import { tcgdex } from './tcgdex'

export type Tier = 'common' | 'uncommon' | 'rare' | 'holo' | 'ultra' | 'secret'

// French rarity names grouped by how hard they are to pull.
// Classic sets use Commune/Rare…, Pocket sets use diamonds and stars.
const TIERS: Record<Tier, string[]> = {
  common: ['Commune', 'Un Diamant'],
  uncommon: ['Peu Commune', 'Deux Diamants'],
  rare: ['Rare', 'Trois Diamants', 'Rare Noir Blanc'],
  holo: [
    'Holo Rare',
    'Rare Holo',
    'Double rare',
    'Holo Rare V',
    'Holo Rare VMAX',
    'Holo Rare VSTAR',
    'Quatre Diamants',
    'Rare Holo LV.X',
    'Rare Prime',
    'Radieux Rare',
    'Une Étoile',
    'Magnifique',
    'Pikachu Rare',
    'Un Chromatique',
    'Collection Classique',
  ],
  ultra: [
    'Ultra Rare',
    'Illustration rare',
    'Shiny rare',
    'Shiny rare V',
    'Shiny rare VMAX',
    'Deux Étoiles',
    'LÉGENDE',
    'Dresseur Full Art',
    'Magnifique rare',
    'Mega Attack Rare',
    'Chromatique ultra rare',
    'Deux Chromatiques',
    'RGB Rare',
    'HIGH-TECH rare',
    'Futuristic Rare',
  ],
  secret: [
    'Hyper rare',
    'Illustration spéciale rare',
    'Méga Hyper Rare',
    'Trois Étoiles',
    'Couronne',
  ],
}

export const tierOf = (rarity?: string) =>
  (Object.keys(TIERS) as Tier[]).find(
    (tier) => rarity && TIERS[tier].includes(rarity),
  ) ?? null

// Odds for the rare slot, renormalised over the tiers the set actually has
const RARE_SLOT_WEIGHTS: Partial<Record<Tier, number>> = {
  rare: 65,
  holo: 22,
  ultra: 10,
  secret: 3,
}

const PACK_LAYOUT = { common: 5, uncommon: 3, bonus: 1, rareSlot: 1 }

export interface PackCard {
  card: CardResumeModel
  tier: Tier
}

type Pools = Record<Tier, CardResumeModel[]>

// Set contents never change, so pools are kept for the life of the server
const poolsCache = new Map<string, Promise<Pools>>()

function loadPools(setId: string) {
  let pools = poolsCache.get(setId)
  if (!pools) {
    pools = (async () => {
      const entries = await Promise.all(
        (Object.keys(TIERS) as Tier[]).map(
          async (tier) =>
            [
              tier,
              await tcgdex.card.list(
                Query.create()
                  .equal('set.id', setId)
                  .equal('rarity', TIERS[tier].join('|')),
              ),
            ] as const,
        ),
      )
      return Object.fromEntries(entries) as Pools
    })()
    poolsCache.set(setId, pools)
    pools.catch(() => poolsCache.delete(setId))
  }
  return pools
}

const randomItem = <T>(items: T[]) =>
  items[Math.floor(Math.random() * items.length)]!

// Draws without repeating a card until the pool runs out
function draw(pool: CardResumeModel[], count: number, taken: Set<string>) {
  const picked: CardResumeModel[] = []
  for (let i = 0; i < count && pool.length; i++) {
    const fresh = pool.filter((card) => !taken.has(card.id))
    const card = randomItem(fresh.length ? fresh : pool)
    taken.add(card.id)
    picked.push(card)
  }
  return picked
}

function pickRareTier(pools: Pools) {
  const available = Object.entries(RARE_SLOT_WEIGHTS).filter(
    ([tier]) => pools[tier as Tier].length,
  )
  const total = available.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = Math.random() * total
  for (const [tier, weight] of available) {
    roll -= weight
    if (roll < 0) return tier as Tier
  }
  return available.at(-1)?.[0] as Tier | undefined
}

export async function openPack(setId: string): Promise<PackCard[] | null> {
  const pools = await loadPools(setId)
  const taken = new Set<string>()
  const pack: PackCard[] = []
  const add = (tier: Tier, count: number) => {
    for (const card of draw(pools[tier], count, taken))
      pack.push({ card, tier })
  }

  const lowTiers = (['common', 'uncommon'] as const).filter(
    (tier) => pools[tier].length,
  )
  const rareTier = pickRareTier(pools)
  if (!rareTier && !lowTiers.length) return null

  // Sets without commons/uncommons (e.g. special collections) fill the pack from rarer tiers
  const filler = lowTiers[0] ?? rareTier!
  add(pools.common.length ? 'common' : filler, PACK_LAYOUT.common)
  add(pools.uncommon.length ? 'uncommon' : filler, PACK_LAYOUT.uncommon)
  add(
    pools.rare.length && Math.random() < 0.5 ? 'rare' : filler,
    PACK_LAYOUT.bonus,
  )
  if (rareTier) add(rareTier, PACK_LAYOUT.rareSlot)

  return pack
}
