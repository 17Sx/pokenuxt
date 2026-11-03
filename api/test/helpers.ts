import { PNG } from 'pngjs'
import type { Pokemon } from '../src/lib/pokemon'

export const pikachu: Pokemon = {
  name: 'pikachu',
  url: 'https://pokeapi.co/api/v2/pokemon/25/',
}

export const bulbasaur: Pokemon = {
  name: 'bulbasaur',
  url: 'https://pokeapi.co/api/v2/pokemon/1/',
}

export function post(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/** A 32 × 32 PNG: a red square on transparent, like a tiny artwork. */
export function tinySprite() {
  const png = new PNG({ width: 32, height: 32 })
  png.data.fill(0)
  for (let y = 8; y < 24; y++) {
    for (let x = 8; x < 24; x++) {
      png.data.set([230, 40, 40, 255], (y * 32 + x) * 4)
    }
  }
  return PNG.sync.write(png)
}
