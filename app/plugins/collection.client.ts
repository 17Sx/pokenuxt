import type { OwnedCard } from '~/composables/useCollection'

const STORAGE_KEY = 'pokenuxt:collection'

export default defineNuxtPlugin(() => {
  const cards = useState<Record<string, OwnedCard>>('collection', () => ({}))

  // Wait for hydration so the server-rendered (empty) collection matches
  onNuxtReady(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) cards.value = JSON.parse(saved)
    }
    catch {
      // Unavailable or corrupted storage: start from an empty collection
    }

    watch(cards, (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      }
      catch {
        // Storage full or blocked: the collection only lives for this session
      }
    }, { deep: true })
  })
})
