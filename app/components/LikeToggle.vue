<script setup lang="ts">
import type { NamedAPIResource } from 'pokenode-ts'

const props = withDefaults(
  defineProps<{ pokemon: NamedAPIResource; full?: boolean }>(),
  { full: false },
)

const { like, unlike, isLiked } = useLikes()
const { t } = useI18n()

const liked = computed(() => isLiked(props.pokemon))
const label = computed(() => pokemonLabel(props.pokemon.name))

function toggle() {
  if (liked.value) unlike(props.pokemon)
  else like(props.pokemon)
}
</script>

<template>
  <button
    type="button"
    :aria-pressed="liked"
    :aria-label="
      liked
        ? t('likes.unlike', { name: label })
        : t('likes.like', { name: label })
    "
    class="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border transition-colors duration-300"
    :class="[
      full ? 'h-9 px-3.5 text-[13px]' : 'size-7',
      liked
        ? 'border-white bg-white text-black hover:bg-zinc-200'
        : 'border-white/10 bg-black/70 text-zinc-400 backdrop-blur hover:border-white/30 hover:text-white',
    ]"
    @click="toggle"
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      class="size-3.5"
      :fill="liked ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
    >
      <path
        d="M8 13.5 2.9 8.4a3 3 0 0 1 4.2-4.3L8 5l.9-.9a3 3 0 0 1 4.2 4.3Z"
      />
    </svg>
    <span v-if="full">{{
      liked ? t('likes.liked') : t('likes.likeShort')
    }}</span>
  </button>
</template>
