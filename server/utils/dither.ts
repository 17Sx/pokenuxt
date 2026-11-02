import { PNG } from 'pngjs'

// A pixel is part of the Pokémon when at least half of it is opaque.
const COVERAGE = 0.5
// Lightness is squeezed between FLOOR and CEILING. The darkest parts of a
// Pokémon keep a few dots, so its shape still reads on a black background,
// and white parts keep a few gaps, so light Pokémon don't turn solid.
const FLOOR = 0.12
const CEILING = 0.92
const GAMMA = 0.9
// How much edges are boosted before dithering, so outlines and eyes stay
// visible inside light areas.
const SHARPEN = 0.9
// Empty space kept around the Pokémon, as a share of its largest side.
const MARGIN = 0.06

type Bounds = { x: number; y: number; width: number; height: number }

function opaqueBounds({ width, height, data }: PNG): Bounds {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 16) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, width, height }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

// Crops the sprite to the Pokémon, scales it down to size × size by averaging
// each block of pixels, and returns a lightness from 0 to 1 per pixel, or -1
// where the pixel is transparent.
function lightness(source: PNG, size: number) {
  const bounds = opaqueBounds(source)
  const side = Math.max(bounds.width, bounds.height) * (1 + MARGIN * 2)
  const left = bounds.x + bounds.width / 2 - side / 2
  const top = bounds.y + bounds.height / 2 - side / 2
  const step = side / size
  const values = new Float32Array(size * size).fill(-1)

  for (let y = 0; y < size; y++) {
    const y0 = Math.floor(top + y * step)
    const y1 = Math.max(y0 + 1, Math.floor(top + (y + 1) * step))
    for (let x = 0; x < size; x++) {
      const x0 = Math.floor(left + x * step)
      const x1 = Math.max(x0 + 1, Math.floor(left + (x + 1) * step))
      let alpha = 0
      let light = 0
      for (let sy = y0; sy < y1; sy++) {
        if (sy < 0 || sy >= source.height) continue
        for (let sx = x0; sx < x1; sx++) {
          if (sx < 0 || sx >= source.width) continue
          const i = (sy * source.width + sx) * 4
          const a = source.data[i + 3]! / 255
          const l =
            (0.2126 * source.data[i]! +
              0.7152 * source.data[i + 1]! +
              0.0722 * source.data[i + 2]!) /
            255
          alpha += a
          light += a * l
        }
      }
      const count = (y1 - y0) * (x1 - x0)
      if (alpha / count < COVERAGE) continue
      values[y * size + x] =
        FLOOR + (CEILING - FLOOR) * (light / alpha) ** GAMMA
    }
  }
  return sharpen(values, size)
}

// Pushes each pixel away from the average of its four neighbours.
function sharpen(values: Float32Array, size: number) {
  const output = values.slice()
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      if (values[i]! < 0) continue
      let sum = 0
      let count = 0
      for (const j of [i - 1, i + 1, i - size, i + size]) {
        const value = values[j]
        if (value === undefined || value < 0) continue
        sum += value
        count++
      }
      if (count) output[i] = values[i]! + SHARPEN * (values[i]! - sum / count)
    }
  }
  return output
}

// Atkinson dithering: each pixel turns white or off, and 6/8 of the error
// spreads to the neighbours below and to the right. It keeps highlights
// crisp and gives the dotted look of early Macintosh pictures.
const ATKINSON = [
  [1, 0],
  [2, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
  [0, 2],
] as const

/** Turns a sprite PNG into a size × size PNG of white dots on transparent. */
export function ditherSprite(input: Buffer, size: number): Buffer {
  const values = lightness(PNG.sync.read(input), size)
  const output = new PNG({ width: size, height: size })
  output.data.fill(0)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      const value = values[i]!
      if (value < 0) continue
      const on = value >= 0.5
      const error = (value - (on ? 1 : 0)) / 8
      for (const [dx, dy] of ATKINSON) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= size || ny >= size) continue
        const j = ny * size + nx
        if (values[j]! >= 0) values[j]! += error
      }
      if (on) output.data.fill(255, i * 4, i * 4 + 4)
    }
  }
  return PNG.sync.write(output)
}
