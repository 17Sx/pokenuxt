<script setup lang="ts">
const props = defineProps<{
  name: string
  logo: string | null
  // Real pack picture: undefined while it is being looked up, null when there is none
  art?: string | null
}>()

const emit = defineEmits<{
  // Fired as soon as the user starts tearing, to fetch the pack early
  start: []
  // Fired once the tear animation is over
  opened: []
}>()

const TEAR_THRESHOLD = 0.6
const GENERATED_RATIO = 63 / 105

const packRef = ref<HTMLDivElement>()
const progress = ref(0)
const direction = ref<1 | -1>(1)
const dragging = ref(false)
const torn = ref(false)
const tilt = ref({ x: 0, y: 0 })
let startX = 0
let width = 1

// The pack only appears once its picture is loaded, so it never swaps design under the user
const loadedArt = ref<string | null>(null)
const failedArt = ref<string | null>(null)
const ratio = ref(GENERATED_RATIO)

watch(
  () => props.art,
  (src) => {
    loadedArt.value = null
    if (!src || !import.meta.client) return
    const img = new Image()
    img.onload = () => {
      if (props.art !== src) return
      ratio.value = img.naturalWidth / img.naturalHeight
      loadedArt.value = src
    }
    img.onerror = () => {
      failedArt.value = src
    }
    img.src = src
  },
  { immediate: true },
)

const mode = computed<'loading' | 'art' | 'generated'>(() => {
  if (props.art === undefined) return 'loading'
  if (!props.art || failedArt.value === props.art) return 'generated'
  return loadedArt.value === props.art ? 'art' : 'loading'
})

const packStyle = computed(() => ({
  '--dir': direction.value,
  // Height of the strip above the cut line, as a fraction of the pack
  '--cut-n': mode.value === 'art' ? 0.1 : 0.14,
  '--art': mode.value === 'art' ? `url("${props.art}")` : 'none',
  aspectRatio: mode.value === 'art' ? ratio.value : GENERATED_RATIO,
}))

const tiltStyle = computed(() => ({
  transform: `perspective(900px) rotateX(${tilt.value.x}deg) rotateY(${tilt.value.y}deg)`,
}))

const onPointerDown = (event: PointerEvent) => {
  if (torn.value || mode.value === 'loading' || !packRef.value) return
  const rect = packRef.value.getBoundingClientRect()
  // Only the top of the pack can be torn
  if (event.clientY - rect.top > rect.height * 0.35) return
  dragging.value = true
  tilt.value = { x: 0, y: 0 }
  startX = event.clientX
  width = rect.width
  progress.value = 0
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  emit('start')
}

const onPointerMove = (event: PointerEvent) => {
  if (!dragging.value) {
    if (torn.value || event.pointerType === 'touch' || !packRef.value) return
    const rect = packRef.value.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    tilt.value = { x: -y * 12, y: x * 16 }
    return
  }
  const dx = event.clientX - startX
  direction.value = dx >= 0 ? 1 : -1
  progress.value = Math.min(1, Math.abs(dx) / (width * 0.8))
  if (progress.value >= 1) tear()
}

const onPointerUp = () => {
  if (!dragging.value) return
  dragging.value = false
  if (progress.value >= TEAR_THRESHOLD) tear()
  else progress.value = 0
}

const onPointerLeave = () => {
  tilt.value = { x: 0, y: 0 }
}

const reduce = () =>
  import.meta.client &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function tear() {
  if (torn.value) return
  dragging.value = false
  progress.value = 1
  tilt.value = { x: 0, y: 0 }
  torn.value = true
  emit('start')
  setTimeout(() => emit('opened'), reduce() ? 0 : 950)
}

// Keyboard and screen reader fallback
const openWithButton = () => {
  direction.value = 1
  tear()
}

watch(
  () => props.name,
  () => {
    torn.value = false
    progress.value = 0
  },
)
</script>

