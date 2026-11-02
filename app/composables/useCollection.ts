import type { Tier } from '~~/server/utils/packs'

export interface OwnedCard {
  id: string
  name: string
  image: string | null
  tier: Tier
  count: number
  firstAt: number
}

// Filled from localStorage by plugins/collection.client.ts once the app is hydrated
export function useCollection() {
  const cards = useState<Record<string, OwnedCard>>('collection', () => ({}))

  const add = (
    opened: Array<Pick<OwnedCard, 'id' | 'name' | 'image' | 'tier'>>,
  ) => {
    const now = Date.now()
    for (const card of opened) {
      const owned = cards.value[card.id]
      if (owned) owned.count++
      else cards.value[card.id] = { ...card, count: 1, firstAt: now }
    }
  }

  const unique = computed(() => Object.keys(cards.value).length)
  const total = computed(() =>
    Object.values(cards.value).reduce((sum, card) => sum + card.count, 0),
  )

  return { cards, add, unique, total }
}
