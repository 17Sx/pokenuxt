import { expect, test } from '@nuxt/test-utils/playwright'
import { API, emptyLikes, emptyWishlist } from './api'

// Likes are shared by every visitor, like the wishlist: each test starts with
// nothing liked, through the API like the front does.
test.beforeEach(async ({ request, goto }) => {
  await emptyLikes(request)
  await emptyWishlist(request)
  await goto('/', { waitUntil: 'hydration' })
})

test('like puis retire le like d’un Pokémon', async ({ page }) => {
  const likes = page.locator('#likes')
  const pokedex = page.locator('#pokedex')
  await expect(
    likes.getByText('Aucun Pokémon liké pour l’instant.'),
  ).toBeVisible()

  await pokedex.getByRole('button', { name: 'Liker Bulbasaur' }).click()

  await expect(likes.getByRole('link', { name: 'Bulbasaur' })).toBeVisible()
  await expect(
    pokedex.getByRole('button', { name: 'Ne plus liker Bulbasaur' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('navigation').getByRole('link', { name: /Likes/ }),
  ).toHaveText(/01/)

  await likes.getByRole('button', { name: 'Ne plus liker Bulbasaur' }).click()

  await expect(
    likes.getByText('Aucun Pokémon liké pour l’instant.'),
  ).toBeVisible()
  await expect(
    pokedex.getByRole('button', { name: 'Liker Bulbasaur' }),
  ).toHaveAttribute('aria-pressed', 'false')
})

test('un like ne touche pas à la wishlist', async ({ page }) => {
  await page
    .locator('#pokedex')
    .getByRole('button', { name: 'Liker Bulbasaur' })
    .click()

  await expect(
    page.locator('#likes').getByRole('link', { name: 'Bulbasaur' }),
  ).toBeVisible()
  await expect(
    page.locator('#wishlist').getByText('Aucun Pokémon pour l’instant.'),
  ).toBeVisible()
})

test('like depuis la fiche d’un Pokémon', async ({ page, goto }) => {
  await goto('/pokemon/pikachu', { waitUntil: 'hydration' })
  const button = page.getByRole('button', { name: 'Liker Pikachu' })
  await expect(button).toHaveText('Liker')

  const saved = page.waitForResponse(
    (r) => r.url() === `${API}/likes` && r.request().method() === 'POST',
  )
  await button.click()
  expect((await saved).status()).toBe(201)

  await expect(
    page.getByRole('button', { name: 'Ne plus liker Pikachu' }),
  ).toHaveText('Liké')
  await page.getByRole('link', { name: 'Pokédex', exact: true }).first().click()
  await expect(
    page.locator('#likes').getByRole('link', { name: 'Pikachu' }),
  ).toBeVisible()
})

test('garde les likes après un rechargement, rendus par le serveur', async ({
  page,
}) => {
  const saved = page.waitForResponse(
    (r) => r.url() === `${API}/likes` && r.request().method() === 'POST',
  )
  await page
    .locator('#pokedex')
    .getByRole('button', { name: 'Liker Bulbasaur' })
    .click()
  await saved

  // The HTML from the server already shows the like.
  const html = await (await page.request.get('/')).text()
  expect(html).toContain('aria-label="Ne plus liker Bulbasaur"')

  await page.reload()
  await expect(
    page.locator('#likes').getByRole('link', { name: 'Bulbasaur' }),
  ).toBeVisible()
  await expect(
    page
      .locator('#pokedex')
      .getByRole('button', { name: 'Ne plus liker Bulbasaur' }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('les likes sont les mêmes pour tous les visiteurs', async ({
  page,
  browser,
}) => {
  const saved = page.waitForResponse(
    (r) => r.url() === `${API}/likes` && r.request().method() === 'POST',
  )
  await page
    .locator('#pokedex')
    .getByRole('button', { name: 'Liker Bulbasaur' })
    .click()
  await saved

  // Another browser, with no cookies in common, sees the same likes.
  const other = await browser.newContext()
  const otherPage = await other.newPage()
  await otherPage.goto(page.url())
  await expect(
    otherPage.locator('#likes').getByRole('link', { name: 'Bulbasaur' }),
  ).toBeVisible()
  await other.close()
})

test('remet le like comme avant quand l’API refuse', async ({ page }) => {
  await page.route(`${API}/likes`, (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 500, json: { error: 'internal_error' } })
      : route.fallback(),
  )

  await page
    .locator('#pokedex')
    .getByRole('button', { name: 'Liker Bulbasaur' })
    .click()

  await expect(
    page.locator('#likes').getByText('Aucun Pokémon liké pour l’instant.'),
  ).toBeVisible()
  await expect(
    page.locator('#pokedex').getByRole('button', { name: 'Liker Bulbasaur' }),
  ).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('alert')).toHaveText(
    'Le like n’a pas pu être enregistré. Réessaie dans un instant.',
  )
})

test('garde le like quand l’API refuse de le retirer', async ({
  page,
  request,
}) => {
  await request.post(`${API}/likes`, {
    data: { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
  })
  await page.reload()
  await page.route(`${API}/likes/1`, (route) =>
    route.fulfill({
      status: 503,
      json: { error: 'internal_error', message: 'L’API est en pause.' },
    }),
  )

  await page
    .locator('#likes')
    .getByRole('button', { name: 'Ne plus liker Bulbasaur' })
    .click()

  await expect(page.getByRole('alert')).toHaveText('L’API est en pause.')
  await expect(
    page.locator('#likes').getByRole('link', { name: 'Bulbasaur' }),
  ).toBeVisible()
})

test('lit, ajoute et retire les likes par l’API', async ({ request }) => {
  const pikachu = {
    name: 'pikachu',
    url: 'https://pokeapi.co/api/v2/pokemon/25/',
  }

  expect((await request.post(`${API}/likes`, { data: pikachu })).status()).toBe(
    201,
  )
  expect((await request.post(`${API}/likes`, { data: pikachu })).status()).toBe(
    409,
  )
  expect(await (await request.get(`${API}/likes`)).json()).toEqual({
    items: [{ id: 25, ...pikachu }],
  })
  expect((await request.delete(`${API}/likes/25`)).status()).toBe(204)
  expect((await request.delete(`${API}/likes/25`)).status()).toBe(404)
})
