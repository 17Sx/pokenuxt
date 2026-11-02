// How real English boosters are built, era by era. Each slot is listed in the
// order the cards sit in the pack (front to back), and each card of a slot
// rolls one of its picks. Weights are relative: they get renormalised over the
// rarities a set actually has.
//
// Odds are community estimates from large openings (PokeBeach, TCGplayer),
// The Pokémon Company does not publish them. Pocket odds are the official
// in-game rates.

export interface SlotPick {
  rarities: string[]
  weight: number
  // Old sets file holo and non-holo rares under the same "Rare" rarity
  holo?: boolean
  reverse?: boolean
}

export interface Slot {
  count: number
  picks: SlotPick[]
}

export interface PackRule {
  slots: Slot[]
  // Basic energies added at the back of the pack
  energy: number
  // Where basic energies come from when the set has no common ones
  energyFallback: 'sve' | 'mee' | null
  // Old packs counted their energies among the commons
  energyReplacesCommons?: boolean
}

const COMMON = ['Commune']
const UNCOMMON = ['Peu Commune']
const RARE = ['Rare']

const commons = (count: number): Slot => ({
  count,
  picks: [{ rarities: COMMON, weight: 1 }],
})
const uncommons = (count: number): Slot => ({
  count,
  picks: [{ rarities: UNCOMMON, weight: 1 }],
})
// Any common, uncommon or rare, printed with a foil background
const reverse = (): Slot => ({
  count: 1,
  picks: [
    { rarities: COMMON, weight: 60, reverse: true },
    { rarities: UNCOMMON, weight: 30, reverse: true },
    { rarities: RARE, weight: 10, reverse: true },
  ],
})

// Base Set to Neo: 11 cards, holo rare about 1 pack in 3
const WOTC: PackRule = {
  slots: [
    commons(7),
    uncommons(3),
    {
      count: 1,
      picks: [
        { rarities: RARE, weight: 2, holo: false },
        { rarities: RARE, weight: 1, holo: true },
      ],
    },
  ],
  energy: 2,
  energyFallback: null,
  energyReplacesCommons: true,
}

// e-Card: 9 cards with the first reverse holos
const ECARD: PackRule = {
  slots: [
    commons(5),
    uncommons(2),
    reverse(),
    {
      count: 1,
      picks: [
        { rarities: RARE, weight: 2 },
        { rarities: ['Holo Rare', 'Rare Holo'], weight: 1 },
      ],
    },
  ],
  energy: 0,
  energyFallback: null,
}

// EX to HeartGold SoulSilver: 10 cards, holo about 1 in 3, chase cards around 1 in 12
const CLASSIC: PackRule = {
  slots: [
    commons(5),
    uncommons(3),
    reverse(),
    {
      count: 1,
      picks: [
        { rarities: RARE, weight: 64, holo: false },
        { rarities: RARE, weight: 24, holo: true },
        { rarities: ['Holo Rare', 'Rare Holo'], weight: 24 },
        { rarities: ['Rare Holo LV.X', 'Rare Prime', 'Ultra Rare'], weight: 8 },
        { rarities: ['LÉGENDE'], weight: 3 },
        { rarities: ['Magnifique rare', 'Shiny rare'], weight: 1 },
      ],
    },
  ],
  energy: 0,
  energyFallback: null,
}

// Black & White to Sun & Moon: EX/GX about 1 in 9, secret rares about 1 in 30
const BW_SM: PackRule = {
  slots: [
    commons(5),
    uncommons(3),
    reverse(),
    {
      count: 1,
      picks: [
        { rarities: RARE, weight: 64 },
        { rarities: ['Holo Rare', 'Rare Holo'], weight: 22 },
        { rarities: ['Ultra Rare'], weight: 11 },
        {
          rarities: ['Magnifique rare', 'Shiny rare', 'Shiny rare V'],
          weight: 3,
        },
      ],
    },
  ],
  energy: 1,
  energyFallback: 'sve',
}

// Sword & Shield: V about 1 in 7, VMAX/VSTAR about 1 in 16, secrets about 1 in 35
const SWSH: PackRule = {
  slots: [
    commons(5),
    uncommons(3),
    reverse(),
    {
      count: 1,
      picks: [
        { rarities: RARE, weight: 44 },
        { rarities: ['Holo Rare', 'Rare Holo', 'Radieux Rare'], weight: 22 },
        { rarities: ['Holo Rare V'], weight: 14 },
        { rarities: ['Holo Rare VMAX', 'Holo Rare VSTAR'], weight: 6 },
        {
          rarities: ['Ultra Rare', 'Shiny rare V', 'Shiny rare VMAX'],
          weight: 7,
        },
        { rarities: ['Magnifique rare', 'Shiny rare'], weight: 3 },
      ],
    },
  ],
  energy: 1,
  energyFallback: 'sve',
}

