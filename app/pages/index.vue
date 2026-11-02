<script setup lang="ts">
import type { CardSummary } from '~/utils/tiers'

const { $orpc } = useNuxtApp()
const { cards: owned } = useCollection()
const query = ref('Pikachu')
const search = ref(query.value)
const filters = reactive({ type: '', rarity: '', category: '' })

// Debounce keystrokes so we only hit the API once typing pauses
let timer: ReturnType<typeof setTimeout> | undefined
watch(query, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    search.value = value.trim()
  }, 300)
})
onBeforeUnmount(() => clearTimeout(timer))

const hasCriteria = computed(() => Boolean(search.value || filters.type || filters.rarity || filters.category))

const { data: options } = await useAsyncData('card-filters', () => $orpc.cards.filters())

const { data: cards, status, error } = await useAsyncData(
  'cards',
  () => hasCriteria.value
    ? $orpc.cards.search({
        name: search.value,
        type: filters.type || undefined,
        rarity: filters.rarity || undefined,
        category: filters.category || undefined
      })
    : Promise.resolve([]),
  { watch: [search, filters] }
)

const selected = ref<CardSummary | null>(null)

const resetFilters = () => Object.assign(filters, { type: '', rarity: '', category: '' })
const selectClass = 'rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500'
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative w-full sm:max-w-sm">
        <input
          v-model="query"
          type="search"
          class="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 pr-10 outline-none focus:border-zinc-500"
          placeholder="Rechercher une carte…"
        >
        <span
          v-if="status === 'pending'"
          class="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200"
          aria-label="Chargement"
        />
      </div>
      <select v-model="filters.category" :class="selectClass" aria-label="Catégorie">
        <option value="">Toutes catégories</option>
        <option v-for="category in options?.categories" :key="category" :value="category">{{ category }}</option>
      </select>
      <select v-model="filters.type" :class="selectClass" aria-label="Type">
        <option value="">Tous types</option>
        <option v-for="type in options?.types" :key="type" :value="type">{{ type }}</option>
      </select>
      <select v-model="filters.rarity" :class="selectClass" aria-label="Rareté">
        <option value="">Toutes raretés</option>
        <option v-for="rarity in options?.rarities" :key="rarity" :value="rarity">{{ rarity }}</option>
      </select>
      <button
        v-if="filters.type || filters.rarity || filters.category"
        type="button"
        class="text-sm text-zinc-400 underline-offset-4 hover:text-zinc-100 hover:underline"
        @click="resetFilters"
      >
        Réinitialiser
      </button>
    </div>
    <p v-if="error" class="mt-6 text-red-400">{{ error.message }}</p>
    <p v-else-if="hasCriteria && status === 'success' && !cards?.length" class="mt-6 text-zinc-500">
      Aucune carte trouvée
    </p>
    <ul
      v-else
      class="mt-8 grid grid-cols-2 gap-4 transition-opacity sm:grid-cols-4 lg:grid-cols-6"
      :class="{ 'opacity-50': status === 'pending' }"
    >
      <li v-for="card in cards" :key="card.id" class="relative">
        <span
          v-if="owned[card.id]"
          class="absolute top-2 right-2 z-10 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-emerald-950"
        >
          ×{{ owned[card.id]!.count }}
        </span>
        <button type="button" class="block w-full cursor-pointer transition-transform hover:-translate-y-1" @click="selected = card">
          <CardImage :src="card.image" :alt="card.name" />
        </button>
        <p class="mt-2 truncate text-sm text-zinc-400">{{ card.name }} · {{ card.id }}</p>
      </li>
    </ul>
    <CardDetail :card="selected" @close="selected = null" />
  </div>
</template>
