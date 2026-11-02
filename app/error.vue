<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const notFound = computed(() => props.error.statusCode === 404)

useHead({ title: () => `${props.error.statusCode} — PokéNuxt` })
</script>

<template>
  <NuxtLayout>
    <div class="flex flex-col items-start py-24 sm:py-32">
      <p
        class="font-doto text-[96px] leading-none font-bold tracking-[0.1em] text-zinc-50 sm:text-[140px]"
      >
        {{ props.error.statusCode }}
      </p>
      <p class="mt-6 max-w-md text-[15px] leading-relaxed text-zinc-400">
        {{
          notFound
            ? 'Ce Pokémon s’est échappé. Il n’est pas dans le Pokédex.'
            : 'Quelque chose a planté. Réessaie dans un instant.'
        }}
      </p>
      <button
        type="button"
        class="mt-8 inline-flex items-center gap-2 rounded-md border border-white/10 bg-zinc-950 px-4 py-2 text-[13px] text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
        @click="clearError({ redirect: '/' })"
      >
        <span aria-hidden="true">←</span> Retour au Pokédex
      </button>
    </div>
  </NuxtLayout>
</template>
