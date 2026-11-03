import { describe, expect, it } from 'vitest'
import { createApp } from '../src/create-app'
import { localeOf } from '../src/i18n'
import { pikachu, post } from './helpers'

describe('localeOf', () => {
  it.each([
    ['fr-FR,fr;q=0.9,en;q=0.8', 'fr'],
    ['en-GB,en;q=0.9', 'en'],
    ['de-DE, fr;q=0.8, en;q=0.5', 'fr'],
    ['en;q=0.2, fr;q=0.9', 'fr'],
    ['de, it', 'en'],
    ['', 'en'],
    [undefined, 'en'],
    [';;;,,q=abc', 'en'],
    ['fr;q=0', 'en'],
  ])('choisit %j → %s', (header, locale) => {
    expect(localeOf(header)).toBe(locale)
  })
})

describe('messages d’erreur', () => {
  it('répond en anglais par défaut', async () => {
    const response = await createApp().request('/nope')

    expect(await response.json()).toEqual({
      error: 'not_found',
      message: 'Nothing was found here.',
    })
  })

  it('répond en français quand on le demande', async () => {
    const app = createApp()
    await app.request('/wishlist', post(pikachu))

    const response = await app.request('/wishlist', {
      ...post(pikachu),
      headers: {
        'content-type': 'application/json',
        'accept-language': 'fr-FR,fr;q=0.9',
      },
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: 'already_in_wishlist',
      message: 'Ce Pokémon est déjà dans la wishlist.',
    })
  })
})
