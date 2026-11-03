import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import { API, emptyLikes, emptyWishlist } from './api'

test.beforeEach(async ({ request }) => {
  await emptyWishlist(request)
  await emptyLikes(request)
})

const card = (page: Page, name: string) =>
  page
    .locator('#pokedex article')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })

/** Clicks, then waits for the API to have saved the change. */
async function clickAndSave(page: Page, button: string, path: string) {
  const saved = page.waitForResponse(
    (r) => r.url() === `${API}/${path}` && r.request().method() === 'POST',
  )
  await card(page, 'Bulbasaur').getByRole('button', { name: button }).click()
  expect((await saved).ok()).toBe(true)
}

test('garde la wishlist, les likes, les couleurs et la langue après un rechargement', async ({
  page,
  goto,
}) => {
  await goto('/', { waitUntil: 'hydration' })

  await clickAndSave(page, 'Ajouter Bulbasaur à la wishlist', 'wishlist')
  await clickAndSave(page, 'Liker Bulbasaur', 'likes')
  await card(page, 'Bulbasaur')
    .getByRole('button', { name: 'Afficher Bulbasaur en couleur' })
    .click()
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.reload()

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Every Pokémon.',
  )
  await expect(
    page.locator('#wishlist').getByRole('link', { name: 'Bulbasaur' }),
  ).toBeVisible()
  await expect(
    page.locator('#likes').getByRole('link', { name: 'Bulbasaur' }),
  ).toBeVisible()
  const bulbasaur = card(page, 'Bulbasaur')
  await expect(
    bulbasaur.getByRole('button', {
      name: 'Remove Bulbasaur from the wishlist',
    }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    bulbasaur.getByRole('button', { name: 'Unlike Bulbasaur' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    bulbasaur.getByRole('button', {
      name: 'Show Bulbasaur in black and white',
    }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(bulbasaur.locator('img')).toHaveAttribute('src', /[?&]c=1/)
  // Only the Pokémon that was chosen.
  await expect(
    card(page, 'Ivysaur').getByRole('button', { name: 'Like Ivysaur' }),
  ).toHaveAttribute('aria-pressed', 'false')
})

test('la fiche retrouve les mêmes choix après un rechargement', async ({
  page,
  goto,
}) => {
  await goto('/pokemon/bulbasaur', { waitUntil: 'hydration' })

  const wishlisted = page.waitForResponse(
    (r) => r.url() === `${API}/wishlist` && r.request().method() === 'POST',
  )
  await page
    .getByRole('button', { name: 'Ajouter Bulbasaur à la wishlist' })
    .click()
  await wishlisted
  const liked = page.waitForResponse(
    (r) => r.url() === `${API}/likes` && r.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Liker Bulbasaur' }).click()
  await liked
  await page.getByRole('button', { name: 'Couleur' }).click()
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByText('Seed Pokémon')).toBeVisible()

  await page.reload()

  await expect(page.getByText('Seed Pokémon')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Remove Bulbasaur from the wishlist' }),
  ).toHaveText('In the wishlist')
  await expect(
    page.getByRole('button', { name: 'Unlike Bulbasaur' }),
  ).toHaveText('Liked')
  await expect(page.getByRole('button', { name: 'Colour' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('main img').first()).toHaveAttribute(
    'src',
    /[?&]c=1/,
  )
})

test('ce qui est retiré le reste après un rechargement', async ({
  page,
  goto,
}) => {
  await goto('/', { waitUntil: 'hydration' })
  await clickAndSave(page, 'Liker Bulbasaur', 'likes')

  const removed = page.waitForResponse(
    (r) => r.url() === `${API}/likes/1` && r.request().method() === 'DELETE',
  )
  await card(page, 'Bulbasaur')
    .getByRole('button', { name: 'Ne plus liker Bulbasaur' })
    .click()
  await removed

  await page.reload()

  await expect(
    page.locator('#likes').getByText('Aucun Pokémon liké pour l’instant.'),
  ).toBeVisible()
  await expect(
    card(page, 'Bulbasaur').getByRole('button', { name: 'Liker Bulbasaur' }),
  ).toHaveAttribute('aria-pressed', 'false')
})
