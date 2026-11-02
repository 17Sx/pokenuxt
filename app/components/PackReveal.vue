<script setup lang="ts">
import type { OpenedCard } from '~/utils/tiers'

const props = defineProps<{ cards: OpenedCard[] }>()
const emit = defineEmits<{ done: [] }>()

const SWIPE_DISTANCE = 80
const FLY_DURATION = 320

const index = ref(0)
const dx = ref(0)
const dy = ref(0)
const dragging = ref(false)
const flying = ref<0 | 1 | -1>(0)
let start = { x: 0, y: 0, time: 0 }

const current = computed(() => props.cards[index.value])
const next = computed(() => props.cards[index.value + 1])
const remaining = computed(() => props.cards.length - index.value - 1)
const glow = computed(() => current.value ? TIER_GLOW[current.value.tier] : undefined)

const cardStyle = computed(() => {
  if (flying.value) {
    return {
      transform: `translate(${flying.value * 130}vw, ${dy.value}px) rotate(${flying.value * 30}deg)`,
      transition: `transform ${FLY_DURATION}ms cubic-bezier(0.5, 0, 0.9, 0.5)`
    }
  }
  return {
    transform: `translate(${dx.value}px, ${dy.value * 0.3}px) rotate(${dx.value / 18}deg)`,
    transition: dragging.value ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.3)'
  }
})

function advance(direction: 1 | -1 = 1) {
  if (flying.value || !current.value) return
  flying.value = direction
  setTimeout(() => {
    flying.value = 0
    dx.value = 0
    dy.value = 0
    if (index.value >= props.cards.length - 1) emit('done')
    else index.value++
  }, FLY_DURATION)
}

const onPointerDown = (event: PointerEvent) => {
  if (flying.value) return
  dragging.value = true
  start = { x: event.clientX, y: event.clientY, time: performance.now() }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const onPointerMove = (event: PointerEvent) => {
  if (!dragging.value) return
  dx.value = event.clientX - start.x
  dy.value = event.clientY - start.y
}

const onPointerUp = () => {
  if (!dragging.value) return
  dragging.value = false
  const isTap = Math.abs(dx.value) < 8 && Math.abs(dy.value) < 8 && performance.now() - start.time < 300
  if (isTap) advance(1)
  else if (Math.abs(dx.value) > SWIPE_DISTANCE) advance(dx.value > 0 ? 1 : -1)
  else {
    dx.value = 0
    dy.value = 0
  }
}

const onKeydown = (event: KeyboardEvent) => {
  if (['ArrowRight', 'Enter', ' '].includes(event.key)) {
    event.preventDefault()
    advance(1)
  }
  else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    advance(-1)
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="relative aspect-[63/88] w-[min(320px,78vw)]">
      <!-- Depth: edges of the cards still in the pack -->
      <div
        v-for="depth in Math.min(remaining, 3)"
        :key="`edge-${depth}`"
        class="absolute inset-0 rounded-xl bg-zinc-800 shadow-lg"
        :style="{ transform: `translateY(${depth * 6}px) scale(${1 - depth * 0.03})`, opacity: 1 - depth * 0.25 }"
      />

      <!-- Next card waits underneath so it is already loaded -->
      <div v-if="next" :key="`next-${index}`" class="absolute inset-0">
        <CardImage :src="next.image && highQuality(next.image)" :alt="next.name" :lazy="false" class="!rounded-xl" />
      </div>

      <!-- Halo behind rare cards -->
      <div
        v-if="glow"
        :key="`glow-${index}`"
        class="reveal-glow pointer-events-none absolute -inset-16 rounded-full"
        :style="{ '--glow': glow }"
      />

      <div
        v-if="current"
        :key="`card-${index}`"
        class="reveal-card absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
        :class="{ 'reveal-card--rare': glow }"
        :style="cardStyle"
        role="button"
        tabindex="0"
        :aria-label="`${current.name}, carte suivante`"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <HoloCard
          v-if="current.image && isHolo(current.tier)"
          :image="highQuality(current.image)"
          :alt="current.name"
          :preset="HOLO_PRESETS[current.tier]"
          :width="320"
          :radius="12"
          :hover-scale="1"
          class="!w-full"
        />
        <CardImage v-else :src="current.image && highQuality(current.image)" :alt="current.name" :lazy="false" class="!rounded-xl shadow-2xl">
          {{ current.name }}
        </CardImage>
      </div>
    </div>

    <div v-if="current" :key="`info-${index}`" class="reveal-info mt-8 flex h-16 flex-col items-center text-center">
      <p class="flex items-center gap-2 text-lg font-semibold text-zinc-100">
        {{ current.name }}
        <span v-if="current.isNew" class="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950 uppercase">Nouvelle</span>
      </p>
      <p class="text-sm font-medium" :class="TIER_COLORS[current.tier]">{{ TIER_LABELS[current.tier] }}</p>
    </div>

    <div class="mt-4 flex items-center gap-6 text-sm text-zinc-500">
      <span>{{ index + 1 }} / {{ cards.length }}</span>
      <button type="button" class="underline-offset-4 hover:text-zinc-200 hover:underline" @click="emit('done')">
        Tout voir
      </button>
    </div>
    <p class="mt-3 text-xs text-zinc-600">Touche ou glisse la carte</p>
  </div>
</template>

<style scoped>
.reveal-card {
  will-change: transform;
}

.reveal-card--rare {
  animation: rare-arrival 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

.reveal-glow {
  background: radial-gradient(closest-side, rgb(var(--glow) / 0.55), rgb(var(--glow) / 0.15) 60%, transparent);
  filter: blur(20px);
  animation: glow-pulse 2.4s ease-in-out infinite, glow-in 0.6s ease-out;
}

.reveal-info {
  animation: info-in 0.35s ease-out;
}

@keyframes rare-arrival {
  0% {
    filter: brightness(2.2);
    scale: 0.92;
  }
  40% {
    filter: brightness(1.4);
    scale: 1.04;
  }
  100% {
    filter: brightness(1);
    scale: 1;
  }
}

@keyframes glow-in {
  from {
    opacity: 0;
    scale: 0.6;
  }
}

@keyframes glow-pulse {
  0%, 100% {
    opacity: 0.85;
  }
  50% {
    opacity: 1;
  }
}

@keyframes info-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal-card--rare,
  .reveal-glow,
  .reveal-info {
    animation: none;
  }
}
</style>
