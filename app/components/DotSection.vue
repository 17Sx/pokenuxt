<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <section class="relative pt-8 pb-12">
    <div
      aria-hidden="true"
      class="rule-dots rule-dots-x pointer-events-none absolute top-0 -right-[100vw] -left-[100vw] -translate-y-1/2"
    />
    <span
      aria-hidden="true"
      class="pointer-events-none absolute top-0 -left-4 z-20 hidden size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white md:block md:-left-8"
    />
    <span
      aria-hidden="true"
      class="pointer-events-none absolute top-0 -right-4 z-20 hidden size-[3px] translate-x-1/2 -translate-y-1/2 rounded-full bg-white md:block md:-right-8"
    />
    <div
      v-if="title || $slots.meta"
      class="mb-5 flex items-baseline justify-between gap-4"
    >
      <h2 class="text-[18px] font-bold tracking-tight text-zinc-50">
        {{ title }}
      </h2>
      <slot name="meta" />
    </div>
    <slot />
  </section>
</template>
