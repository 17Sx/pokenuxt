import { PNG } from 'pngjs'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/create-app'
import { tinySprite } from './helpers'

function appWith(fetcher: (url: string) => Promise<Response>) {
  const fetch = vi.fn(fetcher)
  return {
    fetch,
    app: createApp({ fetch: fetch as unknown as typeof globalThis.fetch }),
  }
}

const sprite = async () => new Response(new Uint8Array(tinySprite()))

async function readPng(response: Response) {
  return PNG.sync.read(Buffer.from(await response.arrayBuffer()))
}

describe('GET /sprite/:id', () => {
  it('sert l’artwork dithéré en points blancs', async () => {
    const { app, fetch } = appWith(sprite)

    const response = await app.request('/sprite/25?s=96')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('cache-control')).toContain('immutable')
    expect(fetch).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    )
    const png = await readPng(response)
    expect([png.width, png.height]).toEqual([96, 96])
    for (let i = 0; i < png.data.length; i += 4) {
      if (png.data[i + 3]) {
        expect([...png.data.subarray(i, i + 3)]).toEqual([255, 255, 255])
      }
    }
  })

  it('colore les points avec c=1', async () => {
    const { app } = appWith(sprite)

    const png = await readPng(await app.request('/sprite/25?s=96&c=1'))

    let red = 0
    for (let i = 0; i < png.data.length; i += 4) {
      if (png.data[i + 3] && png.data[i]! > png.data[i + 1]! + 50) red++
    }
    expect(red).toBeGreaterThan(0)
  })

  it('se rabat sur le petit sprite quand l’artwork manque', async () => {
    const { app, fetch } = appWith(async (url) =>
      url.includes('official-artwork')
        ? new Response('', { status: 404 })
        : sprite(),
    )

    expect((await app.request('/sprite/10001')).status).toBe(200)
    expect(fetch).toHaveBeenLastCalledWith(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10001.png',
    )
  })

  it('renvoie un 404 quand aucun sprite n’existe', async () => {
    const { app } = appWith(async () => new Response('', { status: 404 }))

    expect((await app.request('/sprite/99999')).status).toBe(404)
  })

  it('ne dithère chaque sprite qu’une fois', async () => {
    const { app, fetch } = appWith(sprite)

    await app.request('/sprite/25')
    await app.request('/sprite/25')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['une taille non prévue', '/sprite/25?s=500'],
    ['une couleur invalide', '/sprite/25?c=2'],
    ['un id qui n’est pas un nombre', '/sprite/pikachu'],
  ])('refuse %s', async (_, path) => {
    const { app, fetch } = appWith(sprite)

    expect((await app.request(path)).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
})
