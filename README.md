# PokéNuxt

Nuxt 4 · Tailwind CSS v4 · Hono · données [PokéAPI](https://pokeapi.co)

## Architecture

- **`app/`**: the Nuxt front. It has no server logic of its own: Nuxt relays every `/api/**` request to the Hono API (`routeRules` in `nuxt.config.ts`, target `API_URL`, `http://localhost:8787` by default). The browser stays on one domain.
- **`api/`**: the Hono API, a Bun workspace. It calls PokéAPI, dithers the sprites and keeps the wishlist.

## Setup

```bash
bun install
bun run dev:api
bun run dev
```

The API runs on http://localhost:8787 and the front on http://localhost:3000.

## Scripts

| Script              |                                           |
| ------------------- | ----------------------------------------- |
| `bun run dev`       | Front dev server on http://localhost:3000 |
| `bun run dev:api`   | API dev server on http://localhost:8787   |
| `bun run build`     | Front production build                    |
| `bun run typecheck` | Front type check (`typecheck:api` for it) |
| `bun run lint`      | Front ESLint (`lint:fix` to autofix)      |
| `bun run format`    | Prettier (`format:check` in CI)           |
| `bun run test`      | Front unit tests (`test:watch`)           |
| `bun run test:api`  | API tests                                 |
| `bun run test:e2e`  | Playwright, with the API started for you  |
| `bun run banner`    | Re-dither the home page banner            |

## API

| Route                    |                                                                  |
| ------------------------ | ---------------------------------------------------------------- |
| `GET /health`            | `{ ok: true }`                                                   |
| `GET /pokeapi/<path>`    | Proxies `https://pokeapi.co/api/v2/<path>` (`limit`, `offset`)   |
| `GET /sprite/<id>?s=&c=` | The artwork dithered to dots, `s` = 96, 128 or 256, `c=1` colour |
| `GET /wishlist`          | `{ items: [{ id, name, url }] }`                                 |
| `POST /wishlist`         | Body `{ name, url }`: 201, or 409 when it's already there        |
| `DELETE /wishlist/<id>`  | `id` is the Pokémon's number: 204, or 404 when it isn't there    |

The wishlist is **one array in memory, shared by every visitor**. It is emptied when the API restarts, and on Vercel each instance has its own array.

PokéAPI's fair use policy asks clients to cache what they fetch: responses are cached a day in memory and on the CDN (`s-maxage`). Sprites are dithered once per instance and cached a week.

In the front, `usePokeApi<T>(path)` (in setup) and `fetchPokeApi<T>(path)` (anywhere else) call `/api/pokeapi`. Types come from [`pokenode-ts`](https://github.com/Gabb-c/pokenode-ts):

```ts
import type { Pokemon } from 'pokenode-ts'

const { data } = await usePokeApi<Pokemon>('pokemon/pikachu')
```

## Sprites

`api/src/lib/dither.ts` crops the official artwork to the Pokémon, scales it down, sharpens the edges and applies Atkinson dithering: white dots on transparent. With `c=1`, each dot takes the artwork's colour instead. Each card and each Pokémon page can switch its own Pokémon to colour; the choice is kept in the `pokenuxt-colors` cookie, so the server renders the right sprite.

The home page banner uses the same dithering, inverted so the outlines become white lines: `bun run banner` turns `scripts/banner-source.png` into `public/banner.png`.

## CI/CD

- **API** (`.github/workflows/api.yml`), on pull requests and pushes to `dev` that touch `api/`: Prettier, ESLint, type check and Vitest, as parallel jobs. Only the API's dependencies are installed, and everything runs with Bun, Vitest included.
- **Front** (`.github/workflows/ci.yml`), on every pull request and push to `dev`: lint and format, type check, unit tests, build, and end-to-end tests with the API started alongside.
- **Deploy** (`.github/workflows/deploy.yml`), on every push to `main`: runs both, then deploys the API, checks `/health`, deploys the front, and checks that it answers and reaches the API through `/api/health`.

The API has its own config and scripts, run from `api/`: `bun run lint`, `bun run format:check`, `bun run typecheck` and `bun run test`.

### Setting up Vercel

1. Create two Vercel projects from this repository: one with **Root Directory** `api` (framework Hono), one with the repository root (framework Nuxt). Deploys come only from GitHub Actions: `vercel.json` turns off Vercel's own Git deploys.
2. In GitHub, create a `production` environment with:
   - secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_API_PROJECT_ID` and `VERCEL_WEB_PROJECT_ID`;
   - variables `API_URL` (the API's production URL, like `https://pokenuxt-api.vercel.app`) and `WEB_URL` (the front's).
