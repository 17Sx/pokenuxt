# PokéNuxt

Nuxt 4 · Tailwind CSS v4 · Neon + Drizzle · oRPC · TCGdex SDK

## Setup

```bash
npm install
cp .env.example .env   # fill DATABASE_URL with your Neon connection string
npm run dev
```

## Scripts

| Script | |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm run typecheck` | Type check |
| `npm run db:generate` | Generate SQL migrations from `server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push the schema directly (prototyping) |
| `npm run db:studio` | Drizzle Studio |

## Structure

- `server/orpc/router.ts` — oRPC procedures (exposed on `/rpc`)
- `server/db/` — Drizzle schema and Neon client (`useDb()`)
- `server/utils/tcgdex.ts` — TCGdex SDK instance (French)
- `app/plugins/orpc.*.ts` — `$orpc` client (HTTP in the browser, direct call during SSR)
