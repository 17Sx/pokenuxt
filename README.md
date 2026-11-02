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

## PokéAPI

- `server/api/pokeapi/[...path].get.ts` proxies `https://pokeapi.co/api/v2/<path>` and caches each response for a day, as PokéAPI's fair use policy asks.
- `usePokeApi<T>(path)` (in setup) and `fetchPokeApi<T>(path)` (anywhere else) call it. Types come from [`pokenode-ts`](https://github.com/Gabb-c/pokenode-ts):

```ts
import type { Pokemon } from 'pokenode-ts'

const { data } = await usePokeApi<Pokemon>('pokemon/pikachu')
```

CI (`.github/workflows/ci.yml`) runs lint, format check, type check, build and tests on every PR and on pushes to `main` and `dev`.
