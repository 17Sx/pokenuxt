import { Query } from '@tcgdex/sdk'
import type { CardResumeModel } from '@tcgdex/sdk'
import { ruleFor } from './packRules'
import type { PackRule, SlotPick } from './packRules'
import { tcgdex } from './tcgdex'

type RarityTier = 'common' | 'uncommon' | 'rare' | 'holo' | 'ultra' | 'secret'
// Energies get their own slot, outside rarity odds
export type Tier = RarityTier | 'energy'

// French rarity names grouped by how hard they are to pull, for display.
// Pack contents and odds live in packRules.ts.
// Classic sets use Commune/Rare…, Pocket sets use diamonds and stars.
const TIERS: Record<RarityTier, string[]> = {
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

const RARITY_TIERS = Object.keys(TIERS) as RarityTier[]

export const tierOf = (rarity?: string) =>
  RARITY_TIERS.find((tier) => rarity && TIERS[tier].includes(rarity)) ?? null

export interface PackCard {
  card: CardResumeModel
  tier: Tier
  reverse: boolean
}

// Set contents never change, so lookups are kept for the life of the server
const cache = new Map<string, Promise<CardResumeModel[]>>()

function cached(key: string, load: () => Promise<CardResumeModel[]>) {
  let value = cache.get(key)
  if (!value) {
    value = load()
    cache.set(key, value)
    value.catch(() => cache.delete(key))
  }
  return value
}

const rarityPool = (setId: string, rarities: string[]) =>
  cached(`${setId}|${rarities.join('|')}`, () =>
    tcgdex.card.list(
      Query.create().equal('set.id', setId).equal('rarity', rarities.join('|')),
    ),
  )

// Holo and non-holo rares share a rarity in old sets: only the card details tell them apart
const pickPool = (setId: string, pick: SlotPick) => {
  if (pick.holo === undefined) return rarityPool(setId, pick.rarities)
  return cached(
    `${setId}|${pick.rarities.join('|')}|holo:${pick.holo}`,
    async () => {
      const cards = await rarityPool(setId, pick.rarities)
      const details = await Promise.all(
        cards.map((card) => tcgdex.card.get(card.id)),
      )
      return cards.filter((_, i) => {
        const variants = details[i]?.variants
        const holo = Boolean(variants?.holo && !variants.normal)
        return holo === pick.holo
      })
    },
  )
}

const basicEnergies = (setId: string, commonOnly: boolean) =>
  cached(`${setId}|energy|${commonOnly}`, () => {
    const query = Query.create()
      .equal('set.id', setId)
      .equal('category', 'Énergie')
      .equal('energyType', 'De base')
    if (commonOnly) query.equal('rarity', 'Commune')
    return tcgdex.card.list(query)
  })

const randomItem = <T>(items: T[]) =>
  items[Math.floor(Math.random() * items.length)]!

// Avoids repeating a card until the pool runs out
function drawOne(pool: CardResumeModel[], taken: Set<string>) {
  const fresh = pool.filter((card) => !taken.has(card.id))
  const card = randomItem(fresh.length ? fresh : pool)
  taken.add(card.id)
  return card
}

function rollPick<T extends { pick: SlotPick }>(options: T[]) {
  const total = options.reduce((sum, option) => sum + option.pick.weight, 0)
  let roll = Math.random() * total
  for (const option of options) {
    roll -= option.pick.weight
    if (roll < 0) return option
  }
  return options.at(-1)!
}

const tierFor = (pick: SlotPick): Tier =>
  pick.holo ? 'holo' : (tierOf(pick.rarities[0]) ?? 'rare')

async function energiesFor(setId: string, rule: PackRule) {
  const own = await basicEnergies(setId, true)
  if (own.length || !rule.energyFallback) return { own, pool: own }
  return { own, pool: await basicEnergies(rule.energyFallback, false) }
}

export async function openPack(setId: string): Promise<PackCard[] | null> {
  const set = await tcgdex.set.get(setId)
  const rule = ruleFor(set?.serie.id)
  const energies = await energiesFor(setId, rule)
  // Old sets file basic energies as commons, they only belong in the energy slot
  const energyIds = new Set(energies.own.map((card) => card.id))
  const energyCount = energies.pool.length ? rule.energy : 0

  const taken = new Set<string>()
  const pack: PackCard[] = []
  for (const [index, slot] of rule.slots.entries()) {
    const options = (
      await Promise.all(
        slot.picks.map(async (pick) => ({
          pick,
          pool: (await pickPool(setId, pick)).filter(
            (card) => !energyIds.has(card.id),
          ),
        })),
      )
    ).filter((option) => option.pool.length)
    if (!options.length) continue

    const count =
      index === 0 && rule.energyReplacesCommons
        ? slot.count - energyCount
        : slot.count
    for (let i = 0; i < count; i++) {
      const { pick, pool } = rollPick(options)
      pack.push({
        card: drawOne(pool, taken),
        tier: tierFor(pick),
        reverse: Boolean(pick.reverse),
      })
    }
  }
  if (!pack.length) return null

  // Basic energies sit at the back of the pack, behind the rare
  for (let i = 0; i < energyCount; i++) {
    pack.push({
      card: drawOne(energies.pool, taken),
      tier: 'energy',
      reverse: false,
    })
  }
  return pack
}
