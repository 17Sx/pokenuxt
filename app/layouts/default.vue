<script setup lang="ts">
const { wishlist } = useWishlist()
</script>

<template>
  <div
    class="relative min-h-screen overflow-x-clip bg-black text-zinc-100 antialiased"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 mx-auto hidden max-w-5xl md:block"
    >
      <div
        class="rule-dots rule-dots-y absolute inset-y-0 left-0 -translate-x-1/2"
      />
      <div
        class="rule-dots rule-dots-y absolute inset-y-0 right-0 translate-x-1/2"
      />
    </div>

    <header class="sticky top-0 z-40 bg-black/80 backdrop-blur-md">
      <div
        class="relative mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 md:px-8"
      >
        <NuxtLink
          to="/"
          class="font-doto text-[20px] leading-none font-bold tracking-[0.14em] text-white"
        >
          POKÉNUXT
        </NuxtLink>
        <nav
          aria-label="Navigation principale"
          class="flex items-center gap-5 font-mono text-[11px] tracking-[0.18em] uppercase"
        >
          <NuxtLink
            to="/#pokedex"
            class="text-zinc-400 transition-colors hover:text-white"
          >
            Pokédex
          </NuxtLink>
          <NuxtLink
            to="/#wishlist"
            class="flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
          >
            Wishlist
            <span
              class="font-doto text-[15px] leading-none font-bold tracking-[0.1em] text-white"
            >
              {{ String(wishlist.length).padStart(2, '0') }}
            </span>
          </NuxtLink>
        </nav>
        <div
          aria-hidden="true"
          class="rule-dots rule-dots-x pointer-events-none absolute -right-[100vw] bottom-0 -left-[100vw] translate-y-1/2"
        />
        <span
          aria-hidden="true"
          class="pointer-events-none absolute bottom-0 left-0 hidden size-[3px] -translate-x-1/2 translate-y-1/2 rounded-full bg-white md:block"
        />
        <span
          aria-hidden="true"
          class="pointer-events-none absolute right-0 bottom-0 hidden size-[3px] translate-x-1/2 translate-y-1/2 rounded-full bg-white md:block"
        />
      </div>
    </header>

    <main class="relative mx-auto max-w-5xl px-4 md:px-8">
      <slot />
    </main>
  </div>
</template>
