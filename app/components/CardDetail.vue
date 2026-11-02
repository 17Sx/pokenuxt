<script setup lang="ts">
import type { CardSummary } from '~/utils/tiers'

const props = defineProps<{ card: CardSummary | null }>()
const emit = defineEmits<{ close: [] }>()

const { $orpc } = useNuxtApp()
const { cards: owned } = useCollection()

type Details = Awaited<ReturnType<typeof $orpc.cards.get>>
const details = ref<Details | null>(null)
const loading = ref(false)

watch(
  () => props.card?.id,
  async (id) => {
    details.value = null
    if (!id) return
    loading.value = true
    try {
      const result = await $orpc.cards.get({ id })
      if (props.card?.id === id) details.value = result
    } catch {
      // Details are a bonus: the card itself is still shown
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

const tier = computed(() => props.card?.tier ?? details.value?.tier ?? null)
const image = computed(() =>
  props.card?.image ? highQuality(props.card.image) : null,
)

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => Boolean(props.card),
  (open) => {
    if (!import.meta.client) return
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="detail">
      <div
        v-if="card"
        class="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        :aria-label="card.name"
        @click.self="emit('close')"
      >
        <button
          type="button"
          class="fixed top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-zinc-900/80 text-xl text-zinc-300 hover:text-white"
          aria-label="Fermer"
          @click="emit('close')"
        >
          ×
        </button>
        <div
          class="flex min-h-full flex-col items-center justify-center gap-8 px-4 py-16 md:flex-row md:gap-12"
          @click.self="emit('close')"
        >
          <div class="detail-card w-full max-w-[340px]">
            <HoloCard
              v-if="image"
              :key="card.id"
              :image="image"
              :alt="card.name"
              :preset="tier ? HOLO_PRESETS[tier] : undefined"
              :intensity="isHolo(tier) ? 0.85 : 0"
              :edge-sparkle="isHolo(tier) ? 0.8 : 0"
              :width="340"
              :radius="16"
              :tilt-max="18"
              class="w-full"
            />
            <CardImage v-else :src="null" :alt="card.name">{{
              card.name
            }}</CardImage>
          </div>

          <div class="w-full max-w-sm text-zinc-300">
            <h2 class="text-2xl font-bold text-zinc-100">{{ card.name }}</h2>
            <p class="mt-1 text-sm text-zinc-500">{{ card.id }}</p>
            <p
              v-if="tier"
              class="mt-3 text-sm font-semibold"
              :class="TIER_COLORS[tier]"
            >
              {{ details?.rarity ?? TIER_LABELS[tier] }}
            </p>
            <p v-if="owned[card.id]" class="mt-2 text-sm text-emerald-400">
              Dans ta collection ×{{ owned[card.id]!.count }}
            </p>

            <p v-if="loading" class="mt-6 text-sm text-zinc-500">
              Chargement des détails…
            </p>
            <dl
              v-else-if="details"
              class="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm"
            >
              <dt class="text-zinc-500">Extension</dt>
              <dd>{{ details.set.name }}</dd>
              <dt class="text-zinc-500">Catégorie</dt>
              <dd>{{ details.category }}</dd>
              <template v-if="details.stage">
                <dt class="text-zinc-500">Stade</dt>
                <dd>{{ details.stage }}</dd>
              </template>
              <template v-if="details.hp">
                <dt class="text-zinc-500">PV</dt>
                <dd>{{ details.hp }}</dd>
              </template>
              <template v-if="details.types.length">
                <dt class="text-zinc-500">Type</dt>
                <dd>{{ details.types.join(', ') }}</dd>
              </template>
              <template v-if="details.illustrator">
                <dt class="text-zinc-500">Illustrateur</dt>
                <dd>{{ details.illustrator }}</dd>
              </template>
            </dl>
            <p
              v-if="details?.description"
              class="mt-6 text-sm leading-relaxed text-zinc-400 italic"
            >
              {{ details.description }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.detail-enter-active,
.detail-leave-active {
  transition: opacity 0.2s ease;
}

.detail-enter-active .detail-card {
  transition: transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

.detail-enter-from,
.detail-leave-to {
  opacity: 0;
}

.detail-enter-from .detail-card {
  transform: scale(0.85) translateY(20px);
}
</style>
