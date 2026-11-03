import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { ditherBanner, ditherSprite } from '../src/lib/dither'
import { tinySprite } from './helpers'

describe('ditherSprite', () => {
  it('renvoie un carré de la taille demandée', () => {
    const png = PNG.sync.read(ditherSprite(tinySprite(), 64))

    expect([png.width, png.height]).toEqual([64, 64])
  })

  it('laisse le fond transparent', () => {
    const png = PNG.sync.read(ditherSprite(tinySprite(), 64))

    // The corners are outside the Pokémon, past the margin.
    expect(png.data[3]).toBe(0)
    expect(png.data[png.data.length - 1]).toBe(0)
  })
})

describe('ditherBanner', () => {
  it('garde les proportions de l’image', () => {
    const source = new PNG({ width: 60, height: 20 })
    source.data.fill(255)

    const png = PNG.sync.read(ditherBanner(PNG.sync.write(source), 30))

    expect([png.width, png.height]).toEqual([30, 10])
  })
})
