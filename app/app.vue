<script setup lang="ts">
import type { NamedAPIResourceList } from 'pokenode-ts'

const { data } = await usePokeApi<NamedAPIResourceList>('pokemon?limit=1351')
const { wishlist, addPokemon, removePokemon, isInWishlist } = useWishlist()
const { search } = useSearch()
</script>

<template>
  <NuxtRouteAnnouncer />
  <main class="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
    <h1 class="mx-auto max-w-6xl text-3xl font-bold tracking-tight">
      PokéNuxt
    </h1>

    <section class="mx-auto mt-6 max-w-6xl">
      <h2 class="text-lg font-semibold">Wishlist ({{ wishlist.length }})</h2>
      <ul
        v-if="wishlist.length"
        class="mt-2 flex flex-wrap gap-2 text-sm text-zinc-300"
      >
        <li
          v-for="p in wishlist"
          :key="p.name"
          class="flex items-center gap-2 border border-white/10 px-2 py-1"
        >
          <NuxtLink :to="`/pokemon/${p.url.split('/').pop()}`">
            {{ p.name }}
          </NuxtLink>
          <button type="button" @click="removePokemon(p)">×</button>
        </li>
      </ul>
      <p v-else class="mt-2 text-sm text-zinc-500">
        Aucun Pokémon pour l’instant.
      </p>
    </section>

    <section class="mx-auto mt-6 max-w-6xl">
      <input v-model="search" type="text" placeholder="Rechercher un Pokémon" />
    </section>

    <div
      v-for="p in data?.results.filter((p) => p.name.includes(search))"
      :key="p.name"
    >
      <NuxtLink :to="`/pokemon/${p.url.split('/').pop()}`">
        {{ p.name }}
      </NuxtLink>
      <div class="gap-2">
        <button
          v-if="!isInWishlist(p)"
          type="button"
          class="border border-white/10"
          @click="addPokemon(p)"
        >
          Add +
        </button>
        <button v-else type="button" @click="removePokemon(p)">Remove -</button>
      </div>
    </div>
  </main>
</template>
