import { expect, test } from '@nuxt/test-utils/playwright'

// The wishlist is one array in the API, shared by every visitor: each test
// starts by emptying it, through the API like the front does.
test.beforeEach(async ({ request, goto }) => {
  const { items } = await (await request.get('/api/wishlist')).json()
  for (const { id } of items as { id: number }[]) {
    await request.delete(`/api/wishlist/${id}`)
  }
  await goto('/', { waitUntil: 'hydration' })
})

test('filtre la liste avec la recherche', async ({ page }) => {
  const pokedex = page.locator('#pokedex')

  await page.getByPlaceholder('Rechercher un Pokémon').fill('bulbasaur')

  await expect(
    pokedex.getByRole('heading', { name: 'Bulbasaur', exact: true }),
  ).toBeVisible()
  await expect(
    pokedex.getByRole('heading', { name: 'Pikachu', exact: true }),
  ).toHaveCount(0)
})

test('trouve un Pokémon par son numéro', async ({ page }) => {
  await page.getByPlaceholder('Rechercher un Pokémon').fill('#25')

  await expect(
    page
      .locator('#pokedex')
      .getByRole('heading', { name: 'Pikachu', exact: true }),
  ).toBeVisible()
})

test('⌘K ou Ctrl+K place le curseur dans la recherche', async ({ page }) => {
  const search = page.getByPlaceholder('Rechercher un Pokémon')
  await expect(search).not.toBeFocused()

  await page.keyboard.press('ControlOrMeta+k')

  await expect(search).toBeFocused()
})

test('ajoute puis retire un Pokémon de la wishlist', async ({ page }) => {
  const wishlist = page.locator('#wishlist')
  const pokedex = page.locator('#pokedex')
  await expect(
    wishlist.getByText('Aucun Pokémon pour l’instant.'),
  ).toBeVisible()

  await page.getByPlaceholder('Rechercher un Pokémon').fill('bulbasaur')
  await pokedex
    .getByRole('button', { name: 'Ajouter Bulbasaur à la wishlist' })
    .click()

  await expect(wishlist.getByRole('link', { name: 'Bulbasaur' })).toBeVisible()
  // Once added, the card's button only removes it, so it can't be added twice.
  await expect(
    pokedex.getByRole('button', { name: 'Retirer Bulbasaur de la wishlist' }),
  ).toHaveAttribute('aria-pressed', 'true')

  await wishlist
    .getByRole('button', { name: 'Retirer Bulbasaur de la wishlist' })
    .click()

  await expect(
    wishlist.getByText('Aucun Pokémon pour l’instant.'),
  ).toBeVisible()
  await expect(
    pokedex.getByRole('button', { name: 'Ajouter Bulbasaur à la wishlist' }),
  ).toHaveAttribute('aria-pressed', 'false')
})

test('garde la wishlist après un rechargement', async ({ page, goto }) => {
  await page.getByPlaceholder('Rechercher un Pokémon').fill('bulbasaur')
  await page
    .locator('#pokedex')
    .getByRole('button', { name: 'Ajouter Bulbasaur à la wishlist' })
    .click()
  await expect(
    page.locator('#wishlist').getByRole('link', { name: 'Bulbasaur' }),
  ).toBeVisible()

  await goto('/', { waitUntil: 'hydration' })

  await expect(
    page.locator('#wishlist').getByRole('link', { name: 'Bulbasaur' }),
  ).toBeVisible()
})

test('remet la liste comme avant quand l’API refuse l’ajout', async ({
  page,
}) => {
  await page.route('**/api/wishlist', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 500, json: { error: 'internal_error' } })
      : route.fallback(),
  )

  await page.getByPlaceholder('Rechercher un Pokémon').fill('bulbasaur')
  await page
    .locator('#pokedex')
    .getByRole('button', { name: 'Ajouter Bulbasaur à la wishlist' })
    .click()

  await expect(
    page.locator('#wishlist').getByText('Aucun Pokémon pour l’instant.'),
  ).toBeVisible()
  await expect(
    page
      .locator('#pokedex')
      .getByRole('button', { name: 'Ajouter Bulbasaur à la wishlist' }),
  ).toHaveAttribute('aria-pressed', 'false')
})

test('la wishlist est la même pour tous les visiteurs', async ({
  page,
  browser,
}) => {
  await page.getByPlaceholder('Rechercher un Pokémon').fill('bulbasaur')
  await page
    .locator('#pokedex')
    .getByRole('button', { name: 'Ajouter Bulbasaur à la wishlist' })
    .click()
  await expect(
    page.locator('#wishlist').getByRole('link', { name: 'Bulbasaur' }),
  ).toBeVisible()

  // Another browser, with no cookies in common, sees the same list.
  const other = await browser.newContext()
  const otherPage = await other.newPage()
  await otherPage.goto(page.url())
  await expect(
    otherPage.locator('#wishlist').getByRole('link', { name: 'Bulbasaur' }),
  ).toBeVisible()
  await other.close()
})

test('ouvre la fiche d’un Pokémon et l’ajoute depuis la fiche', async ({
  page,
}) => {
  await page.getByPlaceholder('Rechercher un Pokémon').fill('pikachu')
  await page
    .locator('#pokedex')
    .getByRole('link', { name: 'Pikachu', exact: false })
    .first()
    .click()

  await expect(page).toHaveURL(/\/pokemon\/25$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Pikachu' }),
  ).toBeVisible()
  await expect(page.getByText('Électrik')).toBeVisible()

  await page
    .getByRole('button', { name: 'Ajouter Pikachu à la wishlist' })
    .click()
  await page.getByRole('link', { name: 'Pokédex', exact: true }).first().click()

  await expect(
    page.locator('#wishlist').getByRole('link', { name: 'Pikachu' }),
  ).toBeVisible()
})

test('affiche une 404 pour un Pokémon inconnu', async ({ page, goto }) => {
  await goto('/pokemon/99999', { waitUntil: 'hydration' })

  await expect(page.getByText('404')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Retour au Pokédex' }),
  ).toBeVisible()
})

test('sert les sprites en PNG dithéré', async ({ request }) => {
  const sprite = await request.get('/api/sprite/25?s=128')
  expect(sprite.status()).toBe(200)
  expect(sprite.headers()['content-type']).toBe('image/png')

  const invalid = await request.get('/api/sprite/25?s=500')
  expect(invalid.status()).toBe(400)
})
