<script setup lang="ts">
import type { NamedAPIResourceList, Pokemon, PokemonSpecies } from 'pokenode-ts'

const STAT_MAX = 255

// /pokemon/25 and /pokemon/Pikachu both lead to /pokemon/pikachu. This runs
// before the page, which a redirect from its setup would leave half-run.
definePageMeta({
  middleware: async (to) => {
    const slug = String(to.params.name)
    if (/^\d{1,6}$/.test(slug)) {
      try {
        const { name } = await fetchPokeApi<Pokemon>(`pokemon/${slug}`)
        return navigateTo(`/pokemon/${name}`, { redirectCode: 301 })
      } catch (error) {
        return abortNavigation(
          (error as { statusCode?: number }).statusCode === 404
            ? createError({ statusCode: 404, message: 'Pokémon not found' })
            : createError({
                statusCode: 503,
                message: 'The API is unavailable',
              }),
        )
      }
    }
    if (slug !== slug.toLowerCase()) {
      return navigateTo(`/pokemon/${slug.toLowerCase()}`, { redirectCode: 301 })
    }
  },
})

const { locale, locales, t, te } = useI18n()

const route = useRoute()
const slug = String(route.params.name)
if (!/^[a-z0-9-]{1,100}$/.test(slug)) {
  throw createError({ statusCode: 404, message: 'Pokémon not found' })
}

// Only what the page shows: a Pokémon from PokéAPI also lists every move and
// game, hundreds of kilobytes that would end up in each prerendered page.
const { data: pokemon, error } = await usePokeApi<Pokemon>(`pokemon/${slug}`, {
  pick: [
    'id',
    'name',
    'height',
    'weight',
    'base_experience',
    'species',
    'types',
    'stats',
  ],
})
if (!pokemon.value) {
  // Only the API's 404 means there is no such Pokémon. Anything else is a
  // failure worth retrying, never a "not found" page to prerender.
  throw error.value?.statusCode === 404
    ? createError({ statusCode: 404, message: 'Pokémon not found' })
    : createError({ statusCode: 503, message: 'The API is unavailable' })
}

const id = pokemon.value.id

const siteLocales = locales.value.map((l) => l.code as string)
const { data: species } = await usePokeApi<
  PokemonSpecies,
  ReturnType<typeof speciesIn>
>(`pokemon-species/${pokemon.value.species.name}`, {
  transform: (data) => speciesIn(data, siteLocales),
})

// PokéAPI gives names, categories and descriptions in many languages.
const inLocale = <T extends { language: { name: string } }>(entries?: T[]) =>
  entries?.filter((entry) => entry.language.name === locale.value)

const name = computed(
  () =>
    inLocale(species.value?.names)?.[0]?.name ??
    pokemonLabel(pokemon.value!.name),
)
const genus = computed(() => inLocale(species.value?.genera)?.[0]?.genus)
const flavor = computed(() =>
  inLocale(species.value?.flavor_text_entries)
    ?.at(-1)
    ?.flavor_text.replace(/\s+/g, ' '),
)

// A type or stat PokéAPI adds before the locale files know it keeps its name.
const label = (group: 'types' | 'stats', key: string) =>
  te(`${group}.${key}`) ? t(`${group}.${key}`) : key

const resource = computed(() => pokemonResource(pokemon.value!.name, id))

const facts = computed(() => [
  {
    label: t('pokemon.height'),
    value: (pokemon.value!.height / 10).toLocaleString(locale.value),
    unit: 'm',
  },
  {
    label: t('pokemon.weight'),
    value: (pokemon.value!.weight / 10).toLocaleString(locale.value),
    unit: 'kg',
  },
  {
    label: t('pokemon.baseExperience'),
    value: String(pokemon.value!.base_experience ?? '—'),
    unit: '',
  },
])

const stats = computed(() =>
  pokemon.value!.stats.map((stat) => ({
    name: stat.stat.name,
    label: label('stats', stat.stat.name),
    value: stat.base_stat,
    share: Math.min(1, stat.base_stat / STAT_MAX),
  })),
)
const total = computed(() => stats.value.reduce((sum, s) => sum + s.value, 0))

// The Pokémon just before and after in the national Pokédex. Forms have none.
const { data: around } = await usePokeApi<NamedAPIResourceList>(
  id <= LAST_NATIONAL_ID
    ? `pokemon?offset=${Math.max(0, id - 2)}&limit=3`
    : 'pokemon?limit=0',
)
const neighbour = (number: number) =>
  number >= 1 && number <= LAST_NATIONAL_ID
    ? around.value?.results.find((p) => pokemonId(p) === number)
    : undefined
const previous = computed(() => neighbour(id - 1))
const next = computed(() => neighbour(id + 1))

useHead({ title: () => `${name.value} — PokéNuxt` })
</script>

<template>
  <div v-if="pokemon" class="pt-8 pb-4 sm:pt-12">
    <NuxtLink
      to="/#pokedex"
      class="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-zinc-500 uppercase transition-colors hover:text-white"
    >
      <span aria-hidden="true">←</span> {{ t('pokemon.back') }}
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
          <ColorToggle
            :id="id"
            :name="pokemon.name"
            class="absolute top-3.5 right-4 z-10"
          />
          <DitherSprite
            :id="id"
            :size="256"
            :alt="name"
            class="absolute inset-[11%]"
          />
        </div>
        <nav
          :aria-label="t('pokemon.neighbours')"
          class="mt-3 flex justify-between font-mono text-[11px] tracking-[0.18em] text-zinc-500"
        >
          <NuxtLink
            v-if="previous"
            :to="`/pokemon/${previous.name}`"
            class="transition-colors hover:text-white"
          >
            ← #{{ dexNumber(id - 1) }} {{ pokemonLabel(previous.name) }}
          </NuxtLink>
          <span v-else />
          <NuxtLink
            v-if="next"
            :to="`/pokemon/${next.name}`"
            class="transition-colors hover:text-white"
          >
            {{ pokemonLabel(next.name) }} #{{ dexNumber(id + 1) }} →
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
            {{ label('types', type.type.name) }}
          </li>
        </ul>

        <p
          v-if="flavor"
          class="mt-6 max-w-md text-[15px] leading-relaxed text-zinc-400"
        >
          {{ flavor }}
        </p>

        <div class="mt-7 flex flex-wrap gap-2">
          <WishlistToggle :pokemon="resource" full />
          <LikeToggle :pokemon="resource" full />
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

    <DotSection :title="t('pokemon.stats')" class="mt-14">
      <template #meta>
        <span
          class="font-mono text-[11px] tracking-[0.18em] text-zinc-500 uppercase"
        >
          {{ t('pokemon.total') }}
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
