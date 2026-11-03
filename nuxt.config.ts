import tailwindcss from '@tailwindcss/vite'
import { pokemonRoutes } from './prerender/pokemon-routes'

// The Hono API in api/, on AWS Lambda behind API Gateway in production.
// NUXT_PUBLIC_API_BASE is read at build time, which is when CI knows the
// API's URL, and can still override it at runtime.
const API_BASE = process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

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
      // Pages call it straight from the browser, so its CORS lists this
      // site's origin.
      apiBase: API_BASE,
    },
  },
  // With PRERENDER_POKEMON=1, set by the Deploy workflow, every
  // /pokemon/<name> page is built ahead of time, from the names the API lists.
  // PRERENDER_POKEMON_LIMIT keeps only the first ones, for a quicker check.
  nitro: {
    prerender: {
      crawlLinks: false,
      failOnError: true,
      // A page calls the API about three times, and API Gateway allows 25
      // requests a second: 3 pages at once stay under it. The API calls
      // retry on 429 (usePokeApi) in case they go over.
      concurrency: 3,
      retry: 3,
      retryDelay: 2000,
    },
  },
  hooks: {
    async 'nitro:config'(config) {
      // nuxt generate starts from / when it follows links, which is off.
      if (config.static) {
        config.prerender ??= {}
        config.prerender.routes = [...(config.prerender.routes ?? []), '/']
      }
      if (!process.env.PRERENDER_POKEMON) return
      const limit = Number(process.env.PRERENDER_POKEMON_LIMIT) || undefined
      const routes = (await pokemonRoutes(API_BASE)).slice(0, limit)
      config.prerender ??= {}
      config.prerender.routes = [...(config.prerender.routes ?? []), ...routes]
      console.info(`Prerendering ${routes.length} Pokémon pages`)
    },
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
})
