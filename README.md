# PokéNuxt

Nuxt 4 · Tailwind CSS v4 · données [PokéAPI](https://pokeapi.co)

## Setup

```bash
bun install
bun run dev
```

## Scripts

| Script              |                                     |
| ------------------- | ----------------------------------- |
| `bun run dev`       | Dev server on http://localhost:3000 |
| `bun run build`     | Production build                    |
| `bun run typecheck` | Type check                          |
| `bun run lint`      | ESLint (`lint:fix` to autofix)      |
| `bun run format`    | Prettier (`format:check` in CI)     |
| `bun run test`      | Vitest (`test:watch` in watch mode) |
| `bun run test:e2e`  | Playwright end-to-end tests         |
| `bun run banner`    | Re-dither the home page banner      |

## PokéAPI

- `server/api/pokeapi/[...path].get.ts` proxies `https://pokeapi.co/api/v2/<path>` and caches each response for a day, as PokéAPI's fair use policy asks.
- `usePokeApi<T>(path)` (in setup) and `fetchPokeApi<T>(path)` (anywhere else) call it. Types come from [`pokenode-ts`](https://github.com/Gabb-c/pokenode-ts):

```ts
import type { Pokemon } from 'pokenode-ts'

const { data } = await usePokeApi<Pokemon>('pokemon/pikachu')
```

## Sprites

`/api/sprite/<id>?s=96|128|256` serves the official artwork as white dots on transparent. `server/utils/dither.ts` crops it to the Pokémon, scales it down, sharpens the edges and applies Atkinson dithering. Each sprite is dithered once and cached for a week.

With `&c=1`, each dot takes the artwork's colour instead of white. Each card and each Pokémon page can switch its own Pokémon to colour; the choice is kept in the `pokenuxt-colors` cookie, so the server renders the right sprite.

The home page banner uses the same dithering, inverted so the outlines become white lines: `bun run banner` turns `scripts/banner-source.png` into `public/banner.png`.

CI (`.github/workflows/ci.yml`) runs lint, format check, type check, build, unit tests and end-to-end tests on every PR and on pushes to `main` and `dev`.
