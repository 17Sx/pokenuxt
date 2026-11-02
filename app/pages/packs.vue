<script setup lang="ts">
import type { Tier } from '~~/server/utils/packs'
import type { HoloPreset } from '~/lib/holo-card/types'

const { $orpc } = useNuxtApp()
const { cards: owned, add } = useCollection()

const { data: sets } = await useAsyncData('sets', () => $orpc.sets.list())
const setId = ref('sv03.5')
const selectedSet = computed(() => sets.value?.find(set => set.id === setId.value))

type PackCard = Awaited<ReturnType<typeof $orpc.packs.open>>[number]
const pack = ref<Array<PackCard & { revealed: boolean, isNew: boolean }>>([])
const opening = ref(false)
const errorMessage = ref('')

const revealedCount = computed(() => pack.value.filter(card => card.revealed).length)

async function openPack() {
  opening.value = true
  errorMessage.value = ''
  try {
    const cards = await $orpc.packs.open({ setId: setId.value })
    pack.value = cards.map(card => ({ ...card, revealed: false, isNew: !owned.value[card.id] }))
    add(cards)
  }
  catch (error) {
    pack.value = []
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d’ouvrir ce pack'
  }
  finally {
    opening.value = false
  }
}

const revealAll = () => pack.value.forEach((card) => {
  card.revealed = true
})

const HOLO_PRESETS: Partial<Record<Tier, HoloPreset>> = {
  rare: 'glitter',
  holo: 'rainbow',
  ultra: 'stars',
  secret: 'gold'
}

const TIER_COLORS: Record<Tier, string> = {
  common: 'text-zinc-500',
  uncommon: 'text-zinc-300',
  rare: 'text-sky-400',
  holo: 'text-violet-400',
  ultra: 'text-amber-400',
  secret: 'text-rose-400'
}

const selectClass = 'rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500'
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-3">
      <select v-model="setId" :class="[selectClass, 'w-full sm:w-auto']" aria-label="Extension">
        <option v-for="set in sets" :key="set.id" :value="set.id">
          {{ set.name }} ({{ set.id }})
        </option>
      </select>
      <button
        type="button"
        class="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
        :disabled="opening || !setId"
        @click="openPack"
      >
        {{ opening ? 'Ouverture…' : pack.length ? 'Ouvrir un autre pack' : 'Ouvrir un pack' }}
      </button>
      <img v-if="selectedSet?.logo" :src="selectedSet.logo" :alt="selectedSet.name" class="h-10 w-auto">
    </div>

    <p v-if="errorMessage" class="mt-6 text-red-400">{{ errorMessage }}</p>

    <template v-if="pack.length">
      <div class="mt-8 flex items-center gap-4">
        <p class="text-sm text-zinc-400">{{ revealedCount }} / {{ pack.length }} révélées</p>
        <button
          v-if="revealedCount < pack.length"
          type="button"
          class="text-sm text-zinc-400 underline-offset-4 hover:text-zinc-100 hover:underline"
          @click="revealAll"
        >
          Tout révéler
        </button>
      </div>
      <ul class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <li v-for="(card, index) in pack" :key="`${card.id}-${index}`">
          <Transition name="flip" mode="out-in">
            <button
              v-if="!card.revealed"
              type="button"
              class="block w-full transition-transform hover:-translate-y-1"
              :aria-label="`Révéler la carte ${index + 1}`"
              @click="card.revealed = true"
            >
              <CardBack />
            </button>
            <HoloCard
              v-else-if="card.image && HOLO_PRESETS[card.tier]"
              :image="card.image"
              :alt="card.name"
              :preset="HOLO_PRESETS[card.tier]"
              :width="400"
              :radius="10"
              class="w-full"
            />
            <CardImage v-else :src="card.image" :alt="card.name" :lazy="false">
              {{ card.name }}
            </CardImage>
          </Transition>
          <div class="mt-3 h-10 text-sm">
            <template v-if="card.revealed">
              <p class="truncate text-zinc-300">
                {{ card.name }}
                <span v-if="card.isNew" class="ml-1 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950 uppercase">Nouvelle</span>
              </p>
              <p :class="TIER_COLORS[card.tier]">{{ TIER_LABELS[card.tier] }}</p>
            </template>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.flip-leave-active {
  animation: flip-out 0.18s ease-in forwards;
}

.flip-enter-active {
  animation: flip-in 0.3s ease-out;
}

@keyframes flip-out {
  to {
    transform: perspective(800px) rotateY(90deg);
  }
}

@keyframes flip-in {
  from {
    transform: perspective(800px) rotateY(-90deg);
  }
}
</style>
