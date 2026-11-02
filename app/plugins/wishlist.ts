// Loads the wishlist once, during server rendering, with the visitor's cookie.
// The client then starts from the same list, so the first render matches.
export default defineNuxtPlugin(async () => {
  const { wishlist } = useWishlist()
  await callOnce('wishlist', async () => {
    wishlist.value = await fetchWishlist()
  })
})
