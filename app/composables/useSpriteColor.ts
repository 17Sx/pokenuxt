const YEAR = 60 * 60 * 24 * 365
// A cookie holds about 4 KB. Past this many Pokémon, the oldest choices are
// dropped so the cookie always fits.
export const MAX_COLORED = 600

/** "6.25.150" → [6, 25, 150]. Anything that isn't a Pokémon number is ignored. */
export function parseColorIds(value: string | null | undefined): number[] {
  if (typeof value !== 'string') return []
  const ids = value
    .split('.')
    .filter((part) => /^\d+$/.test(part))
    .map(Number)
    .filter((id) => id > 0)
  return [...new Set(ids)].slice(-MAX_COLORED)
}

/** Adds or removes a Pokémon, keeping the most recent choices last. */
export function withColor(ids: number[], id: number, color: boolean) {
  const rest = ids.filter((other) => other !== id)
  return color ? [...rest, id].slice(-MAX_COLORED) : rest
}

// Which Pokémon are drawn in colour. Kept in a cookie rather than in
// localStorage so the server renders the right sprites from the first load.
export function useSpriteColor() {
  const cookie = useCookie<number[]>('pokenuxt-colors', {
    default: () => [],
    encode: (ids) => ids.join('.'),
    decode: parseColorIds,
    maxAge: YEAR,
    sameSite: 'lax',
  })
  const colored = useState('sprite-colors', () => cookie.value)

  const isColored = (id: number) => colored.value.includes(id)

  function setColored(id: number, color: boolean) {
    colored.value = withColor(colored.value, id, color)
    cookie.value = colored.value
  }

  return { isColored, setColored }
}
