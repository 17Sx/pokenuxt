import { PNG } from 'pngjs'

// A pixel is part of the picture when at least half of it is opaque.
const COVERAGE = 0.5
// Empty space kept around the Pokémon, as a share of its largest side.
const MARGIN = 0.06

type Bounds = { x: number; y: number; width: number; height: number }

type Tone = {
  // Lightness is squeezed between floor and ceiling. For sprites, the darkest
  // parts keep a few dots, so the shape still reads on a black background,
  // and white parts keep a few gaps, so light Pokémon don't turn solid.
  floor: number
  ceiling: number
  gamma: number
  // How much edges are boosted before dithering, so outlines and eyes stay
  // visible inside light areas.
  sharpen: number
  // Dark becomes dots and light becomes black: outlines turn into white lines.
  invert?: boolean
}

const SPRITE_TONE: Tone = {
  floor: 0.12,
  ceiling: 0.92,
  gamma: 0.9,
  sharpen: 0.9,
}
const BANNER_TONE: Tone = {
  floor: 0,
  ceiling: 1,
  gamma: 2.6,
  sharpen: 1.4,
  invert: true,
}

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

// Scales the bounds of the source down to width × height by averaging each
// block of pixels. Returns a lightness from 0 to 1 per pixel, or -1 where the
// pixel is transparent, and the average colour of each pixel.
function lightness(
  source: PNG,
  bounds: Bounds,
  width: number,
  height: number,
  tone: Tone,
) {
  const stepX = bounds.width / width
  const stepY = bounds.height / height
  const values = new Float32Array(width * height).fill(-1)
  const colors = new Uint8Array(width * height * 3)

  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(bounds.y + y * stepY)
    const y1 = Math.max(y0 + 1, Math.floor(bounds.y + (y + 1) * stepY))
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(bounds.x + x * stepX)
      const x1 = Math.max(x0 + 1, Math.floor(bounds.x + (x + 1) * stepX))
      let alpha = 0
      let light = 0
      let red = 0
      let green = 0
      let blue = 0
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
          red += a * source.data[i]!
          green += a * source.data[i + 1]!
          blue += a * source.data[i + 2]!
        }
      }
      const count = (y1 - y0) * (x1 - x0)
      if (alpha / count < COVERAGE) continue
      const l = tone.invert ? 1 - light / alpha : light / alpha
      const j = y * width + x
      values[j] = tone.floor + (tone.ceiling - tone.floor) * l ** tone.gamma
      colors.set([red / alpha, green / alpha, blue / alpha], j * 3)
    }
  }
  return { values: sharpen(values, width, tone.sharpen), colors }
}

// Below this saturation a colour counts as grey, and its dot is drawn light
// grey: outlines and shadows then look as they do in black and white.
const GREY = 0.18
// Coloured dots are brightened to at least this value, out of 1, so dots
// from dark areas still show on black.
const MIN_VALUE = 0.8

function dotColor(colors: Uint8Array, i: number): [number, number, number] {
  const r = colors[i * 3]!
  const g = colors[i * 3 + 1]!
  const b = colors[i * 3 + 2]!
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === 0 || (max - min) / max < GREY) return [230, 230, 230]
  const scale = Math.max(1, (MIN_VALUE * 255) / max)
  return [r * scale, g * scale, b * scale]
}

// Pushes each pixel away from the average of its four neighbours.
function sharpen(values: Float32Array, width: number, amount: number) {
  const output = values.slice()
  for (let i = 0; i < values.length; i++) {
    if (values[i]! < 0) continue
    const x = i % width
    let sum = 0
    let count = 0
    for (const j of [
      x > 0 ? i - 1 : -1,
      x < width - 1 ? i + 1 : -1,
      i - width,
      i + width,
    ]) {
      const value = values[j]
      if (value === undefined || value < 0) continue
      sum += value
      count++
    }
    if (count) output[i] = values[i]! + amount * (values[i]! - sum / count)
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

// Without colours, every dot is white. With them, each dot takes the colour
// of the picture at that spot.
function atkinson(
  values: Float32Array,
  width: number,
  height: number,
  colors?: Uint8Array,
) {
  const output = new PNG({ width, height })
  output.data.fill(0)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const value = values[i]!
      if (value < 0) continue
      const on = value >= 0.5
      const error = (value - (on ? 1 : 0)) / 8
      for (const [dx, dy] of ATKINSON) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= width || ny >= height) continue
        const j = ny * width + nx
        if (values[j]! >= 0) values[j]! += error
      }
      if (!on) continue
      output.data.set(
        colors ? [...dotColor(colors, i), 255] : [255, 255, 255, 255],
        i * 4,
      )
    }
  }
  return PNG.sync.write(output)
}

/**
 * Turns a sprite PNG into a size × size PNG of dots on transparent: white
 * dots, or dots in the sprite's own colours with `color`.
 */
export function ditherSprite(
  input: Buffer,
  size: number,
  color = false,
): Buffer {
  const source = PNG.sync.read(input)
  const bounds = opaqueBounds(source)
  // A square around the Pokémon, centred, with some margin.
  const side = Math.max(bounds.width, bounds.height) * (1 + MARGIN * 2)
  const square = {
    x: bounds.x + bounds.width / 2 - side / 2,
    y: bounds.y + bounds.height / 2 - side / 2,
    width: side,
    height: side,
  }
  const { values, colors } = lightness(source, square, size, size, SPRITE_TONE)
  return atkinson(values, size, size, color ? colors : undefined)
}

/**
 * Turns a whole picture into white dots on transparent, `width` dots wide.
 * Inverted, so a bright illustration stays quiet behind text.
 */
export function ditherBanner(input: Buffer, width: number): Buffer {
  const source = PNG.sync.read(input)
  const height = Math.round((width * source.height) / source.width)
  const whole = { x: 0, y: 0, width: source.width, height: source.height }
  const { values } = lightness(source, whole, width, height, BANNER_TONE)
  return atkinson(values, width, height)
}
