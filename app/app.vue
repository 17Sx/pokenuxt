<script setup lang="ts">
const { unique } = useCollection()

const links = [
  { to: '/', label: 'Recherche' },
  { to: '/packs', label: 'Packs' },
  { to: '/collection', label: 'Collection' }
]
</script>

<template>
  <NuxtRouteAnnouncer />
  <div class="min-h-screen bg-zinc-950 text-zinc-100">
    <header class="border-b border-zinc-900">
      <nav class="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
        <NuxtLink to="/" class="text-xl font-bold tracking-tight">PokéNuxt</NuxtLink>
        <div class="flex gap-4 text-sm">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="text-zinc-400 hover:text-zinc-100"
            exact-active-class="!text-zinc-100"
          >
            {{ link.label }}
            <span v-if="link.to === '/collection' && unique" class="ml-1 text-xs text-zinc-500">{{ unique }}</span>
          </NuxtLink>
        </div>
      </nav>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-10">
      <NuxtPage />
    </main>
  </div>
</template>
