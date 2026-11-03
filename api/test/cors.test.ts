import { describe, expect, it } from 'vitest'
import { createApp, originsFromEnv } from '../src/create-app'

const app = createApp({
  origins: ['http://localhost:3000', 'https://pokenuxt.vercel.app'],
})

describe('CORS', () => {
  it.each(['http://localhost:3000', 'https://pokenuxt.vercel.app'])(
    'autorise %s',
    async (origin) => {
      const response = await app.request('/health', { headers: { origin } })

      expect(response.headers.get('access-control-allow-origin')).toBe(origin)
      expect(
        response.headers.get('access-control-allow-credentials'),
      ).toBeNull()
    },
  )

  it('n’autorise pas les autres sites', async () => {
    const response = await app.request('/health', {
      headers: { origin: 'https://evil.test' },
    })

    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('répond à la pré-vérification d’un POST JSON', async () => {
    const response = await app.request('/wishlist', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type, accept-language',
      },
    })

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-methods')).toBe(
      'GET,POST,DELETE',
    )
    expect(response.headers.get('access-control-allow-headers')).toBe(
      'content-type,accept-language',
    )
  })

  it('laisse les autres sites afficher les sprites', async () => {
    const response = await app.request('/health')

    expect(response.headers.get('cross-origin-resource-policy')).toBe(
      'cross-origin',
    )
  })
})

describe('originsFromEnv', () => {
  it('lit CORS_ORIGINS, séparées par des virgules', () => {
    expect(
      originsFromEnv({ CORS_ORIGINS: 'https://a.test, https://b.test,' }),
    ).toEqual(['https://a.test', 'https://b.test'])
  })

  it('autorise le front local par défaut', () => {
    expect(originsFromEnv({})).toEqual(['http://localhost:3000'])
  })
})
