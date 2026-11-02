import type { Tier } from '~~/server/utils/packs'
import type { HoloPreset } from '~/lib/holo-card/types'

export interface CardSummary {
  id: string
  name: string
  image: string | null
  tier?: Tier | null
}

export interface OpenedCard {
  id: string
  name: string
  image: string | null
  tier: Tier
  isNew: boolean
}

export const TIER_LABELS: Record<Tier, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  holo: 'Holo',
  ultra: 'Ultra rare',
  secret: 'Secrète',
}

export const TIER_ORDER: Tier[] = [
  'secret',
  'ultra',
  'holo',
  'rare',
  'uncommon',
  'common',
]

export const TIER_COLORS: Record<Tier, string> = {
  common: 'text-zinc-500',
  uncommon: 'text-zinc-300',
  rare: 'text-sky-400',
  holo: 'text-violet-400',
  ultra: 'text-amber-400',
  secret: 'text-rose-400',
}

// Glow behind a card as it is revealed, as an RGB triplet
export const TIER_GLOW: Partial<Record<Tier, string>> = {
  rare: '56 189 248',
  holo: '167 139 250',
  ultra: '251 191 36',
  secret: '251 113 133',
}

export const HOLO_PRESETS: Partial<Record<Tier, HoloPreset>> = {
  rare: 'glitter',
  holo: 'rainbow',
  ultra: 'stars',
  secret: 'gold',
}

export const isHolo = (tier?: Tier | null) =>
  Boolean(tier && HOLO_PRESETS[tier])

// Grids use the light image, close-ups the high quality one
export const highQuality = (image: string) => image.replace('/low.', '/high.')
export const lowQuality = (image: string) => image.replace('/high.', '/low.')
