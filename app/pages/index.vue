<script setup lang="ts">
import type { NamedAPIResourceList } from 'pokenode-ts'

const PAGE_SIZE = 48

const { data } = await usePokeApi<NamedAPIResourceList>('pokemon?limit=1351')
const { wishlist, removePokemon, error } = useWishlist()
const { likes, unlike, error: likesError } = useLikes()
const { t } = useI18n()
const { search } = useSearch()

const shown = ref(PAGE_SIZE)
watch(search, () => {
  shown.value = PAGE_SIZE
})

// Matches names ("mr mime" finds mr-mime) and numbers ("25" or "#25").
const results = computed(() => {
  const all = data.value?.results ?? []
  const query = search.value.trim().toLowerCase().replace(/\s+/g, '-')
  if (!query) return all
  const number = query.replace(/^#/, '')
  return all.filter(
    (p) =>
      p.name.includes(query) ||
      (/^\d+$/.test(number) && pokemonId(p) === Number(number)),
  )
})

const input = useTemplateRef('input')

// ⌘K, or Ctrl+K outside macOS, jumps to the search field, as on 17sx.me.
const mac = ref(true)

function onKeydown(event: KeyboardEvent) {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') {
    return
  }
  event.preventDefault()
  input.value?.focus()
  input.value?.select()
}
onMounted(() => {
  mac.value = /Mac|iPhone|iPad/.test(navigator.platform)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div>
    <section class="relative isolate pt-14 pb-12 sm:pt-20">
      <img
        src="/banner.png"
        alt=""
        width="512"
        height="170"
        class="pixelated pointer-events-none absolute top-0 -left-4 -z-10 w-[calc(100%+2rem)] max-w-none opacity-30 [mask-image:linear-gradient(to_bottom,black_30%,transparent_95%)] md:-left-8 md:w-[calc(100%+4rem)]"
      />
      <h1
        class="mt-4 max-w-xl text-[40px] leading-[1.02] font-bold tracking-tight text-zinc-50 sm:text-[56px]"
      >
        {{ t('home.title') }}
      </h1>
      <p class="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-400">
        {{ t('home.intro', { count: data?.results.length ?? 0 }) }}
      </p>

      <label
        class="mt-10 flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-zinc-950 px-4 transition-colors focus-within:border-white/40"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          class="size-4 shrink-0 text-zinc-500"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="m10.5 10.5 3 3" stroke-linecap="square" />
        </svg>
        <span class="sr-only">{{ t('home.search') }}</span>
        <input
          ref="input"
          v-model="search"
          type="search"
          :placeholder="t('home.search')"
          autocomplete="off"
          spellcheck="false"
          class="h-full min-w-0 flex-1 bg-transparent text-[15px] text-zinc-50 outline-none placeholder:text-zinc-600 [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd
          class="hidden items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-1 font-sans text-[11px] text-zinc-500 sm:inline-flex"
        >
          <span class="px-0.5">{{ mac ? '⌘' : 'Ctrl' }}</span>
          <span class="rounded bg-white/10 px-1 py-px">K</span>
        </kbd>
      </label>
    </section>

    <DotSection id="wishlist" :title="t('wishlist.title')" class="scroll-mt-16">
      <template #meta>
        <span
          class="font-doto text-[22px] leading-none font-bold tracking-[0.12em] text-zinc-50"
        >
          {{ String(wishlist.length).padStart(2, '0') }}
        </span>
      </template>
      <PokemonChips
        v-if="wishlist.length"
        :pokemon="wishlist"
        :remove-label="(name) => t('wishlist.remove', { name })"
        @remove="removePokemon"
      />
      <i18n-t
        v-else
        keypath="wishlist.empty"
        tag="p"
        scope="global"
        class="text-[14px] text-zinc-500"
      >
        <template #plus>
          <span class="font-mono text-zinc-300">+</span>
        </template>
      </i18n-t>
      <p v-if="error" role="alert" class="mt-4 text-[13px] text-zinc-300">
        {{ error }}
      </p>
    </DotSection>

    <DotSection id="likes" :title="t('likes.title')" class="scroll-mt-16">
      <template #meta>
        <span
          class="font-doto text-[22px] leading-none font-bold tracking-[0.12em] text-zinc-50"
        >
          {{ String(likes.length).padStart(2, '0') }}
        </span>
      </template>
      <PokemonChips
        v-if="likes.length"
        :pokemon="likes"
        :remove-label="(name) => t('likes.unlike', { name })"
        @remove="unlike"
      />
      <i18n-t
        v-else
        keypath="likes.empty"
        tag="p"
        scope="global"
        class="text-[14px] text-zinc-500"
      >
        <template #heart>
          <span class="font-mono text-zinc-300">♥</span>
        </template>
      </i18n-t>
      <p v-if="likesError" role="alert" class="mt-4 text-[13px] text-zinc-300">
        {{ likesError }}
      </p>
    </DotSection>

    <DotSection id="pokedex" :title="t('home.pokedex')" class="scroll-mt-16">
      <template #meta>
        <span
          class="font-doto text-[22px] leading-none font-bold tracking-[0.12em] text-zinc-50"
          :aria-label="t('home.results', { count: results.length })"
        >
          {{ dexNumber(results.length) }}
        </span>
      </template>

      <ul
        v-if="results.length"
        class="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4"
      >
        <li v-for="p in results.slice(0, shown)" :key="p.name">
          <PokemonCard :pokemon="p" />
        </li>
      </ul>
      <p v-else class="text-[14px] text-zinc-500">
        {{ t('home.noResults', { query: search.trim() }) }}
      </p>

      <div v-if="results.length > shown" class="mt-10 flex justify-center">
        <button
          type="button"
          class="inline-flex items-center gap-3 rounded-md border border-white/10 bg-zinc-950 px-4 py-2 text-[13px] text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
          @click="shown += PAGE_SIZE"
        >
          {{ t('home.showMore') }}
          <span class="font-mono text-[11px] tracking-[0.12em] text-zinc-500">
            {{ shown }} / {{ results.length }}
          </span>
        </button>
      </div>
    </DotSection>
  </div>
</template>