<template>
  <div class="flex flex-col items-center">
    <div
      ref="packRef"
      class="booster relative w-[min(260px,65vw)] touch-none select-none"
      :class="{
        'is-torn': torn,
        'is-dragging': dragging,
        'has-art': mode === 'art',
        'is-loading': mode === 'loading',
      }"
      :style="packStyle"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerLeave"
    >
      <div class="booster__glow" />

      <div
        v-if="mode === 'loading'"
        class="absolute inset-0 animate-pulse rounded-md bg-zinc-900"
      />

      <div v-else class="booster__tilt" :style="tiltStyle">
        <!-- Strip above the cut line, flies away when torn -->
        <div class="booster__flap">
          <div v-if="mode === 'generated'" class="booster__crimp" />
        </div>

        <div class="booster__body">
          <div class="booster__shine" />
          <div
            v-if="mode === 'generated'"
            class="relative flex h-full flex-col items-center justify-center gap-4 px-6 pt-6"
          >
            <img
              v-if="logo"
              :src="logo"
              :alt="name"
              class="max-h-24 w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
              draggable="false"
            />
            <p
              v-else
              class="text-center text-xl font-black text-white drop-shadow"
            >
              {{ name }}
            </p>
            <div class="mt-4 flex flex-col items-center gap-1">
              <span
                class="rounded-full border-2 border-amber-300/90 px-3 py-1 text-xs font-black tracking-widest text-amber-300"
                >PN</span
              >
              <span
                class="text-[10px] font-semibold tracking-[0.3em] text-white/70 uppercase"
                >Booster</span
              >
            </div>
          </div>
          <span v-else class="sr-only">{{ name }}</span>
          <div
            v-if="mode === 'generated'"
            class="booster__crimp booster__crimp--bottom"
          />
        </div>

        <!-- Cut line and swipe progress -->
        <div class="booster__line">
          <div
            class="booster__cut"
            :style="{
              transform: `scaleX(${progress})`,
              transformOrigin: direction === 1 ? 'left' : 'right',
            }"
          />
          <div v-if="!torn && !dragging" class="booster__hint" />
        </div>
      </div>
    </div>

    <p class="mt-8 h-5 text-sm text-zinc-400" aria-live="polite">
      <template v-if="!torn && mode !== 'loading'"
        >Glisse le long de la ligne pour ouvrir</template
      >
    </p>
    <button
      v-if="!torn"
      type="button"
      class="mt-2 text-xs text-zinc-600 underline-offset-4 hover:text-zinc-300 hover:underline disabled:invisible"
      :disabled="mode === 'loading'"
      @click="openWithButton"
    >
      Ouvrir sans glisser
    </button>
  </div>
</template>

<style scoped>
.booster {
  animation: float 4s ease-in-out infinite;
  cursor: grab;
}

.booster.is-dragging {
  animation-play-state: paused;
  cursor: grabbing;
}

.booster.is-torn {
  animation: none;
  cursor: default;
}

.booster.is-loading {
  cursor: default;
}

.booster__glow {
  position: absolute;
  inset: 8%;
  border-radius: 24px;
  background: radial-gradient(
    closest-side,
    rgb(250 204 21 / 0.35),
    transparent
  );
  filter: blur(30px);
  transform: scale(1.4);
}

.booster__tilt {
  position: absolute;
  inset: 0;
  transition: transform 0.2s ease-out;
  animation: appear 0.4s ease-out;
}

.booster__flap,
.booster__body {
  position: absolute;
  left: 0;
  right: 0;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgb(255 255 255 / 0.18), transparent 40%),
    linear-gradient(160deg, #4338ca 0%, #7c3aed 35%, #db2777 70%, #f59e0b 100%);
  background-repeat: no-repeat;
  box-shadow: 0 30px 60px -20px rgb(0 0 0 / 0.8);
}

.has-art .booster__flap,
.has-art .booster__body {
  background-image:
    linear-gradient(135deg, rgb(255 255 255 / 0.12), transparent 40%),
    var(--art);
}

