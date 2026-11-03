import type { APIRequestContext } from '@playwright/test'

/** The API the front calls in the tests, started by playwright.config.ts. */
export const API = process.env.NUXT_PUBLIC_API_BASE!

/** The wishlist is shared by every visitor: tests start from an empty one. */
export async function emptyWishlist(request: APIRequestContext) {
  const { items } = await (await request.get(`${API}/wishlist`)).json()
  for (const { id } of items as { id: number }[]) {
    await request.delete(`${API}/wishlist/${id}`)
  }
}