// Scarlet & Violet: the second reverse slot can hold an Illustration Rare (1 in 13)
// or a Special Illustration Rare (1 in 32). Rare slot: Double Rare 1 in 6,
// Ultra Rare 1 in 15, Hyper Rare 1 in 55.
const SV: PackRule = {
  slots: [
    commons(4),
    uncommons(3),
    reverse(),
    {
      count: 1,
      picks: [
        ...reverse().picks.map((pick) => ({
          ...pick,
          weight: pick.weight * 0.892,
        })),
        { rarities: ['Illustration rare'], weight: 7.7 },
        { rarities: ['Illustration spéciale rare'], weight: 3.1 },
      ],
    },
    {
      count: 1,
      picks: [
        { rarities: RARE, weight: 74.8 },
        { rarities: ['Double rare'], weight: 16.7 },
        { rarities: ['Ultra Rare'], weight: 6.7 },
        { rarities: ['Hyper rare'], weight: 1.8 },
      ],
    },
  ],
  energy: 1,
  energyFallback: 'sve',
}

// Mega Evolution (PokeBeach, 5,000+ packs): Double Rare 1 in 5, Illustration Rare
// 1 in 9, Ultra Rare 1 in 12, SIR 1 in 101, Mega Hyper Rare 1 in 1,260
const ME: PackRule = {
  slots: [
    commons(4),
    uncommons(3),
    reverse(),
    {
      count: 1,
      picks: [
        ...reverse().picks.map((pick) => ({
          ...pick,
          weight: pick.weight * 0.879,
        })),
        { rarities: ['Illustration rare'], weight: 11.1 },
        { rarities: ['Illustration spéciale rare'], weight: 1 },
      ],
    },
    {
      count: 1,
      picks: [
        { rarities: RARE, weight: 71.62 },
        { rarities: ['Double rare'], weight: 20 },
        { rarities: ['Ultra Rare'], weight: 8.3 },
        { rarities: ['Hyper rare', 'Méga Hyper Rare'], weight: 0.08 },
      ],
    },
  ],
  energy: 1,
  energyFallback: 'mee',
}

// Pokémon TCG Pocket: 5 cards, official rates shown in the game
const POCKET: PackRule = {
  slots: [
    { count: 3, picks: [{ rarities: ['Un Diamant'], weight: 1 }] },
    {
      count: 1,
      picks: [
        { rarities: ['Deux Diamants'], weight: 90 },
        { rarities: ['Trois Diamants'], weight: 5 },
        { rarities: ['Quatre Diamants'], weight: 1.666 },
        { rarities: ['Une Étoile'], weight: 2.572 },
        { rarities: ['Deux Étoiles'], weight: 0.5 },
        { rarities: ['Trois Étoiles'], weight: 0.222 },
        { rarities: ['Un Chromatique'], weight: 0.714 },
        { rarities: ['Deux Chromatiques'], weight: 0.333 },
        { rarities: ['Couronne'], weight: 0.04 },
      ],
    },
    {
      count: 1,
      picks: [
        { rarities: ['Deux Diamants'], weight: 60 },
        { rarities: ['Trois Diamants'], weight: 20 },
        { rarities: ['Quatre Diamants'], weight: 6.664 },
        { rarities: ['Une Étoile'], weight: 10.288 },
        { rarities: ['Deux Étoiles'], weight: 2 },
        { rarities: ['Trois Étoiles'], weight: 0.888 },
        { rarities: ['Un Chromatique'], weight: 2.857 },
        { rarities: ['Deux Chromatiques'], weight: 1.333 },
        { rarities: ['Couronne'], weight: 0.16 },
      ],
    },
  ],
  energy: 0,
  energyFallback: null,
}

const RULES: Record<string, PackRule> = {
  base: WOTC,
  gym: WOTC,
  neo: WOTC,
  ecard: ECARD,
  ex: CLASSIC,
  dp: CLASSIC,
  pl: CLASSIC,
  hgss: CLASSIC,
  col: CLASSIC,
  bw: BW_SM,
  xy: BW_SM,
  sm: BW_SM,
  swsh: SWSH,
  sv: SV,
  me: ME,
  tcgp: POCKET,
}

// Promos, trainer kits and other one-off products use the closest modern layout
export const ruleFor = (serieId?: string) =>
  (serieId && RULES[serieId]) || BW_SM
