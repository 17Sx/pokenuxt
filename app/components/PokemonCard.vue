<script setup lang="ts">
import type { NamedAPIResource } from 'pokenode-ts'

const props = defineProps<{ pokemon: NamedAPIResource }>()

const id = computed(() => pokemonId(props.pokemon))
const label = computed(() => pokemonLabel(props.pokemon.name))
</script>

<template>
  <article class="group relative">
    <NuxtLink :to="`/pokemon/${id}`" class="block outline-none">
      <div
        class="dot-grid relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-zinc-950 transition-colors duration-500 group-hover:border-white/30 group-has-[a:focus-visible]:border-white"
      >
        <span
          class="absolute top-3 left-3.5 font-mono text-[10px] tracking-[0.2em] text-zinc-500"
        >
          #{{ dexNumber(id) }}
        </span>
        <DitherSprite
          :id="id"
          class="absolute inset-[16%] transition-transform duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
      <h3
        class="mt-2.5 truncate text-[14px] font-semibold tracking-tight text-zinc-50"
      >
        {{ label }}
      </h3>
    </NuxtLink>
    <WishlistToggle :pokemon="props.pokemon" class="absolute top-2 right-2" />
  </article>
</template>
