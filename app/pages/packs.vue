<script setup lang="ts">
import type { CardSummary, OpenedCard } from '~/utils/tiers'

const { $orpc } = useNuxtApp()
const { cards: owned, add } = useCollection()

const { data: sets } = await useAsyncData('sets', () => $orpc.sets.list())
const setId = ref('sv03.5')
const selectedSet = computed(() =>
  sets.value?.find((set) => set.id === setId.value),
)

const { data: packArt, status: packArtStatus } = await useAsyncData(
  'pack-art',
  () => $orpc.sets.packArt({ setId: setId.value }),
  { watch: [setId] },
)
// undefined tells the booster to wait, null to use the generated design
const art = computed(() =>
  packArtStatus.value === 'pending'
    ? undefined
    : (packArt.value?.image ?? null),
)

type Stage = 'pack' | 'reveal' | 'summary'
const stage = ref<Stage>('pack')
const opened = ref<OpenedCard[]>([])
const errorMessage = ref('')
const waiting = ref(false)
const selected = ref<CardSummary | null>(null)

type Pack = Awaited<ReturnType<typeof $orpc.packs.open>>
let request: Promise<Pack> | null = null
// Bumped on every new pack so late answers from a previous one are ignored
let generation = 0
// Remounts the booster with a fresh, untorn pack
const packKey = ref(0)

const preload = (pack: Pack) =>
  Promise.all(
    pack.map(
      (card) =>
        new Promise<void>((resolve) => {
          if (!card.image) return resolve()
          const img = new Image()
          img.onload = img.onerror = () => resolve()
          img.src = highQuality(card.image)
        }),
    ),
  )

// Starts as soon as the user begins tearing, so the pack is usually ready when the animation ends
function prefetch() {
  if (request) return
  errorMessage.value = ''
  request = $orpc.packs.open({ setId: setId.value }).then(async (pack) => {
    await Promise.race([
      preload(pack),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ])
    return pack
  })
  request.catch(() => {
    request = null
  })
}

async function onOpened() {
  prefetch()
  const current = ++generation
  waiting.value = true
  try {
    const pack = await request!
    if (current !== generation) return
    opened.value = pack.map((card) => ({
      id: card.id,
      name: card.name,
      image: card.image,
      tier: card.tier,
      isNew: !owned.value[card.id],
    }))
    add(pack)
    stage.value = 'reveal'
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Impossible d’ouvrir ce pack'
    packKey.value++
  } finally {
    request = null
    waiting.value = false
  }
}

function newPack() {
  generation++
  packKey.value++
  request = null
  opened.value = []
  stage.value = 'pack'
}

watch(setId, newPack)

const rareCount = computed(
  () => opened.value.filter((card) => isHolo(card.tier)).length,
)
const newCount = computed(
  () => opened.value.filter((card) => card.isNew).length,
)

const selectClass =
  'rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500'
</script>

<template>
  <div class="flex flex-col items-center">
    <template v-if="stage === 'pack'">
      <select
        v-model="setId"
        :class="[selectClass, 'w-full max-w-sm']"
        aria-label="Extension"
      >
        <option v-for="set in sets" :key="set.id" :value="set.id">
          {{ set.name }} ({{ set.id }})
        </option>
      </select>
      <p v-if="errorMessage" class="mt-4 text-center text-sm text-red-400">
        {{ errorMessage }}
      </p>
      <div class="mt-12">
        <BoosterPack
          :key="`${setId}-${packKey}`"
          :name="selectedSet?.name ?? setId"
          :logo="selectedSet?.logo ?? null"
          :art="art"
          @start="prefetch"
          @opened="onOpened"
        />
      </div>
      <p v-if="waiting" class="mt-4 text-sm text-zinc-500">
        Préparation du pack…
      </p>
    </template>

    <PackReveal
      v-else-if="stage === 'reveal'"
      :cards="opened"
      class="mt-4"
      @done="stage = 'summary'"
    />

    <div v-else class="w-full">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold">{{ selectedSet?.name }}</h2>
          <p class="mt-1 text-sm text-zinc-400">
            {{ newCount }} nouvelle{{ newCount > 1 ? 's' : '' }} ·
            {{ rareCount }} rare{{ rareCount > 1 ? 's' : '' }}
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300"
            @click="newPack"
          >
            Ouvrir un autre pack
          </button>
          <NuxtLink
            to="/collection"
            class="rounded-lg border border-zinc-800 px-4 py-2 text-sm hover:border-zinc-600"
          >
            Voir la collection
          </NuxtLink>
        </div>
      </div>
      <ul class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <li
          v-for="(card, i) in opened"
          :key="`${card.id}-${i}`"
          class="summary-card"
          :style="{ animationDelay: `${i * 50}ms` }"
        >
          <button
            type="button"
            class="relative block w-full cursor-pointer rounded-lg transition-transform hover:-translate-y-1"
            :class="{
              'ring-2 ring-offset-2 ring-offset-zinc-950': isHolo(card.tier),
            }"
            :style="
              isHolo(card.tier)
                ? { '--tw-ring-color': `rgb(${TIER_GLOW[card.tier]})` }
                : undefined
            "
            @click="selected = card"
          >
            <CardImage
              :src="card.image && lowQuality(card.image)"
              :alt="card.name"
            />
          </button>
          <p
            class="mt-2 flex items-center gap-1 truncate text-sm text-zinc-300"
          >
            <span class="truncate">{{ card.name }}</span>
            <span
              v-if="card.isNew"
              class="shrink-0 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950 uppercase"
              >Nouvelle</span
            >
          </p>
          <p class="text-xs" :class="TIER_COLORS[card.tier]">
            {{ TIER_LABELS[card.tier] }}
          </p>
        </li>
      </ul>
    </div>

    <CardDetail :card="selected" @close="selected = null" />
  </div>
</template>

<style scoped>
.summary-card {
  animation: summary-in 0.4s ease-out both;
}

@keyframes summary-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
}

@media (prefers-reduced-motion: reduce) {
  .summary-card {
    animation: none;
  }
}
</style>
