# PokéNuxt

Nuxt 4 · Tailwind CSS v4 · Hono · données [PokéAPI](https://pokeapi.co)

## Architecture

- **`app/`**: the Nuxt front. It has no server logic of its own: pages call the Hono API straight from the browser, at `runtimeConfig.public.apiBase` (`NUXT_PUBLIC_API_BASE`, `http://localhost:8787` by default). The API's CORS lists the front's origins.
- **`api/`**: the Hono API, a Bun workspace. It calls PokéAPI, dithers the sprites and keeps the wishlist. In production it runs on **AWS Lambda behind API Gateway** (`src/lambda.ts`), locally on Bun (`src/serve.ts`).
- **`infra/`**: the AWS infrastructure, with AWS CDK in TypeScript.
- **`db/`**: the Postgres schema. `init.sql` creates the wishlist table; later changes go in `db/migrations/`, as `.sql` files applied in name order.

## Setup

```bash
bun install
bun run dev:api
bun run dev
```

The API runs on http://localhost:8787 and the front on http://localhost:3000.

## Scripts

| Script               |                                           |
| -------------------- | ----------------------------------------- |
| `bun run dev`        | Front dev server on http://localhost:3000 |
| `bun run dev:api`    | API dev server on http://localhost:8787   |
| `bun run build`      | Front production build                    |
| `bun run typecheck`  | Front type check (`typecheck:api` for it) |
| `bun run lint`       | Front ESLint (`lint:fix` to autofix)      |
| `bun run format`     | Prettier (`format:check` in CI)           |
| `bun run i18n:check` | Locale files against `en.json`            |
| `bun run test`       | Front unit tests (`test:watch`)           |
| `bun run test:api`   | API tests                                 |
| `bun run test:e2e`   | Playwright, with the API started for you  |
| `bun run banner`     | Re-dither the home page banner            |

## API

| Route                    |                                                                  |
| ------------------------ | ---------------------------------------------------------------- |
| `GET /health`            | `{ ok: true }`                                                   |
| `GET /pokeapi/<path>`    | Proxies `https://pokeapi.co/api/v2/<path>` (`limit`, `offset`)   |
| `GET /sprite/<id>?s=&c=` | The artwork dithered to dots, `s` = 96, 128 or 256, `c=1` colour |
| `GET /wishlist`          | `{ items: [{ id, name, url }] }`                                 |
| `POST /wishlist`         | Body `{ name, url }`: 201, or 409 when it's already there        |
| `DELETE /wishlist/<id>`  | `id` is the Pokémon's number: 204, or 404 when it isn't there    |

The wishlist is **shared by every visitor**. It is kept in Postgres, in the `wishlist_items` table, when `DATABASE_URL` is set. Without it, it is kept in memory and emptied when the API restarts, which is fine for development and tests; in production the API refuses to start without a database.

PokéAPI's fair use policy asks clients to cache what they fetch: responses are cached a day in memory and on the CDN (`s-maxage`). Sprites are dithered once per instance and cached a week.

In the front, `usePokeApi<T>(path)` (in setup) and `fetchPokeApi<T>(path)` (anywhere else) call `/api/pokeapi`. Types come from [`pokenode-ts`](https://github.com/Gabb-c/pokenode-ts):

```ts
import type { Pokemon } from 'pokenode-ts'

const { data } = await usePokeApi<Pokemon>('pokemon/pikachu')
```

## Sprites

`api/src/lib/dither.ts` crops the official artwork to the Pokémon, scales it down, sharpens the edges and applies Atkinson dithering: white dots on transparent. With `c=1`, each dot takes the artwork's colour instead. Each card and each Pokémon page can switch its own Pokémon to colour; the choice is kept in the `pokenuxt-colors` cookie, so the server renders the right sprite.

The home page banner uses the same dithering, inverted so the outlines become white lines: `bun run banner` turns `scripts/banner-source.png` into `public/banner.png`.

## i18n

The site speaks English and French, with French as the default. A first visit follows the browser's language, and the choice made with the EN / FR switch is kept in the `pokenuxt-lang` cookie. URLs don't change with the language.

- **Front**: [`@nuxtjs/i18n`](https://i18n.nuxtjs.org), texts in `i18n/locales/`. Pokémon names, categories and descriptions come from PokéAPI in the site's language.
- **API**: each error has a code and a `message` in the language of the request's `Accept-Language`, from `api/locales/`. The front sends its own language.

`en.json` is the reference. `bun run i18n:check` (`node scripts/check-i18n.mjs`) compares every other `.json` in `i18n/locales/` and `api/locales/` with it. It reports missing keys, keys that aren't in `en.json`, wrong types, empty texts and `{placeholders}` that differ, and exits with 1 when there is any. Pass folders to check only those: `node scripts/check-i18n.mjs api/locales`. Both CI workflows run it.

## CI/CD

- **API** (`.github/workflows/api.yml`), on pull requests and pushes to `dev` that touch `api/`: Prettier, ESLint, type check and Vitest, as parallel jobs. Only the API's dependencies are installed, and everything runs with Bun, Vitest included.
- **Front** (`.github/workflows/ci.yml`), on every pull request and push to `dev`: lint and format, type check, unit tests, build, and end-to-end tests with the API started alongside.
- **Database** (`.github/workflows/db.yml`), on pull requests and pushes to `dev` that touch `db/`: applies it to an empty Postgres, then again to check nothing runs twice.
- **Deploy** (`.github/workflows/deploy.yml`), on every push to `main`: runs the three, applies `db/` to the production database, deploys the API to AWS with CDK and checks `/health` and `/wishlist`, then deploys the front to Vercel with the API Gateway URL, and checks that it answers and that the API's CORS lets it in.

The API workflow also type checks `infra/` and runs `cdk synth --strict`, which bundles the Lambda.

The API has its own config and scripts, run from `api/`: `bun run lint`, `bun run format:check`, `bun run typecheck` and `bun run test`.

### AWS

The API runs in the project's Region, `eu-north-1` (`infra/bin/pokenuxt.ts`):

- **Lambda** (Node.js 22, arm64, 1 GB since dithering is CPU-bound), bundled from `api/src/lambda.ts` by esbuild. `@hono/aws-lambda` turns API Gateway events into requests, sprites included, sent back as base64.
- **API Gateway HTTP API** in front, with every route going to the Lambda. Its CORS allows `http://localhost:3000` and the front's production origin (`-c webOrigin=…`), for `GET`, `POST` and `DELETE`, without credentials. The stage is throttled to 25 requests a second, bursts of 50.
- **Supabase**: the Lambda reads Supabase's **transaction pooler** URL (port 6543, made for serverless) from the SSM SecureString `/pokenuxt/database-url` when it starts, and keeps one connection per instance. Its role can read that parameter and nothing else in SSM.

From `infra/`, with an AWS profile: `bun run synth`, `bun run diff`, `bun run deploy`. Setting it up once:

1. `aws login --profile pokenuxt`, then `npx cdk bootstrap aws://<account>/eu-north-1` with `AWS_PROFILE=pokenuxt`.
2. Store the transaction pooler URL: `aws ssm put-parameter --name /pokenuxt/database-url --type SecureString --value '<url>'`.
3. `bun run deploy` for the API, and `bun run deploy:ci-user` for the CI user.

Projects in the new AWS experience can't create OIDC providers, so GitHub Actions can't use OIDC. CI deploys as the IAM user `pokenuxt-github-deploy` (`infra/lib/ci-user-stack.ts`), which can only assume the CDK bootstrap roles. Its access key lives in GitHub's secrets; rotate it from time to time.

### Setting up GitHub and Vercel

1. Create a Vercel project for the front, at the repository root (framework Nuxt). Deploys come only from GitHub Actions: `vercel.json` turns off Vercel's own Git deploys.
2. In GitHub, create a `production` environment with:
   - secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_WEB_PROJECT_ID`;
   - secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`: the `pokenuxt-github-deploy` user's access key;
   - secret `DATABASE_URL`: Supabase's **session pooler** URL, used to migrate. GitHub's runners have no IPv6, which the direct `db.<project>.supabase.co` host needs;
   - variable `WEB_URL`: the front's production URL, which the API's CORS allows.

### Database

`bun run --cwd api db:migrate` applies `db/` to the database in `DATABASE_URL`, read from the root `.env` locally. It records each file in a `schema_migrations` table and never applies one twice. `bun run dev:api` reads the same `.env`.

The API's Postgres tests run against `TEST_DATABASE_URL`, never `DATABASE_URL`, since they empty the table. The end-to-end tests start their own API on port 8788, in memory.
