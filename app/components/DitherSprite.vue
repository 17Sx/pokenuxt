<script setup lang="ts">
const props = withDefaults(
  defineProps<{ id: number; size?: 96 | 128 | 256; alt?: string }>(),
  { size: 128, alt: '' },
)

const image = useTemplateRef('image')
const loaded = ref(false)
const failed = ref(false)

// The image may finish loading before hydration, when no listener is attached yet.
onMounted(() => {
  if (!image.value?.complete) return
  if (image.value.naturalWidth) loaded.value = true
  else failed.value = true
})
</script>

<template>
  <div>
    <img
      v-if="!failed"
      ref="image"
      :src="`/api/sprite/${props.id}?s=${props.size}`"
      :alt="props.alt"
      :width="props.size"
      :height="props.size"
      loading="lazy"
      decoding="async"
      class="pixelated h-full w-full object-contain opacity-70"
      :class="loaded ? 'dither-reveal' : 'opacity-0'"
      @load="loaded = true"
      @error="failed = true"
    />
    <div
      v-else
      class="flex h-full w-full items-center justify-center font-doto text-[40px] leading-none font-bold text-zinc-700"
      :aria-label="props.alt || undefined"
      :role="props.alt ? 'img' : undefined"
    >
      ?
    </div>
  </div>
</template>
