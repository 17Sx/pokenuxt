<script setup lang="ts">
const props = withDefaults(
  defineProps<{ id: number; name: string; compact?: boolean }>(),
  { compact: false },
)

const { isColored, setColored } = useSpriteColor()

const color = computed(() => isColored(props.id))
const label = computed(() => pokemonLabel(props.name))

const options = [
  { label: 'N&B', value: false },
  { label: 'Couleur', value: true },
]

// Four dots for the compact button: grey in black and white, coloured otherwise.
const dots = [
  { cx: 5, cy: 5, fill: '#f87171' },
  { cx: 11, cy: 5, fill: '#facc15' },
  { cx: 5, cy: 11, fill: '#4ade80' },
  { cx: 11, cy: 11, fill: '#60a5fa' },
]
</script>

<template>
  <button
    v-if="props.compact"
    type="button"
    :aria-pressed="color"
    :aria-label="
      color
        ? `Afficher ${label} en noir et blanc`
        : `Afficher ${label} en couleur`
    "
    class="inline-flex size-7 shrink-0 items-center justify-center rounded-md border backdrop-blur transition-colors duration-300"
    :class="
      color
        ? 'border-white/30 bg-black/70'
        : 'border-white/10 bg-black/70 hover:border-white/30'
    "
    @click="setColored(props.id, !color)"
  >
    <svg aria-hidden="true" viewBox="0 0 16 16" class="size-3.5">
      <circle
        v-for="dot in dots"
        :key="dot.fill"
        :cx="dot.cx"
        :cy="dot.cy"
        r="2"
        :fill="color ? dot.fill : '#71717a'"
      />
    </svg>
  </button>

  <div
    v-else
    role="group"
    :aria-label="`Couleur de ${label}`"
    class="flex items-center rounded-md border border-white/10 bg-black/70 p-0.5 font-mono text-[10px] tracking-[0.16em] uppercase backdrop-blur"
  >
    <button
      v-for="option in options"
      :key="option.label"
      type="button"
      :aria-pressed="color === option.value"
      class="rounded px-2 py-1 uppercase transition-colors"
      :class="
        color === option.value
          ? 'bg-white text-black'
          : 'text-zinc-400 hover:text-white'
      "
      @click="setColored(props.id, option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
