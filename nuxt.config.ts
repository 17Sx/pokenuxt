import tailwindcss from '@tailwindcss/vite'

// The Hono API in api/. The front never talks to anything else: Nuxt relays
// /api/** to it, so the browser stays on one domain and cookies just work.
const API_URL = (process.env.API_URL ?? 'http://localhost:8787').replace(
  /\/$/,
  '',
)

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'PokéNuxt',
      meta: [
        {
          name: 'description',
          content: 'Le Pokédex national en noir et blanc, point par point.',
        },
        { name: 'theme-color', content: '#000000' },
      ],
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
