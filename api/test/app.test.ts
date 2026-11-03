import { describe, expect, it } from 'vitest'
import { createApp } from '../src/create-app'
import { storesFromEnv } from '../src/stores-from-env'

describe('app', () => {
  const app = createApp()

  it('répond sur /health', async () => {
    const response = await app.request('/health')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('envoie les en-têtes de sécurité', async () => {
    const response = await app.request('/health')

    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN')
  })

  it('refuse un corps de plus de 1 Ko avec un 413', async () => {
    const response = await app.request('/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'a'.repeat(2000), url: 'x' }),
    })

    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ error: 'body_too_large' })
  })

  it('refuse aussi un like de plus de 1 Ko', async () => {
    const response = await app.request('/likes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'a'.repeat(2000), url: 'x' }),
    })

    expect(response.status).toBe(413)
  })

  it('renvoie un 404 en JSON pour une route inconnue', async () => {
    const response = await app.request('/nope')

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: 'not_found' })
  })
})

describe('storesFromEnv', () => {
  it('refuse de démarrer en production sans DATABASE_URL', () => {
    expect(() => storesFromEnv({ NODE_ENV: 'production' })).toThrow(
      'DATABASE_URL is required in production',
    )
  })
})
