<script setup lang="ts">
import type { Pokemon, PokemonSpecies } from 'pokenode-ts'

const STAT_MAX = 255

const route = useRoute()
const id = Number(route.params.id)
if (!Number.isInteger(id) || id < 1) {
  throw createError({ statusCode: 404, statusMessage: 'Pokémon introuvable' })
}

const { data: pokemon } = await usePokeApi<Pokemon>(`pokemon/${id}`)
if (!pokemon.value) {
  throw createError({ statusCode: 404, statusMessage: 'Pokémon introuvable' })
}

const { data: species } = await usePokeApi<PokemonSpecies>(
  `pokemon-species/${pokemon.value.species.name}`,
)

const french = <T extends { language: { name: string } }>(entries?: T[]) =>
  entries?.filter((entry) => entry.language.name === 'fr')

const name = computed(
  () =>
    french(species.value?.names)?.[0]?.name ??
    pokemonLabel(pokemon.value!.name),
)
const genus = computed(() => french(species.value?.genera)?.[0]?.genus)
const flavor = computed(() =>
  french(species.value?.flavor_text_entries)
    ?.at(-1)
    ?.flavor_text.replace(/\s+/g, ' '),
)

const resource = computed(() => pokemonResource(pokemon.value!.name, id))

const facts = computed(() => [
  {
    label: 'Taille',
    value: (pokemon.value!.height / 10).toLocaleString('fr-FR'),
    unit: 'm',
  },
  {
    label: 'Poids',
    value: (pokemon.value!.weight / 10).toLocaleString('fr-FR'),
    unit: 'kg',
  },
  {
    label: 'Exp. de base',
    value: String(pokemon.value!.base_experience ?? '—'),
    unit: '',
  },
])

const stats = computed(() =>
  pokemon.value!.stats.map((stat) => ({
    name: stat.stat.name,
    label: STAT_LABELS[stat.stat.name] ?? stat.stat.name,
    value: stat.base_stat,
    share: Math.min(1, stat.base_stat / STAT_MAX),
  })),
)
const total = computed(() => stats.value.reduce((sum, s) => sum + s.value, 0))

const previous = id > 1 && id <= LAST_NATIONAL_ID ? id - 1 : null
const next = id < LAST_NATIONAL_ID ? id + 1 : null

useHead({ title: () => `${name.value} — PokéNuxt` })
</script>

<template>
  <div v-if="pokemon" class="pt-8 pb-4 sm:pt-12">
    <NuxtLink
      to="/#pokedex"
      class="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-zinc-500 uppercase transition-colors hover:text-white"
    >
      <span aria-hidden="true">←</span> Pokédex
    </NuxtLink>

    <div class="mt-8 grid gap-10 md:grid-cols-[1.05fr_1fr] md:gap-12">
      <div>
        <div
          class="dot-grid relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-zinc-950"
        >
          <span
            class="absolute top-4 left-5 font-doto text-[28px] leading-none font-bold tracking-[0.12em] text-zinc-50"
          >
            #{{ dexNumber(id) }}
          </span>
          <DitherSprite
            :id="id"
            :size="256"
            :alt="name"
            class="absolute inset-[11%]"
          />
        </div>
        <nav
          aria-label="Pokémon voisins"
          class="mt-3 flex justify-between font-mono text-[11px] tracking-[0.18em] text-zinc-500"
        >
          <NuxtLink
            v-if="previous"
            :to="`/pokemon/${previous}`"
            class="transition-colors hover:text-white"
          >
            ← #{{ dexNumber(previous) }}
          </NuxtLink>
          <span v-else />
          <NuxtLink
            v-if="next"
            :to="`/pokemon/${next}`"
            class="transition-colors hover:text-white"
          >
            #{{ dexNumber(next) }} →
          </NuxtLink>
        </nav>
      </div>

      <div class="flex flex-col">
        <p
          v-if="genus"
          class="font-mono text-[11px] tracking-[0.22em] text-zinc-500 uppercase"
        >
          {{ genus }}
        </p>
        <h1
          class="mt-3 text-[44px] leading-none font-bold tracking-tight text-zinc-50 sm:text-[56px]"
        >
          {{ name }}
        </h1>
        <p
          v-if="name !== pokemonLabel(pokemon.name)"
          class="mt-2 text-[14px] text-zinc-500"
        >
          {{ pokemonLabel(pokemon.name) }}
        </p>

        <ul class="mt-5 flex flex-wrap gap-2">
          <li
            v-for="type in pokemon.types"
            :key="type.type.name"
            class="rounded-full border border-white/15 px-2.5 py-0.5 text-[12px] text-zinc-300"
          >
            {{ TYPE_LABELS[type.type.name] ?? type.type.name }}
          </li>
        </ul>

        <p
          v-if="flavor"
          class="mt-6 max-w-md text-[15px] leading-relaxed text-zinc-400"
        >
          {{ flavor }}
        </p>

        <div class="mt-7">
          <WishlistToggle :pokemon="resource" full />
        </div>

        <dl class="mt-auto grid grid-cols-3 gap-3 pt-10">
          <div
            v-for="fact in facts"
            :key="fact.label"
            class="rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-3"
          >
            <dt
              class="font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase"
            >
              {{ fact.label }}
            </dt>
            <dd class="mt-2 flex items-baseline gap-1">
              <span
                class="font-doto text-[22px] leading-none font-bold tracking-[0.06em] text-zinc-50"
              >
                {{ fact.value }}
              </span>
              <span v-if="fact.unit" class="text-[12px] text-zinc-500">
                {{ fact.unit }}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>

    <DotSection title="Statistiques" class="mt-14">
      <template #meta>
        <span class="font-mono text-[11px] tracking-[0.18em] text-zinc-500">
          TOTAL
          <span
            class="ml-2 font-doto text-[22px] leading-none font-bold tracking-[0.1em] text-zinc-50"
          >
            {{ total }}
          </span>
        </span>
      </template>
      <dl class="flex flex-col gap-3.5">
        <div
          v-for="stat in stats"
          :key="stat.name"
          class="grid grid-cols-[5.5rem_2.75rem_1fr] items-center gap-3 sm:grid-cols-[7rem_3rem_1fr]"
        >
          <dt
            class="font-mono text-[11px] tracking-[0.14em] text-zinc-500 uppercase"
          >
            {{ stat.label }}
          </dt>
          <dd
            class="text-right font-doto text-[18px] leading-none font-bold tracking-[0.08em] text-zinc-50"
          >
            {{ stat.value }}
          </dd>
          <dd aria-hidden="true" class="relative h-2">
            <div class="dot-bar absolute inset-0 text-white/12" />
            <div
              class="dot-bar absolute inset-y-0 left-0 text-white"
              :style="{ width: `${stat.share * 100}%` }"
            />
          </dd>
        </div>
      </dl>
    </DotSection>
  </div>
</template>
