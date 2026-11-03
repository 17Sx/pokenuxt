import { expect, test } from '@nuxt/test-utils/playwright'

test('ouvre la fiche d’un Pokémon par son nom', async ({ page, goto }) => {
  await goto('/pokemon/pikachu', { waitUntil: 'hydration' })

  await expect(
    page.getByRole('heading', { level: 1, name: 'Pikachu' }),
  ).toBeVisible()
  await expect(page).toHaveTitle('Pikachu — PokéNuxt')
})

test('montre tout ce que la fiche sait du Pokémon', async ({ page, goto }) => {
  await goto('/pokemon/pikachu', { waitUntil: 'hydration' })
  const main = page.locator('main')

  await expect(main.getByText('#0025')).toBeVisible()
  await expect(main.getByText('Pokémon Souris')).toBeVisible()
  await expect(main.getByText('Électrik', { exact: true })).toBeVisible()
  await expect(main.locator('img').first()).toHaveAttribute('alt', 'Pikachu')
  await expect(main.locator('img').first()).toHaveAttribute(
    'src',
    /\/sprite\/25\?s=256/,
  )

  const fact = (label: string) =>
    main.locator('dl > div').filter({ hasText: label })
  await expect(fact('Taille')).toContainText(/0,4\s*m/)
  await expect(fact('Poids')).toContainText(/6\s*kg/)
  await expect(fact('Exp. de base')).toContainText('112')

  const stats = main
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Statistiques' }) })
  await expect(stats.locator('dl > div')).toHaveCount(6)
  await expect(
    stats.locator('dl > div').filter({ hasText: 'PV' }),
  ).toContainText('35')
  await expect(
    stats.locator('dl > div').filter({ hasText: 'Vitesse' }),
  ).toContainText('90')
  await expect(stats.getByText('Total')).toContainText('320')

  await expect(
    page.getByRole('button', { name: 'Ajouter Pikachu à la wishlist' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Liker Pikachu' }),
  ).toBeVisible()
  await expect(
    page.getByRole('group', { name: 'Couleur de Pikachu' }),
  ).toBeVisible()
})

test('revient au Pokédex depuis la fiche', async ({ page, goto }) => {
  await goto('/pokemon/pikachu', { waitUntil: 'hydration' })

  await page.locator('main').getByRole('link', { name: 'Pokédex' }).click()

  await expect(page).toHaveURL(/\/#pokedex$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Tous les Pokémon.',
  )
})

for (const path of ['/pokemon/25', '/pokemon/Pikachu']) {
  test(`redirige ${path} vers /pokemon/pikachu`, async ({ page, request }) => {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(response.headers().location).toMatch(/\/pokemon\/pikachu$/)

    await page.goto(path)
    await expect(page).toHaveURL(/\/pokemon\/pikachu$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Pikachu' }),
    ).toBeVisible()
    await expect(page).toHaveTitle('Pikachu — PokéNuxt')
  })
}

test('redirige aussi un lien interne vers /pokemon/25', async ({
  page,
  goto,
}) => {
  await goto('/', { waitUntil: 'hydration' })

  // Through the router, as a link would, without loading a new page.
  await page.evaluate(() => {
    const nuxt = window as unknown as {
      useNuxtApp: () => { $router: { push: (to: string) => Promise<unknown> } }
    }
    return nuxt.useNuxtApp().$router.push('/pokemon/25')
  })

  await expect(page).toHaveURL(/\/pokemon\/pikachu$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Pikachu' }),
  ).toBeVisible()
})

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
