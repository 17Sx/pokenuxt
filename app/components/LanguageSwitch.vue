<script setup lang="ts">
const { locale, locales, setLocale, t } = useI18n()
</script>

<template>
  <div role="group" :aria-label="t('nav.language')" class="flex items-center">
    <template v-for="(option, index) in locales" :key="option.code">
      <span v-if="index" aria-hidden="true" class="mx-1.5 text-zinc-700"
        >/</span
      >
      <button
        type="button"
        :lang="option.code"
        :aria-label="option.name"
        :aria-pressed="locale === option.code"
        class="uppercase transition-colors"
        :class="
          locale === option.code
            ? 'text-white'
            : 'text-zinc-500 hover:text-zinc-200'
        "
        @click="setLocale(option.code)"
      >
        {{ option.code }}
      </button>
    </template>
  </div>
</template>
