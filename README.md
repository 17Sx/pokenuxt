# PokéNuxt

[![Deploy](https://github.com/17Sx/pokenuxt/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/17Sx/pokenuxt/actions/workflows/deploy.yml)
[![Front](https://github.com/17Sx/pokenuxt/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/17Sx/pokenuxt/actions/workflows/ci.yml)
[![API](https://github.com/17Sx/pokenuxt/actions/workflows/api.yml/badge.svg?branch=dev)](https://github.com/17Sx/pokenuxt/actions/workflows/api.yml)
[![Coverage front](https://img.shields.io/endpoint?url=https%3A%2F%2Fd1jjigkssadg5n.cloudfront.net%2Fcoverage%2Ffront%2Fbadge.json)](https://d1jjigkssadg5n.cloudfront.net/coverage/front/)
[![Coverage API](https://img.shields.io/endpoint?url=https%3A%2F%2Fd1jjigkssadg5n.cloudfront.net%2Fcoverage%2Fapi%2Fbadge.json)](https://d1jjigkssadg5n.cloudfront.net/coverage/api/)

Nuxt 4 · Tailwind CSS v4 · Hono · données [PokéAPI](https://pokeapi.co)

| Live                               |                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Front, generated (S3 + CloudFront) | https://d1jjigkssadg5n.cloudfront.net                                                                       |
| Front, server-rendered (Vercel)    | https://pokenuxt-mauve.vercel.app                                                                           |
| API (API Gateway + Lambda)         | https://p03y7ni65h.execute-api.eu-north-1.amazonaws.com/health                                              |
| Coverage reports                   | https://d1jjigkssadg5n.cloudfront.net/coverage/front/ · https://d1jjigkssadg5n.cloudfront.net/coverage/api/ |

## Architecture

- **`app/`**: the Nuxt front, published twice: generated (SSG) on S3 and CloudFront, and server-rendered (SSR) on Vercel. It has no server logic of its own: pages call the Hono API, from Vercel's server or straight from the browser, at `runtimeConfig.public.apiBase` (`NUXT_PUBLIC_API_BASE`, `http://localhost:8787` by default). The API's CORS lists the front's origins.
- **`api/`**: the Hono API, a Bun workspace. It calls PokéAPI, dithers the sprites and keeps the wishlist and the likes. In production it runs on **AWS Lambda behind API Gateway** (`src/lambda.ts`), locally on Bun (`src/serve.ts`).
- **`infra/`**: the AWS infrastructure, with AWS CDK in TypeScript.
- **`db/migrations/`**: the Postgres schema, as numbered `NNN_name.sql` files applied in order: `000_init.sql` creates the wishlist table, `001_likes.sql` the likes. See [Database](#database).

## Setup

```bash
bun install
bun run dev:api
bun run dev
```

The API runs on http://localhost:8787 and the front on http://localhost:3000.

## Scripts

| Script                  |                                                |
| ----------------------- | ---------------------------------------------- |
| `bun run dev`           | Front dev server on http://localhost:3000      |
| `bun run dev:api`       | API dev server on http://localhost:8787        |
| `bun run build`         | Front production build                         |
| `bun run typecheck`     | Front type check (`typecheck:api` for it)      |
| `bun run lint`          | Front ESLint (`lint:fix` to autofix)           |
| `bun run format`        | Prettier (`format:check` in CI)                |
| `bun run i18n:check`    | Locale files against `en.json`                 |
| `bun run test`          | Front unit tests (`test:watch`)                |
| `bun run test:coverage` | Front unit tests with coverage, in `coverage/` |
| `bun run test:api`      | API tests                                      |
| `bun run test:e2e`      | Playwright, with the API started for you       |
| `bun scripts/smoke.ts`  | Smoke tests of a live release (see below)      |
| `bun run banner`        | Re-dither the home page banner                 |

## API

| Route                    |                                                                  |
| ------------------------ | ---------------------------------------------------------------- |
| `GET /health`            | `{ ok: true }`                                                   |
| `GET /pokeapi/<path>`    | Proxies `https://pokeapi.co/api/v2/<path>` (`limit`, `offset`)   |
| `GET /sprite/<id>?s=&c=` | The artwork dithered to dots, `s` = 96, 128 or 256, `c=1` colour |
| `GET /wishlist`          | `{ items: [{ id, name, url }] }`                                 |
| `POST /wishlist`         | Body `{ name, url }`: 201, or 409 when it's already there        |
| `DELETE /wishlist/<id>`  | `id` is the Pokémon's number: 204, or 404 when it isn't there    |
| `GET /likes`             | `{ items: [{ id, name, url }] }`                                 |
| `POST /likes`            | Body `{ name, url }`: 201, or 409 when it's already liked        |
| `DELETE /likes/<id>`     | `id` is the Pokémon's number: 204, or 404 when it isn't liked    |

The wishlist is **shared by every visitor**. It is kept in Postgres, in the `wishlist_items` table, when `DATABASE_URL` is set. Without it, it is kept in memory and emptied when the API restarts, which is fine for development and tests; in production the API refuses to start without a database.

The likes work the same way, in the `likes` table: there are no accounts, so they are shared too. A card and a Pokémon page each have a ♥ to like or unlike the Pokémon, and the home page lists the liked ones.

PokéAPI's fair use policy asks clients to cache what they fetch: responses are cached a day in memory and on the CDN (`s-maxage`). Sprites are dithered once per instance and cached a week.

In the front, `usePokeApi<T>(path)` (in setup) and `fetchPokeApi<T>(path)` (anywhere else) call `/api/pokeapi`. Types come from [`pokenode-ts`](https://github.com/Gabb-c/pokenode-ts):

```ts
import type { Pokemon } from 'pokenode-ts'

const { data } = await usePokeApi<Pokemon>('pokemon/pikachu')
```

## Sprites

`api/src/lib/dither.ts` crops the official artwork to the Pokémon, scales it down, sharpens the edges and applies Atkinson dithering: white dots on transparent. With `c=1`, each dot takes the artwork's colour instead. Each card and each Pokémon page can switch its own Pokémon to colour; the choice is kept in the `pokenuxt-colors` cookie, so the server renders the right sprite.

The home page banner uses the same dithering, inverted so the outlines become white lines: `bun run banner` turns `scripts/banner-source.png` into `public/banner.png`.

## Prerendering

The Deploy workflow builds every `/pokemon/<name>` page ahead of time: with `PRERENDER_POKEMON=1`, `nuxt.config.ts` asks the API for the names (`prerender/pokemon-routes.ts`) and adds a route for each. `nuxt generate` turns the whole front into static files, which CloudFront serves from S3. Numbers like `/pokemon/25` and unknown names have no page of their own: CloudFront answers with Nuxt's `404.html`, which starts the app in the browser, so `/pokemon/25` still leads to `/pokemon/pikachu`.

- Prerendering takes a few minutes: 3 pages at a time, since each calls the API about three times and API Gateway allows 25 requests a second.
- A prerendered page was built for no one, so the browser loads what belongs to the visitor once it's hydrated: the wishlist, and the Pokémon they chose to see in colour. A page in English shows French for a moment first.
- `PRERENDER_POKEMON_LIMIT=5` keeps only the first names, for a quick check: `PRERENDER_POKEMON=1 PRERENDER_POKEMON_LIMIT=5 NUXT_PUBLIC_API_BASE=<api> bun run build`.

## i18n

The site speaks English and French, with French as the default. A first visit follows the browser's language, and the choice made with the EN / FR switch is kept in the `pokenuxt-lang` cookie. URLs don't change with the language.

- **Front**: [`@nuxtjs/i18n`](https://i18n.nuxtjs.org), texts in `i18n/locales/`. Pokémon names, categories and descriptions come from PokéAPI in the site's language.
- **API**: each error has a code and a `message` in the language of the request's `Accept-Language`, from `api/locales/`. The front sends its own language.

`en.json` is the reference. `bun run i18n:check` (`node scripts/check-i18n.mjs`) compares every other `.json` in `i18n/locales/` and `api/locales/` with it. It reports missing keys, keys that aren't in `en.json`, wrong types, empty texts and `{placeholders}` that differ, and exits with 1 when there is any. Pass folders to check only those: `node scripts/check-i18n.mjs api/locales`. Both CI workflows run it.

## CI/CD

- **API** (`.github/workflows/api.yml`), on pull requests and pushes to `dev` that touch `api/`: Prettier, ESLint, type check and Vitest with coverage, as parallel jobs. Only the API's dependencies are installed, and everything runs with Bun, Vitest included.
- **Front** (`.github/workflows/ci.yml`), on every pull request and push to `dev`: lint and format, type check, unit tests with coverage, build, and end-to-end tests with the API started alongside.
- **Database** (`.github/workflows/db.yml`), on pull requests and pushes to `dev` that touch `db/`: applies the migrations to an empty Postgres, then again to check nothing runs twice.
- **Deploy** (`.github/workflows/deploy.yml`), on every push to `main`: runs the three, applies the migrations to the production database, deploys the API and the front's S3 bucket and CloudFront distribution to AWS with CDK, then publishes the front twice, at the same time: generated (SSG) to S3, with CloudFront's cache invalidated, and server-rendered (SSR) to Vercel. Smoke tests then check the live release, and the deploy fails if one doesn't pass.
- **Rollback** (`.github/workflows/rollback.yml`), run by hand: publishes a previous stable release again. See below.

### Smoke tests

`scripts/smoke.ts` (checks in `scripts/smoke-checks.ts`) reads every URL without running JavaScript, the way curl or a crawler does, so a page counts only if its **raw HTML** has the content:

- **API**: `/health` answers `{"ok":true}`, the PokéAPI proxy, `/wishlist` and `/likes` answer 200, an unknown route 404, and its CORS lets both fronts in.
- **SSG (CloudFront)** and **SSR (Vercel)**: the home page, `/pokemon/pikachu` and `/pokemon/bulbasaur` answer 200 with the right `<title>` (`Pikachu — PokéNuxt`), `<h1>`, `lang="fr"`, number and types; `/pokemon/missingno` answers 404; the prerendered payload is there.
- **SSR only**: with the `pokenuxt-lang=en` cookie the HTML comes back in English (`Bulbasaur — PokéNuxt`), which a generated page can't do, and `/pokemon/25` answers a 301 to `/pokemon/pikachu`.
- **Version**: both fronts serve `/version.json`, which must name the commit just deployed.

Each URL gets 4 tries, 5 seconds apart, for the CDN to catch up. The results go to the run's summary, and any failure fails the run.

```bash
SMOKE_API=https://p03y7ni65h.execute-api.eu-north-1.amazonaws.com SMOKE_SSR=https://pokenuxt-mauve.vercel.app SMOKE_SSG=https://d1jjigkssadg5n.cloudfront.net bun scripts/smoke.ts
```

### Rollback

Each Deploy run keeps what it published as artifacts, for 90 days: the CDK assembly with the Lambda bundle (`release-infra`), the generated site (`release-ssg`) and Vercel's prebuilt output (`release-ssr`). A run whose smoke tests pass also keeps `release`, a `release.json` with its commit and URLs: that makes it a **stable release**.

Run **Rollback** from the Actions tab, or:

```bash
gh workflow run rollback.yml                 # the previous stable release
gh workflow run rollback.yml -f run=<run-id> # a given Deploy run
```

Without a run ID, it reads the commit live now from `/version.json` and picks the newest stable release built from another commit. It deploys that release's CDK assembly, syncs its site to S3 and invalidates CloudFront, deploys its Vercel output to production, then runs the smoke tests against that commit. Nothing is rebuilt. The database stays as it is: migrations only ever add, so an older API still works with it. The next push to `main` deploys the latest code again.

### Coverage

The front's and the API's unit tests run with V8 coverage in CI (`bun run test:coverage`, and the same in `api/`). Each job uploads its HTML report and a [shields.io](https://shields.io/badges/endpoint-badge) badge (`scripts/coverage-badge.ts`), and Deploy publishes them with the site, at [`/coverage/front/`](https://d1jjigkssadg5n.cloudfront.net/coverage/front/) and [`/coverage/api/`](https://d1jjigkssadg5n.cloudfront.net/coverage/api/): the badges above read them. The front's count covers `app/utils`, `app/composables`, `prerender/` and `scripts/`; components and pages are left to the end-to-end tests.

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

Projects in the new AWS experience can't create OIDC providers, so GitHub Actions can't use OIDC. CI deploys as the IAM user `pokenuxt-github-deploy` (`infra/lib/ci-user-stack.ts`), which can only assume the CDK bootstrap roles. Its access key lives in GitHub's secrets; rotate it from time to time. This creates one and stores it in the `production` environment without printing it:

```bash
aws iam create-access-key --user-name pokenuxt-github-deploy --profile pokenuxt --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text | { read id secret; gh secret set AWS_ACCESS_KEY_ID --env production --body "$id"; gh secret set AWS_SECRET_ACCESS_KEY --env production --body "$secret"; }
```

### The front on S3 and CloudFront

`infra/lib/web-stack.ts`:

- A **private S3 bucket**. Only CloudFront reads it, through origin access control, and requests that aren't HTTPS are refused.
- A **CloudFront distribution** in front, HTTPS only, North America and Europe edge locations. A CloudFront Function turns `/pokemon/pikachu` into `/pokemon/pikachu/index.html`, which S3 doesn't do on its own. Missing pages get Nuxt's `404.html`.
- The CI user may list and write the bucket, and invalidate this distribution, nothing else.

Assets in `_nuxt/` have a hash in their name and are cached a year. Pages and payloads are cached a day by CloudFront, and each deploy invalidates everything.

### Setting up GitHub

In GitHub, create a `production` environment with:

- secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`: the `pokenuxt-github-deploy` user's access key;
- secret `DATABASE_URL`: Supabase's **session pooler** URL, used to migrate. GitHub's runners have no IPv6, which the direct `db.<project>.supabase.co` host needs;
- secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_WEB_PROJECT_ID`: a Vercel token and the IDs in the project's `.vercel/project.json`, for the SSR front. Vercel's own Git deploys are off (`vercel.json`), and `.vercelignore` keeps `api/` from becoming Vercel functions;
- variable `WEB_URL`: the Vercel front's production URL. The API's CORS allows it, and the smoke tests check it. The CloudFront origin is always allowed.

### Database

`bun run --cwd api db:migrate` applies `db/migrations/` to the database in `DATABASE_URL`, read from the root `.env` locally. `bun run dev:api` reads the same `.env`. The runner is `api/src/migrations.ts`:

- a migration is a file named `NNN_name.sql`, such as `001_likes.sql`. They run in number order, each in its own transaction: one that fails leaves nothing behind and stops the run, and the ones before it stay applied;
- each applied file is recorded in the `schema_migrations` table, with its SHA-256 `checksum` and `applied_at`. A file already applied is never run again, and a run with nothing new prints `Nothing to apply.`;
- it refuses to go on, before applying anything, when an applied file was changed (its checksum differs), is missing, or when a new file is numbered before one already applied. Never edit a migration once it has been applied: add the next number instead;
- every transaction takes the same advisory lock, so two runs at once apply each file once.

The first runner recorded `init.sql` without a checksum: on its first run, the new one renames that row `000_init.sql` and records the file's checksum.

The API's Postgres tests run against `TEST_DATABASE_URL`, never `DATABASE_URL`, since they empty the tables; the runner's tests each work in a schema of their own, dropped afterwards. Without `TEST_DATABASE_URL` they are skipped. The end-to-end tests start their own API on port 8788, in memory.
