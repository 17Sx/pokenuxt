// A prerendered page was built without the visitor's cookie: once it's
// hydrated, show the Pokémon they chose to see in colour.
export default defineNuxtPlugin((nuxtApp) => {
  if (!nuxtApp.payload.prerenderedAt) return
  const { syncWithCookie } = useSpriteColor()
  onNuxtReady(syncWithCookie)
})
