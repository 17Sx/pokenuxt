<script setup lang="ts">
const { $orpc } = useNuxtApp()
const name = ref('Pikachu')

const { data: cards, status, error } = await useAsyncData(
  'cards',
  () => $orpc.cards.search({ name: name.value }),
  { watch: [name] }
)
</script>

<template>
  <NuxtRouteAnnouncer />
  <main class="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
    <div class="mx-auto max-w-6xl">
      <h1 class="text-3xl font-bold tracking-tight">PokéNuxt</h1>
      <input
        v-model.lazy="name"
        class="mt-6 w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 outline-none focus:border-zinc-500"
        placeholder="Rechercher une carte…"
      >
      <p v-if="error" class="mt-6 text-red-400">{{ error.message }}</p>
      <p v-else-if="status === 'pending'" class="mt-6 text-zinc-500">Chargement…</p>
      <ul v-else class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
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
