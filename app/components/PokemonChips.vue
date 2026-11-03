<script setup lang="ts">
import type { NamedAPIResource } from 'pokenode-ts'

// The Pokémon of a list on the home page, each with a button to take it out.
defineProps<{
  pokemon: NamedAPIResource[]
  removeLabel: (name: string) => string
}>()
defineEmits<{ remove: [pokemon: NamedAPIResource] }>()
</script>

<template>
  <ul class="flex flex-wrap gap-2">
    <li
      v-for="p in pokemon"
      :key="p.name"
      class="group flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-950 py-1 pr-1 pl-1.5 transition-colors hover:border-white/25"
    >
      <NuxtLink
        :to="`/pokemon/${p.name}`"
        class="flex items-center gap-2 pr-1 text-[13px] text-zinc-200 hover:text-white"
      >
        <DitherSprite :id="pokemonId(p)" :size="96" class="size-8" />
        {{ pokemonLabel(p.name) }}
      </NuxtLink>
      <button
        type="button"
        :aria-label="removeLabel(pokemonLabel(p.name))"
        class="flex size-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
        @click="$emit('remove', p)"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          class="size-3"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="square"
        >
          <path d="m4 4 8 8M12 4l-8 8" />
        </svg>
      </button>
    </li>
  </ul>
</template>
