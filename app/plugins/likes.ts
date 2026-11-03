// Loads the likes once. A server-rendered page gets them with the HTML, so
// the first client render matches. A prerendered page was built for no one:
// it leaves them out, and the browser loads them once it's hydrated.
export default defineNuxtPlugin(async (nuxtApp) => {
  const { likes } = useLikes()
  if (import.meta.prerender) return

  if (import.meta.client && nuxtApp.payload.prerenderedAt) {
    onNuxtReady(() =>
      nuxtApp.runWithContext(async () => {
        likes.value = await fetchLikes()
      }),
    )
    return
  }

  await callOnce('likes', async () => {
    likes.value = await fetchLikes()
  })
})
