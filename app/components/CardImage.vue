<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src: string | null
    alt: string
    lazy?: boolean
  }>(),
  { lazy: true },
)

const MAX_RETRIES = 2

// The TCGdex CDN sometimes answers 503 under load, so retry before giving up
const attempt = ref(0)
const failed = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

const url = computed(() => {
  if (!props.src) return null
  return attempt.value ? `${props.src}?retry=${attempt.value}` : props.src
})

watch(
  () => props.src,
  () => {
    clearTimeout(timer)
    attempt.value = 0
    failed.value = false
  },
)

const onError = () => {
  if (attempt.value >= MAX_RETRIES) {
    failed.value = true
    return
  }
  timer = setTimeout(() => attempt.value++, 1500 * (attempt.value + 1))
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <img
    v-if="url && !failed"
    :src="url"
    :alt="alt"
    :loading="lazy ? 'lazy' : 'eager'"
    class="aspect-[63/88] w-full rounded-lg bg-zinc-900"
    @error="onError"
  />
  <div
    v-else
    class="flex aspect-[63/88] w-full items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900 p-3 text-center text-xs text-zinc-500"
  >
    <slot>Image indisponible</slot>
  </div>
</template>
