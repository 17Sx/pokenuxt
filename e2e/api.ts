import type { APIRequestContext } from '@playwright/test'

/** The API the front calls in the tests, started by playwright.config.ts. */
export const API = process.env.NUXT_PUBLIC_API_BASE!

async function empty(request: APIRequestContext, list: 'wishlist' | 'likes') {
  const { items } = await (await request.get(`${API}/${list}`)).json()
  for (const { id } of items as { id: number }[]) {
    await request.delete(`${API}/${list}/${id}`)
  }
}

/** The wishlist is shared by every visitor: tests start from an empty one. */
export async function emptyWishlist(request: APIRequestContext) {
  await empty(request, 'wishlist')
}

/** So are the likes: tests start with nothing liked. */
export async function emptyLikes(request: APIRequestContext) {
  await empty(request, 'likes')
}
