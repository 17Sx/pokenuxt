# PokéNuxt

Nuxt 4 · Tailwind CSS v4 · données [PokéAPI](https://pokeapi.co)

## Setup

```bash
npm install
npm run dev
```

## Scripts

| Script              |                                     |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Dev server on http://localhost:3000 |
| `npm run build`     | Production build                    |
| `npm run typecheck` | Type check                          |
| `npm run lint`      | ESLint (`lint:fix` to autofix)      |
| `npm run format`    | Prettier (`format:check` in CI)     |

## PokéAPI

- `server/api/pokeapi/[...path].get.ts` proxies `https://pokeapi.co/api/v2/<path>` and caches each response for a day, as PokéAPI's fair use policy asks.
- `usePokeApi<T>(path)` (in setup) and `fetchPokeApi<T>(path)` (anywhere else) call it. Types come from [`pokenode-ts`](https://github.com/Gabb-c/pokenode-ts):

```ts
import type { Pokemon } from 'pokenode-ts'

const { data } = await usePokeApi<Pokemon>('pokemon/pikachu')
```

CI (`.github/workflows/ci.yml`) runs lint, format check, type check and build on every PR and on pushes to `main` and `dev`.
