import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxtjs/i18n'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'PokéNuxt',
      meta: [{ name: 'theme-color', content: '#000000' }],
    },
  },
  // Texts live in i18n/locales/. en.json is the reference the others are
  // checked against (bun run i18n:check). French stays the default, and URLs
  // don't change with the language: the choice is kept in a cookie.
  i18n: {
    locales: [
      { code: 'en', language: 'en-GB', name: 'English', file: 'en.json' },
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
    ],
    defaultLocale: 'fr',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'pokenuxt-lang',
      fallbackLocale: 'fr',
    },
  },
  runtimeConfig: {
    public: {
      // The Hono API in api/, on AWS Lambda behind API Gateway in production.
      // Pages call it straight from the browser, so its CORS lists this
      // site's origin. NUXT_PUBLIC_API_BASE is read at build time, which is
      // when CI knows the API's URL, and can still override it at runtime.
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:8787',
    },
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
})
