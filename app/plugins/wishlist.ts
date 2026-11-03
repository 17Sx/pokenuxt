// Loads the wishlist once. A server-rendered page gets it with the HTML, so
// the first client render matches. A prerendered page was built for no one:
// it leaves the wishlist out, and the browser loads it once it's hydrated.
export default defineNuxtPlugin(async (nuxtApp) => {
  const { wishlist } = useWishlist()
  if (import.meta.prerender) return

  if (import.meta.client && nuxtApp.payload.prerenderedAt) {
    onNuxtReady(() =>
      nuxtApp.runWithContext(async () => {
        wishlist.value = await fetchWishlist()
      }),
    )
    return
  }

  await callOnce('wishlist', async () => {
    wishlist.value = await fetchWishlist()
  })
})
