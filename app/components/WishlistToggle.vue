<script setup lang="ts">
import type { NamedAPIResource } from 'pokenode-ts'

const props = withDefaults(
  defineProps<{ pokemon: NamedAPIResource; full?: boolean }>(),
  { full: false },
)

const { addPokemon, removePokemon, isInWishlist } = useWishlist()
const { t } = useI18n()

const saved = computed(() => isInWishlist(props.pokemon))
const label = computed(() => pokemonLabel(props.pokemon.name))

function toggle() {
  if (saved.value) removePokemon(props.pokemon)
  else addPokemon(props.pokemon)
}
</script>

<template>
  <button
    type="button"
    :aria-pressed="saved"
    :aria-label="
      saved
        ? t('wishlist.remove', { name: label })
        : t('wishlist.add', { name: label })
    "
    class="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border transition-colors duration-300"
    :class="[
      full ? 'h-9 px-3.5 text-[13px]' : 'size-7',
      saved
        ? 'border-white bg-white text-black hover:bg-zinc-200'
        : 'border-white/10 bg-black/70 text-zinc-400 backdrop-blur hover:border-white/30 hover:text-white',
    ]"
    @click="toggle"
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      class="size-3.5"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="square"
    >
      <path v-if="saved" d="M3 8.5 6.5 12 13 4.5" />
      <path v-else d="M8 3v10M3 8h10" />
    </svg>
    <span v-if="full">{{
      saved ? t('wishlist.saved') : t('wishlist.addShort')
    }}</span>
  </button>
</template>
