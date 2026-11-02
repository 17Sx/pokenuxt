<script setup lang="ts">
import type { Tier } from '~~/server/utils/packs'
import type { CardSummary } from '~/utils/tiers'
const { cards, unique, total } = useCollection()
const name = ref('')
const tier = ref<Tier | ''>('')

const visible = computed(() => {
  const needle = name.value.trim().toLocaleLowerCase('fr')
  return Object.values(cards.value)
    .filter(card => !tier.value || card.tier === tier.value)
    .filter(card => !needle || card.name.toLocaleLowerCase('fr').includes(needle))
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.name.localeCompare(b.name, 'fr'))
})

const selected = ref<CardSummary | null>(null)

const clear = () => {
  if (confirm('Vider toute la collection ?')) cards.value = {}
}

const selectClass = 'rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500'
</script>

<template>
  <div>
    <div class="flex flex-wrap items-baseline justify-between gap-3">
      <p class="text-sm text-zinc-400">
        {{ unique }} cartes différentes · {{ total }} au total
      </p>
      <button
        v-if="unique"
        type="button"
        class="text-sm text-zinc-500 underline-offset-4 hover:text-red-400 hover:underline"
        @click="clear"
      >
        Vider la collection
      </button>
    </div>

    <p v-if="!unique" class="mt-8 text-zinc-500">
      Ta collection est vide. <NuxtLink to="/packs" class="text-amber-400 hover:underline">Ouvre un pack</NuxtLink> pour commencer.
    </p>

    <template v-else>
      <div class="mt-6 flex flex-wrap items-center gap-3">
        <input
          v-model="name"
          type="search"
          class="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 outline-none focus:border-zinc-500 sm:max-w-sm"
          placeholder="Rechercher dans la collection…"
        >
        <select v-model="tier" :class="selectClass" aria-label="Rareté">
          <option value="">Toutes raretés</option>
          <option v-for="value in TIER_ORDER" :key="value" :value="value">{{ TIER_LABELS[value] }}</option>
        </select>
      </div>
      <p v-if="!visible.length" class="mt-6 text-zinc-500">Aucune carte trouvée</p>
      <ul class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <li v-for="card in visible" :key="card.id" class="relative">
          <span
            v-if="card.count > 1"
            class="absolute top-2 right-2 z-10 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-emerald-950"
          >
            ×{{ card.count }}
          </span>
          <button type="button" class="block w-full cursor-pointer transition-transform hover:-translate-y-1" @click="selected = card">
            <CardImage :src="card.image && lowQuality(card.image)" :alt="card.name" />
          </button>
          <p class="mt-2 truncate text-sm text-zinc-300">{{ card.name }}</p>
          <p class="text-xs text-zinc-500">{{ TIER_LABELS[card.tier] }} · {{ card.id }}</p>
        </li>
      </ul>
    </template>
    <CardDetail :card="selected" @close="selected = null" />
  </div>
</template>