/* Backgrounds are sized to the whole pack so flap and body line up */
.booster__flap {
  top: 0;
  height: calc(var(--cut-n) * 100%);
  border-radius: 6px 6px 0 0;
  background-size:
    100% 100%,
    100% calc(100% / var(--cut-n));
  background-position:
    0 0,
    0 0;
  transition:
    transform 0.7s cubic-bezier(0.3, 0.6, 0.4, 1),
    opacity 0.7s ease;
}

.booster__body {
  top: calc(var(--cut-n) * 100%);
  bottom: 0;
  border-radius: 0 0 6px 6px;
  background-size:
    100% 100%,
    100% calc(100% / (1 - var(--cut-n)));
  background-position:
    0 0,
    0 100%;
  transition:
    transform 0.6s cubic-bezier(0.5, 0, 0.75, 0) 0.35s,
    opacity 0.5s ease 0.45s;
}

.has-art .booster__flap {
  border-radius: 3px 3px 0 0;
}

.has-art .booster__body {
  border-radius: 0 0 3px 3px;
}

.booster__crimp {
  position: absolute;
  inset: 0 0 auto;
  height: 22px;
  background: repeating-linear-gradient(
    90deg,
    rgb(255 255 255 / 0.35) 0 2px,
    rgb(255 255 255 / 0.08) 2px 6px
  );
  mask: linear-gradient(to bottom, #000 60%, transparent);
}

.booster__crimp--bottom {
  inset: auto 0 0;
  mask: linear-gradient(to top, #000 60%, transparent);
}

.booster__shine {
  position: absolute;
  inset: -50%;
  background: linear-gradient(
    115deg,
    transparent 40%,
    rgb(255 255 255 / 0.35) 50%,
    transparent 60%
  );
  animation: shine 3.5s ease-in-out infinite;
  pointer-events: none;
}

.has-art .booster__shine {
  opacity: 0.6;
}

.booster__line {
  position: absolute;
  top: calc(var(--cut-n) * 100%);
  left: 4%;
  right: 4%;
  height: 0;
  border-top: 2px dashed rgb(255 255 255 / 0.55);
  pointer-events: none;
}

.has-art .booster__line {
  border-top-color: rgb(255 255 255 / 0.8);
  filter: drop-shadow(0 0 2px rgb(0 0 0 / 0.8));
}

.booster__cut {
  position: absolute;
  top: -3px;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 2px;
  background: #fff;
  box-shadow:
    0 0 12px 3px rgb(255 255 255 / 0.9),
    0 0 30px 8px rgb(250 204 21 / 0.7);
  transition: transform 0.08s linear;
}

.booster__hint {
  position: absolute;
  top: -9px;
  left: 0;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.9);
  box-shadow: 0 0 16px 4px rgb(255 255 255 / 0.6);
  animation: hint 2.2s ease-in-out infinite;
}

.is-torn .booster__line {
  opacity: 0;
  transition: opacity 0.2s ease 0.1s;
}

.is-torn .booster__glow {
  transition:
    transform 0.6s ease,
    opacity 0.6s ease 0.3s;
  transform: scale(2.2);
  opacity: 0;
}

.is-torn .booster__flap {
  transform: translate(calc(var(--dir) * 60%), -160%)
    rotate(calc(var(--dir) * 28deg));
  opacity: 0;
}

.is-torn .booster__body {
  transform: translateY(115%);
  opacity: 0;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) rotate(-1deg);
  }
  50% {
    transform: translateY(-10px) rotate(1deg);
  }
}

@keyframes appear {
  from {
    opacity: 0;
    scale: 0.96;
  }
}

@keyframes shine {
  0% {
    transform: translateX(-40%);
  }
  60%,
  100% {
    transform: translateX(40%);
  }
}

@keyframes hint {
  0% {
    left: 0;
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  75% {
    left: calc(100% - 16px);
    opacity: 1;
  }
  100% {
    left: calc(100% - 16px);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .booster,
  .booster__tilt,
  .booster__shine,
  .booster__hint {
    animation: none;
  }
}
</style>
