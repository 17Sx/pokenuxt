import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'

const wishlistSection = (page: Page) =>
  page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: /^Wishlist/ }) })

test.beforeEach(async ({ goto }) => {
  await goto('/', { waitUntil: 'hydration' })
})

test('filtre la liste avec la recherche', async ({ page }) => {
  await page.getByPlaceholder('Rechercher un Pokémon').fill('bulbasaur')

  await expect(
    page.getByRole('link', { name: 'bulbasaur', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'pikachu', exact: true }),
  ).toHaveCount(0)
})

test('ajoute puis retire un Pokémon de la wishlist', async ({ page }) => {
  const wishlist = wishlistSection(page)
  await expect(
    wishlist.getByText('Aucun Pokémon pour l’instant.'),
  ).toBeVisible()

  await page.getByPlaceholder('Rechercher un Pokémon').fill('bulbasaur')
  await page.getByRole('button', { name: 'Add +' }).click()

  await expect(
    page.getByRole('heading', { name: 'Wishlist (1)' }),
  ).toBeVisible()
  await expect(
    wishlist.getByRole('link', { name: 'bulbasaur', exact: true }),
  ).toBeVisible()
  // Once added, the Pokémon can only be removed, so it can't be added twice.
  await expect(page.getByRole('button', { name: 'Add +' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Remove -' }).click()

  await expect(
    page.getByRole('heading', { name: 'Wishlist (0)' }),
  ).toBeVisible()
  await expect(
    wishlist.getByText('Aucun Pokémon pour l’instant.'),
  ).toBeVisible()
})

test('garde la wishlist après un rechargement', async ({ page, goto }) => {
  await page.getByPlaceholder('Rechercher un Pokémon').fill('bulbasaur')
  await page.getByRole('button', { name: 'Add +' }).click()
  await expect(
    page.getByRole('heading', { name: 'Wishlist (1)' }),
  ).toBeVisible()

  await goto('/', { waitUntil: 'hydration' })

  await expect(
    wishlistSection(page).getByRole('link', { name: 'bulbasaur', exact: true }),
  ).toBeVisible()
})
