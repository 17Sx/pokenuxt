import { expect, test } from '@nuxt/test-utils/playwright'

test.beforeEach(async ({ request }) => {
  const { items } = await (await request.get('/api/wishlist')).json()
  for (const { id } of items as { id: number }[]) {
    await request.delete(`/api/wishlist/${id}`)
  }
})

test('le site est en français par défaut', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })

  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Tous les Pokémon.',
  )
  await expect(page.getByRole('button', { name: 'Français' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('passe en anglais et le garde après un rechargement', async ({
  page,
  goto,
}) => {
  await goto('/', { waitUntil: 'hydration' })

  await page.getByRole('button', { name: 'English' }).click()

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Every Pokémon.',
  )
  await expect(page.getByPlaceholder('Search for a Pokémon')).toBeVisible()

  await goto('/pokemon/pikachu', { waitUntil: 'hydration' })

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByText('Mouse Pokémon')).toBeVisible()
  await expect(page.getByText('Electric', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Add Pikachu to the wishlist' }),
  ).toBeVisible()
})

test('montre le message de l’API quand elle refuse un ajout', async ({
  page,
  goto,
}) => {
  await goto('/', { waitUntil: 'hydration' })
  await page.route('**/api/wishlist', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 503,
          json: { error: 'internal_error', message: 'L’API est en pause.' },
        })
      : route.fallback(),
  )

  await page
    .getByRole('button', { name: 'Ajouter Bulbasaur à la wishlist' })
    .click()

  await expect(page.getByRole('alert')).toHaveText('L’API est en pause.')
})

test('demande les messages de l’API dans la langue du site', async ({
  page,
  goto,
}) => {
  await goto('/', { waitUntil: 'hydration' })
  await page.getByRole('button', { name: 'English' }).click()

  const request = page.waitForRequest(
    (r) => r.url().endsWith('/api/wishlist') && r.method() === 'POST',
  )
  await page
    .getByRole('button', { name: 'Add Bulbasaur to the wishlist' })
    .click()

  expect((await request).headers()['accept-language']).toBe('en')
})

test.describe('avec un navigateur en anglais', () => {
  test.use({ locale: 'en-GB' })

  test('affiche le site en anglais dès la première visite', async ({
    page,
    goto,
  }) => {
    await goto('/', { waitUntil: 'hydration' })

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Every Pokémon.',
    )
  })
})
