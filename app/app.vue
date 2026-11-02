<script setup lang="ts">
const { $orpc } = useNuxtApp()
const query = ref('Pikachu')
const search = ref(query.value)

// Debounce keystrokes so we only hit the API once typing pauses
let timer: ReturnType<typeof setTimeout> | undefined
watch(query, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    search.value = value.trim()
  }, 300)
})
onBeforeUnmount(() => clearTimeout(timer))

const { data: cards, status, error } = await useAsyncData(
  'cards',
  () => search.value ? $orpc.cards.search({ name: search.value }) : Promise.resolve([]),
  { watch: [search] }
)
</script>

<template>
  <NuxtRouteAnnouncer />
  <main class="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
    <div class="mx-auto max-w-6xl">
      <h1 class="text-3xl font-bold tracking-tight">PokéNuxt</h1>
      <div class="relative mt-6 w-full max-w-sm">
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
      <p v-if="error" class="mt-6 text-red-400">{{ error.message }}</p>
      <p v-else-if="search && status === 'success' && !cards?.length" class="mt-6 text-zinc-500">
        Aucune carte trouvée pour « {{ search }} »
      </p>
      <ul
        v-else
        class="mt-8 grid grid-cols-2 gap-4 transition-opacity sm:grid-cols-4 lg:grid-cols-6"
        :class="{ 'opacity-50': status === 'pending' }"
      >
        <li v-for="card in cards" :key="card.id">
          <img
            v-if="card.image"
            :src="card.image"
            :alt="card.name"
            loading="lazy"
            class="aspect-[63/88] w-full rounded-lg"
          >
          <p class="mt-2 truncate text-sm text-zinc-400">{{ card.name }} · {{ card.id }}</p>
        </li>
      </ul>
    </div>
  </main>
</template>
