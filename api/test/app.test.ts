import { describe, expect, it } from 'vitest'
import { createApp } from '../src/create-app'

describe('app', () => {
  const app = createApp()

  it('répond sur /health', async () => {
    const response = await app.request('/health')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('renvoie un 404 en JSON pour une route inconnue', async () => {
    const response = await app.request('/nope')

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'not_found' })
  })
})
