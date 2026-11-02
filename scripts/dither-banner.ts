// Dithers the home page banner into public/banner.png.
// Run it again after changing scripts/banner-source.png: bun run banner
import { readFileSync, writeFileSync } from 'node:fs'
import { ditherBanner } from '../api/src/lib/dither'

// Dots across. The banner is shown about twice as wide, so each dot stays sharp.
const WIDTH = 512

const source = readFileSync(new URL('banner-source.png', import.meta.url))
writeFileSync(
  new URL('../public/banner.png', import.meta.url),
  ditherBanner(source, WIDTH),
)
