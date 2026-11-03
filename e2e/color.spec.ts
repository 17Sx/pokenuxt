import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'

const cardSprite = (page: Page, name: string) =>
  page
    .locator('#pokedex article')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .locator('img')

test('le bouton d’une carte ne colore que ce Pokémon', async ({
  page,
  goto,
}) => {
  await goto('/', { waitUntil: 'hydration' })

  await page
    .getByRole('button', { name: 'Afficher Bulbasaur en couleur' })
    .click()

  await expect(cardSprite(page, 'Bulbasaur')).toHaveAttribute('src', /[?&]c=1/)
  await expect(cardSprite(page, 'Ivysaur')).not.toHaveAttribute(
    'src',
    /[?&]c=1/,
  )
  await expect(
    page.getByRole('button', { name: 'Afficher Bulbasaur en noir et blanc' }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('le choix est retenu et rendu par le serveur', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await page
    .getByRole('button', { name: 'Afficher Bulbasaur en couleur' })
    .click()
  await expect(cardSprite(page, 'Bulbasaur')).toHaveAttribute('src', /[?&]c=1/)

  // The HTML from the server already asks for the coloured sprite.
  const html = await (await page.request.get('/pokemon/bulbasaur')).text()
  expect(html).toContain('/api/sprite/1?s=256&amp;c=1')

  await goto('/pokemon/bulbasaur', { waitUntil: 'hydration' })
  await expect(page.getByRole('button', { name: 'Couleur' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('la fiche et la carte partagent le même réglage', async ({
  page,
  goto,
}) => {
  await goto('/pokemon/pikachu', { waitUntil: 'hydration' })
  await page.getByRole('button', { name: 'Couleur' }).click()
  await expect(page.locator('main img').first()).toHaveAttribute(
    'src',
    /[?&]c=1/,
  )

  await goto('/', { waitUntil: 'hydration' })
  await page.getByPlaceholder('Rechercher un Pokémon').fill('#25')
  await expect(cardSprite(page, 'Pikachu')).toHaveAttribute('src', /[?&]c=1/)

  await page
    .getByRole('button', { name: 'Afficher Pikachu en noir et blanc' })
    .click()
  await goto('/pokemon/pikachu', { waitUntil: 'hydration' })
  await expect(page.getByRole('button', { name: 'N&B' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('ne plante pas avec un cookie de couleur corrompu', async ({
  page,
  goto,
  baseURL,
}) => {
  await page
    .context()
    .addCookies([
      { name: 'pokenuxt-colors', value: '%E0%A4%A[1,2', url: baseURL! },
    ])

  await goto('/', { waitUntil: 'hydration' })

  await expect(cardSprite(page, 'Bulbasaur')).toHaveAttribute(
    'src',
    '/api/sprite/1?s=128',
  )
  await page
    .getByRole('button', { name: 'Afficher Bulbasaur en couleur' })
    .click()
  await expect(cardSprite(page, 'Bulbasaur')).toHaveAttribute('src', /[?&]c=1/)
})

test('sert les sprites en couleur', async ({ request }) => {
  const sprite = await request.get('/api/sprite/25?s=128&c=1')
  expect(sprite.status()).toBe(200)
  expect(sprite.headers()['content-type']).toBe('image/png')

  const invalid = await request.get('/api/sprite/25?s=128&c=2')
  expect(invalid.status()).toBe(400)
})
