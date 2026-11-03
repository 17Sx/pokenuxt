import { expect, test } from '@nuxt/test-utils/playwright'

test('ouvre la fiche d’un Pokémon par son nom', async ({ page, goto }) => {
  await goto('/pokemon/pikachu', { waitUntil: 'hydration' })

  await expect(
    page.getByRole('heading', { level: 1, name: 'Pikachu' }),
  ).toBeVisible()
  await expect(page).toHaveTitle('Pikachu — PokéNuxt')
})

for (const path of ['/pokemon/25', '/pokemon/Pikachu']) {
  test(`redirige ${path} vers /pokemon/pikachu`, async ({ page, request }) => {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(response.headers().location).toMatch(/\/pokemon\/pikachu$/)

    await page.goto(path)
    await expect(page).toHaveURL(/\/pokemon\/pikachu$/)
  })
}

test('relie les Pokémon voisins par leur nom', async ({ page, goto }) => {
  await goto('/pokemon/pikachu', { waitUntil: 'hydration' })
  const neighbours = page.getByRole('navigation', { name: 'Pokémon voisins' })

  await expect(neighbours.getByRole('link')).toHaveCount(2)
  await neighbours.getByRole('link', { name: /Raichu/ }).click()

  await expect(page).toHaveURL(/\/pokemon\/raichu$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Raichu' }),
  ).toBeVisible()
})

test('le premier Pokémon n’a pas de précédent', async ({ page, goto }) => {
  await goto('/pokemon/bulbasaur', { waitUntil: 'hydration' })
  const neighbours = page.getByRole('navigation', { name: 'Pokémon voisins' })

  await expect(neighbours.getByRole('link')).toHaveCount(1)
  await expect(neighbours.getByRole('link')).toHaveAttribute(
    'href',
    '/pokemon/ivysaur',
  )
})

test('les cartes du Pokédex mènent à la fiche par nom', async ({
  page,
  goto,
}) => {
  await goto('/', { waitUntil: 'hydration' })

  await page
    .locator('#pokedex')
    .getByRole('link', { name: /Bulbasaur/ })
    .click()

  await expect(page).toHaveURL(/\/pokemon\/bulbasaur$/)
})

test('affiche une 404 pour un nom inconnu', async ({ page, goto }) => {
  await goto('/pokemon/pikachuu', { waitUntil: 'hydration' })

  await expect(page.getByText('404')).toBeVisible()
})
