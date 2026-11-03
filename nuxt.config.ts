import tailwindcss from '@tailwindcss/vite'

// The Hono API in api/. The front never talks to anything else: Nuxt relays
// /api/** to it, so the browser stays on one domain and cookies just work.
const API_URL = (process.env.API_URL ?? 'http://localhost:8787').replace(
  /\/$/,
  '',
)

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
  routeRules: {
    '/api/**': { proxy: `${API_URL}/**` },
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
})
